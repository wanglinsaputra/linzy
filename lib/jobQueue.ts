import { randomUUID } from 'node:crypto';
import type { Job, Platform } from './types';
import { extract } from './extract';

// ponytail: in-memory queue, single process, 1h TTL.
// Pinned to globalThis because each route bundle gets its own module instance in
// dev (and HMR resets module scope), so a plain module-level Map made
// /api/status 404 on every job enqueued by /api/extract.
// Ceiling: jobs still die on restart and don't cross serverless instances.
// Upgrade path: swap this map for bullmq + Redis, same enqueue/get surface.
const store = globalThis as typeof globalThis & { __linzyJobs?: Map<string, Job> };
const jobs = (store.__linzyJobs ??= new Map<string, Job>());
const TTL = 60 * 60 * 1000;

function sweep() {
  const cutoff = Date.now() - TTL;
  for (const [id, j] of jobs) if (j.createdAt < cutoff) jobs.delete(id);
}

export function enqueue(url: string, platform: Platform): Job {
  sweep();
  const job: Job = { id: randomUUID(), status: 'processing', url, platform, createdAt: Date.now() };
  jobs.set(job.id, job);

  // Fire-and-forget: the request returns immediately, client polls /api/status.
  void (async () => {
    try {
      job.result = await extract(url, platform);
      job.status = 'done';
    } catch (e) {
      job.status = 'error';
      job.error = (e as Error)?.message ?? 'Extraction failed.';
      console.error(`[job ${job.id}] ${platform} error:`, e);
    }
  })();

  return job;
}

export const getJob = (id: string) => jobs.get(id);
