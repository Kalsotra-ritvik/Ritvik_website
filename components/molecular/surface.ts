import * as THREE from "three";
import { createRandom } from "@/lib/science/random";
import { ParticleBuffer, color, createParticleMaterial, disposeObject } from "@/lib/engine/materials";

/**
 * Schematic macromolecular surfaces drawn as a lumpy shell of lit beads
 * (a Goodsell-like look). Used for RNA polymerase, ribosomal subunits and the
 * nuclear pore complex. These are schematic shapes, not atomic models.
 */
export interface SurfaceOptions {
  radii: [number, number, number];
  count: number;
  beadSize: number;
  color: number;
  seed: number;
  lumps?: number;
  lumpiness?: number;
  /** Return true to drop a bead (channels, tunnels, clefts). */
  exclude?: (p: THREE.Vector3) => boolean;
  cutaway?: number;
  fogNear?: number;
  fogFar?: number;
}

const HEADER = /* glsl */ `
attribute float aSeed;
uniform float uAssemble;
`;
const DISPLACE = /* glsl */ `
  float k = clamp(uAssemble * 1.4 - aSeed * 0.4, 0.0, 1.0);
  float e = 1.0 - k;
  p += n * e * e * (1.5 + aSeed * 3.5);
  s *= mix(0.35, 1.0, k);
  a *= k;
`;

export function createSurface(opts: SurfaceOptions) {
  const rng = createRandom(opts.seed);
  const buf = new ParticleBuffer({ aSeed: 1 });
  const lumps = Array.from({ length: opts.lumps ?? 9 }, () => ({
    dir: new THREE.Vector3(rng.normal(), rng.normal(), rng.normal()).normalize(),
    amp: rng.range(-0.5, 1) * (opts.lumpiness ?? 0.16),
    width: rng.range(0.25, 0.6),
  }));
  const base = color(opts.color);
  const c = new THREE.Color();
  const dir = new THREE.Vector3();
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < opts.count; i++) {
    const y = 1 - (2 * (i + 0.5)) / opts.count;
    const r = Math.sqrt(1 - y * y);
    const phi = i * golden + rng.range(-0.08, 0.08);
    dir.set(Math.cos(phi) * r, y, Math.sin(phi) * r);
    let scale = 1;
    for (const l of lumps) {
      const ang = Math.acos(Math.min(1, Math.max(-1, dir.dot(l.dir))));
      scale += l.amp * Math.exp(-(ang * ang) / (l.width * l.width));
    }
    scale *= rng.range(0.96, 1.04);
    const p = new THREE.Vector3(dir.x * opts.radii[0], dir.y * opts.radii[1], dir.z * opts.radii[2]).multiplyScalar(scale);
    if (opts.exclude?.(p)) continue;
    const normal = new THREE.Vector3(
      dir.x / opts.radii[0],
      dir.y / opts.radii[1],
      dir.z / opts.radii[2],
    ).normalize();
    c.copy(base).multiplyScalar(rng.range(0.85, 1.1));
    buf.push(p, c, opts.beadSize * rng.range(0.85, 1.2), normal, 1, { aSeed: rng.next() });
  }

  const uniforms = { uAssemble: { value: 1 } };
  const material = createParticleMaterial({
    style: "bead",
    header: HEADER,
    displace: DISPLACE,
    uniforms,
    cutaway: opts.cutaway ?? 0,
    fogNear: opts.fogNear ?? 10,
    fogFar: opts.fogFar ?? 36,
  });
  material.uniforms.uRimColor.value = new THREE.Color(0xf3d9b1);
  const points = new THREE.Points(buf.toGeometry(), material);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);

  return {
    group,
    material,
    count: buf.count,
    set(assemble: number, opacity = 1) {
      uniforms.uAssemble.value = assemble;
      material.uniforms.uOpacity.value = opacity;
      group.visible = assemble > 0.001 && opacity > 0.001;
    },
    dispose() {
      disposeObject(group);
    },
  };
}

export type Surface = ReturnType<typeof createSurface>;
