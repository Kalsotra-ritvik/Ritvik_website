/**
 * Converts story time t into the state of every molecular process.
 * Pure function: the scenes read it, the tests check it.
 */
import { seg, sseg } from "./chapters";

export const GENE_LAYOUT = {
  basePairs: 176,
  txStart: 58,
};

export const PHASES = {
  intro: [0, 0.1],
  bind: [0.55, 0.95], // RNA polymerase assembles and melts the DNA
  elongate: [1.0, 1.85], // one base pair per nucleotide
  terminate: [1.85, 2.02],
  release: [1.95, 2.3], // pre-mRNA leaves the template
  process: [2.25, 2.6], // capping, splicing, polyadenylation
  population: [2.45, 2.85],
  exportStart: [2.85, 3.25],
  smallSubunit: [3.3, 3.42],
  scan: [3.4, 3.5],
  largeSubunit: [3.48, 3.58],
  elongateProtein: [3.6, 3.98],
  fastForward: [4.0, 4.24],
  dissociate: [4.2, 4.34],
  fold: [4.34, 4.96],
} as const;

export interface MolecularState {
  // Transcription
  polymeraseAssemble: number;
  bubbleOpen: number;
  /** Polymerase position along the DNA, in base pairs. */
  polymeraseBp: number;
  /** Nucleotides synthesised so far. */
  synthesized: number;
  polymeraseRelease: number;
  // RNA life cycle
  rnaRelease: number;
  splice: number;
  polyA: number;
  population: number;
  export: number;
  // Translation
  smallSubunit: number;
  scan: number;
  largeSubunit: number;
  /** Completed elongation cycles (translocations). */
  cycle: number;
  /** Progress within the current cycle, 0..1. */
  cycleFraction: number;
  /** Residues in the nascent chain. */
  residues: number;
  /** Translocation progress inside the current cycle (0..1). */
  translocation: number;
  dissociate: number;
  fold: number;
}

export function molecularState(t: number, preMrnaLength: number, codons: number, totalResidues: number): MolecularState {
  const r = (p: readonly [number, number]) => seg(t, p[0], p[1]);
  const elong = r(PHASES.elongate);
  const synthesized = Math.min(preMrnaLength, elong * preMrnaLength);

  const cycles = codons - 1;
  const ep = r(PHASES.elongateProtein) * cycles;
  const cycle = Math.min(cycles, Math.floor(ep));
  const cycleFraction = cycle >= cycles ? 0 : ep - cycle;
  const peptideBond = cycleFraction > 0.45 ? 1 : 0;
  const translocation = sseg(cycleFraction, 0.5, 0.8);
  let residues = t < PHASES.smallSubunit[0] ? 0 : 1 + cycle + peptideBond;
  const ff = sseg(t, PHASES.fastForward[0], PHASES.fastForward[1]);
  if (ff > 0) residues = Math.round(codons + (totalResidues - codons) * ff);

  return {
    polymeraseAssemble: sseg(t, PHASES.bind[0], PHASES.bind[1] - 0.1) * (1 - sseg(t, PHASES.terminate[0], PHASES.terminate[1])),
    bubbleOpen: sseg(t, PHASES.bind[0] + 0.15, PHASES.bind[1]) * (1 - sseg(t, PHASES.terminate[0], PHASES.terminate[1])),
    polymeraseBp: GENE_LAYOUT.txStart + synthesized,
    synthesized,
    polymeraseRelease: sseg(t, PHASES.terminate[0], PHASES.terminate[1]),
    rnaRelease: sseg(t, PHASES.release[0], PHASES.release[1]),
    splice: sseg(t, PHASES.process[0] + 0.05, PHASES.process[1]),
    polyA: sseg(t, PHASES.process[0], PHASES.process[0] + 0.2),
    population: sseg(t, PHASES.population[0], PHASES.population[1]) * (1 - sseg(t, 2.95, 3.25)),
    export: sseg(t, PHASES.exportStart[0], PHASES.exportStart[1]),
    smallSubunit: sseg(t, PHASES.smallSubunit[0], PHASES.smallSubunit[1]),
    scan: sseg(t, PHASES.scan[0], PHASES.scan[1]),
    largeSubunit: sseg(t, PHASES.largeSubunit[0], PHASES.largeSubunit[1]),
    cycle,
    cycleFraction,
    residues,
    translocation,
    dissociate: sseg(t, PHASES.dissociate[0], PHASES.dissociate[1]),
    fold: sseg(t, PHASES.fold[0], PHASES.fold[1]),
  };
}
