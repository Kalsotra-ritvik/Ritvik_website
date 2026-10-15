"use client";

import { useEffect, useRef, useState } from "react";
import { CHAPTERS, type ChapterId } from "@/lib/story/chapters";
import { story } from "@/lib/story/store";
import { profile } from "@/data/profile";

const NAV = CHAPTERS.filter((c) => c.nav);
const GROUP: Partial<Record<ChapterId, ChapterId>> = {
  hero: "about",
  foundations: "transcriptome",
  translation: "transcriptome",
  folding: "structure",
  credentials: "skills",
};

export default function Nav() {
  const [active, setActive] = useState<ChapterId>("hero");
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);
  const [light, setLight] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(
    () =>
      story.subscribe((s) => {
        setActive(s.chapter);
        setPaused(s.userPaused);
        setSystemReduced(s.reducedMotion);
        setLight(s.navOnLight);
      }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const current = GROUP[active] ?? active;
  const motionOff = paused || systemReduced;

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${light ? "bg-ivory-50/90 text-umber-900" : "bg-ink-900/55 text-mist-100"} backdrop-blur-md`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#hero" className="group flex items-center gap-3">
          <span aria-hidden="true" className={`grid h-9 w-9 place-items-center rounded-full border font-mono text-[0.7rem] tracking-widest ${light ? "border-umber-900/25" : "border-mist-200/25"}`}>RK</span>
          <span className="sr-only whitespace-nowrap font-display text-xl sm:not-sr-only lg:sr-only xl:not-sr-only">{profile.name}</span>
        </a>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((c) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  aria-current={current === c.id ? "true" : undefined}
                  className={`whitespace-nowrap rounded-full px-2.5 py-2 text-sm transition-colors xl:px-3 ${
                    current === c.id ? (light ? "bg-umber-900/8 text-rust-500" : "bg-white/8 text-amber-300") : light ? "hover:text-rust-500" : "text-mist-300 hover:text-mist-100"
                  }`}
                >
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => story.set({ userPaused: !paused })}
            aria-pressed={motionOff}
            disabled={systemReduced}
            title={systemReduced ? "Reduced motion is on in your system settings" : undefined}
            className={`hidden min-h-[40px] items-center gap-2 whitespace-nowrap rounded-full border px-3 text-xs sm:inline-flex ${light ? "border-umber-900/20" : "border-mist-200/20 text-mist-200"} disabled:opacity-60`}
          >
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${motionOff ? "bg-mist-400" : "bg-teal-400"}`} />
            {systemReduced ? "Motion reduced" : paused ? "Resume motion" : "Pause motion"}
          </button>
          <a href={profile.cv.href} download={profile.cv.fileName} className="btn btn-primary hidden !min-h-[40px] !py-2 text-sm sm:inline-flex">
            CV
          </a>
          <button
            ref={buttonRef}
            type="button"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border lg:hidden ${light ? "border-umber-900/20" : "border-mist-200/20"}`}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden="true" className="relative block h-3 w-5">
              <span className={`absolute left-0 h-px w-5 bg-current transition-transform ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 h-px w-5 bg-current transition-transform ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </div>
      </div>

      <div className="h-px w-full bg-white/5">
        <div className="h-px origin-left bg-amber-300/80" style={{ transform: "scaleX(var(--story-progress))" }} />
      </div>

      {open && (
        <div id="mobile-menu" ref={menuRef} className="border-t border-white/10 bg-ink-900/97 text-mist-100 lg:hidden">
          <nav aria-label="Mobile">
            <ul className="mx-auto grid max-w-7xl gap-1 px-4 py-4 sm:px-6">
              {NAV.map((c) => (
                <li key={c.id}>
                  <a
                    href={`#${c.id}`}
                    onClick={() => setOpen(false)}
                    aria-current={current === c.id ? "true" : undefined}
                    className={`flex min-h-[48px] items-center rounded-lg px-3 text-base ${current === c.id ? "bg-white/8 text-amber-300" : "hover:bg-white/5"}`}
                  >
                    {c.label}
                  </a>
                </li>
              ))}
              <li className="mt-2 flex flex-wrap gap-2 px-1">
                <a href={profile.cv.href} download={profile.cv.fileName} className="btn btn-primary">
                  Download CV
                </a>
                <button
                  type="button"
                  onClick={() => story.set({ userPaused: !paused })}
                  aria-pressed={motionOff}
                  disabled={systemReduced}
                  className="btn btn-ghost disabled:opacity-60"
                >
                  {systemReduced ? "Motion reduced (system)" : paused ? "Resume motion" : "Pause motion"}
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
