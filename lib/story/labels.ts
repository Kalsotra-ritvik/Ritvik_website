/**
 * Leader-line annotations attached to 3D anchors. Each is visible over a story-time range.
 * `primary` labels are kept on small screens; the rest are hidden there to avoid clutter.
 */
export interface SceneLabel {
  id: string;
  text: string;
  range: [number, number];
  primary?: boolean;
  /** Place text to the left of the anchor. */
  flip?: boolean;
}

export const SCENE_LABELS: readonly SceneLabel[] = [
  { id: "template", text: "Template strand", range: [0.8, 1.6] },
  { id: "polymerase", text: "RNA polymerase (schematic)", range: [0.72, 1.85], primary: true },
  { id: "rna5", text: "Nascent RNA, 5′ end", range: [1.25, 1.95], primary: true },
  { id: "cap", text: "5′ cap", range: [2.18, 2.62], flip: true },
  { id: "intron", text: "Intron removed as a lariat", range: [2.32, 2.62], primary: true },
  { id: "polyA", text: "Poly(A) tail", range: [2.25, 2.62] },
  { id: "mrna", text: "Protein-coding mRNA", range: [2.6, 2.95], primary: true },
  { id: "isoform", text: "Alternative isoform (exon skipped)", range: [2.6, 2.95] },
  { id: "ncrna", text: "Non-coding RNA (not translated)", range: [2.6, 2.95], primary: true, flip: true },
  { id: "pore", text: "Nuclear pore complex", range: [3.02, 3.32], primary: true },
  { id: "small", text: "Small ribosomal subunit", range: [3.26, 3.55], flip: true },
  { id: "large", text: "Large subunit", range: [3.48, 3.72], flip: true },
  { id: "siteE", text: "E", range: [3.6, 3.98] },
  { id: "siteP", text: "P", range: [3.6, 3.98] },
  { id: "siteA", text: "A", range: [3.6, 3.98] },
  { id: "trna", text: "tRNA", range: [3.6, 3.95], primary: true, flip: true },
  { id: "tunnel", text: "Nascent chain leaves the exit tunnel", range: [3.66, 4.05], primary: true },
  { id: "chain", text: "Unfolded polypeptide", range: [4.12, 4.42], primary: true },
  { id: "helix", text: "α-helix", range: [4.62, 4.95], primary: true },
  { id: "ligand", text: "Empagliflozin (as bound in 7VSI)", range: [5.04, 5.97], primary: true },
  { id: "map17", text: "MAP17 subunit", range: [5.04, 5.97], flip: true },
];
