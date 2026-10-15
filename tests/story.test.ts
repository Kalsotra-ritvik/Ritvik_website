import { describe, expect, it } from "vitest";
import { CHAPTERS, storyTimeAt, type SectionMetrics } from "@/lib/story/chapters";
import { GENE_LAYOUT, molecularState } from "@/lib/story/molecularTimeline";
import { buildGene } from "@/lib/science/gene";

const gene = buildGene(GENE_LAYOUT.basePairs, GENE_LAYOUT.txStart);
const ms = (t: number) => molecularState(t, gene.preMrna.length, gene.codons.length, 672);
const ts = Array.from({ length: 801 }, (_, i) => i * 0.01);

describe("story time mapping", () => {
  const vh = 800;
  let top = 0;
  const sections: SectionMetrics[] = CHAPTERS.map((c) => {
    const s = { id: c.id, top, height: 1600 };
    top += 1600;
    return s;
  });

  it("is monotonic in scroll position and spans 0..7", () => {
    let prev = -1;
    for (let y = 0; y <= top - vh; y += 25) {
      const t = storyTimeAt(y, vh, sections);
      expect(t).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = t;
    }
    expect(storyTimeAt(0, vh, sections)).toBeCloseTo(0, 5);
    expect(storyTimeAt(top, vh, sections)).toBeCloseTo(7, 5);
  });

  it("holds steady over the opaque document sections", () => {
    const opaque = sections.filter((s) => CHAPTERS.find((c) => c.id === s.id)?.opaque);
    for (const s of opaque) expect(storyTimeAt(s.top + s.height / 2 - vh / 2, vh, sections)).toBe(6);
  });
});

describe("molecular timeline", () => {
  it("RNA polymerase advances exactly one base pair per nucleotide", () => {
    for (const t of ts) {
      const s = ms(t);
      expect(s.polymeraseBp - GENE_LAYOUT.txStart).toBeCloseTo(s.synthesized, 9);
      expect(s.synthesized).toBeLessThanOrEqual(gene.preMrna.length);
    }
  });

  it("follows the biological order", () => {
    const first = (pred: (s: ReturnType<typeof ms>) => boolean) => ts.find((t) => pred(ms(t)))!;
    const bubble = first((s) => s.bubbleOpen > 0.5);
    const rna = first((s) => s.synthesized > 1);
    const spliced = first((s) => s.splice > 0.5);
    const exported = first((s) => s.export > 0.5);
    const small = first((s) => s.smallSubunit > 0.5);
    const large = first((s) => s.largeSubunit > 0.5);
    const peptide = first((s) => s.residues >= 2);
    const folded = first((s) => s.fold > 0.5);
    const order = [bubble, rna, spliced, exported, small, large, peptide, folded];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("the nascent chain only grows during translation and is complete before folding", () => {
    let prev = 0;
    for (const t of ts) {
      const s = ms(t);
      expect(s.residues).toBeGreaterThanOrEqual(prev);
      prev = s.residues;
      if (s.fold > 0) expect(s.residues).toBe(672);
    }
  });

  it("decodes every codon once before the fast-forward", () => {
    expect(ms(3.99).residues).toBe(gene.codons.length);
  });
});
