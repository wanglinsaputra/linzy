import { randomUUID } from 'node:crypto';
import type { Job, Platform } from './types';
import { extract } from './extract';
import { redisAcquireLock, redisDel, redisEnabled, redisGet, redisSet } from './redis';

// In-memory fallback so dev/selfcheck work without Upstash env vars. Pinned to
// globalThis because each route bundle gets its own module instance in dev.
// In production (with UPSTASH_REDIS_REST_URL/TOKEN set) jobs live in Redis so
// they survive across serverless instances — the whole reason /api/status used
// to 404 on Vercel (extract landed on one instance, polls hit another).
const store = globalThis as typeof globalThis & { __linzyJobs?: Map<string, Job> };
const mem = (store.__linzyJobs ??= new Map<string, Job>());
const TTL = 60 * 60; // seconds (Redis) — mem map uses the same 1h lifetime

const jobKey = (id: string) => `linzy:job:${id}`;
const lockKey = (id: string) => `linzy:lock:${id}`;
const LOCK_TTL = 120; // seconds; longest upstream extraction observed is ~25s

export async function enqueue(url: string, platform: Platform): Promise<Job> {
  const job: Job = { id: randomUUID(), status: 'processing', url, platform, createdAt: Date.now() };
  if (redisEnabled) {
    await redisSet(jobKey(job.id), JSON.stringify(job), TTL).catch(() => {});
  } else {
    mem.set(job.id, job);
    sweep();
  }
  return job;
}

/**
 * Load a job, kicking off extraction on first poll (lazy). Extraction runs
 * inside the status handler so it is never abandoned when a serverless
 * instance is recycled; the Redis lock keeps concurrent polls from extracting
 * twice. Fire-and-forget can't be trusted on serverless — this is the guard.
 */
export async function getJob(id: string): Promise<Job | null> {
  const key = jobKey(id);
  let job: Job | null = null;

  if (redisEnabled) {
    job = await redisGet<Job>(key).catch(() => null);
    if (job?.status === 'processing') {
      const mine = await redisAcquireLock(lockKey(id), LOCK_TTL).catch(() => true);
      if (mine) {
        try {
          const result = await extract(job.url, job.platform);
          job = { ...job, status: 'done', result };
        } catch (e) {
          job = { ...job, status: 'error', error: (e as Error)?.message ?? 'Extraction failed.' };
        }
        await redisSet(key, JSON.stringify(job), TTL).catch(() => {});
        await redisDel(lockKey(id)).catch(() => {});
      }
    }
    return job;
  }

  // Dev fallback: in-memory, fire-and-forget like before.
  job = mem.get(id) ?? null;
  if (job?.status === 'processing') {
    void (async () => {
      try {
        job!.result = await extract(job!.url, job!.platform);
        job!.status = 'done';
      } catch (e) {
        job!.status = 'error';
        job!.error = (e as Error)?.message ?? 'Extraction failed.';
      }
    })();
  }
  return job;
}

function sweep() {
  const cutoff = Date.now() - TTL * 1000;
  for (const [id, j] of mem) if (j.createdAt < cutoff) mem.delete(id);
}
