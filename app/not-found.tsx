import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer, Header } from '@/components/Chrome';

export const metadata: Metadata = {
  title: '404 — Page Not Found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center pt-24 md:pt-32 pb-24 px-margin-mobile md:px-gutter relative z-10 w-full max-w-container-max mx-auto">
        <div className="bg-surface-container-low border border-inverse-surface w-full max-w-3xl relative p-6 sm:p-8 md:p-16 flex flex-col items-center">
          <div className="absolute top-0 left-0 bg-danger text-black font-label-sm text-label-sm px-2 py-1 -translate-y-1/2 translate-x-4 border border-danger">
            [SIG_LOST :: 404]
          </div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-secondary-fixed-dim -translate-y-[1px] translate-x-[1px]" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-secondary-fixed-dim translate-y-[1px] -translate-x-[1px]" />

          <p
            aria-hidden="true"
            className="font-display-lg text-display-lg text-primary drop-shadow-[0_0_12px_rgba(255,171,243,0.8)] tracking-tighter leading-none mb-2"
          >
            404
          </p>

          <h1 className="font-headline-lg text-headline-md md:text-headline-lg text-secondary-fixed-dim text-center mb-4 uppercase tracking-wide leading-tight">
            Route not found
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant text-center mb-8 md:mb-12 max-w-xl text-balance">
            This address does not exist on Linzy. The link may be mistyped or the page may have been
            removed. Head back to the extractor and paste your post link there.
          </p>

          <div className="w-full flex flex-col items-center gap-6">
            {/* Mirrors the terminal input on the home page, but read-only: it is a
                signpost, not a field, so the 404 has the same silhouette. */}
            <div className="w-full relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-danger font-label-md select-none">
                ~&gt;
              </span>
              <p className="w-full bg-surface-dim border-b border-inverse-surface font-label-md text-outline-variant pl-12 pr-4 py-5 uppercase tracking-wider truncate">
                NO_SUCH_ENDPOINT
                <span className="inline-block w-[10px] h-[18px] bg-danger cursor-blink ml-2 align-middle" />
              </p>
            </div>

            <Link
              href="/"
              className="btn-primary font-label-md text-label-md px-12 py-5 uppercase tracking-[0.2em] w-full md:w-auto text-center glitch-hover transition-all duration-300 rounded-none"
            >
              <span className="flex items-center justify-center gap-3">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                RETURN TO TERMINAL
              </span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
