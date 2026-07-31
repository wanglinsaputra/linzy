import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobQueue';
import { fingerprintOk, originAllowed, rateLimited } from '@/lib/security';

export const runtime = 'nodejs';

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Browser requests prove their origin; non-browser clients need the fingerprint.
  if (!originAllowed(req) || !fingerprintOk(req)) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }
  const rl = rateLimited(req, 60);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, {
      status: 429,
      headers: { 'retry-after': String(rl.retryAfter) },
    });
  }

  const { id } = await params;
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid job id.' }, { status: 400 });
  }
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Job not found or already expired.' }, { status: 404 });
  return NextResponse.json({
    id: job.id,
    status: job.status,
    platform: job.platform,
    error: job.error,
    result: job.result,
  });
}
