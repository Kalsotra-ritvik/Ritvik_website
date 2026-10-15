/// <reference lib="webworker" />
/**
 * Computes Gaussian molecular surfaces off the main thread (see meshes.ts).
 * Bundled separately by scripts/build-worker.mjs into public/workers/.
 */
import { computeGaussianSurface, type SurfaceInput } from "./gaussianSurface";

self.onmessage = (e: MessageEvent<{ id: number; input: SurfaceInput }>) => {
  const { id, input } = e.data;
  try {
    const result = computeGaussianSurface(input);
    (self as unknown as Worker).postMessage({ id, result }, [result.position.buffer, result.normal.buffer, result.color.buffer]);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: (err as Error).message });
  }
};
