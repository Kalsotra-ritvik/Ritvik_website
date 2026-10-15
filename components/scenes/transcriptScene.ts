import * as THREE from "three";
import { createSurface } from "@/components/molecular/surface";
import { SmoothStrandRenderer, StrandRenderer } from "@/components/molecular/strand";
import { dnaAxisY } from "@/components/molecular/dna";
import { PathSampler } from "@/lib/engine/path";
import { PALETTE, ParticleBuffer, color, createParticleMaterial, disposeObject } from "@/lib/engine/materials";
import { GENE_LAYOUT, PHASES, type MolecularState } from "@/lib/story/molecularTimeline";
import { seg, sseg } from "@/lib/story/chapters";
import { type Gene, matureIndexMap, regionAt } from "@/lib/science/gene";
import type { World } from "./world";

const BASE_RGB: Record<string, number> = { A: PALETTE.baseA, U: PALETTE.baseU, G: PALETTE.baseG, C: PALETTE.baseC };

/** Spacing (world units per nucleotide) in each representation. */
const SP_TRANSCRIBE = 0.3;
const SP_DISPLAY = 0.15;
export const SP_MRNA = 0.3;

export function createTranscriptScene(
  world: World,
  gene: Gene,
  quality: "high" | "low",
  rnaStyle: "smooth" | "beads" = "beads",
  rnaColor?: string,
) {
  const high = quality === "high";
  const preLen = gene.preMrna.length;
  const polyALen = gene.polyA;
  const total = preLen + polyALen;
  const matureMap = matureIndexMap(gene);
  const matureLen = gene.mature.length;

  // --- RNA polymerase (schematic) -------------------------------------------------
  const exitDir = new THREE.Vector3(0.3, -0.5, 0.8).normalize();
  const polymerase = createSurface({
    radii: [2.05, 2.35, 2.05],
    count: high ? 2600 : 1200,
    beadSize: high ? 0.19 : 0.26,
    color: PALETTE.polymerase,
    seed: 9,
    lumps: 11,
    lumpiness: 0.2,
    cutaway: 1,
    exclude: (p) => p.x * p.x + p.z * p.z < 1.45 * 1.45 || p.clone().normalize().dot(exitDir) > 0.93,
  });
  world.dnaGroup.add(polymerase.group);

  // --- Paths -------------------------------------------------------------------
  // Transcription path, in the polymerase's local frame (DNA axis = +Y,
  // polymerase moving +Y). d = 0 at the active site; the ~8-nt RNA–DNA hybrid
  // follows the template, then the RNA leaves through the exit channel.
  const transcribePts = [
    new THREE.Vector3(0.25, 0.15, 0.3),
    new THREE.Vector3(0.45, -0.75, 0.55),
    new THREE.Vector3(0.55, -1.35, 1.45),
    new THREE.Vector3(0.45, -1.9, 2.7),
  ];
  // Beyond the exit channel the RNA leaves roughly perpendicular to the helix:
  // local −X is world "up" for the tilted DNA, +Z is toward the viewer.
  for (let k = 1; k <= 16; k++) {
    transcribePts.push(
      new THREE.Vector3(0.2 - k * 1.15 + Math.sin(k * 0.7) * 0.35, -2.1 + k * 0.42 + Math.sin(k * 0.9) * 0.45, 2.9 + k * 0.3 + Math.cos(k * 0.8) * 0.4),
    );
  }
  const transcribePath = new PathSampler(transcribePts);

  const TC = world.TC;
  const displayPts = [
    [-2.6, 1.7, 0], [0, 2.1, 0.7], [2.5, 1.5, 0], [2.6, 0.1, -0.6], [0, -0.1, 0.5],
    [-2.5, 0.1, 0], [-2.6, -1.4, -0.5], [0, -1.8, 0.4], [2.6, -1.5, 0],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z).add(TC));
  const displayPath = new PathSampler(displayPts);

  const NPC = world.NPC;
  const RIB = world.RIB;
  const mrnaY = 0.1;
  const exportPts = [
    TC.clone().add(new THREE.Vector3(1.5, -2.5, 1)),
    TC.clone().add(new THREE.Vector3(0.6, 1.5, 0.4)),
    NPC.clone().add(new THREE.Vector3(0, -2.6, 0)),
    NPC.clone(),
    NPC.clone().add(new THREE.Vector3(0, 2.2, 0)),
    RIB.clone().add(new THREE.Vector3(-3.7, mrnaY - 1.3, 0.25)),
    RIB.clone().add(new THREE.Vector3(-2.4, mrnaY, 0)),
    RIB.clone().add(new THREE.Vector3(0, mrnaY, 0)),
    RIB.clone().add(new THREE.Vector3(2.4, mrnaY, 0)),
    RIB.clone().add(new THREE.Vector3(5.2, mrnaY + 0.7, 0.9)),
    RIB.clone().add(new THREE.Vector3(7.5, mrnaY + 2.2, 1.6)),
  ];
  const exportPath = new PathSampler(exportPts, 800);
  const sAt = (target: THREE.Vector3) => {
    let best = 0;
    let bestD = Infinity;
    const p = new THREE.Vector3();
    for (let s = 0; s <= exportPath.length; s += 0.02) {
      const d = exportPath.at(s, p).distanceToSquared(target);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  };
  const sNPC = sAt(NPC);
  const sRib = sAt(RIB.clone().add(new THREE.Vector3(0, mrnaY, 0)));

  // --- RNA strand ------------------------------------------------------------------
  const strand = rnaStyle === "smooth" ? new SmoothStrandRenderer(total, quality) : new StrandRenderer(total, quality, 5);
  const centers = new Float32Array(total * 3);
  const bbColor = new Float32Array(total * 3);
  const baseColor = new Float32Array(total * 3);
  const alpha = new Float32Array(total);
  const exonHex = rnaColor ? new THREE.Color().setStyle(rnaColor).getHex() : PALETTE.rnaExon;
  const exon = color(exonHex);
  const intron = color(PALETTE.rnaIntron);
  const polyA = color(exonHex, 0xffffff, 0.25);
  const tmpC = new THREE.Color();

  // 5′ cap (7-methylguanosine) marker.
  const capBuf = new ParticleBuffer();
  capBuf.push([0, 0, 0], color(0xffe0a8), 0.55, [0, 0, 1], 0.9);
  capBuf.push([0, 0, 0], color(0xffc070), 1.6, [0, 0, 1], 0.18);
  const capMat = createParticleMaterial({ style: "glow", fogNear: 10, fogFar: 40, backAlpha: 1 });
  const cap = new THREE.Points(capBuf.toGeometry(true), capMat);
  cap.frustumCulled = false;

  const group = new THREE.Group();
  group.add(strand.group, cap);

  const local = new THREE.Vector3();
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pC = new THREE.Vector3();
  const loopN = new THREE.Vector3(0, 0.45, 1).normalize();
  const polyLocal = new THREE.Vector3();

  const anchors = {
    polymerase: new THREE.Vector3(),
    rna5: new THREE.Vector3(),
    intron: new THREE.Vector3(),
    exonJunction: new THREE.Vector3(),
    /** Centroid of the synthesised RNA, for the camera. */
    mid: new THREE.Vector3(),
    polyA: new THREE.Vector3(),
    template: new THREE.Vector3(),
    pore: NPC.clone().add(new THREE.Vector3(1.9, 0, 0)),
  };

  /** Position of mature nucleotide m along the export/translation path for a given lead. */
  const mrnaLead = (t: number, ms: MolecularState) => {
    let lead = THREE.MathUtils.lerp(sNPC - 2.4, sRib + 1 * SP_MRNA, sseg(t, 2.95, PHASES.exportStart[1]));
    lead += gene.cdsStart * SP_MRNA * ms.scan;
    lead += 3 * SP_MRNA * (ms.cycle + ms.translocation);
    return lead;
  };

  function update(t: number, ms: MolecularState) {
    // Polymerase rides along the DNA.
    const bp = ms.polymeraseBp;
    polymerase.group.position.set(0, dnaAxisY(bp, GENE_LAYOUT.basePairs), 0);
    polymerase.set(ms.polymeraseAssemble, 1);
    polymerase.group.updateMatrixWorld(true);
    anchors.polymerase.set(0, 0, 0).applyMatrix4(polymerase.group.matrixWorld);
    anchors.template.set(0, dnaAxisY(bp - 4, GENE_LAYOUT.basePairs), 0).applyMatrix4(world.dnaGroup.matrixWorld);

    const w34 = ms.rnaRelease;
    const w45 = sseg(t, 2.78, 3.02);
    const lead = mrnaLead(t, ms);
    const synthesized = ms.synthesized;
    const visibleRNA = t >= PHASES.elongate[0] - 0.01;
    const fade = 1 - sseg(t, PHASES.fastForward[0] + 0.05, PHASES.dissociate[1]) * 0.75 - sseg(t, PHASES.dissociate[0], PHASES.dissociate[1] + 0.05) * 0.25;
    const splice = ms.splice;
    const sDisplayMid = displayPath.length / 2;
    const elongCodon = ms.cycle + (ms.cycleFraction > 0.5 ? 1 : 0);

    for (let i = 0; i < total; i++) {
      const isPolyA = i >= preLen;
      const m = isPolyA ? matureLen + (i - preLen) : matureMap[i];
      const region = isPolyA ? null : regionAt(gene, i);
      const isIntron = region?.kind === "intron";

      // P3 — on the polymerase
      const d = Math.max(0, synthesized - 1 - (isPolyA ? preLen - 1 : i));
      transcribePath.at(d * SP_TRANSCRIBE, local);
      pA.copy(local).applyMatrix4(polymerase.group.matrixWorld);

      // P4 — free pre-mRNA being processed
      const sPre = sDisplayMid + (i - total / 2) * SP_DISPLAY;
      if (!isIntron) {
        const sPost = sDisplayMid + (m - (matureLen + polyALen) / 2) * SP_DISPLAY;
        displayPath.at(THREE.MathUtils.lerp(sPre, sPost, splice), pB);
      } else {
        // Intron: ends converge on the exon junction while the loop (lariat) bulges out.
        const lastExonM = matureMap[region!.start - 1];
        const sJ = sDisplayMid + (lastExonM + 0.5 - (matureLen + polyALen) / 2) * SP_DISPLAY;
        const u = (i - region!.start) / Math.max(1, region!.length - 1);
        displayPath.at(THREE.MathUtils.lerp(sPre, sJ, splice), pB);
        const ring = Math.sin(Math.PI * u);
        pB.addScaledVector(loopN, ring * 1.5 * splice);
        pB.x += Math.sin(Math.PI * 2 * u) * 0.55 * splice;
        pB.y += sseg(splice, 0.6, 1) * 1.4;
      }

      // P5 — exported mRNA threading the ribosome (introns are gone by now)
      exportPath.at(lead - m * SP_MRNA, pC);

      const p = pA.lerp(pB, w34).lerp(pC, isIntron ? 0 : w45);
      centers[i * 3] = p.x;
      centers[i * 3 + 1] = p.y;
      centers[i * 3 + 2] = p.z;

      // Colour: exons warm, introns muted; codons in the reading frame alternate in brightness.
      tmpC.copy(isPolyA ? polyA : isIntron ? intron : exon);
      if (!isIntron && !isPolyA && m >= gene.cdsStart && m < gene.cdsStart + gene.codons.length * 3 + 3) {
        const codon = Math.floor((m - gene.cdsStart) / 3);
        const parity = codon % 2 === 0 ? 1.08 : 0.8;
        tmpC.multiplyScalar(THREE.MathUtils.lerp(1, parity, w45));
        const inSites = codon === elongCodon || codon === elongCodon + 1;
        if (inSites && ms.largeSubunit > 0.5) tmpC.lerp(color(0xffe2b0), 0.35);
      }
      bbColor[i * 3] = tmpC.r;
      bbColor[i * 3 + 1] = tmpC.g;
      bbColor[i * 3 + 2] = tmpC.b;
      const base = isPolyA ? "A" : gene.preMrna[i];
      tmpC.setHex(BASE_RGB[base]);
      baseColor[i * 3] = tmpC.r;
      baseColor[i * 3 + 1] = tmpC.g;
      baseColor[i * 3 + 2] = tmpC.b;

      let a = 1;
      if (!visibleRNA) a = 0;
      else if (isPolyA) a = (i - preLen) < ms.polyA * polyALen ? 1 : 0;
      else if (i >= synthesized) a = 0;
      if (isIntron) a *= 1 - sseg(splice, 0.72, 0.98);
      alpha[i] = a * fade;
    }
    strand.update(centers, total, bbColor, baseColor, alpha, THREE.MathUtils.lerp(1, 0.9, w45));
    strand.setOpacity(visibleRNA ? 1 : 0);

    // Cap appears co-transcriptionally once the 5′ end has emerged.
    const capOn = seg(synthesized, 18, 24) * fade * (visibleRNA ? 1 : 0);
    cap.position.set(centers[0], centers[1], centers[2]);
    capMat.uniforms.uOpacity.value = capOn;
    cap.visible = capOn > 0.01;

    anchors.rna5.set(centers[0], centers[1], centers[2]);
    anchors.mid.set(0, 0, 0);
    const shown = Math.max(1, Math.min(total, Math.ceil(synthesized)));
    for (let i = 0; i < shown; i++) anchors.mid.add(local.set(centers[i * 3], centers[i * 3 + 1], centers[i * 3 + 2]));
    anchors.mid.divideScalar(shown);
    const firstIntron = gene.regions.find((r) => r.kind === "intron")!;
    const mid = firstIntron.start + Math.floor(firstIntron.length / 2);
    anchors.intron.set(centers[mid * 3], centers[mid * 3 + 1], centers[mid * 3 + 2]);
    const j = firstIntron.start - 1;
    anchors.exonJunction.set(centers[j * 3], centers[j * 3 + 1], centers[j * 3 + 2]);
    const last = total - 1;
    anchors.polyA.set(centers[last * 3], centers[last * 3 + 1], centers[last * 3 + 2]);
    polyLocal.copy(anchors.polyA);
  }

  return {
    group,
    polymerase,
    anchors,
    sRib,
    update,
    dispose() {
      polymerase.dispose();
      strand.dispose();
      disposeObject(cap);
    },
  };
}

export type TranscriptScene = ReturnType<typeof createTranscriptScene>;
