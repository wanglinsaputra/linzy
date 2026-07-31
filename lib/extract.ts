import type { ExtractResult, MediaFormat, MediaKind, Platform } from './types';

const API = process.env.WAVY_API_BASE ?? 'https://wavy.netraux.eu.cc';
const TIMEOUT = 25_000;

export class ExtractError extends Error {
  constructor(
    message: string,
    readonly needsAuth = false,
  ) {
    super(message);
  }
}

interface WavyMedia {
  type?: string;
  quality?: string;
  extension?: string;
  url?: string;
  size?: number;
  width?: number;
  height?: number;
}

interface WavyResult {
  url?: string;
  title?: string;
  caption?: string;
  cover?: string;
  duration?: number;
  author?: string | { username?: string };
  media?: {
    all?: WavyMedia[];
    videos?: WavyMedia[];
    images?: WavyMedia[];
    audio?: WavyMedia[];
  };
  /** Wavy sometimes double-wraps the payload. */
  result?: WavyResult;
}

interface WavyEnvelope {
  success?: boolean;
  platform?: string;
  error?: string;
  result?: WavyResult;
}

const KINDS: Record<string, MediaKind> = {
  video: 'video',
  image: 'photo',
  photo: 'photo',
  audio: 'audio',
  track: 'audio',
};

function kindOf(type: string | undefined, ext: string): MediaKind {
  const hit = KINDS[(type ?? '').toLowerCase()];
  if (hit) return hit;
  if (/^(mp4|webm|mov|m3u8)$/i.test(ext)) return 'video';
  if (/^(mp3|m4a|opus|ogg|wav)$/i.test(ext)) return 'audio';
  return 'photo';
}

function extOf(m: WavyMedia): string {
  if (m.extension) return m.extension.toLowerCase();
  let path = '';
  try {
    path = new URL(m.url!).pathname;
  } catch {
    /* fall through to 'bin' */
  }
  return path.match(/\.([a-z0-9]{2,5})$/i)?.[1].toLowerCase() ?? 'bin';
}

function labelOf(m: WavyMedia, kind: MediaKind, ext: string): string {
  const q = (m.quality ?? '').trim().toUpperCase().replace(/\s+/g, '_');
  return `${ext.toUpperCase()}_${q || (kind === 'photo' ? 'IMAGE' : kind.toUpperCase())}`;
}

function flatten(r: WavyResult): WavyResult {
  let cur = r;
  for (let i = 0; i < 3 && cur.result; i++) cur = cur.result;
  return cur;
}

export function normalize(env: WavyEnvelope, platform: Platform, sourceUrl: string): ExtractResult {
  if (!env.success || !env.result) {
    throw new ExtractError(env.error?.trim() || `The extraction service returned no data for ${platform}.`);
  }
  const r = flatten(env.result);

  // Meta serves a login wall with HTTP 200 for private/age-gated posts, so the
  // payload looks successful while carrying only login-page assets. Matched
  // exactly, not by substring — a real caption may well contain "log in".
  if (/^(threads|instagram|facebook)\s*[•·|\u2022-]?\s*log ?in$/i.test(r.title?.trim() ?? '')) {
    throw new ExtractError(
      'This post is not publicly accessible (it hit a login wall). Make sure the account and the post are public.',
      true,
    );
  }

  // `all` is the superset; the typed buckets repeat the same entries.
  const raw = r.media?.all?.length
    ? r.media.all
    : [...(r.media?.videos ?? []), ...(r.media?.images ?? []), ...(r.media?.audio ?? [])];

  const seen = new Set<string>();
  const formats: MediaFormat[] = [];
  for (const m of raw) {
    if (!m.url || !/^https?:\/\//.test(m.url) || seen.has(m.url)) continue;
    seen.add(m.url);
    const ext = extOf(m);
    const kind = kindOf(m.type, ext);
    formats.push({
      id: String(formats.length),
      label: labelOf(m, kind, ext),
      kind,
      ext,
      url: m.url,
      width: m.width,
      height: m.height,
      filesize: m.size && m.size > 0 ? m.size : undefined,
    });
  }

  if (!formats.length) {
    throw new ExtractError(
      `No media files at this link — it may be a text-only post. (${platform.toUpperCase()})`,
    );
  }

  const author = typeof r.author === 'string' ? r.author : r.author?.username;
  const caption = r.caption?.trim(); // Pinterest returns a single space

  // Threads mixes cover thumbnails into `all`, so the first entry is often a
  // JPEG even on a video post. Pick the headline kind by precedence instead.
  const kind = (['video', 'audio', 'photo'] as const).find((k) => formats.some((f) => f.kind === k))!;

  return {
    platform,
    kind,
    title: r.title?.trim() || author || 'MEDIA_01',
    caption: caption || undefined,
    thumbnail: r.cover?.trim() || undefined,
    duration: r.duration,
    sourceUrl: r.url ?? sourceUrl,
    formats,
    via: 'wavy',
  };
}

async function byteSize(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'user-agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? Number(res.headers.get('content-length')) || 0 : null;
  } catch {
    return null;
  }
}

/**
 * Wavy labels three Pinterest entries original/large/medium but points all of
 * them at the same `236x` thumbnail. Real variants sit at sibling paths, and
 * `736x` is often larger than `originals`, so pick by byte size, not by name.
 */
function upgradePinterest(formats: MediaFormat[]): Promise<MediaFormat[]> {
  return Promise.all(
    formats.map(async (f) => {
      const m = f.url.match(/^(https:\/\/i\.pinimg\.com\/)(?:\d+x|originals)(\/.+)$/);
      if (!m) return f;
      let best = f;
      let bestSize = -1;
      for (const url of [`${m[1]}originals${m[2]}`, `${m[1]}736x${m[2]}`, f.url]) {
        const size = await byteSize(url);
        if (size == null || size <= bestSize) continue;
        bestSize = size;
        best = {
          ...f,
          url,
          filesize: size || undefined,
          label: `${f.ext.toUpperCase()}_${url.split('/')[3].toUpperCase()}`,
        };
      }
      return best;
    }),
  );
}

const remainingQuota = (res: Response) =>
  Number(res.headers.get('ratelimit')?.match(/remaining=(\d+)/)?.[1]);

/**
 * Sole extraction engine: Wavy's public `GET /api/download?url=`.
 * ponytail: no caching, no retry. Wavy allows 100 req / 15 min per IP and every
 * Linzy user shares this server's IP. Add a URL-keyed cache (~30 min TTL, media
 * links expire) before this sees real traffic.
 */
export async function extract(url: string, platform: Platform): Promise<ExtractResult> {
  let res: Response;
  try {
    res = await fetch(`${API}/api/download?url=${encodeURIComponent(url)}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT),
      cache: 'no-store',
    });
  } catch (e) {
    const timedOut = (e as Error)?.name === 'TimeoutError';
    throw new ExtractError(
      timedOut
        ? 'The extraction service did not respond within 25 seconds. Try again.'
        : 'Could not reach the extraction service. Try again in a moment.',
    );
  }

  if (res.status === 429 || remainingQuota(res) === 0) {
    throw new ExtractError('Extraction quota used up (100 requests / 15 minutes). Wait a few minutes.');
  }

  const env = (await res.json().catch(() => null)) as WavyEnvelope | null;
  if (!env) throw new ExtractError(`The extraction service replied with invalid data (HTTP ${res.status}).`);

  const result = normalize(env, platform, url);
  if (platform === 'pinterest') result.formats = await upgradePinterest(result.formats);

  const left = remainingQuota(res);
  if (Number.isFinite(left) && left < 10) {
    result.notice = `Extraction quota nearly used up (${left} left). The next few requests may fail temporarily.`;
  }
  return result;
}
