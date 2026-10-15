export type Quality = "high" | "low";

export interface QualityProfile {
  quality: Quality;
  maxPixelRatio: number;
  minPixelRatio: number;
  dust: number;
}

/** Pick a rendering budget from coarse device signals; refined at runtime by frame timing. */
export function detectQuality(): QualityProfile {
  if (typeof window === "undefined") return { quality: "low", maxPixelRatio: 1, minPixelRatio: 1, dust: 300 };
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const low = (coarse && small) || cores < 4 || memory < 4;
  return low
    ? { quality: "low", maxPixelRatio: 1.5, minPixelRatio: 0.85, dust: 320 }
    : { quality: "high", maxPixelRatio: 2, minPixelRatio: 1, dust: 900 };
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
