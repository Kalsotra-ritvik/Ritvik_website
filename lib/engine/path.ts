import * as THREE from "three";

/**
 * Arc-length parameterised path through control points (centripetal Catmull–Rom),
 * pre-sampled so `at(s)` is O(1). Beyond either end the path is extended along
 * the end tangent, so callers can safely ask for positions off the curve.
 */
export class PathSampler {
  readonly length: number;
  private readonly pts: THREE.Vector3[];
  private readonly step: number;

  constructor(points: THREE.Vector3[], samples = 400) {
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    this.pts = curve.getSpacedPoints(samples);
    this.length = curve.getLength();
    this.step = this.length / samples;
  }

  at(s: number, out = new THREE.Vector3()): THREE.Vector3 {
    const n = this.pts.length - 1;
    if (s <= 0) {
      const t = this.pts[1].clone().sub(this.pts[0]).normalize();
      return out.copy(this.pts[0]).addScaledVector(t, s);
    }
    if (s >= this.length) {
      const t = this.pts[n].clone().sub(this.pts[n - 1]).normalize();
      return out.copy(this.pts[n]).addScaledVector(t, s - this.length);
    }
    const x = s / this.step;
    const i = Math.floor(x);
    return out.copy(this.pts[i]).lerp(this.pts[Math.min(n, i + 1)], x - i);
  }
}

/** Seeded smooth random walk with soft attraction to a centre: a random-coil-like path. */
export function randomCoilPath(
  start: THREE.Vector3,
  initialDir: THREE.Vector3,
  center: THREE.Vector3,
  length: number,
  rng: { normal: () => number },
  opts: { step?: number; persistence?: number; pull?: number; radius?: number } = {},
): THREE.Vector3[] {
  const step = opts.step ?? 0.6;
  const persistence = opts.persistence ?? 0.82;
  const pull = opts.pull ?? 0.06;
  const radius = opts.radius ?? 7;
  const pts = [start.clone()];
  const dir = initialDir.clone().normalize();
  const p = start.clone();
  const noise = new THREE.Vector3();
  const toC = new THREE.Vector3();
  let travelled = 0;
  while (travelled < length) {
    noise.set(rng.normal(), rng.normal(), rng.normal()).multiplyScalar(1 - persistence);
    toC.subVectors(center, p);
    const d = toC.length();
    const attraction = d > radius ? pull * 2.5 : pull * (d / radius);
    dir.multiplyScalar(persistence).add(noise).addScaledVector(toC.normalize(), attraction).normalize();
    p.addScaledVector(dir, step);
    pts.push(p.clone());
    travelled += step;
  }
  return pts;
}
