import { ContactMenu } from '@/components/ContactMenu';

export function Header() {
  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-primary/30 shadow-[0_4px_20px_rgba(255,171,243,0.15)] flex items-center justify-between px-margin-mobile md:px-gutter h-16">
      <div className="flex items-center gap-3 md:gap-4">
        <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          terminal
        </span>
        <span className="font-display-lg text-headline-md tracking-tighter text-primary drop-shadow-[0_0_8px_rgba(255,171,243,0.8)]">
          LINZY
        </span>
      </div>
      <ContactMenu />
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-surface-container-lowest w-full relative border-t border-secondary-fixed-dim/20 flex justify-center items-center py-8 px-margin-mobile md:px-gutter mt-12 z-20">
      <span className="font-label-sm text-label-sm uppercase tracking-[0.12em] md:tracking-[0.2em] text-tertiary text-center text-balance max-w-full">
        © {new Date().getFullYear()} LINZY_CORP // DATA_EXTRACTION_UNIT
      </span>
    </footer>
  );
}

const NODES: Array<[string, string]> = [
  ['smart_display', 'NODE_TT'],
  ['photo_camera', 'NODE_IG'],
  ['chat', 'NODE_X'],
  ['thumb_up', 'NODE_FB'],
  ['forum', 'NODE_TH'],
  ['push_pin', 'NODE_PIN'],
  ['music_note', 'NODE_SPOT'],
  ['movie_edit', 'NODE_CC'],
];

export function ActiveNodes() {
  return (
    <div className="mt-12 md:mt-20 w-full max-w-3xl flex flex-col items-center">
      <div className="font-label-sm text-label-sm text-secondary-fixed-dim mb-6 flex items-center gap-2 uppercase tracking-widest opacity-80">
        <span className="w-4 h-[1px] bg-secondary-fixed-dim" />
        ACTIVE_NODES
        <span className="w-4 h-[1px] bg-secondary-fixed-dim" />
      </div>
      <div className="flex flex-wrap justify-center gap-3 md:gap-4 w-full">
        {NODES.map(([icon, name]) => (
          <div
            key={name}
            className="bg-surface-container-low border border-inverse-surface px-4 py-2 md:px-6 md:py-3 flex items-center gap-2 md:gap-3 hover:border-secondary-fixed-dim hover:shadow-[0_0_10px_rgba(0,221,221,0.2)] transition-all cursor-crosshair rounded-none relative group"
          >
            <div className="absolute inset-0 border border-secondary-fixed-dim opacity-0 group-hover:opacity-100 scale-105 group-hover:scale-100 transition-all duration-300 pointer-events-none" />
            <span className="material-symbols-outlined text-outline-variant group-hover:text-secondary-fixed-dim transition-colors text-[20px]">
              {icon}
            </span>
            <span className="font-label-sm text-label-sm text-outline-variant group-hover:text-secondary-fixed-dim transition-colors">
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
