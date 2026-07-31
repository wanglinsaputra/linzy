import type { NextRequest } from 'next/server';

/** Origin allow-list from env. Set ALLOWED_ORIGIN in .env for deployments. */
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'https://linzy.web.id';

/**
 * Rejects requests whose Origin/Referer is not the allow-listed site.
 * Missing header (curl, direct GET navigation) passes — browsers always send
 * Origin on fetch and Referer on navigation; rate limiting covers the rest.
 * Localhost is blocked in production so the API only accepts the real origin.
 */
export function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get('origin') ?? req.headers.get('referer');
  if (!origin) return true;
  let u: URL;
  try {
    u = new URL(origin);
  } catch {
    return false;
  }
  if (process.env.NODE_ENV !== 'production') {
    // Dev only: your own dev server (localhost) may call the API.
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
  }
  return u.origin === new URL(ALLOWED_ORIGIN).origin;
}

/**
 * Smallest viable rate limiter: fixed window, in-memory, per-IP.
 * ponytail: single process, no Redis, no sliding window.
 * Ceiling: not shared across serverless instances.
 * Upgrade path: swap the Map for Redis (upstash-rate-limit or similar).
 */
const WINDOW = 15 * 60 * 1000;
const store = globalThis as typeof globalThis & { __linzyRate?: Map<string, number[]> };
const hits = (store.__linzyRate ??= new Map<string, number[]>());

export function rateLimited(
  req: NextRequest,
  limit: number,
): { ok: true } | { ok: false; retryAfter: number } {
  const key = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const bucket = (hits.get(key) ?? []).filter((t) => now - t < WINDOW);
  if (bucket.length >= limit) {
    const retryAfter = Math.ceil((bucket[0] + WINDOW - now) / 1000);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }
  bucket.push(now);
  hits.set(key, bucket);
  return { ok: true };
}
