'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const KEY = 'linzy-install-dismissed';

/**
 * Custom themed install prompt. Browsers never show a themed prompt by
 * themselves — Android/desktop fire `beforeinstallprompt`, which we capture
 * and surface as an in-theme banner; iOS has no such event, so it gets
 * "Add to Home Screen" instructions instead.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    if (standalone || (navigator as Navigator & { standalone?: boolean }).standalone) return; // already installed
    if (localStorage.getItem(KEY)) return; // dismissed before

    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      setIos(true);
      setHidden(false);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    localStorage.setItem(KEY, '1');
  };

  const install = async () => {
    if (!deferred) return;
    setHidden(true);
    localStorage.setItem(KEY, '1');
    await deferred.prompt();
  };

  return (
    <div
      role="dialog"
      aria-label="Install Linzy as an app"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-[26rem] z-[60] glitch-panel border-primary/40 shadow-[0_0_20px_rgba(255,171,243,0.25)]"
    >
      <div className="absolute top-0 left-0 bg-primary text-black font-label-sm text-label-sm px-2 py-1 -translate-y-1/2 translate-x-4 border border-primary">
        INSTALL_SEQUENCE
      </div>
      <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-secondary-fixed-dim -translate-y-[1px] translate-x-[1px]" />
      <div className="p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-primary text-3xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
          install_mobile
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-headline-md text-headline-md text-primary mb-1 tracking-tight">Install Linzy</p>
          {ios ? (
            <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
              Tap <span className="text-secondary-fixed-dim">Share</span> →{' '}
              <span className="text-secondary-fixed-dim">Add to Home Screen</span> to run Linzy as an app.
            </p>
          ) : (
            <p className="font-label-sm text-label-sm text-on-surface-variant leading-relaxed">
              Standalone window, offline shell, no browser chrome.
            </p>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="font-label-sm text-label-sm text-outline hover:text-on-surface transition-colors shrink-0 mt-1"
        >
          ESC
        </button>
      </div>
      {!ios && (
        <button
          onClick={install}
          className="w-full btn-primary font-label-sm text-label-sm tracking-[0.2em] uppercase py-3"
        >
          INSTALL_APP
        </button>
      )}
    </div>
  );
}
