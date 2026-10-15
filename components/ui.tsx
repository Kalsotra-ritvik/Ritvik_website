import type { ReactNode } from "react";

export function ChapterHeader({ index, label, title, children, light }: { index: string; label: string; title: ReactNode; children?: ReactNode; light?: boolean }) {
  return (
    <header data-reveal className="max-w-xl">
      <p className="eyebrow">
        <span aria-hidden="true">{index} · </span>
        {label}
      </p>
      <h2 className={`display mt-4 text-[clamp(2.4rem,1.6rem+3.2vw,4.4rem)] ${light ? "text-umber-900" : "text-mist-100"}`}>{title}</h2>
      {children && <div className="prose-body mt-5 space-y-4">{children}</div>}
    </header>
  );
}

/** Small mono note describing what the 3D scene shows at this point. */
export function SceneNote({ children, title = "In the scene" }: { children: ReactNode; title?: string }) {
  return (
    <aside data-reveal className="panel max-w-md p-4 sm:p-5" aria-label={title}>
      <p className="note mb-2 uppercase tracking-[0.14em] text-teal-400">{title}</p>
      <div className="note text-mist-300">{children}</div>
    </aside>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div data-reveal className={`panel p-5 sm:p-7 ${className}`}>
      {children}
    </div>
  );
}

export function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DownloadIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 2.5v8m-3.5-3.5L8 10.5 11.5 7M3 13.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExternalIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M6 3H3.5A.5.5 0 0 0 3 3.5v9a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V10M9 3h4v4m0-4L7 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
