import * as THREE from "three";
import { createSurface } from "@/components/molecular/surface";
import { PALETTE, ParticleBuffer, chainColor, color, createParticleMaterial, disposeObject } from "@/lib/engine/materials";
import { createRandom } from "@/lib/science/random";
import { sseg } from "@/lib/story/chapters";
import { PHASES, type MolecularState } from "@/lib/story/molecularTimeline";
import type { Gene } from "@/lib/science/gene";
import { SP_MRNA } from "./transcriptScene";
import type { World } from "./world";
import type { RibosomeModel } from "./ribosomeModel";

/**
 * Ribosome with tRNAs cycling through the
 * A (aminoacyl), P (peptidyl) and E (exit) sites. One elongation cycle:
 *   aminoacyl-tRNA arrives in A → peptide bond → translocation (A→P, P→E, mRNA moves one codon) → E-site tRNA leaves.
 *
 * The subunits are drawn either as schematic bead shells or, once loaded, as
 * surfaces of the human 80S ribosome model PDB 4UG0 (ribosomeModel.ts). tRNAs
 * and mRNA are schematic in both cases.
 */
const COMPLEMENT: Record<string, string> = { A: "U", U: "A", G: "C", C: "G" };
const BASE_RGB: Record<string, number> = { A: PALETTE.baseA, U: PALETTE.baseU, G: PALETTE.baseG, C: PALETTE.baseC };

const CODON_W = 3 * SP_MRNA;
const SITE = { A: -CODON_W, P: 0, E: CODON_W };
const MRNA_Y = 0.15;
export const PTC_LOCAL = new THREE.Vector3(0.3, 1.72, 0.1);
const TUNNEL_EXIT_LOCAL = new THREE.Vector3(0.65, 3.95, 0.1);

function createTRNA(seed: number, quality: "high" | "low") {
  const rng = createRandom(seed);
  const buf = new ParticleBuffer();
  const col = color(PALETTE.trna);
  const elbow = new THREE.Vector3(-0.28, 1.05, 0.5);
  const segs: [THREE.Vector3, THREE.Vector3][] = [
    [new THREE.Vector3(0, 0.2, 0), elbow],
    [elbow, PTC_LOCAL.clone()],
  ];
  const steps = quality === "high" ? 16 : 9;
  for (const [a, b] of segs) {
    for (let i = 0; i <= steps; i++) {
      const p = a.clone().lerp(b, i / steps);
      for (let k = 0; k < 3; k++) {
        const off = new THREE.Vector3(rng.normal(), rng.normal(), rng.normal()).normalize();
        buf.push(p.clone().addScaledVector(off, 0.12), col.clone().multiplyScalar(rng.range(0.85, 1.1)), 0.15, off, 1);
      }
    }
  }
  // D/T-loop bulge at the elbow
  for (let i = 0; i < 14; i++) {
    const off = new THREE.Vector3(rng.normal(), rng.normal(), rng.normal()).normalize();
    buf.push(elbow.clone().addScaledVector(off, 0.22), col.clone().multiplyScalar(0.95), 0.17, off, 1);
  }
  // Three anticodon beads (recoloured per codon)
  const anticodonStart = buf.count;
  for (let i = 0; i < 3; i++) {
    // Codon base i (5′→3′) sits at x = (1 − i)·spacing because the mRNA's 5′ end points to +X.
    buf.push([(1 - i) * SP_MRNA, 0.05, 0.05], col, 0.17, [0, -1, 0.3], 1);
  }
  const geom = buf.toGeometry(true);
  const material = createParticleMaterial({ style: "bead", fogNear: 8, fogFar: 30 });
  const points = new THREE.Points(geom, material);
  points.frustumCulled = false;

  // Amino acid carried on the acceptor end
  const aaBuf = new ParticleBuffer();
  aaBuf.push(PTC_LOCAL.clone().add(new THREE.Vector3(0.05, 0.2, 0)), color(0xffffff), 0.36, [0, 0, 1], 1);
  const aaMat = createParticleMaterial({ style: "bead", fogNear: 8, fogFar: 30 });
  const aa = new THREE.Points(aaBuf.toGeometry(true), aaMat);
  aa.frustumCulled = false;

  const group = new THREE.Group();
  group.add(points, aa);
  let assigned = "";
  return {
    group,
    setCodon(codon: string, residueColor: THREE.Color) {
      if (assigned === codon + residueColor.getHexString()) return;
      assigned = codon + residueColor.getHexString();
      const c = geom.getAttribute("aColor") as THREE.BufferAttribute;
      for (let i = 0; i < 3; i++) {
        // Anticodon pairs antiparallel with the codon: position i faces codon base i.
        const b = new THREE.Color().setHex(BASE_RGB[COMPLEMENT[codon[i]]]);
        c.setXYZ(anticodonStart + i, b.r, b.g, b.b);
      }
      c.needsUpdate = true;
      const ac = aa.geometry.getAttribute("aColor") as THREE.BufferAttribute;
      ac.setXYZ(0, residueColor.r, residueColor.g, residueColor.b);
      ac.needsUpdate = true;
    },
    set(opacity: number, aminoAcid: number) {
      material.uniforms.uOpacity.value = opacity;
      aaMat.uniforms.uOpacity.value = opacity * aminoAcid;
      group.visible = opacity > 0.01;
      aa.visible = opacity * aminoAcid > 0.01;
    },
    dispose() {
      disposeObject(group);
    },
  };
}

export function createTranslationScene(world: World, gene: Gene, totalResidues: number, quality: "high" | "low") {
  const high = quality === "high";
  const group = new THREE.Group();
  group.position.copy(world.RIB);

  const largeCenter = new THREE.Vector3(0, 1.95, 0);
  const tunnelA = PTC_LOCAL.clone().sub(largeCenter);
  const tunnelB = TUNNEL_EXIT_LOCAL.clone().sub(largeCenter);
  const line = new THREE.Line3(tunnelA, tunnelB);
  const closest = new THREE.Vector3();

  const small = createSurface({
    radii: [2.45, 0.92, 1.85],
    count: high ? 2200 : 1000,
    beadSize: high ? 0.18 : 0.25,
    color: PALETTE.ribosomeSmall,
    seed: 31,
    lumps: 10,
    cutaway: 1,
    fogNear: 8,
    fogFar: 30,
  });
  small.group.position.set(0, -0.85, 0);
  const large = createSurface({
    radii: [2.75, 1.85, 2.2],
    count: high ? 3200 : 1400,
    beadSize: high ? 0.19 : 0.26,
    color: PALETTE.ribosomeLarge,
    seed: 47,
    lumps: 12,
    cutaway: 1,
    fogNear: 8,
    fogFar: 30,
    exclude: (p) => line.closestPointToPoint(p, true, closest).distanceTo(p) < 0.6,
  });
  large.group.position.copy(largeCenter);
  group.add(small.group, large.group);

  // Deposited-model surfaces replace the schematic shells when available.
  let model: RibosomeModel | null = null;
  function useModel(m: RibosomeModel) {
    model = m;
    group.add(m.small.group, m.large.group);
  }

  const trnas = [createTRNA(101, quality), createTRNA(202, quality), createTRNA(303, quality)];
  trnas.forEach((r) => group.add(r.group));

  const incoming = new THREE.Vector3(-4.2, 3.6, 3.4);
  const outgoing = new THREE.Vector3(4.2, 3.2, 3.2);
  const siteVec = (x: number, out: THREE.Vector3) => out.set(x, MRNA_Y, 0);
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const resColor = new THREE.Color();

  const anchors = {
    small: new THREE.Vector3(),
    large: new THREE.Vector3(),
    siteA: new THREE.Vector3(),
    siteP: new THREE.Vector3(),
    siteE: new THREE.Vector3(),
    tunnel: new THREE.Vector3(),
    trna: new THREE.Vector3(),
  };

  const ptcWorld = () => PTC_LOCAL.clone().add(world.RIB);
  const tunnelExitWorld = () => TUNNEL_EXIT_LOCAL.clone().add(world.RIB);

  function placeTRNA(i: number, codonIndex: number, pos: THREE.Vector3, opacity: number, carrying: number, tilt: number) {
    const r = trnas[i];
    const codon = gene.codons[codonIndex];
    if (!codon) {
      r.set(0, 0);
      return;
    }
    r.setCodon(codon, chainColor(codonIndex / Math.max(1, totalResidues - 1), resColor));
    r.group.position.copy(pos);
    r.group.rotation.set(0, 0, tilt);
    r.set(opacity, carrying);
  }

  function update(t: number, ms: MolecularState) {
    const fadeAll = 1 - sseg(t, 3.98, 4.06);
    const dis = ms.dissociate;
    if (model) {
      small.set(0, 0);
      large.set(0, 0);
      // Subunits arrive from below/above, join, and separate again after termination.
      const s = ms.smallSubunit, l = ms.largeSubunit;
      model.small.set(s, 1 - dis);
      model.large.set(l, 1 - dis);
      model.small.group.position.set(0, -(1 - s) * 1.4 - dis * 2.5, -dis * 1.5);
      model.large.group.position.set(0, (1 - l) * 1.8 + dis * 3, dis * 1.5);
      // Section plane just behind the mRNA so the tRNA sites and exit tunnel stay in view.
      model.setCut(world.RIB.z - 0.05 + dis * 1.5);
    } else {
      small.set(ms.smallSubunit, 1 - dis);
      large.set(ms.largeSubunit, 1 - dis);
    }
    small.group.position.set(0, -0.85 - dis * 2.5, -dis * 1.5);
    large.group.position.copy(largeCenter).add(new THREE.Vector3(0, dis * 3, dis * 1.5));
    group.visible = ms.smallSubunit > 0.001 && dis < 0.999;

    const c = ms.cycle;
    const f = ms.cycleFraction;
    const elongating = t >= PHASES.elongateProtein[0];
    trnas.forEach((r) => r.set(0, 0));

    if (!elongating) {
      // Initiator Met-tRNA arrives with the small subunit and sits in the P site.
      placeTRNA(0, 0, siteVec(SITE.P, pA), ms.smallSubunit * fadeAll, 0, 0);
    } else {
      // tRNA for codon c: in P (holding the chain), then shifts to E and leaves.
      const tr = ms.translocation;
      const leave = sseg(f, 0.8, 1);
      siteVec(SITE.P, pA).lerp(siteVec(SITE.E, pB), tr);
      pA.lerp(outgoing, leave);
      placeTRNA(c % 3, c, pA, (1 - leave) * fadeAll, 0, -0.12 * tr);
      // tRNA for codon c+1: delivered to A, then translocates to P.
      if (c + 1 < gene.codons.length && f > 0) {
        const arrive = sseg(f, 0, 0.35);
        pA.copy(incoming).lerp(siteVec(SITE.A, pB), arrive);
        pA.lerp(siteVec(SITE.P, pB), tr);
        const carrying = f < 0.45 ? 1 : 0; // peptide bond moves the chain onto this tRNA
        placeTRNA((c + 1) % 3, c + 1, pA, Math.min(1, arrive * 1.5) * fadeAll, carrying, 0.2 * (1 - arrive));
      }
    }

    group.updateMatrixWorld(true);
    if (model) {
      anchors.small.set(-1.9, -1.1, -0.1).add(world.RIB);
      anchors.large.set(-1.7, 3.0, -0.1).add(world.RIB);
    } else {
      anchors.small.set(-1.6, -1.2, 1.2).add(world.RIB);
      anchors.large.set(-1.8, 3.1, 1.2).add(world.RIB);
    }
    anchors.siteA.set(SITE.A, MRNA_Y - 0.2, 0.4).add(world.RIB);
    anchors.siteP.set(SITE.P, MRNA_Y - 0.2, 0.4).add(world.RIB);
    anchors.siteE.set(SITE.E, MRNA_Y - 0.2, 0.4).add(world.RIB);
    anchors.tunnel.copy(tunnelExitWorld());
    anchors.trna.set(SITE.P - 0.3, 1.1, 0.5).add(world.RIB);
  }

  return {
    group,
    anchors,
    ptcWorld,
    tunnelExitWorld,
    update,
    useModel,
    dispose() {
      small.dispose();
      large.dispose();
      model?.small.dispose();
      model?.large.dispose();
      trnas.forEach((r) => r.dispose());
    },
  };
}

export type TranslationScene = ReturnType<typeof createTranslationScene>;
