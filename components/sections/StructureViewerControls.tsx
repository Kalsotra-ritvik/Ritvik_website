"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { story, type ViewerMode } from "@/lib/story/store";

const MODES: { id: ViewerMode; label: string; text: string }[] = [
  { id: "cartoon", label: "Helices", text: "α-helices smoothed into cylinders and coloured from N-terminus (teal) to C-terminus (amber)." },
  { id: "trace", label: "Backbone trace", text: "One bead per resolved Cα atom, joined in sequence order." },
  { id: "site", label: "Binding site", text: "Empagliflozin as bound in the structure; residues with any heavy atom within 4.5 Å of it are highlighted in coral." },
];

const STEP = Math.PI / 12;

export default function StructureViewerControls({ contactCount }: { contactCount: number }) {
  const [mode, setMode] = useState<ViewerMode>("cartoon");
  const [webgl, setWebgl] = useState<"pending" | "ready" | "unavailable">("pending");

  useEffect(
    () =>
      story.subscribe((s) => {
        setMode(s.viewerMode);
        setWebgl(s.webgl);
      }),
    [],
  );

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

  const active = MODES.find((m) => m.id === mode)!;
  const disabled = webgl === "unavailable";

  return (
      <div className="panel p-5 sm:p-6">
        <p className="note uppercase tracking-[0.14em] text-teal-400">Explore the structure</p>
        <div role="radiogroup" aria-label="Representation" className="mt-3 flex flex-wrap gap-1 rounded-full border border-white/10 p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              disabled={disabled}
              onClick={() => story.set({ viewerMode: m.id })}
              className={`min-h-[40px] flex-1 rounded-full px-3 text-sm whitespace-nowrap ${mode === m.id ? "bg-amber-300 text-ink-900" : "text-mist-300 hover:text-mist-100"} disabled:opacity-50`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-3 min-h-[3rem] text-sm leading-relaxed text-mist-200" aria-live="polite">
          {active.text}
          {mode === "site" && ` (${contactCount} residues, computed from the deposited coordinates.)`}
        </p>
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
            onClick={() => story.set({ viewerYaw: 0, viewerPitch: 0, viewerMode: "cartoon" })}
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
    story.set({ viewerYaw: drag.current.yaw + dx, viewerPitch: Math.max(-1.2, Math.min(1.2, drag.current.pitch + (e.pointerType === "mouse" ? dy : 0))) });
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
