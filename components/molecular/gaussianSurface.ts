/**
 * Gaussian molecular surface computation. Pure and dependency-free (no three.js),
 * so it runs in the standalone surface worker (scripts/build-worker.mjs) or,
 * as a fallback, on the main thread.
 *
 * Sum of isotropic Gaussians (one per point) on a cubic grid, triangulated with
 * marching cubes at `iso`. Colours are density-weighted averages of the points'
 * colours; normals are the negative field gradient (pointing outward).
 */
import { EDGE_TABLE, TRI_TABLE } from "./mcTables";

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

// Corner offsets (dx, dy, dz) in the corner order used by the lookup tables.
const CORNERS = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
];
// Bit for each corner below the iso level (table convention: corners 2/3 and 6/7 swapped).
const CORNER_BIT = [1, 2, 8, 4, 16, 32, 128, 64];
// The two corners joined by each of the 12 cube edges.
const EDGES = [
  [0, 1], [1, 3], [2, 3], [0, 2],
  [4, 5], [5, 7], [6, 7], [4, 6],
  [0, 4], [1, 5], [3, 7], [2, 6],
];

export function computeGaussianSurface({ xyz, rgb, weight, opts }: SurfaceInput): SurfaceArrays {
  const n = weight.length;
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = xyz[i * 3], y = xyz[i * 3 + 1], z = xyz[i * 3 + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  const pad = opts.pad ?? opts.sigma * 3;
  const half = Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2 + pad;
  const ox = (minX + maxX) / 2 - half, oy = (minY + maxY) / 2 - half, oz = (minZ + maxZ) / 2 - half;
  const R = opts.resolution;
  const R2 = R * R;
  const voxel = (2 * half) / R;

  // ---- Density and colour fields ----------------------------------------------------
  const field = new Float32Array(R * R2);
  const palette = new Float32Array(R * R2 * 3);
  const reach = Math.ceil((opts.sigma * 3) / voxel);
  const inv2s2 = 1 / (2 * opts.sigma * opts.sigma);
  for (let i = 0; i < n; i++) {
    const gx = (xyz[i * 3] - ox) / voxel, gy = (xyz[i * 3 + 1] - oy) / voxel, gz = (xyz[i * 3 + 2] - oz) / voxel;
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    const w0 = weight[i];
    const x0 = Math.max(1, Math.floor(gx - reach)), x1 = Math.min(R - 2, Math.ceil(gx + reach));
    const y0 = Math.max(1, Math.floor(gy - reach)), y1 = Math.min(R - 2, Math.ceil(gy + reach));
    const z0 = Math.max(1, Math.floor(gz - reach)), z1 = Math.min(R - 2, Math.ceil(gz + reach));
    for (let z = z0; z <= z1; z++) {
      const dz = (z - gz) * voxel;
      for (let y = y0; y <= y1; y++) {
        const dy = (y - gy) * voxel;
        const row = R2 * z + R * y;
        for (let x = x0; x <= x1; x++) {
          const dx = (x - gx) * voxel;
          const v = w0 * Math.exp(-(dx * dx + dy * dy + dz * dz) * inv2s2);
          if (v < 1e-4) continue;
          const q = row + x;
          field[q] += v;
          palette[q * 3] += r * v;
          palette[q * 3 + 1] += g * v;
          palette[q * 3 + 2] += b * v;
        }
      }
    }
  }
  for (let q = 0; q < field.length; q++) {
    const w = field[q];
    if (w > 0) {
      palette[q * 3] /= w;
      palette[q * 3 + 1] /= w;
      palette[q * 3 + 2] /= w;
    }
  }

  // ---- Marching cubes ---------------------------------------------------------------
  const iso = opts.iso;
  const pos: number[] = [], nor: number[] = [], col: number[] = [];
  const vp = new Float32Array(36), vn = new Float32Array(36), vc = new Float32Array(36);
  const cq = new Int32Array(8);
  const cf = new Float32Array(8);
  const grad = (q: number, k: number) =>
    k === 0 ? field[q - 1] - field[q + 1] : k === 1 ? field[q - R] - field[q + R] : field[q - R2] - field[q + R2];

  for (let z = 1; z < R - 2; z++) {
    for (let y = 1; y < R - 2; y++) {
      for (let x = 1; x < R - 2; x++) {
        let cube = 0;
        for (let c = 0; c < 8; c++) {
          const [dx, dy, dz] = CORNERS[c];
          const q = (z + dz) * R2 + (y + dy) * R + (x + dx);
          cq[c] = q;
          cf[c] = field[q];
          if (cf[c] < iso) cube |= CORNER_BIT[c];
        }
        const bits = EDGE_TABLE[cube];
        if (bits === 0) continue;
        for (let e = 0; e < 12; e++) {
          if (!(bits & (1 << e))) continue;
          const [a, b] = EDGES[e];
          const fa = cf[a], fb = cf[b];
          const mu = fb === fa ? 0.5 : (iso - fa) / (fb - fa);
          const A = CORNERS[a], B = CORNERS[b];
          const o = e * 3;
          vp[o] = ox + (x + A[0] + (B[0] - A[0]) * mu) * voxel;
          vp[o + 1] = oy + (y + A[1] + (B[1] - A[1]) * mu) * voxel;
          vp[o + 2] = oz + (z + A[2] + (B[2] - A[2]) * mu) * voxel;
          const qa = cq[a], qb = cq[b];
          for (let k = 0; k < 3; k++) {
            vn[o + k] = grad(qa, k) + (grad(qb, k) - grad(qa, k)) * mu;
            vc[o + k] = palette[qa * 3 + k] + (palette[qb * 3 + k] - palette[qa * 3 + k]) * mu;
          }
        }
        const t0 = cube << 4;
        for (let i = 0; TRI_TABLE[t0 + i] !== -1; i += 3) {
          for (let j = 0; j < 3; j++) {
            const o = TRI_TABLE[t0 + i + j] * 3;
            pos.push(vp[o], vp[o + 1], vp[o + 2]);
            const l = Math.hypot(vn[o], vn[o + 1], vn[o + 2]) || 1;
            nor.push(vn[o] / l, vn[o + 1] / l, vn[o + 2] / l);
            col.push(vc[o], vc[o + 1], vc[o + 2]);
          }
        }
      }
    }
  }
  return { position: new Float32Array(pos), normal: new Float32Array(nor), color: new Float32Array(col) };
}
