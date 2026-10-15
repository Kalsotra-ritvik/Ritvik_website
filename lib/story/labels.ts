/**
 * Leader-line annotations attached to 3D anchors.
 *
 * Each label belongs to one or more story chapters (`stages`) and is visible
 * over a story-time range that must lie inside those chapters (enforced by
 * tests/story.test.ts), so a label can never outlive the process it names.
 * The engine also multiplies by the visibility of the labelled object itself.
 * Label text is editable content (lib/content/schema.ts, "labels").
 *
 * `primary` labels stay on small screens; the rest are hidden there.
 */
import type { ChapterId } from "./chapters";
import type { LabelId } from "@/lib/content/schema";

export interface SceneLabel {
  id: LabelId;
  stages: ChapterId[];
  range: [number, number];
  primary?: boolean;
  /** Place text to the left of the anchor. */
  flip?: boolean;
  /** Compact single-letter site markers. */
  marker?: boolean;
}

export const SCENE_LABELS: readonly SceneLabel[] = [
  { id: "polymerase", stages: ["about", "foundations"], range: [0.72, 1.85], primary: true },
  { id: "template", stages: ["about", "foundations"], range: [0.8, 1.6] },
  { id: "rna5", stages: ["foundations"], range: [1.25, 1.95], primary: true },
  { id: "cap", stages: ["transcriptome"], range: [2.18, 2.62], flip: true },
  { id: "intron", stages: ["transcriptome"], range: [2.32, 2.62], primary: true },
  { id: "polyA", stages: ["transcriptome"], range: [2.25, 2.62] },
  { id: "mrna", stages: ["transcriptome"], range: [2.6, 2.84], primary: true },
  { id: "isoform", stages: ["transcriptome"], range: [2.6, 2.84] },
  { id: "ncrna", stages: ["transcriptome"], range: [2.6, 2.84], primary: true, flip: true },
  { id: "pore", stages: ["export"], range: [2.9, 3.26], primary: true },
  { id: "small", stages: ["translation"], range: [3.32, 3.56], flip: true },
  { id: "large", stages: ["translation"], range: [3.5, 3.72], flip: true },
  { id: "siteE", stages: ["translation"], range: [3.6, 3.98], marker: true },
  { id: "siteP", stages: ["translation"], range: [3.6, 3.98], marker: true },
  { id: "siteA", stages: ["translation"], range: [3.6, 3.98], marker: true },
  { id: "trna", stages: ["translation"], range: [3.6, 3.95], primary: true, flip: true },
  { id: "tunnel", stages: ["translation"], range: [3.66, 4.0], primary: true },
  { id: "chain", stages: ["folding"], range: [4.08, 4.42], primary: true },
  { id: "helix", stages: ["folding"], range: [4.62, 4.96], primary: true },
  { id: "sglt2", stages: ["structure"], range: [5.04, 5.97] },
  { id: "ligand", stages: ["structure"], range: [5.04, 5.97], primary: true },
  { id: "map17", stages: ["structure"], range: [5.04, 5.97], flip: true },
];
