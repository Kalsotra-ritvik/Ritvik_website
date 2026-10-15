import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CODON_TABLE, DISPLAY_CODON, translateCodon } from "@/lib/science/geneticCode";
import { SGLT2_N_TERMINUS, buildGene, matureIndexMap } from "@/lib/science/gene";
import { buildResidues, type StructureData } from "@/lib/science/structure";
import { simulateHeatmap, simulateVolcano } from "@/lib/science/simulated";
import { GENE_LAYOUT } from "@/lib/story/molecularTimeline";

const structure = JSON.parse(readFileSync("public/data/sglt2-7vsi.json", "utf8")) as StructureData;

describe("genetic code (NCBI table 1)", () => {
  it("has 64 codons with three stops", () => {
    expect(Object.keys(CODON_TABLE)).toHaveLength(64);
    expect(Object.entries(CODON_TABLE).filter(([, aa]) => aa === "*").map(([c]) => c).sort()).toEqual(["UAA", "UAG", "UGA"]);
  });
  it("decodes landmark codons", () => {
    expect(translateCodon("AUG")).toBe("M");
    expect(translateCodon("UGG")).toBe("W");
    expect(translateCodon("GCC")).toBe("A");
    expect(translateCodon("ATG")).toBe("M"); // DNA spelling accepted
  });
  it("every display codon encodes its amino acid", () => {
    for (const [aa, codon] of Object.entries(DISPLAY_CODON)) expect(translateCodon(codon)).toBe(aa);
  });
});

describe("schematic gene", () => {
  const gene = buildGene(GENE_LAYOUT.basePairs, GENE_LAYOUT.txStart);

  it("pre-mRNA is the coding strand over the transcribed region (T→U)", () => {
    const region = gene.dnaCoding.slice(gene.txStart, gene.txStart + gene.preMrna.length);
    expect(region.replace(/T/g, "U")).toBe(gene.preMrna);
    expect(gene.dnaCoding).toHaveLength(GENE_LAYOUT.basePairs);
    expect(gene.dnaCoding).toMatch(/^[ACGT]+$/);
  });

  it("introns carry canonical GU…AG splice sites and splicing yields the mature mRNA", () => {
    const introns = gene.regions.filter((r) => r.kind === "intron");
    expect(introns.length).toBeGreaterThan(0);
    for (const r of introns) {
      const seq = gene.preMrna.slice(r.start, r.start + r.length);
      expect(seq.startsWith("GU")).toBe(true);
      expect(seq.endsWith("AG")).toBe(true);
    }
    const spliced = gene.regions.filter((r) => r.kind === "exon").map((r) => gene.preMrna.slice(r.start, r.start + r.length)).join("");
    expect(spliced).toBe(gene.mature);
    const map = matureIndexMap(gene);
    expect(Math.max(...map) + 1).toBe(gene.mature.length);
  });

  it("the open reading frame encodes the SGLT2 N-terminus and ends in a stop codon", () => {
    const cds = gene.mature.slice(gene.cdsStart);
    const codons = Array.from({ length: SGLT2_N_TERMINUS.length + 1 }, (_, i) => cds.slice(i * 3, i * 3 + 3));
    expect(codons.slice(0, -1).map(translateCodon).join("")).toBe(SGLT2_N_TERMINUS);
    expect(translateCodon(codons.at(-1)!)).toBe("*");
    expect(gene.mature).toContain("AAUAAA");
  });

  it("the N-terminus matches the deposited SEQRES of PDB 7VSI chain A", () => {
    expect(structure.sequence.A.startsWith(SGLT2_N_TERMINUS)).toBe(true);
  });
});

describe("structure data (PDB 7VSI)", () => {
  it("records the entry and citation", () => {
    expect(structure.source.pdbId).toBe("7VSI");
    expect(structure.source.resolutionAngstrom).toBe(2.95);
    expect(structure.source.citation.doi).toBe("10.1038/s41586-021-04212-9");
    expect(structure.ligand.code).toBe("7R3");
  });

  it("maps resolved and unresolved residues of chain A", () => {
    const residues = buildResidues(structure, "A");
    expect(residues).toHaveLength(672);
    const unresolved = residues.filter((r) => !r.modeled).map((r) => r.number);
    expect(unresolved).toEqual([...Array.from({ length: 20 }, (_, i) => i + 1), ...Array.from({ length: 66 }, (_, i) => 575 + i)]);
    expect(residues.filter((r) => r.modeled)).toHaveLength(586);
  });

  it("contact residues are computed within the cut-off and belong to resolved residues", () => {
    const residues = buildResidues(structure, "A");
    const contacts = structure.contacts.residues.filter((c) => c.chain === "A");
    expect(contacts.length).toBeGreaterThan(10);
    for (const c of contacts) {
      expect(c.minDistance).toBeLessThanOrEqual(structure.contacts.cutoffAngstrom);
      expect(residues[c.resSeq - 1].modeled).toBe(true);
      expect(residues[c.resSeq - 1].contact).toBe(true);
    }
  });

  it("is centred on the chain A Cα centroid", () => {
    const pts = structure.chains[0].segments.flat().map((r) => r.p);
    const mean = [0, 1, 2].map((k) => pts.reduce((s, p) => s + p[k], 0) / pts.length);
    for (const m of mean) expect(Math.abs(m)).toBeLessThan(0.05);
  });
});

describe("simulated figures", () => {
  it("are deterministic for a given seed", () => {
    expect(simulateHeatmap(7)).toEqual(simulateHeatmap(7));
    expect(simulateVolcano(11)).toEqual(simulateVolcano(11));
  });
  it("heatmap rows are z-scored", () => {
    for (const row of simulateHeatmap().values) {
      const mean = row.reduce((a, b) => a + b, 0) / row.length;
      expect(Math.abs(mean)).toBeLessThan(1e-9);
    }
  });
});
