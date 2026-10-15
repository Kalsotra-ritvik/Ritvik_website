/**
 * Gaussian molecular surface computation (pure; runs in surfaceWorker.ts or,
 * as a fallback, on the main thread). Kept separate from meshes.ts so the
 * worker bundle does not include the code that starts the worker.
 */
import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";

export interface SurfaceOptions {
  sigma: number;
  iso: number;
  resolution: number;
  pad?: number;
}

/** Flat inputs for the surface builder (transferable to a worker). Colours are linear RGB. */
export interface SurfaceInput {
  xyz: Float32Array;
  rgb: Float32Array;
  weight: Float32Array;
  opts: SurfaceOptions;
}

export interface SurfaceArrays {
  position: Float32Array;
  normal: Float32Array;
  color: Float32Array;
}

/**
 * Gaussian molecular surface: sum of isotropic Gaussians (one per point) on a
 * cubic grid, triangulated with marching cubes at `iso`. Pure computation, so
 * it can run in a worker (see surfaceWorker.ts).
 */
export function computeGaussianSurface({ xyz, rgb, weight, opts }: SurfaceInput): SurfaceArrays {
  const n = weight.length;
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = xyz[i * 3], y = xyz[i * 3 + 1], z = xyz[i * 3 + 2];
    if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
  }
  const pad = opts.pad ?? opts.sigma * 3;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
  const half = Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2 + pad;
  const R = opts.resolution;
  const mc = new MarchingCubes(R, new THREE.MeshBasicMaterial(), false, true, 400000);
  const field = mc.field as Float32Array;
  const palette = mc.palette as Float32Array;
  const weightSum = new Float32Array(R * R * R);
  const voxel = (2 * half) / R;
  const reach = Math.ceil((opts.sigma * 3) / voxel);
  const inv2s2 = 1 / (2 * opts.sigma * opts.sigma);
  // Grid point (x,y,z) sits at centre + ((x − R/2) / (R/2)) · half (MarchingCubes convention).
  const toGrid = (v: number, c: number) => ((v - c) / half) * (R / 2) + R / 2;
  for (let i = 0; i < n; i++) {
    const gx = toGrid(xyz[i * 3], cx), gy = toGrid(xyz[i * 3 + 1], cy), gz = toGrid(xyz[i * 3 + 2], cz);
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    const w0 = weight[i];
    const x0 = Math.max(1, Math.floor(gx - reach)), x1 = Math.min(R - 2, Math.ceil(gx + reach));
    const y0 = Math.max(1, Math.floor(gy - reach)), y1 = Math.min(R - 2, Math.ceil(gy + reach));
    const z0 = Math.max(1, Math.floor(gz - reach)), z1 = Math.min(R - 2, Math.ceil(gz + reach));
    for (let z = z0; z <= z1; z++) {
      const dz = (z - gz) * voxel;
      for (let y = y0; y <= y1; y++) {
        const dy = (y - gy) * voxel;
        const row = R * R * z + R * y;
        for (let x = x0; x <= x1; x++) {
          const dx = (x - gx) * voxel;
          const v = w0 * Math.exp(-(dx * dx + dy * dy + dz * dz) * inv2s2);
          if (v < 1e-4) continue;
          const q = row + x;
          field[q] += v;
          weightSum[q] += v;
          palette[q * 3] += r * v;
          palette[q * 3 + 1] += g * v;
          palette[q * 3 + 2] += b * v;
        }
      }
    }
  }
  for (let q = 0; q < weightSum.length; q++) {
    const w = weightSum[q];
    if (w > 0) {
      palette[q * 3] /= w;
      palette[q * 3 + 1] /= w;
      palette[q * 3 + 2] /= w;
    }
  }
  mc.isolation = opts.iso;
  mc.update();
  const count = mc.count;
  const posSrc = mc.positionArray as Float32Array;
  const norSrc = mc.normalArray as Float32Array;
  const colSrc = mc.colorArray as Float32Array;
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const color = colSrc.slice(0, count * 3);
  for (let i = 0; i < count * 3; i += 3) {
    position[i] = posSrc[i] * half + cx;
    position[i + 1] = posSrc[i + 1] * half + cy;
    position[i + 2] = posSrc[i + 2] * half + cz;
    // MarchingCubes normals are the negative field gradient, i.e. they already point outward.
    const l = Math.hypot(norSrc[i], norSrc[i + 1], norSrc[i + 2]) || 1;
    normal[i] = norSrc[i] / l;
    normal[i + 1] = norSrc[i + 1] / l;
    normal[i + 2] = norSrc[i + 2] / l;
  }
  mc.geometry.dispose();
  (mc.material as THREE.Material).dispose();
  return { position, normal, color };
}

