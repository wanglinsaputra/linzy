import { NextRequest, NextResponse } from 'next/server';
import { detectPlatform } from '@/lib/detectPlatform';
import { originAllowed, rateLimited } from '@/lib/security';

export const runtime = 'nodejs';

const MAX_LEN = 2048;

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }
  const rl = rateLimited(req, 10);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, {
      status: 429,
      headers: { 'retry-after': String(rl.retryAfter) },
    });
  }

  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (typeof url !== 'string' || !url.trim()) {
    return NextResponse.json({ error: 'URL is empty.' }, { status: 400 });
  }
  if (url.length > MAX_LEN) {
    return NextResponse.json({ error: 'URL is too long.' }, { status: 400 });
  }
  const hit = detectPlatform(url);
  if (!hit) {
    return NextResponse.json({ error: 'Unsupported platform or invalid URL.' }, { status: 422 });
  }
  return NextResponse.json(hit);
}
