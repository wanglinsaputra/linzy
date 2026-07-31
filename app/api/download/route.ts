import { Readable } from 'node:stream';
import { NextRequest } from 'next/server';
import { getJob } from '@/lib/jobQueue';
import { ffmpegStream } from '@/lib/ffmpegHelper';
import { authorized, rateLimited } from '@/lib/security';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Proxies a download for a format that belongs to an existing job.
 * Only job-owned URLs are fetched — arbitrary `url` params are rejected so this
 * endpoint can never be used as an open proxy (SSRF).
 * `?to=mp3` pipes the media through ffmpeg to strip the video track.
 */
export async function GET(req: NextRequest) {
  // Browser requests pass via Origin; non-browser clients need the fingerprint.
  if (!authorized(req)) {
    return new Response('Forbidden.', { status: 403 });
  }
  const rl = rateLimited(req, 20);
  if (!rl.ok) {
    return new Response('Too many requests. Try again later.', {
      status: 429,
      headers: { 'retry-after': String(rl.retryAfter) },
    });
  }

  const q = new URL(req.url).searchParams;
  const job = await getJob(q.get('job') ?? '');
  const fmt = job?.result?.formats.find((f) => f.id === q.get('format'));
  if (!job || !fmt) {
    return new Response('No such format for this job.', { status: 404 });
  }

  const safeTitle = (job.result?.title ?? 'linzy').replace(/[^\w.-]+/g, '_').slice(0, 80);

  // Audio-only request: ffmpeg transcodes as it streams, so nothing blocks and
  // no temp file is written (hence nothing to clean up later).
  if (q.get('to') === 'mp3') {
    const stream = Readable.toWeb(ffmpegStream(fmt.url, 'mp3') as Readable) as ReadableStream;
    return new Response(stream, {
      headers: {
        'content-type': 'audio/mpeg',
        'content-disposition': `attachment; filename="${safeTitle}.mp3"`,
        'x-content-type-options': 'nosniff',
        'cache-control': 'private, no-store',
      },
    });
  }

  const upstream = await fetch(fmt.url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!upstream.ok || !upstream.body) {
    return new Response(`The source refused the request (HTTP ${upstream.status}).`, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'content-disposition': `attachment; filename="${safeTitle}_${fmt.label}.${fmt.ext}"`,
      'x-content-type-options': 'nosniff',
      'cache-control': 'private, no-store',
      ...(upstream.headers.get('content-length')
        ? { 'content-length': upstream.headers.get('content-length')! }
        : {}),
    },
  });
}
