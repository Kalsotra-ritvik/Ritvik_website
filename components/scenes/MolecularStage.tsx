"use client";

import { useEffect, useRef, useState } from "react";
import { SCENE_LABELS } from "@/lib/story/labels";
import { story } from "@/lib/story/store";
import StaticHelix from "./StaticHelix";

/**
 * Fixed full-viewport WebGL stage behind the page. The engine (and three.js)
 * load in a separate chunk after hydration; until the first frame — or if
 * WebGL is unavailable — a lightweight SVG helix stands in.
 */
export default function MolecularStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"pending" | "ready" | "unavailable">("pending");

  useEffect(() => {
    let disposed = false;
    let engine: { dispose: () => void } | null = null;
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
        engine = new MolecularEngine({
          canvas: canvasRef.current,
          labelsRoot: labelsRef.current,
          profile: detectQuality(),
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
      engine?.dispose();
    };
  }, []);

  return (
    <div
      className="stage"
      role="img"
      aria-label="Animated molecular scene that follows the page: a DNA double helix is transcribed into RNA, the RNA is processed and translated by a ribosome, and the resulting chain folds into the structure of the SGLT2 transporter."
    >
      <div className={`stage-fallback ${status === "ready" ? "is-hidden" : ""}`} aria-hidden="true">
        <StaticHelix />
      </div>
      <canvas ref={canvasRef} className={`stage-canvas ${status === "ready" ? "is-ready" : ""}`} aria-hidden="true" />
      <div ref={labelsRef} className="stage-labels" aria-hidden="true">
        {SCENE_LABELS.map((l) => (
          <div key={l.id} data-label={l.id} className={`scene-label ${l.flip ? "is-flipped" : ""} ${l.text.length <= 2 ? "is-site" : ""}`}>
            <span className="scene-label__dot" />
            <span className="scene-label__line" />
            <span className="scene-label__text">{l.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
