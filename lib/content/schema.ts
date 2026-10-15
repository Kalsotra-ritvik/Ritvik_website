/**
 * Content model shared by the public site, the admin forms and server-side validation.
 *
 * Text conventions (rendered by lib/content/markup.tsx, never as raw HTML):
 *  - "inline" fields support *italic*, **bold** and [label](https://link).
 *  - "rich" fields add paragraphs separated by a blank line.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Allowed link targets: http(s), mailto:, site-relative paths and in-page anchors. */
export function isSafeHref(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (v.startsWith("#")) return /^#[A-Za-z0-9_.~-]*$/.test(v);
  if (v.startsWith("/")) return !v.startsWith("//") && !/[\s\\]/.test(v);
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" || u.protocol === "mailto:";
  } catch {
    return false;
  }
}

// Strip control characters (except tab/newline) so stored text stays printable.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();

export const plain = (max = 200) => z.string().max(max).transform(clean);
export const inline = (max = 400) => z.string().max(max).transform(clean);
export const rich = (max = 6000) => z.string().max(max).transform(clean);
export const href = z
  .string()
  .max(1000)
  .transform(clean)
  .refine(isSafeHref, { message: "Use an https:// link, a mailto: address or a path starting with /" });
export const requiredHref = href.refine((v) => v.length > 0, { message: "Required" });
export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #f0c27a");
const list = <T extends z.ZodType>(item: T, max = 40) => z.array(item).max(max);
const tags = (max = 60) => list(plain(120), max);
/** Bullet lists of full sentences. */
const sentences = (max = 20) => list(plain(500), max);

export const linkSchema = z.object({ label: plain(80).pipe(z.string().min(1, "Required")), href: requiredHref });
export type LinkItem = z.infer<typeof linkSchema>;

/** Reference to a media-library item, or a bundled static file. */
export const assetSchema = z.object({
  mediaId: z.uuid().nullable(),
  src: href,
  alt: plain(300),
});
export type AssetRef = z.infer<typeof assetSchema>;
export const emptyAsset: AssetRef = { mediaId: null, src: "", alt: "" };

const listMeta = { visible: z.boolean(), order: z.number().int().min(0).max(100000) };

// ---------------------------------------------------------------------------
// Singletons
// ---------------------------------------------------------------------------

export const profileSchema = z.object({
  name: plain(120).pipe(z.string().min(1, "Required")),
  role: plain(120),
  tagline: inline(300),
  location: plain(120),
  heroEyebrow: plain(120),
  heroIntro: inline(400),
  heroIntroMuted: inline(300),
  heroCtaPrimary: plain(40),
  heroCtaCv: plain(40),
  heroCtaContact: plain(40),
  heroScrollCue: plain(80),
  summary: rich(4000),
  goal: inline(600),
  researchInterests: tags(20),
  currentStatus: plain(240),
  affiliation: plain(240),
  facts: list(z.object({ label: plain(40), value: plain(240) }), 8),
  profileImage: assetSchema,
  email: z.union([z.literal(""), z.email().max(200)]),
  phone: plain(40),
  showPhone: z.boolean(),
  links: list(linkSchema, 12),
  cv: z.object({ asset: assetSchema, label: plain(40), fileName: plain(120) }),
  dissertation: z.object({
    title: plain(400),
    shortTitle: plain(300),
    institute: plain(200),
    period: plain(80),
    mentor: plain(160),
  }),
});
export type Profile = z.infer<typeof profileSchema>;

const sceneNote = { sceneNoteTitle: plain(80), sceneNote: rich(1500) };
const chapterCore = { eyebrow: plain(60), title: inline(160), body: rich(3000), ...sceneNote };

export const scienceSchema = z.object({
  about: z.object({ eyebrow: plain(60), title: inline(160), ...sceneNote }),
  transcription: z.object({
    ...chapterCore,
    trainingEyebrow: plain(60),
    trainingTitle: inline(200),
    benchIntro: inline(300),
    benchItems: tags(20),
  }),
  transcriptomics: z.object({
    ...chapterCore,
    currentWorkEyebrow: plain(60),
    relatedMethodsLabel: plain(80),
    relatedMethods: tags(20),
    legend: z.object({ mrna: plain(200), isoform: plain(200), ncrna: plain(200) }),
    legendNote: inline(400),
  }),
  export: z.object({ ...chapterCore }),
  translation: z.object({
    ...chapterCore,
    codonNote: inline(400),
    codonNoteShort: plain(160),
    focusEyebrow: plain(60),
    focusTitle: inline(200),
    focusIntro: rich(800),
    focusItems: list(z.object({ title: plain(80), text: plain(300) }), 8),
  }),
  folding: z.object({ ...chapterCore, dissertationEyebrow: plain(80) }),
  structure: z.object({
    ...chapterCore,
    viewerTitle: plain(80),
    modes: z.object({ cartoon: plain(300), trace: plain(300), site: plain(300) }),
    methodsEyebrow: plain(80),
    methodsTitle: inline(160),
    methodsNote: inline(500),
    detailsSummary: plain(120),
    detailsNote: inline(500),
  }),
});
export type Science = z.infer<typeof scienceSchema>;

export const LABEL_IDS = [
  "template",
  "polymerase",
  "rna5",
  "cap",
  "intron",
  "polyA",
  "mrna",
  "isoform",
  "ncrna",
  "pore",
  "small",
  "large",
  "siteE",
  "siteP",
  "siteA",
  "trna",
  "tunnel",
  "chain",
  "helix",
  "ligand",
  "map17",
  "sglt2",
] as const;
export type LabelId = (typeof LABEL_IDS)[number];
export const labelsSchema = z.object(Object.fromEntries(LABEL_IDS.map((id) => [id, plain(80)])) as Record<LabelId, ReturnType<typeof plain>>);
export type Labels = z.infer<typeof labelsSchema>;

export const figuresSchema = z.object({
  simulatedBadge: plain(40),
  simulatedNotice: inline(400),
  heatmap: z.object({ label: plain(60), caption: rich(800), axisLabel: plain(40) }),
  volcano: z.object({ label: plain(60), caption: rich(800), xLabel: plain(60), yLabel: plain(60) }),
  coverage: z.object({ label: plain(60), caption: rich(800) }),
  isoforms: z.object({ label: plain(60), caption: rich(800), unit: plain(40) }),
});
export type Figures = z.infer<typeof figuresSchema>;

/** Story chapters follow the biological sequence; only their labels are editable. */
export const STORY_SECTIONS = ["hero", "about", "foundations", "transcriptome", "export", "translation", "folding", "structure"] as const;
/** Document sections can be reordered and hidden. */
export const DOCUMENT_SECTIONS = ["projects", "experience", "skills", "credentials"] as const;
export type StorySectionId = (typeof STORY_SECTIONS)[number];
export type DocumentSectionId = (typeof DOCUMENT_SECTIONS)[number];
export type SectionId = StorySectionId | DocumentSectionId | "contact";

const sectionHeading = z.object({ eyebrow: plain(60), title: inline(160), intro: rich(800) });

export const sectionsSchema = z.object({
  nav: list(
    z.object({
      target: z.enum([...STORY_SECTIONS, ...DOCUMENT_SECTIONS, "contact"]),
      label: plain(40).pipe(z.string().min(1, "Required")),
      visible: z.boolean(),
    }),
    16,
  ),
  documentOrder: z.array(z.enum(DOCUMENT_SECTIONS)).length(DOCUMENT_SECTIONS.length),
  documentVisible: z.object({ projects: z.boolean(), experience: z.boolean(), skills: z.boolean(), credentials: z.boolean() }),
  headings: z.object({
    projects: sectionHeading,
    experience: sectionHeading,
    education: sectionHeading,
    skills: sectionHeading,
    presentations: sectionHeading,
    learning: sectionHeading,
  }),
  storyLabels: z.object(Object.fromEntries(STORY_SECTIONS.map((s) => [s, plain(40)])) as Record<StorySectionId, ReturnType<typeof plain>>),
});
export type Sections = z.infer<typeof sectionsSchema>;

export const siteSchema = z.object({
  title: plain(120).pipe(z.string().min(1, "Required")),
  description: plain(300),
  ogTitle: plain(120),
  ogDescription: plain(300),
  ogImage: assetSchema,
  favicon: assetSchema,
  contact: z.object({ eyebrow: plain(60), title: inline(160), body: rich(1200) }),
  footer: z.object({ attribution: rich(1500), builtWith: plain(200), copyright: plain(120), adminLink: plain(40) }),
});
export type Site = z.infer<typeof siteSchema>;

export const PROTEIN_MODES = ["cartoon", "trace", "site"] as const;
export const CAMERA_PRESETS = ["cinematic", "close", "wide"] as const;
export type ProteinMode = (typeof PROTEIN_MODES)[number];

export const visualSchema = z.object({
  // Older stored values (e.g. "surface") fall back to the cartoon view.
  proteinMode: z.enum(PROTEIN_MODES).catch("cartoon"),
  cameraPreset: z.enum(CAMERA_PRESETS),
  bloom: z.number().min(0).max(1),
  particleDensity: z.number().min(0.4).max(1.5),
  motionIntensity: z.number().min(0).max(1),
  transitionSpeed: z.number().min(0.5).max(2),
  showAnnotations: z.boolean(),
  hiddenAnnotations: z.array(z.enum(LABEL_IDS)).max(LABEL_IDS.length),
  showDust: z.boolean(),
  showTranscriptPopulation: z.boolean(),
  enableProteinInteraction: z.boolean(),
  enablePointerParallax: z.boolean(),
  colors: z.object({
    accent: hexColor,
    dnaCoding: hexColor,
    dnaTemplate: hexColor,
    rna: hexColor,
    map17: hexColor,
    ligand: hexColor,
  }),
});
export type VisualSettings = z.infer<typeof visualSchema>;

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export const educationSchema = z.object({
  degree: plain(160).pipe(z.string().min(1, "Required")),
  subject: plain(160),
  institution: plain(200).pipe(z.string().min(1, "Required")),
  location: plain(160),
  period: plain(80),
  current: z.boolean(),
  detail: inline(500),
  achievements: sentences(12),
  links: list(linkSchema, 6),
  document: assetSchema,
  ...listMeta,
});
export type Education = z.infer<typeof educationSchema>;

export const experienceSchema = z.object({
  role: plain(160).pipe(z.string().min(1, "Required")),
  organisation: plain(200).pipe(z.string().min(1, "Required")),
  location: plain(160),
  period: plain(80),
  current: z.boolean(),
  description: rich(1500),
  points: sentences(16),
  methods: tags(20),
  tools: tags(20),
  mentor: plain(160),
  links: list(linkSchema, 6),
  ...listMeta,
});
export type Experience = z.infer<typeof experienceSchema>;

export const PROJECT_STATUSES = ["Completed", "Ongoing", "Presented", "Planned"] as const;
export const ACCENTS = ["blue", "amber", "violet", "teal", "coral"] as const;

export const projectSchema = z.object({
  title: plain(240).pipe(z.string().min(1, "Required")),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lower-case letters, numbers and hyphens"),
  category: plain(80),
  accent: z.enum(ACCENTS),
  researchArea: plain(160),
  status: z.enum(PROJECT_STATUSES),
  context: plain(240),
  period: plain(80),
  summary: inline(500),
  objective: rich(1500),
  background: rich(3000),
  methods: sentences(20),
  workflow: rich(3000),
  tools: tags(30),
  contribution: sentences(12),
  results: rich(3000),
  datasets: rich(1500),
  media: list(z.object({ asset: assetSchema, caption: plain(300) }), 12),
  cardImage: assetSchema,
  repoUrl: href,
  publicationUrl: href,
  links: list(linkSchema, 8),
  note: inline(600),
  featured: z.boolean(),
  ...listMeta,
});
export type Project = z.infer<typeof projectSchema>;

export const skillGroupSchema = z.object({
  label: plain(80).pipe(z.string().min(1, "Required")),
  items: list(z.object({ name: plain(120).pipe(z.string().min(1, "Required")), visible: z.boolean() }), 60),
  ...listMeta,
});
export type SkillGroup = z.infer<typeof skillGroupSchema>;

export const CREDENTIAL_KINDS = ["Publication", "Poster", "Presentation", "Conference", "Certificate", "Workshop", "Award"] as const;
export const credentialSchema = z.object({
  kind: z.enum(CREDENTIAL_KINDS),
  title: plain(400).pipe(z.string().min(1, "Required")),
  contributors: plain(400),
  issuer: plain(300),
  date: plain(60),
  doi: z.union([z.literal(""), z.string().regex(/^10\.\d{4,9}\/\S+$/, "A DOI looks like 10.1038/xxxx")]),
  url: href,
  document: assetSchema,
  description: rich(1200),
  ...listMeta,
});
export type Credential = z.infer<typeof credentialSchema>;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const SINGLETONS = {
  profile: profileSchema,
  science: scienceSchema,
  labels: labelsSchema,
  figures: figuresSchema,
  sections: sectionsSchema,
  site: siteSchema,
  visual: visualSchema,
} as const;

export const LISTS = {
  education: educationSchema,
  experience: experienceSchema,
  project: projectSchema,
  skillGroup: skillGroupSchema,
  credential: credentialSchema,
} as const;

export type SingletonName = keyof typeof SINGLETONS;
export type ListName = keyof typeof LISTS;
export type CollectionName = SingletonName | ListName;

export const COLLECTIONS = [...Object.keys(SINGLETONS), ...Object.keys(LISTS)] as CollectionName[];

export function isCollection(name: string): name is CollectionName {
  return (COLLECTIONS as string[]).includes(name);
}
export function isSingleton(name: string): name is SingletonName {
  return name in SINGLETONS;
}
export function schemaFor(name: CollectionName): z.ZodType {
  return isSingleton(name) ? SINGLETONS[name] : LISTS[name as ListName];
}

export interface SiteContent {
  profile: Profile;
  science: Science;
  labels: Labels;
  figures: Figures;
  sections: Sections;
  site: Site;
  visual: VisualSettings;
  education: Education[];
  experience: Experience[];
  projects: Project[];
  skillGroups: SkillGroup[];
  credentials: Credential[];
  /** Resolved public URLs for media-library assets, keyed by media id. */
  media: Record<string, { url: string; mime: string; alt: string | null }>;
}
