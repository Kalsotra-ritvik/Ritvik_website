import * as THREE from "three";
import { createRandom } from "@/lib/science/random";
import { PALETTE, ParticleBuffer, color, createParticleMaterial, disposeObject } from "@/lib/engine/materials";
import type { World } from "./world";

/**
 * A schematic transcriptome: many RNA molecules from several genes.
 * Copy number per gene stands for expression level (what RNA-seq estimates);
 * coral molecules are an alternative isoform (one exon skipped); violet hairpins
 * are non-coding RNAs, which are not translated. Counts are illustrative.
 */
export type TranscriptKind = "mrna" | "isoform" | "ncrna";

const HEADER = /* glsl */ `
attribute float aSeed;
attribute float aOrder;
uniform float uReveal;
uniform float uFocus;
`;
const DISPLACE = /* glsl */ `
  float k = clamp(uReveal * 1.6 - aOrder * 0.6, 0.0, 1.0);
  float drift = 0.18;
  p += vec3(sin(uTime * 0.23 + aSeed * 6.28), cos(uTime * 0.19 + aSeed * 5.1), sin(uTime * 0.17 + aSeed * 3.3)) * drift;
  p += n * (1.0 - k) * (1.0 - k) * 2.5;
  a *= k * mix(1.0, 0.25, uFocus);
  s *= mix(0.4, 1.0, k);
`;

export function createTranscriptomeScene(world: World, quality: "high" | "low") {
  const rng = createRandom(1234);
  const buf = new ParticleBuffer({ aSeed: 1, aOrder: 1 });
  const per = quality === "high" ? 3 : 2;
  const center = world.TC;
  const anchors: Record<TranscriptKind, THREE.Vector3> = {
    mrna: new THREE.Vector3(),
    isoform: new THREE.Vector3(),
    ncrna: new THREE.Vector3(),
  };
  const anchorSet: Record<TranscriptKind, boolean> = { mrna: false, isoform: false, ncrna: false };

  const genes = 10;
  const t = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const bin = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  for (let g = 0; g < genes; g++) {
    const angle = (g / genes) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const radius = rng.range(4.5, 7.5);
    const gc = new THREE.Vector3(Math.cos(angle) * radius, rng.range(-3, 3.2), Math.sin(angle) * radius * 0.6 - 3).add(center);
    const kind: TranscriptKind = g % 4 === 3 ? "ncrna" : g % 4 === 1 ? "isoform" : "mrna";
    // Simulated copy number (log-normal), i.e. expression level.
    const copies = Math.max(1, Math.min(9, Math.round(Math.exp(rng.normal() * 0.7 + 1.1))));
    const col = color(kind === "ncrna" ? PALETTE.ncRna : kind === "isoform" ? PALETTE.isoform : PALETTE.rnaExon);
    for (let c = 0; c < copies; c++) {
      const seed = rng.next();
      const len = kind === "ncrna" ? rng.int(18, 26) : rng.int(34, 58);
      const start = gc.clone().add(new THREE.Vector3(rng.normal(), rng.normal(), rng.normal()).multiplyScalar(1.2));
      const dir = new THREE.Vector3(rng.normal(), rng.normal() * 0.5, rng.normal()).normalize();
      const pts: THREE.Vector3[] = [];
      const p = start.clone();
      for (let i = 0; i < len; i++) {
        if (kind === "ncrna") {
          // Stem-loop: go out, turn, come back alongside.
          const half = Math.floor(len / 2);
          const leg = i < half ? i : len - 1 - i;
          const side = i < half ? 0 : 0.32;
          pts.push(start.clone().addScaledVector(dir, leg * 0.15).add(new THREE.Vector3(0, side, side * 0.5)));
        } else {
          dir.add(new THREE.Vector3(rng.normal(), rng.normal(), rng.normal()).multiplyScalar(0.16)).normalize();
          p.addScaledVector(dir, 0.15);
          pts.push(p.clone());
        }
      }
      const order = (g + c / copies) / genes;
      const skipFrom = Math.floor(len * 0.4);
      const skipTo = Math.floor(len * 0.6);
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        t.subVectors(b, a).normalize();
        nrm.crossVectors(t, up).normalize();
        bin.crossVectors(t, nrm);
        // Exon boundaries shown as slight brightness steps; the isoform lacks the middle exon.
        const exonBand = Math.floor((i / len) * 3) % 2 === 0 ? 1 : 0.82;
        if (kind === "isoform" && i >= skipFrom && i < skipTo) continue;
        for (let k = 0; k < per; k++) {
          const phi = (k / per) * Math.PI * 2 + i * 0.6;
          const off = nrm.clone().multiplyScalar(Math.cos(phi)).addScaledVector(bin, Math.sin(phi));
          buf.push(
            pts[i].clone().addScaledVector(off, 0.08),
            col.clone().multiplyScalar(exonBand * rng.range(0.9, 1.08)),
            0.11,
            off,
            1,
            { aSeed: seed, aOrder: order },
          );
        }
      }
      if (!anchorSet[kind] && c === 0) {
        anchors[kind].copy(pts[Math.floor(pts.length / 2)]);
        anchorSet[kind] = true;
      }
    }
  }

  const uniforms = { uReveal: { value: 0 }, uFocus: { value: 0 } };
  const material = createParticleMaterial({ style: "bead", header: HEADER, displace: DISPLACE, uniforms, fogNear: 9, fogFar: 32 });
  const points = new THREE.Points(buf.toGeometry(), material);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);

  return {
    group,
    anchors,
    count: buf.count,
    update(reveal: number, focus: number) {
      uniforms.uReveal.value = reveal;
      uniforms.uFocus.value = focus;
      group.visible = reveal > 0.001;
    },
    dispose() {
      disposeObject(group);
    },
  };
}
