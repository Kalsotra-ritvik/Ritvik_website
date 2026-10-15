/**
 * One internally consistent schematic gene used across the whole story:
 *
 *   DNA coding strand  ──transcription──▶  pre-mRNA  ──splicing──▶  mRNA  ──translation──▶  peptide
 *
 * - The pre-mRNA equals the DNA coding strand over the transcribed region (T→U),
 *   so the RNA drawn in the transcription scene is complementary to the template strand.
 * - Introns use the canonical GU…AG splice-site dinucleotides.
 * - The open reading frame encodes the first residues of human SGLT2
 *   (UniProt P31639; SEQRES of PDB 7VSI). The codons are one valid choice per
 *   residue for display — NOT the native SLC5A2 sequence. Lengths are not to scale.
 */
import { createRandom } from "./random";
import { encodeForDisplay } from "./geneticCode";

/** First 14 residues of human SGLT2 (UniProt P31639 / PDB 7VSI chain A SEQRES). */
export const SGLT2_N_TERMINUS = "MEEHTEAGSAPEMG";

export interface Gene {
  /** DNA coding (non-template) strand, 5′→3′, over the whole drawn helix. */
  dnaCoding: string;
  /** First transcribed base pair. */
  txStart: number;
  preMrna: string;
  /** Exon/intron map over the pre-mRNA. */
  regions: { kind: "exon" | "intron"; start: number; length: number }[];
  mature: string;
  /** Index of the A of AUG in the mature mRNA. */
  cdsStart: number;
  codons: string[];
  stopCodon: string;
  polyA: number;
}

const BASES = ["A", "C", "G", "U"] as const;

export function buildGene(basePairs = 176, txStart = 58, seed = 21): Gene {
  const rng = createRandom(seed);
  const rand = (n: number) => Array.from({ length: n }, () => rng.pick(BASES)).join("");

  const utr5 = "GCCACC".slice(2); // "ACC" context before AUG, Kozak-like, shortened
  const codons = encodeForDisplay(SGLT2_N_TERMINUS);
  const stopCodon = "UGA";
  const utr3 = "CGCAAUAAAGCUC"; // includes the AAUAAA polyadenylation signal
  const mature = utr5 + codons.join("") + stopCodon + utr3;

  // Split the mature message into three exons (boundaries chosen inside the CDS).
  const exonLengths = [20, 18, mature.length - 38];
  const intron = (len: number) => "GU" + rand(len - 4) + "AG";
  const intronLengths = [16, 14];

  const regions: Gene["regions"] = [];
  let pre = "";
  let m = 0;
  exonLengths.forEach((len, i) => {
    regions.push({ kind: "exon", start: pre.length, length: len });
    pre += mature.slice(m, m + len);
    m += len;
    if (i < intronLengths.length) {
      const seq = intron(intronLengths[i]);
      regions.push({ kind: "intron", start: pre.length, length: seq.length });
      pre += seq;
    }
  });

  const dnaRandom = Array.from({ length: basePairs }, () => rng.pick(["A", "C", "G", "T"] as const));
  const dna = dnaRandom.map((b, i) => (i >= txStart && i < txStart + pre.length ? pre[i - txStart].replace("U", "T") : b));

  return {
    dnaCoding: dna.join(""),
    txStart,
    preMrna: pre,
    regions,
    mature,
    cdsStart: utr5.length,
    codons,
    stopCodon,
    polyA: 12,
  };
}

export function regionAt(gene: Gene, preIndex: number) {
  return gene.regions.find((r) => preIndex >= r.start && preIndex < r.start + r.length) ?? gene.regions[0];
}

/** Map each pre-mRNA nucleotide to its index in the mature mRNA (-1 for introns). */
export function matureIndexMap(gene: Gene): number[] {
  const map: number[] = [];
  let m = 0;
  for (let i = 0; i < gene.preMrna.length; i++) map.push(regionAt(gene, i).kind === "exon" ? m++ : -1);
  return map;
}
