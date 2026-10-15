import * as THREE from "three";
import { createRandom } from "@/lib/science/random";
import { PALETTE, ParticleBuffer, color, createParticleMaterial, disposeObject } from "@/lib/engine/materials";

/** Sparse ambient particles that give the molecular world depth. */
const HEADER = /* glsl */ `attribute float aSeed; uniform float uDrift;`;
const DISPLACE = /* glsl */ `
  p += vec3(sin(uTime * 0.05 + aSeed * 40.0), cos(uTime * 0.04 + aSeed * 23.0), sin(uTime * 0.03 + aSeed * 11.0)) * 0.6 * uDrift;
  a *= 0.55 + 0.45 * sin(uTime * 0.6 + aSeed * 30.0) * uDrift;
`;

export function createDust(bounds: THREE.Box3, count: number) {
  const rng = createRandom(99);
  const buf = new ParticleBuffer({ aSeed: 1 });
  const size = bounds.getSize(new THREE.Vector3());
  const warm = color(PALETTE.node);
  const cool = color(PALETTE.dust);
  for (let i = 0; i < count; i++) {
    const p = new THREE.Vector3(rng.next() * size.x, rng.next() * size.y, rng.next() * size.z).add(bounds.min);
    const n = new THREE.Vector3(rng.normal(), rng.normal(), rng.normal()).normalize();
    buf.push(p, rng.next() < 0.12 ? warm : cool, rng.range(0.03, 0.09), n, rng.range(0.25, 0.6), { aSeed: rng.next() });
  }
  const uniforms = { uDrift: { value: 1 } };
  const material = createParticleMaterial({ style: "glow", header: HEADER, displace: DISPLACE, uniforms, fogNear: 6, fogFar: 40, backAlpha: 1, intensity: 1.2 });
  const points = new THREE.Points(buf.toGeometry(), material);
  points.frustumCulled = false;
  return {
    object: points,
    setDrift(v: number) {
      uniforms.uDrift.value = v;
    },
    dispose() {
      disposeObject(points);
    },
  };
}
