'use client';

import { useEffect, useRef, useState } from 'react';

const EMAIL = 'support@linzy.web.id';
const GITHUB = 'https://github.com/wanglinsaputra';

/**
 * Header contact dropdown. SUPPORT copies the address instead of firing a
 * mailto:, because most desktop users have no mail client registered and the
 * link silently does nothing for them.
 *
 * ponytail: open/close is still the native <details>, so the only state here is
 * the toast. Ceiling: the menu won't close on outside click or Escape.
 * Upgrade path: a click-away listener, or swap to <dialog>.
 */
export function ContactMenu() {
  const [toast, setToast] = useState<'copied' | 'manual' | null>(null);
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!toast) return;
    // The manual fallback has to stay up long enough to read and select.
    const t = setTimeout(() => setToast(null), toast === 'copied' ? 2200 : 8000);
    return () => clearTimeout(t);
  }, [toast]);

  async function copyEmail() {
    menu.current?.removeAttribute('open');
    try {
      await navigator.clipboard.writeText(EMAIL);
      setToast('copied');
    } catch {
      // Clipboard API is blocked on insecure origins and by some mobile
      // browsers, so show the address for manual selection instead of failing.
      setToast('manual');
    }
  }

  return (
    <div className="relative">
      <details ref={menu} className="group">
        <summary
          aria-label="Contact links"
          className="list-none cursor-pointer text-on-surface-variant hover:text-secondary-fixed-dim group-open:text-secondary-fixed-dim transition-colors duration-300 active:scale-95 flex items-center justify-center p-2 [&::-webkit-details-marker]:hidden"
        >
          <span className="material-symbols-outlined">settings_input_component</span>
        </summary>
        <div className="absolute right-0 top-full mt-2 min-w-[13rem] bg-surface-container-lowest border border-secondary-fixed-dim/60 shadow-[0_0_16px_rgba(0,221,221,0.15)] flex flex-col py-1 z-10">
          <a
            href={GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            className="font-label-sm text-label-sm uppercase tracking-[0.15em] text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors px-4 py-3 flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-[18px]">code</span>
            GITHUB
          </a>
          <button
            type="button"
            onClick={copyEmail}
            className="font-label-sm text-label-sm uppercase tracking-[0.15em] text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors px-4 py-3 flex items-center gap-3 text-left w-full"
          >
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
            COPY SUPPORT EMAIL
          </button>
        </div>
      </details>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-0 top-full mt-2 z-20 w-max max-w-[calc(100vw-2rem)] bg-surface-container-lowest border border-primary/70 shadow-[0_0_16px_rgba(255,171,243,0.25)] px-4 py-3 flex items-start gap-3"
        >
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-secondary-fixed-dim m-1 opacity-60" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-secondary-fixed-dim m-1 opacity-60" />
          <span
            className={`material-symbols-outlined text-[18px] shrink-0 ${
              toast === 'copied' ? 'text-tertiary' : 'text-primary'
            }`}
          >
            {toast === 'copied' ? 'task_alt' : 'content_paste_off'}
          </span>
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm uppercase tracking-[0.15em] text-primary">
              {toast === 'copied' ? '[ EMAIL COPIED ]' : '[ COPY BLOCKED ]'}
            </p>
            <p className="font-label-sm text-label-sm text-secondary-fixed-dim break-all select-all mt-1">
              {EMAIL}
            </p>
            {toast === 'manual' && (
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Copy it manually.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="shrink-0 text-outline-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
