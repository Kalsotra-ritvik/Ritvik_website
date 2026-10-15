/**
 * Shared mutable state between the DOM (scroll, controls) and the WebGL engine.
 * The engine reads it every frame; React components subscribe only to the few
 * fields they display, so scrolling never re-renders the React tree.
 */
import type { ChapterId } from "./chapters";
import type { ProteinMode } from "@/lib/content/schema";

export type ViewerMode = ProteinMode;

export interface StoryState {
  /** Target story time from scroll. */
  target: number;
  /** Current chapter id. */
  chapter: ChapterId;
  /** True when the current section is opaque (canvas hidden). */
  covered: boolean;
  /** True when a light section sits under the fixed navigation bar. */
  navOnLight: boolean;
  /** OS-level reduced motion preference OR the user's "pause motion" toggle. */
  reducedMotion: boolean;
  userPaused: boolean;
  viewerMode: ViewerMode;
  /** Extra yaw/pitch the visitor applied to the protein (radians). */
  viewerYaw: number;
  viewerPitch: number;
  webgl: "pending" | "ready" | "unavailable";
  /** Translation read-out, written by the engine. */
  codonIndex: number;
}

type Listener = (s: StoryState) => void;

const state: StoryState = {
  target: 0,
  chapter: "hero",
  covered: false,
  navOnLight: false,
  reducedMotion: false,
  userPaused: false,
  viewerMode: "cartoon",
  viewerYaw: 0,
  viewerPitch: 0,
  webgl: "pending",
  codonIndex: -1,
};

const listeners = new Set<Listener>();

export const story = {
  get: () => state,
  set(patch: Partial<StoryState>) {
    let changed = false;
    for (const key in patch) {
      const k = key as keyof StoryState;
      if (state[k] !== patch[k]) {
        (state as unknown as Record<string, unknown>)[k] = patch[k];
        changed = true;
      }
    }
    if (changed) listeners.forEach((l) => l(state));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  motionReduced: () => state.reducedMotion || state.userPaused,
};
