/**
 * The scroll story is driven by one scalar, "story time" t.
 *
 *  0   DNA double helix (hero)
 *  1   RNA polymerase bound, transcription bubble open
 *  2   Elongation complete, nascent pre-mRNA released
 *  2.85 Processed mRNA leaves the transcriptome view
 *  3.3  mRNA exported through a nuclear pore into the cytoplasm
 *  4   Ribosome has translated the first codons
 *  5   Polypeptide folded into the SGLT2 structure (PDB 7VSI)
 *  6   Interactive structure view
 *  7   Closing composition (contact)
 *
 * Each dark chapter in the page maps its scroll range onto a t interval.
 * Light "document" sections hold t steady and cover the canvas, so rendering pauses there.
 */
export type ChapterId =
  | "hero"
  | "about"
  | "foundations"
  | "transcriptome"
  | "export"
  | "translation"
  | "folding"
  | "structure"
  | "projects"
  | "experience"
  | "skills"
  | "credentials"
  | "contact";

export interface Chapter {
  id: ChapterId;
  label: string;
  /** Story time when the chapter's reference line enters / leaves. */
  t: [number, number];
  /** Stable, resolved state used for reduced motion. */
  rest: number;
  /** True when the section is opaque and covers the 3D canvas. */
  opaque?: boolean;
  /** Show in the top navigation. */
  nav?: boolean;
}

export const CHAPTERS: readonly Chapter[] = [
  { id: "hero", label: "Home", t: [-0.5, 0.5], rest: 0 },
  { id: "about", label: "About", t: [0.5, 1], rest: 1, nav: true },
  { id: "foundations", label: "Transcription", t: [1, 2], rest: 1.8 },
  { id: "transcriptome", label: "Transcriptomics", t: [2, 2.85], rest: 2.7, nav: true },
  { id: "export", label: "Export", t: [2.85, 3.3], rest: 3.15 },
  { id: "translation", label: "Translation", t: [3.3, 4], rest: 3.8 },
  { id: "folding", label: "Folding", t: [4, 5], rest: 5 },
  { id: "structure", label: "Structure", t: [5, 6], rest: 5.6, nav: true },
  { id: "projects", label: "Projects", t: [6, 6], rest: 6, opaque: true, nav: true },
  { id: "experience", label: "Experience", t: [6, 6], rest: 6, opaque: true, nav: true },
  { id: "skills", label: "Skills", t: [6, 6], rest: 6, opaque: true, nav: true },
  { id: "credentials", label: "Credentials", t: [6, 6], rest: 6, opaque: true },
  { id: "contact", label: "Contact", t: [6, 7], rest: 7, nav: true },
];

export const T_MAX = 7;

/** Linear 0..1 progress of x through [a, b]. */
export function seg(x: number, a: number, b: number): number {
  if (b === a) return x >= b ? 1 : 0;
  return Math.min(1, Math.max(0, (x - a) / (b - a)));
}

export function smooth(x: number): number {
  return x * x * (3 - 2 * x);
}

export function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

export function easeOutCubic(x: number): number {
  return 1 - (1 - x) ** 3;
}

/** Smoothed progress of x through [a, b]. */
export function sseg(x: number, a: number, b: number): number {
  return smooth(seg(x, a, b));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface SectionMetrics {
  id: ChapterId;
  top: number;
  height: number;
}

/**
 * Map a scroll position to story time. The reference line is the viewport centre:
 * a chapter's progress runs from 0 when its top crosses the centre to 1 when its
 * bottom does.
 */
function byTop(sections: readonly SectionMetrics[]) {
  return [...sections].sort((a, b) => a.top - b.top);
}

export function storyTimeAt(scrollY: number, viewportHeight: number, sections: readonly SectionMetrics[]): number {
  if (sections.length === 0) return 0;
  const line = scrollY + viewportHeight * 0.5;
  const sorted = byTop(sections);
  let active = sorted[0];
  for (const s of sorted) if (line >= s.top) active = s;
  const chapter = CHAPTERS.find((c) => c.id === active.id);
  if (!chapter) return 0;
  const local = Math.min(1, Math.max(0, (line - active.top) / Math.max(1, active.height)));
  return Math.max(0, lerp(chapter.t[0], chapter.t[1], local));
}

export function chapterAt(scrollY: number, viewportHeight: number, sections: readonly SectionMetrics[]): Chapter {
  const line = scrollY + viewportHeight * 0.5;
  const sorted = byTop(sections);
  let active = sorted[0];
  for (const s of sorted) if (line >= s.top) active = s;
  return CHAPTERS.find((c) => c.id === active?.id) ?? CHAPTERS[0];
}
