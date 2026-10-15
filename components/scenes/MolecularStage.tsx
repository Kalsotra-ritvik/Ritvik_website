"use client";

import { useEffect, useRef, useState } from "react";
import { SCENE_LABELS } from "@/lib/story/labels";
import { story } from "@/lib/story/store";
import type { Labels, VisualSettings } from "@/lib/content/schema";
import StaticHelix from "./StaticHelix";

/**
 * Fixed full-viewport WebGL stage behind the page. The engine (and three.js)
 * load in a separate chunk after the page has loaded; until the first frame —
 * or if WebGL is unavailable — a lightweight SVG helix stands in.
 */
export default function MolecularStage({ visual, labels }: { visual: VisualSettings; labels: Labels }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<{ dispose: () => void; setVisual: (v: VisualSettings) => void } | null>(null);
  const visualRef = useRef(visual);
  const [status, setStatus] = useState<"pending" | "ready" | "unavailable">("pending");

  useEffect(() => {
    visualRef.current = visual;
    engineRef.current?.setVisual(visual);
  }, [visual]);

  useEffect(() => {
    let disposed = false;
    (async () => {
      // Let the page finish loading and the main thread settle before starting 3D.
      if (document.readyState !== "complete") await new Promise((r) => window.addEventListener("load", r, { once: true }));
      await new Promise<void>((r) => {
        const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
        if (w.requestIdleCallback) w.requestIdleCallback(() => r(), { timeout: 1200 });
        else setTimeout(r, 200);
      });
      if (disposed) return;
      const { hasWebGL, detectQuality } = await import("@/lib/engine/quality");
      if (!hasWebGL()) {
        story.set({ webgl: "unavailable" });
        setStatus("unavailable");
        return;
      }
      try {
        const { MolecularEngine } = await import("@/lib/engine/Engine");
        if (disposed || !canvasRef.current) return;
        engineRef.current = new MolecularEngine({
          canvas: canvasRef.current,
          labelsRoot: labelsRef.current,
          profile: detectQuality(),
          visual: visualRef.current,
          onFailure: () => setStatus("unavailable"),
          onFirstFrame: () => setStatus("ready"),
        });
      } catch (err) {
        console.warn("3D scene disabled:", err);
        story.set({ webgl: "unavailable" });
        setStatus("unavailable");
      }
    })();
    return () => {
      disposed = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const hidden = new Set(visual.showAnnotations ? visual.hiddenAnnotations : SCENE_LABELS.map((l) => l.id));

  return (
    <div
      className="stage"
      role="img"
      aria-label="Animated molecular scene that follows the page: a DNA double helix is transcribed into RNA, the RNA is processed, exported and translated by a ribosome, and the resulting chain folds into the structure of the SGLT2 transporter."
    >
      <div className={`stage-fallback ${status === "ready" ? "is-hidden" : ""}`} aria-hidden="true">
        <StaticHelix />
      </div>
      <canvas ref={canvasRef} className={`stage-canvas ${status === "ready" ? "is-ready" : ""}`} aria-hidden="true" />
      <div ref={labelsRef} className="stage-labels" aria-hidden="true">
        {SCENE_LABELS.filter((l) => !hidden.has(l.id) && labels[l.id]).map((l) => (
          <div key={l.id} data-label={l.id} className={`scene-label ${l.flip ? "is-flipped" : ""} ${l.marker ? "is-site" : ""}`}>
            <span className="scene-label__dot" />
            <span className="scene-label__line" />
            <span className="scene-label__text">{labels[l.id]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
