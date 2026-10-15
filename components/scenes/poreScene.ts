import * as THREE from "three";
import { createRandom } from "@/lib/science/random";
import { PALETTE, ParticleBuffer, color, createParticleMaterial, disposeObject } from "@/lib/engine/materials";
import type { World } from "./world";

/**
 * Nuclear envelope (inner and outer membranes, fused at the pore rim) with a
 * schematic nuclear pore complex showing its eight-fold rotational symmetry.
 * Mature mRNA is exported through the central channel.
 */
export function createPoreScene(world: World, quality: "high" | "low") {
  const rng = createRandom(77);
  const buf = new ParticleBuffer();
  const high = quality === "high";
  const membrane = color(PALETTE.envelope);
  const pore = color(PALETTE.pore);
  const rim = 2.4;
  const outer = 6;
  const n = high ? 2400 : 1000;
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n;
      const r = Math.sqrt(rim * rim + f * (outer * outer - rim * rim));
      const a = i * golden;
      // Membranes curve toward each other and fuse at the pore rim.
      const sep = 0.45 * Math.min(1, Math.sqrt(Math.max(0, (r - rim) / 0.9)));
      const y = side * (0.08 + sep);
      const fade = 1 - THREE.MathUtils.smoothstep(r, outer * 0.55, outer);
      buf.push(
        [Math.cos(a) * r, y + rng.range(-0.03, 0.03), Math.sin(a) * r],
        membrane.clone().multiplyScalar(rng.range(0.85, 1.1)),
        high ? 0.15 : 0.21,
        [0, side, 0],
        fade,
      );
    }
  }
  // Eight spokes plus cytoplasmic and nuclear rings.
  for (let s = 0; s < 8; s++) {
    const a = (s / 8) * Math.PI * 2;
    const cx = Math.cos(a) * 1.75;
    const cz = Math.sin(a) * 1.75;
    const beads = high ? 90 : 40;
    for (let i = 0; i < beads; i++) {
      const d = new THREE.Vector3(rng.normal(), rng.normal() * 1.4, rng.normal()).multiplyScalar(0.32);
      buf.push([cx + d.x, d.y, cz + d.z], pore.clone().multiplyScalar(rng.range(0.85, 1.15)), 0.24, d.clone().normalize(), 1);
    }
  }
  for (const y of [-0.62, 0.62]) {
    const ringBeads = high ? 120 : 60;
    for (let i = 0; i < ringBeads; i++) {
      const a = (i / ringBeads) * Math.PI * 2;
      const r = 1.95 + rng.range(-0.12, 0.12);
      buf.push([Math.cos(a) * r, y + rng.range(-0.08, 0.08), Math.sin(a) * r], pore.clone().multiplyScalar(1.1), 0.2, [Math.cos(a), y, Math.sin(a)], 1);
    }
  }

  const material = createParticleMaterial({ style: "bead", fogNear: 8, fogFar: 30 });
  const points = new THREE.Points(buf.toGeometry(), material);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.position.copy(world.NPC);
  group.add(points);

  return {
    group,
    update(opacity: number) {
      material.uniforms.uOpacity.value = opacity;
      group.visible = opacity > 0.002;
    },
    dispose() {
      disposeObject(group);
    },
  };
}
