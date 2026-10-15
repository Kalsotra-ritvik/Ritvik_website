import * as THREE from "three";
import { dnaAxisY } from "@/components/molecular/dna";
import { GENE_LAYOUT } from "@/lib/story/molecularTimeline";

/**
 * Spatial layout of the molecular world (world units ≈ nm for DNA; other
 * molecules are schematic and not to scale).
 *
 * The helix lies on a gentle diagonal. Transcription runs "up-right" along it.
 * The released RNA rises into the nucleoplasm (transcriptome view), passes
 * through a nuclear pore, meets a ribosome in the cytoplasm, and the protein
 * folds above it.
 */
export function createWorld(preMrnaLength: number) {
  const dnaGroup = new THREE.Group();
  dnaGroup.rotation.set(0.22, 0.18, -1.18);
  dnaGroup.updateMatrixWorld(true);

  const bpWorld = (bp: number, out = new THREE.Vector3()) =>
    out.set(0, dnaAxisY(bp, GENE_LAYOUT.basePairs), 0).applyMatrix4(dnaGroup.matrixWorld);

  const txStartW = bpWorld(GENE_LAYOUT.txStart);
  const txEndW = bpWorld(GENE_LAYOUT.txStart + preMrnaLength);
  const heroTarget = bpWorld(GENE_LAYOUT.txStart + 16);

  const TC = txEndW.clone().add(new THREE.Vector3(-2.5, 6.5, -1));
  const NPC = TC.clone().add(new THREE.Vector3(0, 6.8, 0));
  const RIB = NPC.clone().add(new THREE.Vector3(4.2, 5.4, 0));
  const PROT = RIB.clone().add(new THREE.Vector3(0.5, 7.5, 0));

  return { dnaGroup, bpWorld, txStartW, txEndW, heroTarget, TC, NPC, RIB, PROT };
}

export type World = ReturnType<typeof createWorld>;
