/**
 * SIMULATED data for the transcriptomics explainer figures.
 *
 * These values are generated from a fixed random seed to show what common
 * RNA-seq figures look like. They are not measurements, they do not come from
 * any of Ritvik's projects, and the gene labels are deliberately generic.
 */
import { createRandom } from "./random";

export interface HeatmapData {
  genes: string[];
  samples: string[];
  /** Row-wise z-scores, genes × samples. */
  values: number[][];
}

export function simulateHeatmap(seed = 7): HeatmapData {
  const rng = createRandom(seed);
  const samples = ["Ctrl 1", "Ctrl 2", "Ctrl 3", "Trt 1", "Trt 2", "Trt 3"];
  const genes = Array.from({ length: 14 }, (_, i) => `Gene ${String.fromCharCode(65 + i)}`);
  const values = genes.map((_, g) => {
    // Three expression programmes: up in treatment, down in treatment, unchanged.
    const programme = g < 5 ? 1 : g < 10 ? -1 : 0;
    const effect = programme * rng.range(0.9, 1.6);
    const raw = samples.map((_, s) => (s < 3 ? -effect / 2 : effect / 2) + rng.normal() * 0.35);
    const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
    const sd = Math.sqrt(raw.reduce((a, b) => a + (b - mean) ** 2, 0) / raw.length) || 1;
    return raw.map((v) => (v - mean) / sd);
  });
  return { genes, samples, values };
}

export interface VolcanoPoint {
  log2FoldChange: number;
  negLog10P: number;
}

export function simulateVolcano(seed = 11, n = 420): VolcanoPoint[] {
  const rng = createRandom(seed);
  return Array.from({ length: n }, () => {
    const isDifferential = rng.next() < 0.14;
    const lfc = isDifferential ? Math.sign(rng.next() - 0.5) * rng.range(1, 4) : rng.normal() * 0.55;
    const signal = Math.abs(lfc) * (isDifferential ? rng.range(1.4, 3.2) : rng.range(0.2, 1.2));
    return { log2FoldChange: lfc, negLog10P: Math.max(0, signal + rng.normal() * 0.35) };
  });
}

export interface CoverageData {
  /** Exon intervals on a 0..length coordinate. */
  exons: [number, number][];
  /** Per-position read depth for two isoform-mixture conditions. */
  depth: number[];
  /** Splice junctions: [donor, acceptor, supporting reads]. */
  junctions: [number, number, number][];
  length: number;
}

export function simulateCoverage(seed = 5): CoverageData {
  const rng = createRandom(seed);
  const length = 300;
  const exons: [number, number][] = [[10, 60], [110, 150], [200, 290]];
  const depth = Array.from({ length }, (_, x) => {
    const inExon = exons.findIndex(([a, b]) => x >= a && x <= b);
    if (inExon < 0) return Math.max(0, rng.normal() * 0.6 + 0.6); // low intronic background
    const level = inExon === 1 ? 26 : 44; // middle exon partly skipped
    return Math.max(0, level + rng.normal() * 4);
  });
  const junctions: [number, number, number][] = [
    [60, 110, 30],
    [150, 200, 28],
    [60, 200, 14], // exon-skipping junction
  ];
  return { exons, depth, junctions, length };
}
