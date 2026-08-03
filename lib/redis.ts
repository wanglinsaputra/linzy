/**
 * Upstash Redis over REST — plain fetch, no SDK, works in serverless.
 * Empty env = feature off (dev/test fall back to the in-memory map in jobQueue).
 * ponytail: one HTTP request per command, no pipelining.
 * Upgrade path: @upstash/redis SDK or /pipeline when Redis cost per job matters.
 */
const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redisEnabled = Boolean(URL && TOKEN);

export async function redisGet<T>(key: string): Promise<T | null> {
  if (!URL || !TOKEN) return null;
  const res = await fetch(`${URL}/get/${key}`, {
    headers: { authorization: `Bearer ${TOKEN}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Redis GET failed (${res.status}).`);
  const body = (await res.json().catch(() => null)) as { result?: string } | null;
  const raw = body?.result;
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSet(key: string, value: string, ttl: number): Promise<void> {
  if (!URL || !TOKEN) return;
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(['SET', key, value, 'EX', ttl]),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Redis SET failed (${res.status}).`);
}

export async function redisAcquireLock(key: string, ttl: number): Promise<boolean> {
  if (!URL || !TOKEN) return true;
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(['SET', key, '1', 'EX', ttl, 'NX']),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Redis LOCK failed (${res.status}).`);
  const body = (await res.json().catch(() => null)) as { result?: string } | null;
  return body?.result === 'OK';
}

export async function redisDel(key: string): Promise<void> {
  if (!URL || !TOKEN) return;
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(['DEL', key]),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Redis DEL failed (${res.status}).`);
}

