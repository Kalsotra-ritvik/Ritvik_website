/**
 * The standard genetic code (NCBI translation table 1), written out as RNA codons.
 * Used by the translation scene so every codon shown decodes to the amino acid shown.
 */
const BASES = ["U", "C", "A", "G"] as const;
// Amino acids in the canonical UUU, UUC, UUA, ... GGG order of table 1. '*' = stop.
const TABLE_1 = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG";

export const CODON_TABLE: Readonly<Record<string, string>> = (() => {
  const table: Record<string, string> = {};
  let i = 0;
  for (const a of BASES) for (const b of BASES) for (const c of BASES) table[a + b + c] = TABLE_1[i++];
  return table;
})();

export const AMINO_ACID_NAMES: Readonly<Record<string, string>> = {
  A: "Ala", R: "Arg", N: "Asn", D: "Asp", C: "Cys", Q: "Gln", E: "Glu", G: "Gly", H: "His", I: "Ile",
  L: "Leu", K: "Lys", M: "Met", F: "Phe", P: "Pro", S: "Ser", T: "Thr", W: "Trp", Y: "Tyr", V: "Val", "*": "Stop",
};

/**
 * One valid codon per amino acid. This is an illustrative choice for display;
 * it is NOT the native SLC5A2 mRNA sequence, which is not reproduced here.
 */
export const DISPLAY_CODON: Readonly<Record<string, string>> = {
  A: "GCC", R: "CGG", N: "AAC", D: "GAC", C: "UGC", Q: "CAG", E: "GAG", G: "GGC", H: "CAC", I: "AUC",
  L: "CUG", K: "AAG", M: "AUG", F: "UUC", P: "CCC", S: "AGC", T: "ACC", W: "UGG", Y: "UAC", V: "GUG",
};

export function translateCodon(codon: string): string {
  const aa = CODON_TABLE[codon.toUpperCase().replace(/T/g, "U")];
  if (!aa) throw new Error(`Not a codon: ${codon}`);
  return aa;
}

/** Encode a protein sequence with the display codons (illustrative coding sequence). */
export function encodeForDisplay(protein: string): string[] {
  return [...protein].map((aa) => {
    const codon = DISPLAY_CODON[aa];
    if (!codon) throw new Error(`No display codon for ${aa}`);
    return codon;
  });
}
