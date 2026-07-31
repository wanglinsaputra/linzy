'use client';

import { useEffect, useRef, useState } from 'react';
import type { ExtractResult, Platform } from '@/lib/types';
import { ActiveNodes, Footer, Header } from '@/components/Chrome';
import { LoadingPanel } from '@/components/LoadingPanel';
import { ResultPanel } from '@/components/ResultPanel';

type Phase = 'idle' | 'loading' | 'done' | 'error';

export default function Home() {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [platform, setPlatform] = useState<Platform | undefined>();
  const [jobId, setJobId] = useState('');
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState('');
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => void (poll.current && clearInterval(poll.current)), []);

  function reset() {
    if (poll.current) clearInterval(poll.current);
    setUrl('');
    setPhase('idle');
    setResult(null);
    setError('');
    setPlatform(undefined);
  }

  async function paste() {
    try {
      setUrl((await navigator.clipboard.readText()).trim());
    } catch {
      setError('Clipboard blocked by the browser. Paste manually (Ctrl+V).');
    }
  }

  async function submit() {
    if (!url.trim() || phase === 'loading') return;
    setPhase('loading');
    setError('');
    setResult(null);

    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    }).catch(() => null);

    const body = (await res?.json().catch(() => null)) as
      | { id?: string; platform?: Platform; error?: string }
      | null;

    if (!res?.ok || !body?.id) {
      setPhase('error');
      setError(body?.error ?? 'Could not reach the extraction server.');
      return;
    }

    setJobId(body.id);
    setPlatform(body.platform);

    poll.current = setInterval(async () => {
      const s = await fetch(`/api/status/${body.id}`).then((r) => r.json()).catch(() => null);
      if (!s) return;
      if (s.status === 'done') {
        clearInterval(poll.current!);
        setResult(s.result);
        setPhase('done');
      } else if (s.status === 'error') {
        clearInterval(poll.current!);
        setError(s.error ?? 'That platform is having trouble right now.');
        setPhase('error');
      }
    }, 1500);
  }

  return (
    <>
      <Header />
      <main className="flex-1 flex flex-col items-center pt-24 md:pt-32 pb-24 px-margin-mobile md:px-gutter relative z-10 w-full max-w-container-max mx-auto">
        {phase === 'loading' && <LoadingPanel platform={platform} />}
        {phase === 'done' && result && <ResultPanel jobId={jobId} result={result} onBack={reset} />}

        {(phase === 'idle' || phase === 'error') && (
          <div className="bg-surface-container-low border border-inverse-surface w-full max-w-3xl relative p-6 sm:p-8 md:p-16 flex flex-col items-center">
            <div className="absolute top-0 left-0 bg-primary text-black font-label-sm text-label-sm px-2 py-1 -translate-y-1/2 translate-x-4 border border-primary shadow-[0_0_8px_#ffabf3]">
              [SYS_READY :: TX_WAIT]
            </div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-secondary-fixed-dim -translate-y-[1px] translate-x-[1px]" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-secondary-fixed-dim translate-y-[1px] -translate-x-[1px]" />

            <h1 className="font-headline-lg text-headline-md md:text-headline-lg text-primary drop-shadow-[0_0_12px_rgba(255,171,243,0.8)] text-center mb-4 uppercase tracking-wide leading-tight">
              Paste a link, download the media
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant text-center mb-8 md:mb-12 max-w-xl text-balance">
              Linzy pulls the original video, photo or audio out of a public social media post so
              you can save it. Drop in a link from TikTok, Instagram, X, Facebook, Threads,
              Pinterest, Spotify or CapCut — no account, no app, no watermark.
            </p>

            <div className="w-full relative flex flex-col gap-6 items-center">
              <div className="w-full relative group input-glow transition-shadow duration-300">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-fixed-dim font-label-md select-none">
                  ~&gt;
                </span>
                <input
                  type="url"
                  inputMode="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  aria-label="Paste a post link"
                  placeholder="AWAITING_DATA_STREAM..."
                  className="w-full bg-surface-dim border-b border-inverse-surface focus:border-secondary-fixed-dim focus:border focus:ring-0 focus:outline-none font-label-md text-secondary-fixed-dim pl-12 pr-4 py-5 rounded-none placeholder:text-outline-variant transition-all"
                />
                <div className="absolute top-0 left-0 w-0 h-[1px] bg-secondary-fixed-dim group-focus-within:w-full transition-all duration-500 ease-out" />
                <div className="absolute bottom-0 right-0 w-0 h-[1px] bg-secondary-fixed-dim group-focus-within:w-full transition-all duration-500 ease-out" />
              </div>

              <div className="flex gap-3 w-full justify-center flex-wrap">
                <button
                  type="button"
                  onClick={paste}
                  className="font-label-sm text-label-sm uppercase tracking-widest border border-secondary-fixed-dim text-secondary-fixed-dim px-4 py-2 hover:bg-secondary-fixed-dim hover:text-black transition-colors"
                >
                  [ PASTE ]
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="font-label-sm text-label-sm uppercase tracking-widest border border-outline-variant text-on-surface-variant px-4 py-2 hover:border-primary hover:text-primary transition-colors"
                >
                  [ CLEAR ]
                </button>
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={!url.trim()}
                className="btn-primary font-label-md text-label-md px-12 py-5 uppercase tracking-[0.2em] w-full md:w-auto relative overflow-hidden group glitch-hover transition-all duration-300 rounded-none"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  GET MEDIA
                  <span className="inline-block w-[10px] h-[18px] bg-black group-hover:bg-white cursor-blink ml-1" />
                </span>
              </button>

              {phase === 'error' && (
                <p
                  role="alert"
                  className="w-full border border-danger text-danger font-label-sm text-label-sm p-3 uppercase tracking-wider"
                >
                  [ERR] {error}
                </p>
              )}
            </div>
          </div>
        )}

        {(phase === 'idle' || phase === 'error') && <ActiveNodes />}
      </main>
      <Footer />
    </>
  );
}
