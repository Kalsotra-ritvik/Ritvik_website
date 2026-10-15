"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { story } from "@/lib/story/store";
import type { ProteinMode } from "@/lib/content/schema";

const LABELS: Record<ProteinMode, string> = {
  cartoon: "Cartoon",
  trace: "Backbone",
  surface: "Surface",
  beads: "Beads",
  site: "Binding site",
};
const ORDER: ProteinMode[] = ["cartoon", "trace", "surface", "beads", "site"];
const STEP = Math.PI / 12;

export default function StructureViewerControls({
  title,
  modes,
  defaultMode,
  contactCount,
  interactive,
}: {
  title: string;
  modes: Record<ProteinMode, string>;
  defaultMode: ProteinMode;
  contactCount: number;
  interactive: boolean;
}) {
  const [mode, setMode] = useState<ProteinMode>(defaultMode);
  const [webgl, setWebgl] = useState<"pending" | "ready" | "unavailable">("pending");

  useEffect(() => {
    story.set({ viewerMode: defaultMode });
    return story.subscribe((s) => {
      setMode(s.viewerMode);
      setWebgl(s.webgl);
    });
  }, [defaultMode]);

  const rotate = (dYaw: number, dPitch = 0) => {
    const s = story.get();
    story.set({ viewerYaw: s.viewerYaw + dYaw, viewerPitch: Math.max(-1.2, Math.min(1.2, s.viewerPitch + dPitch)) });
  };

  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, [number, number]> = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] };
    const d = map[e.key];
    if (d) {
      e.preventDefault();
      rotate(d[0], d[1]);
    }
  };

  const disabled = webgl === "unavailable";

  return (
    <div className="panel p-5 sm:p-6">
      <p className="note uppercase tracking-[0.14em] text-teal-400">{title}</p>
      <div role="radiogroup" aria-label="Representation" className="mt-3 grid grid-cols-3 gap-1 rounded-2xl border border-white/10 p-1 sm:grid-cols-5">
        {ORDER.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            disabled={disabled}
            onClick={() => story.set({ viewerMode: m })}
            className={`min-h-[40px] rounded-xl px-2 text-sm whitespace-nowrap ${mode === m ? "bg-amber-300 text-ink-900" : "text-mist-300 hover:text-mist-100"} disabled:opacity-50`}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>
      <p className="mt-3 min-h-[4.5rem] text-sm leading-relaxed text-mist-200" aria-live="polite">
        {modes[mode]}
        {mode === "site" && ` (${contactCount} residues, computed from the deposited coordinates.)`}
      </p>
      {interactive && (
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Rotate the model">
          <button type="button" className="btn btn-ghost !min-h-[40px] !px-3 text-sm" onClick={() => rotate(-STEP)} disabled={disabled} aria-label="Rotate left">
            ←
          </button>
          <button type="button" className="btn btn-ghost !min-h-[40px] !px-3 text-sm" onClick={() => rotate(STEP)} disabled={disabled} aria-label="Rotate right">
            →
          </button>
          <button
            type="button"
            className="btn btn-ghost !min-h-[40px] !px-3 text-sm"
            onClick={() => story.set({ viewerYaw: 0, viewerPitch: 0, viewerMode: defaultMode })}
            disabled={disabled}
          >
            Reset
          </button>
          <span
            tabIndex={disabled ? -1 : 0}
            onKeyDown={onKey}
            className="note ml-auto rounded-md border border-dashed border-white/15 px-2 py-1.5"
            aria-label="Focus here and use the arrow keys to rotate the model"
          >
            Focus + arrow keys · drag on desktop
          </span>
        </div>
      )}
      {disabled && <p className="note mt-3">3D is unavailable in this browser; the structure details are listed in text below.</p>}
    </div>
  );
}

/** Drag-to-rotate surface over the right half of the section, where the protein is framed (mouse/pen; touch keeps scrolling). */
export function ViewerDragSurface() {
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const [webgl, setWebgl] = useState<"pending" | "ready" | "unavailable">("pending");
  useEffect(() => story.subscribe((s) => setWebgl(s.webgl)), []);
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const s = story.get();
    drag.current = { x: e.clientX, y: e.clientY, yaw: s.viewerYaw, pitch: s.viewerPitch };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dx = (e.clientX - drag.current.x) / 180;
    const dy = (e.clientY - drag.current.y) / 220;
    story.set({ viewerYaw: drag.current.yaw + dx, viewerPitch: Math.max(-1.2, Math.min(1.2, drag.current.pitch + dy)) });
  };
  const onUp = () => {
    drag.current = null;
  };

  if (webgl !== "ready") return null;
  return (
    <div
      className="drag-surface absolute inset-y-0 right-0 z-0 hidden w-[50%] md:block"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-hidden="true"
    />
  );
}
