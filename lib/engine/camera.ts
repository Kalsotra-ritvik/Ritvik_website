import * as THREE from "three";

/**
 * Scroll-driven camera. A shot is a story time with a target and an offset
 * (camera position relative to the target). Both are functions so shots can
 * follow moving molecules. Between shots, targets and offsets are interpolated
 * with Catmull–Rom splines for continuous, composed movement.
 */
export interface Shot {
  t: number;
  target: () => THREE.Vector3;
  offset: () => THREE.Vector3;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function catmull(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, u: number, out: THREE.Vector3) {
  const u2 = u * u;
  const u3 = u2 * u;
  return out
    .set(0, 0, 0)
    .addScaledVector(p0, -0.5 * u3 + u2 - 0.5 * u)
    .addScaledVector(p1, 1.5 * u3 - 2.5 * u2 + 1)
    .addScaledVector(p2, -1.5 * u3 + 2 * u2 + 0.5 * u)
    .addScaledVector(p3, 0.5 * u3 - 0.5 * u2);
}

export class CameraDirector {
  private targets: THREE.Vector3[] = [];
  private offsets: THREE.Vector3[] = [];
  readonly target = new THREE.Vector3();
  readonly position = new THREE.Vector3();
  private readonly tmpO = new THREE.Vector3();

  constructor(private shots: Shot[]) {}

  setShots(shots: Shot[]) {
    this.shots = shots;
  }

  evaluate(t: number) {
    const shots = this.shots;
    this.targets = shots.map((s) => s.target());
    this.offsets = shots.map((s) => s.offset());
    let i = 0;
    while (i < shots.length - 2 && t > shots[i + 1].t) i++;
    const a = shots[i];
    const b = shots[i + 1];
    const raw = THREE.MathUtils.clamp((t - a.t) / (b.t - a.t), 0, 1);
    const u = raw * raw * (3 - 2 * raw); // ease within each segment
    const i0 = Math.max(0, i - 1);
    const i3 = Math.min(shots.length - 1, i + 2);
    catmull(this.targets[i0], this.targets[i], this.targets[i + 1], this.targets[i3], u, this.target);
    catmull(this.offsets[i0], this.offsets[i], this.offsets[i + 1], this.offsets[i3], u, this.tmpO);
    this.position.copy(this.target).add(this.tmpO);
  }
}

/**
 * Responsive framing. Landscape: shift the projection so subjects sit right of
 * centre (text column on the left). Portrait: pull back and raise the subject
 * so text cards below it don't cover the important detail.
 */
export function applyFraming(camera: THREE.PerspectiveCamera, width: number, height: number, shiftX: number) {
  const aspect = width / height;
  camera.aspect = aspect;
  if (aspect >= 1.05) {
    const s = THREE.MathUtils.clamp((aspect - 1.05) / 0.6, 0, 1) * shiftX;
    camera.setViewOffset(width, height, -width * s, 0, width, height);
  } else {
    // Portrait: subject in the upper part of the screen, above bottom-pinned controls.
    camera.setViewOffset(width, height, 0, height * 0.16, width, height);
  }
  camera.updateProjectionMatrix();
}

export function portraitDistanceScale(aspect: number) {
  if (aspect >= 1.05) return 1;
  return THREE.MathUtils.clamp(0.78 / Math.max(aspect, 0.3), 1, 1.75);
}

export { v as vec3 };
