import * as THREE from "three";
import { assetUrl } from "@/lib/assets";
import { computeGaussianSurface, type SurfaceArrays, type SurfaceInput, type SurfaceOptions } from "./gaussianSurface";

export type { SurfaceOptions } from "./gaussianSurface";

/**
 * Mesh builders for structural representations (cartoon ribbons, tubes,
 * ball-and-stick and Gaussian molecular surfaces). Inputs are positions in
 * world units; colours are given in sRGB and converted to linear here, because
 * the built-in physically based materials work in linear colour space.
 */

export function linear(hex: number | THREE.Color): THREE.Color {
  const c = hex instanceof THREE.Color ? hex.clone() : new THREE.Color().setHex(hex);
  return c.convertSRGBToLinear();
}

export interface RibbonResidue {
  p: THREE.Vector3;
  helix: boolean;
  color: THREE.Color; // sRGB
}

export interface RibbonOptions {
  samplesPerResidue: number;
  sides: number;
  coilRadius: number;
  helixHalfWidth: number;
  helixHalfThickness: number;
}

/**
 * Cartoon ribbon for one contiguous chain segment, from Cα positions only.
 *
 * Helices are drawn as flat bands whose broad face points away from the helix
 * axis (normal = local Cα curvature vector), the usual cartoon convention for
 * Cα-only models. Coils are round tubes framed by parallel transport.
 */
export function ribbonGeometry(res: RibbonResidue[], o: RibbonOptions): THREE.BufferGeometry | null {
  const n = res.length;
  if (n < 2) return null;
  const pts = res.map((r) => r.p);
  // Extend the end points so the spline does not overshoot at the termini.
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
  const S = (n - 1) * o.samplesPerResidue + 1;

  // Per-residue curvature normal (points toward the helix axis); used for helices.
  const curv = pts.map((p, i) => {
    if (i === 0 || i === n - 1) return null;
    const v = pts[i - 1].clone().sub(p).add(pts[i + 1].clone().sub(p));
    return v.lengthSq() > 1e-8 ? v.normalize() : null;
  });
  for (let i = 0; i < n; i++) if (!curv[i]) curv[i] = (curv[i + 1] ?? curv[i - 1] ?? new THREE.Vector3(1, 0, 0)).clone();
  // Helix weight per residue, softened over one residue so bands taper into tubes.
  const hw = res.map((r) => (r.helix ? 1 : 0));
  const soft = hw.map((h, i) => (h ? Math.min(1, 0.5 + 0.25 * ((hw[i - 1] ?? 0) + (hw[i + 1] ?? 0))) : 0));

  const centers: THREE.Vector3[] = [];
  const tangents: THREE.Vector3[] = [];
  for (let s = 0; s < S; s++) {
    const u = s / (S - 1);
    centers.push(curve.getPoint(u));
    tangents.push(curve.getTangent(u).normalize());
  }
  // Parallel-transport frame for coils.
  const pt: THREE.Vector3[] = [];
  let ref = new THREE.Vector3(0, 0, 1);
  if (Math.abs(ref.dot(tangents[0])) > 0.9) ref = new THREE.Vector3(1, 0, 0);
  pt.push(ref.clone().sub(tangents[0].clone().multiplyScalar(ref.dot(tangents[0]))).normalize());
  for (let s = 1; s < S; s++) {
    const prev = pt[s - 1];
    const t = tangents[s];
    const v = prev.clone().sub(t.clone().multiplyScalar(prev.dot(t)));
    pt.push(v.lengthSq() > 1e-10 ? v.normalize() : prev.clone());
  }

  const sides = o.sides;
  const vertCount = S * (sides + 1);
  const pos = new Float32Array(vertCount * 3);
  const nor = new Float32Array(vertCount * 3);
  const col = new Float32Array(vertCount * 3);
  const N = new THREE.Vector3(), B = new THREE.Vector3(), cn = new THREE.Vector3(), d = new THREE.Vector3(), nn = new THREE.Vector3();
  const c = new THREE.Color();
  let prevN: THREE.Vector3 | null = null;
  for (let s = 0; s < S; s++) {
    const x = s / o.samplesPerResidue;
    const i = Math.min(n - 2, Math.floor(x));
    const f = x - i;
    const h = THREE.MathUtils.smoothstep(soft[i] + (soft[i + 1] - soft[i]) * f, 0, 1);
    const T = tangents[s];
    cn.copy(curv[i]!).lerp(curv[i + 1]!, f);
    cn.sub(d.copy(T).multiplyScalar(cn.dot(T)));
    if (cn.lengthSq() < 1e-8) cn.copy(pt[s]);
    cn.normalize();
    N.copy(pt[s]).lerp(cn, h);
    N.sub(d.copy(T).multiplyScalar(N.dot(T)));
    if (N.lengthSq() < 1e-8) N.copy(pt[s]);
    N.normalize();
    // Avoid sudden half-turns of the band between consecutive samples.
    if (prevN && N.dot(prevN) < 0 && h > 0.5) N.negate();
    prevN = N.clone();
    B.crossVectors(T, N).normalize();
    const w = THREE.MathUtils.lerp(o.coilRadius, o.helixHalfWidth, h);
    const th = THREE.MathUtils.lerp(o.coilRadius, o.helixHalfThickness, h);
    c.copy(res[i].color).lerp(res[i + 1].color, f).convertSRGBToLinear();
    for (let k = 0; k <= sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const idx = (s * (sides + 1) + k) * 3;
      d.copy(B).multiplyScalar(w * ca).addScaledVector(N, th * sa).add(centers[s]);
      pos[idx] = d.x; pos[idx + 1] = d.y; pos[idx + 2] = d.z;
      nn.copy(B).multiplyScalar(ca / w).addScaledVector(N, sa / th).normalize();
      nor[idx] = nn.x; nor[idx + 1] = nn.y; nor[idx + 2] = nn.z;
      col[idx] = c.r; col[idx + 1] = c.g; col[idx + 2] = c.b;
    }
  }
  const index: number[] = [];
  for (let s = 0; s < S - 1; s++) {
    for (let k = 0; k < sides; k++) {
      const a = s * (sides + 1) + k;
      const b = a + sides + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setIndex(index);
  return g;
}

/** Merge several indexed geometries with identical attributes into one. */
export function mergeGeometries(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const names = Object.keys(list[0].attributes);
  const total = list.reduce((n, g) => n + g.attributes.position.count, 0);
  const out = new THREE.BufferGeometry();
  for (const name of names) {
    const size = list[0].attributes[name].itemSize;
    const arr = new Float32Array(total * size);
    let off = 0;
    for (const g of list) {
      arr.set(g.attributes[name].array as Float32Array, off * size);
      off += g.attributes[name].count;
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  const idx: number[] = [];
  let base = 0;
  for (const g of list) {
    const gi = g.index!.array;
    for (let i = 0; i < gi.length; i++) idx.push(gi[i] + base);
    base += g.attributes.position.count;
  }
  out.setIndex(idx);
  list.forEach((g) => g.dispose());
  return out;
}

export interface Atom {
  p: THREE.Vector3;
  color: THREE.Color; // sRGB
  radius: number;
}

/** Instanced spheres (atoms, Cα beads). */
export function sphereInstances(atoms: Atom[], material: THREE.Material, detail = 2): THREE.InstancedMesh {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const mesh = new THREE.InstancedMesh(geo, material, atoms.length);
  const m = new THREE.Matrix4();
  atoms.forEach((a, i) => {
    m.makeScale(a.radius, a.radius, a.radius).setPosition(a.p);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, linear(a.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/** Instanced cylinders for bonds; each bond is split in two halves coloured by its atoms. */
export function bondInstances(atoms: Atom[], bonds: [number, number][], radius: number, material: THREE.Material): THREE.InstancedMesh {
  const geo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
  geo.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, material, bonds.length * 2);
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const m = new THREE.Matrix4();
  const dir = new THREE.Vector3();
  const mid = new THREE.Vector3();
  let k = 0;
  for (const [i, j] of bonds) {
    const a = atoms[i].p, b = atoms[j].p;
    mid.copy(a).add(b).multiplyScalar(0.5);
    for (const [from, to, atom] of [
      [a, mid, atoms[i]],
      [b, mid, atoms[j]],
    ] as const) {
      dir.copy(to).sub(from);
      const len = dir.length();
      q.setFromUnitVectors(up, dir.normalize());
      m.compose(from, q, new THREE.Vector3(radius, len, radius));
      mesh.setMatrixAt(k, m);
      mesh.setColorAt(k, linear(atom.color));
      k++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

export interface DensityPoint {
  p: THREE.Vector3;
  color: THREE.Color; // sRGB
  weight?: number;
}

export function packPoints(points: DensityPoint[], opts: SurfaceOptions): SurfaceInput {
  const n = points.length;
  const xyz = new Float32Array(n * 3), rgb = new Float32Array(n * 3), weight = new Float32Array(n);
  const lin = new THREE.Color();
  points.forEach((pt, i) => {
    xyz.set([pt.p.x, pt.p.y, pt.p.z], i * 3);
    lin.copy(pt.color).convertSRGBToLinear();
    rgb.set([lin.r, lin.g, lin.b], i * 3);
    weight[i] = pt.weight ?? 1;
  });
  return { xyz, rgb, weight, opts };
}

export function surfaceGeometry(a: SurfaceArrays): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(a.position, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(a.normal, 3));
  g.setAttribute("color", new THREE.BufferAttribute(a.color, 3));
  return g;
}

let worker: Worker | null = null;
let workerBroken = false;
let nextJob = 0;
const jobs = new Map<number, { resolve: (a: SurfaceArrays) => void; reject: (e: Error) => void }>();

/**
 * Build a Gaussian surface off the main thread when workers are available
 * (falls back to computing in an idle slice otherwise).
 */
/** Main-thread fallback, run after a short delay so it does not block the current frame. */
function computeLater(input: SurfaceInput): Promise<SurfaceArrays> {
  return new Promise((resolve) => setTimeout(() => resolve(computeGaussianSurface(input)), 50));
}

export function gaussianSurfaceAsync(points: DensityPoint[], opts: SurfaceOptions): Promise<THREE.BufferGeometry> {
  const input = packPoints(points, opts);
  if (typeof Worker === "undefined" || workerBroken) return computeLater(input).then(surfaceGeometry);
  if (!worker) {
    try {
      worker = new Worker(assetUrl("/workers/surface-worker.js"));
      worker.onmessage = (e: MessageEvent<{ id: number; result?: SurfaceArrays; error?: string }>) => {
        const job = jobs.get(e.data.id);
        if (!job) return;
        jobs.delete(e.data.id);
        if (e.data.result) job.resolve(e.data.result);
        else job.reject(new Error(e.data.error ?? "Surface worker failed"));
      };
      // If the worker cannot load (e.g. a host that blocks it), compute on the main thread instead.
      worker.onerror = () => {
        workerBroken = true;
        worker = null;
        for (const job of jobs.values()) job.reject(new Error("Surface worker failed"));
        jobs.clear();
      };
    } catch {
      workerBroken = true;
      return computeLater(input).then(surfaceGeometry);
    }
  }
  const id = nextJob++;
  // Keep a copy: the worker receives the buffers by transfer.
  const fallback: SurfaceInput = { xyz: input.xyz.slice(), rgb: input.rgb.slice(), weight: input.weight.slice(), opts };
  return new Promise<SurfaceArrays>((resolve, reject) => {
    jobs.set(id, { resolve, reject });
    worker!.postMessage({ id, input }, [input.xyz.buffer, input.rgb.buffer, input.weight.buffer]);
  })
    .catch(() => computeLater(fallback))
    .then(surfaceGeometry);
}

/** Rendering cost tier for mesh materials (set by the engine from the device profile). */
let materialTier: "high" | "low" = "high";
export function setMaterialTier(tier: "high" | "low") {
  materialTier = tier;
}

/**
 * Physically based material used by every structural mesh. High tier adds a
 * clear-coat layer; low tier uses the cheaper standard model.
 */
export function moleculeMaterial(opts: { roughness?: number; clearcoat?: number; color?: number; vertexColors?: boolean; side?: THREE.Side } = {}): THREE.MeshStandardMaterial {
  const base = {
    color: opts.color != null ? linear(opts.color) : new THREE.Color(0xffffff),
    vertexColors: opts.vertexColors ?? true,
    roughness: opts.roughness ?? 0.42,
    metalness: 0,
    side: opts.side ?? THREE.FrontSide,
  };
  if (materialTier === "low") return new THREE.MeshStandardMaterial(base);
  return new THREE.MeshPhysicalMaterial({ ...base, clearcoat: opts.clearcoat ?? 0.3, clearcoatRoughness: 0.35 });
}

/**
 * Set the fade of a mesh material; hides the object when fully transparent.
 * Fully opaque meshes render in the opaque pass; partially faded ones blend
 * (and stop writing depth once mostly transparent so they don't hide what is behind).
 */
export function setFade(obj: THREE.Object3D, material: THREE.Material, opacity: number) {
  material.opacity = opacity;
  material.transparent = opacity < 0.999;
  material.depthWrite = opacity > 0.6;
  obj.visible = opacity > 0.01;
}
