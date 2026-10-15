/**
 * Form definitions for the admin editors. One generic editor renders these;
 * the Zod schemas in lib/content/schema.ts remain the source of truth for what
 * is valid (checked in the browser for feedback and again on the server).
 */
import {
  ACCENTS,
  CAMERA_PRESETS,
  CREDENTIAL_KINDS,
  DNA_STYLES,
  DOCUMENT_SECTIONS,
  LABEL_IDS,
  LIGHTING_PRESETS,
  PROJECT_STATUSES,
  PROTEIN_MODES,
  STORY_SECTIONS,
  type CollectionName,
} from "@/lib/content/schema";

export type MediaAccept = "image" | "video" | "pdf" | "model" | "any";

interface Base {
  name: string;
  label: string;
  help?: string;
}

export type Field =
  | (Base & { kind: "text"; placeholder?: string; max?: number; required?: boolean })
  | (Base & { kind: "email" | "url" })
  | (Base & { kind: "textarea"; rows?: number; markup?: "inline" | "rich"; max?: number })
  | (Base & { kind: "lines"; rows?: number; itemHelp?: string })
  | (Base & { kind: "select"; options: readonly { value: string; label: string }[] })
  | (Base & { kind: "checkbox" })
  | (Base & { kind: "slider"; min: number; max: number; step: number; unit?: string })
  | (Base & { kind: "color" })
  | (Base & { kind: "asset"; accept: MediaAccept; allowStatic?: boolean })
  | (Base & { kind: "group"; fields: Field[] })
  | (Base & { kind: "repeater"; fields: Field[]; itemLabel: string; newItem: Record<string, unknown>; max?: number })
  | (Base & { kind: "checklist"; options: readonly { value: string; label: string }[] })
  | (Base & { kind: "order"; options: readonly { value: string; label: string }[] });

export interface FormSection {
  title: string;
  description?: string;
  fields: Field[];
}

const opts = <T extends string>(values: readonly T[], labels?: Partial<Record<T, string>>) =>
  values.map((v) => ({ value: v, label: labels?.[v] ?? v }));

const INLINE_HELP = "Supports *italic*, **bold** and [link text](https://…).";
const RICH_HELP = "Separate paragraphs with a blank line. " + INLINE_HELP;

const assetField = (name: string, label: string, accept: MediaAccept, help?: string): Field => ({ kind: "asset", name, label, accept, help, allowStatic: true });
const links = (name = "links", label = "Links"): Field => ({
  kind: "repeater",
  name,
  label,
  itemLabel: "Link",
  newItem: { label: "", href: "" },
  max: 12,
  fields: [
    { kind: "text", name: "label", label: "Label", required: true },
    { kind: "url", name: "href", label: "URL", help: "https://…, mailto:… or a path on this site" },
  ],
});
const visibility: Field = { kind: "checkbox", name: "visible", label: "Show on the website" };

const sceneNote = (prefix = ""): Field[] => [
  { kind: "text", name: `${prefix}sceneNoteTitle`, label: "Scene note title" },
  { kind: "textarea", name: `${prefix}sceneNote`, label: "Scene note", rows: 4, markup: "rich", help: "Explains what the 3D scene shows at this point. " + RICH_HELP },
];
const chapterCore: Field[] = [
  { kind: "text", name: "eyebrow", label: "Eyebrow (small label above the title)" },
  { kind: "textarea", name: "title", label: "Title", rows: 2, markup: "inline", help: "Wrap words in *asterisks* to set them in italic." },
  { kind: "textarea", name: "body", label: "Body text", rows: 6, markup: "rich", help: RICH_HELP },
  ...sceneNote(),
];

export const FORMS: Record<CollectionName, FormSection[]> = {
  profile: [
    {
      title: "Identity",
      fields: [
        { kind: "text", name: "name", label: "Display name", required: true },
        { kind: "text", name: "role", label: "Professional identity", help: "For example “M.Sc. Biotechnology”." },
        { kind: "textarea", name: "tagline", label: "One-line positioning", rows: 2, markup: "inline" },
        { kind: "text", name: "location", label: "Location" },
        { kind: "text", name: "currentStatus", label: "Current position or status" },
        { kind: "text", name: "affiliation", label: "Academic affiliation" },
        { kind: "lines", name: "researchInterests", label: "Research interests", help: "One per line." },
        assetField("profileImage", "Profile image", "image", "Optional. Shown at the top of the About chapter."),
      ],
    },
    {
      title: "Hero",
      fields: [
        { kind: "text", name: "heroEyebrow", label: "Eyebrow" },
        { kind: "textarea", name: "heroIntro", label: "Introduction", rows: 2, markup: "inline" },
        { kind: "textarea", name: "heroIntroMuted", label: "Secondary sentence (muted)", rows: 2, markup: "inline" },
        { kind: "text", name: "heroCtaPrimary", label: "Primary button label", help: "Leave empty to hide the button." },
        { kind: "text", name: "heroCtaCv", label: "CV button label" },
        { kind: "text", name: "heroCtaContact", label: "Contact button label" },
        { kind: "text", name: "heroScrollCue", label: "Scroll cue text" },
      ],
    },
    {
      title: "Biography",
      fields: [
        { kind: "textarea", name: "summary", label: "Professional summary", rows: 8, markup: "rich", help: RICH_HELP },
        { kind: "textarea", name: "goal", label: "Goal / closing statement", rows: 2, markup: "inline" },
        {
          kind: "repeater",
          name: "facts",
          label: "Key facts (About chapter)",
          itemLabel: "Fact",
          newItem: { label: "", value: "" },
          max: 8,
          fields: [
            { kind: "text", name: "label", label: "Label" },
            { kind: "text", name: "value", label: "Value" },
          ],
        },
      ],
    },
    {
      title: "Dissertation",
      description: "Shown in the Folding chapter.",
      fields: [
        {
          kind: "group",
          name: "dissertation",
          label: "Dissertation",
          fields: [
            { kind: "textarea", name: "title", label: "Full title", rows: 2 },
            { kind: "text", name: "shortTitle", label: "Short title" },
            { kind: "text", name: "institute", label: "Institute" },
            { kind: "text", name: "period", label: "Period" },
            { kind: "text", name: "mentor", label: "Mentor" },
          ],
        },
      ],
    },
    {
      title: "Contact & CV",
      fields: [
        { kind: "email", name: "email", label: "Public contact email" },
        { kind: "text", name: "phone", label: "Phone" },
        { kind: "checkbox", name: "showPhone", label: "Show the phone number publicly" },
        links("links", "Professional and research profiles"),
        {
          kind: "group",
          name: "cv",
          label: "CV",
          fields: [
            assetField("asset", "CV file", "pdf", "Upload a new PDF in the media library, then select it here."),
            { kind: "text", name: "label", label: "Button label" },
            { kind: "text", name: "fileName", label: "Download file name" },
          ],
        },
      ],
    },
  ],

  site: [
    {
      title: "Search & sharing",
      fields: [
        { kind: "text", name: "title", label: "Website title", required: true },
        { kind: "textarea", name: "description", label: "Description", rows: 3 },
        { kind: "text", name: "ogTitle", label: "Open Graph title" },
        { kind: "textarea", name: "ogDescription", label: "Open Graph description", rows: 2 },
        assetField("ogImage", "Open Graph preview image", "image", "1200×630 px works best."),
        assetField("favicon", "Favicon", "image", "A square PNG. Leave empty to use the default icon."),
      ],
    },
    {
      title: "Contact section",
      fields: [
        {
          kind: "group",
          name: "contact",
          label: "Contact",
          fields: [
            { kind: "text", name: "eyebrow", label: "Eyebrow" },
            { kind: "textarea", name: "title", label: "Title", rows: 2, markup: "inline" },
            { kind: "textarea", name: "body", label: "Closing message", rows: 4, markup: "rich" },
          ],
        },
      ],
    },
    {
      title: "Footer",
      fields: [
        {
          kind: "group",
          name: "footer",
          label: "Footer",
          fields: [
            { kind: "textarea", name: "attribution", label: "Data attribution and disclaimers", rows: 5, markup: "rich", help: RICH_HELP },
            { kind: "text", name: "builtWith", label: "Built-with line" },
            { kind: "text", name: "copyright", label: "Copyright line" },
          ],
        },
      ],
    },
  ],

  sections: [
    {
      title: "Navigation",
      description: "Links in the top bar, in this order.",
      fields: [
        {
          kind: "repeater",
          name: "nav",
          label: "Navigation links",
          itemLabel: "Link",
          newItem: { target: "projects", label: "", visible: true },
          max: 16,
          fields: [
            {
              kind: "select",
              name: "target",
              label: "Section",
              options: opts([...STORY_SECTIONS, ...DOCUMENT_SECTIONS, "contact"] as const),
            },
            { kind: "text", name: "label", label: "Label", required: true },
            { kind: "checkbox", name: "visible", label: "Visible" },
          ],
        },
      ],
    },
    {
      title: "Portfolio sections",
      description:
        "The scientific story (DNA → transcription → RNA processing → export → translation → folding → structure) always appears first in its biological order and can't be reordered. These sections follow it, in the order below.",
      fields: [
        { kind: "order", name: "documentOrder", label: "Order", options: opts(DOCUMENT_SECTIONS, { projects: "Projects", experience: "Experience & education", skills: "Skills", credentials: "Publications & credentials" }) },
        {
          kind: "group",
          name: "documentVisible",
          label: "Visibility",
          fields: DOCUMENT_SECTIONS.map((id) => ({ kind: "checkbox" as const, name: id, label: `Show ${id}` })),
        },
      ],
    },
    {
      title: "Section headings",
      fields: (["projects", "experience", "education", "skills", "presentations", "learning"] as const).map((id) => ({
        kind: "group" as const,
        name: `headings.${id}`,
        label: id[0].toUpperCase() + id.slice(1),
        fields: [
          { kind: "text" as const, name: "eyebrow", label: "Eyebrow" },
          { kind: "textarea" as const, name: "title", label: "Title", rows: 1, markup: "inline" as const },
          { kind: "textarea" as const, name: "intro", label: "Introduction", rows: 2, markup: "rich" as const },
        ],
      })),
    },
    {
      title: "Story chapter names",
      description: "Short names used for the story chapters (for example in navigation).",
      fields: [{ kind: "group", name: "storyLabels", label: "Chapter names", fields: STORY_SECTIONS.map((s) => ({ kind: "text" as const, name: s, label: s })) }],
    },
  ],

  science: [
    { title: "About chapter", fields: [{ kind: "group", name: "about", label: "About", fields: [{ kind: "text", name: "eyebrow", label: "Eyebrow" }, { kind: "textarea", name: "title", label: "Title", rows: 2, markup: "inline" }, ...sceneNote()] }] },
    {
      title: "Transcription",
      fields: [
        {
          kind: "group",
          name: "transcription",
          label: "Transcription",
          fields: [
            ...chapterCore,
            { kind: "text", name: "trainingEyebrow", label: "Training card eyebrow" },
            { kind: "textarea", name: "trainingTitle", label: "Training card title", rows: 2, markup: "inline" },
            { kind: "textarea", name: "benchIntro", label: "Wet-lab introduction", rows: 2, markup: "inline" },
            { kind: "lines", name: "benchItems", label: "Wet-lab methods shown", help: "One per line." },
          ],
        },
      ],
    },
    {
      title: "Transcriptomics & RNA processing",
      fields: [
        {
          kind: "group",
          name: "transcriptomics",
          label: "Transcriptomics",
          fields: [
            ...chapterCore,
            { kind: "text", name: "currentWorkEyebrow", label: "Current-work card eyebrow" },
            { kind: "text", name: "relatedMethodsLabel", label: "Related methods label (screen readers)" },
            { kind: "lines", name: "relatedMethods", label: "Related methods", help: "One per line." },
            {
              kind: "group",
              name: "legend",
              label: "3D legend",
              fields: [
                { kind: "text", name: "mrna", label: "Protein-coding mRNA" },
                { kind: "text", name: "isoform", label: "Alternative isoform" },
                { kind: "text", name: "ncrna", label: "Non-coding RNA" },
              ],
            },
            { kind: "textarea", name: "legendNote", label: "Legend note", rows: 2, markup: "inline" },
          ],
        },
      ],
    },
    { title: "Nuclear export", fields: [{ kind: "group", name: "export", label: "Export", fields: chapterCore }] },
    {
      title: "Translation",
      fields: [
        {
          kind: "group",
          name: "translation",
          label: "Translation",
          fields: [
            ...chapterCore,
            { kind: "textarea", name: "codonNote", label: "Codon read-out note", rows: 2, markup: "inline" },
            { kind: "text", name: "codonNoteShort", label: "Codon read-out note (phones)" },
            { kind: "text", name: "focusEyebrow", label: "Research-focus eyebrow" },
            { kind: "textarea", name: "focusTitle", label: "Research-focus title", rows: 1, markup: "inline" },
            { kind: "textarea", name: "focusIntro", label: "Research-focus introduction", rows: 3, markup: "rich" },
            {
              kind: "repeater",
              name: "focusItems",
              label: "Research-focus items",
              itemLabel: "Item",
              newItem: { title: "", text: "" },
              max: 8,
              fields: [
                { kind: "text", name: "title", label: "Title" },
                { kind: "textarea", name: "text", label: "Text", rows: 2 },
              ],
            },
          ],
        },
      ],
    },
    { title: "Folding", fields: [{ kind: "group", name: "folding", label: "Folding", fields: [...chapterCore, { kind: "text", name: "dissertationEyebrow", label: "Dissertation card eyebrow" }] }] },
    {
      title: "Structural biology",
      fields: [
        {
          kind: "group",
          name: "structure",
          label: "Structure",
          fields: [
            ...chapterCore,
            { kind: "text", name: "viewerTitle", label: "Viewer title" },
            {
              kind: "group",
              name: "modes",
              label: "Representation descriptions",
              fields: PROTEIN_MODES.map((m) => ({ kind: "textarea" as const, name: m, label: m, rows: 2 })),
            },
            { kind: "text", name: "methodsEyebrow", label: "Methods card eyebrow" },
            { kind: "textarea", name: "methodsTitle", label: "Methods card title", rows: 1, markup: "inline" },
            { kind: "textarea", name: "methodsNote", label: "Methods card note", rows: 2, markup: "inline" },
            { kind: "text", name: "detailsSummary", label: "Structure details: summary line" },
            { kind: "textarea", name: "detailsNote", label: "Structure details: method note", rows: 2, markup: "inline" },
          ],
        },
      ],
    },
  ],

  labels: [
    {
      title: "Scene annotations",
      description:
        "Text of the labels that point at molecules in the 3D scenes. When and where each label appears is fixed by the scientific timeline. To hide a label, use Visual settings → Annotations.",
      fields: LABEL_IDS.map((id) => ({ kind: "text" as const, name: id, label: id })),
    },
  ],

  figures: [
    {
      title: "Transcriptomics figures",
      description: "The figures use simulated data and always carry the badge and notice below.",
      fields: [
        { kind: "text", name: "simulatedBadge", label: "Badge text" },
        { kind: "textarea", name: "simulatedNotice", label: "Notice", rows: 3, markup: "inline" },
        { kind: "group", name: "heatmap", label: "Heatmap", fields: [{ kind: "text", name: "label", label: "Tab label" }, { kind: "textarea", name: "caption", label: "Caption", rows: 4, markup: "rich" }, { kind: "text", name: "axisLabel", label: "Colour-scale label" }] },
        {
          kind: "group",
          name: "volcano",
          label: "Volcano plot",
          fields: [
            { kind: "text", name: "label", label: "Tab label" },
            { kind: "textarea", name: "caption", label: "Caption", rows: 4, markup: "rich" },
            { kind: "text", name: "xLabel", label: "x-axis label" },
            { kind: "text", name: "yLabel", label: "y-axis label" },
          ],
        },
        { kind: "group", name: "coverage", label: "Coverage & splicing", fields: [{ kind: "text", name: "label", label: "Tab label" }, { kind: "textarea", name: "caption", label: "Caption", rows: 4, markup: "rich" }] },
        { kind: "group", name: "isoforms", label: "Isoforms", fields: [{ kind: "text", name: "label", label: "Tab label" }, { kind: "textarea", name: "caption", label: "Caption", rows: 4, markup: "rich" }, { kind: "text", name: "unit", label: "Unit" }] },
      ],
    },
  ],

  visual: [
    {
      title: "Molecular representations",
      fields: [
        { kind: "select", name: "dnaStyle", label: "DNA", options: opts(DNA_STYLES, { smooth: "Smooth (tubes and base-pair slabs)", hybrid: "Smooth with fine particle detail", beads: "Beads (original particle style)" }) },
        { kind: "select", name: "rnaStyle", label: "RNA", options: opts(["smooth", "beads"] as const, { smooth: "Smooth tube", beads: "Beads" }) },
        { kind: "select", name: "ribosomeStyle", label: "Ribosome", options: opts(["surface", "beads"] as const, { surface: "Surface from the structural model", beads: "Schematic beads" }) },
        { kind: "select", name: "proteinMode", label: "Default protein view", options: opts(PROTEIN_MODES, { cartoon: "Cartoon", trace: "Backbone", surface: "Surface", beads: "Beads", site: "Binding site" }) },
      ],
    },
    {
      title: "Lighting & camera",
      fields: [
        { kind: "select", name: "lighting", label: "Lighting preset", options: opts(LIGHTING_PRESETS, { studio: "Studio (neutral)", deep: "Deep (higher contrast)", warm: "Warm" }) },
        { kind: "select", name: "cameraPreset", label: "Camera framing", options: opts(CAMERA_PRESETS, { cinematic: "Cinematic (default)", close: "Closer", wide: "Wider" }) },
        { kind: "slider", name: "bloom", label: "Glow (bloom)", min: 0, max: 1, step: 0.05 },
      ],
    },
    {
      title: "Motion & density",
      fields: [
        { kind: "slider", name: "motionIntensity", label: "Ambient motion", min: 0, max: 1, step: 0.05, help: "Idle rotation, drift and pointer parallax. Visitors who prefer reduced motion always get none." },
        { kind: "slider", name: "transitionSpeed", label: "Scroll response speed", min: 0.5, max: 2, step: 0.05, unit: "×" },
        { kind: "slider", name: "particleDensity", label: "Particle density", min: 0.4, max: 1.5, step: 0.05, unit: "×", help: "Applies to particle-based styles and ambient dust." },
      ],
    },
    {
      title: "Scenes & interaction",
      fields: [
        { kind: "checkbox", name: "showDust", label: "Ambient particles" },
        { kind: "checkbox", name: "showTranscriptPopulation", label: "Transcript population in the transcriptomics chapter" },
        { kind: "checkbox", name: "enableProteinInteraction", label: "Let visitors rotate the protein" },
        { kind: "checkbox", name: "enablePointerParallax", label: "Subtle pointer parallax" },
      ],
    },
    {
      title: "Annotations",
      fields: [
        { kind: "checkbox", name: "showAnnotations", label: "Show scene annotations" },
        { kind: "checklist", name: "hiddenAnnotations", label: "Hide individual annotations", options: opts(LABEL_IDS) },
      ],
    },
    {
      title: "Colours",
      description: "Colours keep their scientific meaning across scenes: DNA strands, RNA, and each protein chain.",
      fields: [
        {
          kind: "group",
          name: "colors",
          label: "Colours",
          fields: [
            { kind: "color", name: "accent", label: "Accent" },
            { kind: "color", name: "dnaCoding", label: "DNA coding strand" },
            { kind: "color", name: "dnaTemplate", label: "DNA template strand" },
            { kind: "color", name: "rna", label: "RNA (exons)" },
            { kind: "color", name: "sglt2", label: "SGLT2 (surface)" },
            { kind: "color", name: "map17", label: "MAP17" },
            { kind: "color", name: "ligand", label: "Ligand (empagliflozin)" },
          ],
        },
      ],
    },
  ],

  education: [
    {
      title: "Degree",
      fields: [
        { kind: "text", name: "degree", label: "Degree or programme", required: true },
        { kind: "text", name: "subject", label: "Subject" },
        { kind: "text", name: "institution", label: "Institution", required: true },
        { kind: "text", name: "location", label: "Location" },
        { kind: "text", name: "period", label: "Dates", placeholder: "2024 – 2026" },
        { kind: "checkbox", name: "current", label: "Currently enrolled" },
        { kind: "textarea", name: "detail", label: "Description", rows: 2, markup: "inline" },
        { kind: "lines", name: "achievements", label: "Selected achievements", help: "One per line." },
        links(),
        assetField("document", "Supporting document", "pdf"),
        visibility,
      ],
    },
  ],

  experience: [
    {
      title: "Position",
      fields: [
        { kind: "text", name: "role", label: "Position", required: true },
        { kind: "text", name: "organisation", label: "Organisation", required: true },
        { kind: "text", name: "location", label: "Location" },
        { kind: "text", name: "period", label: "Dates", placeholder: "January – June 2026, or Ongoing" },
        { kind: "checkbox", name: "current", label: "Ongoing" },
        { kind: "text", name: "mentor", label: "Mentor / supervisor" },
        visibility,
      ],
    },
    {
      title: "Details",
      fields: [
        { kind: "textarea", name: "description", label: "Description", rows: 4, markup: "rich" },
        { kind: "lines", name: "points", label: "Responsibilities", help: "One per line." },
        { kind: "lines", name: "methods", label: "Methods", help: "One per line." },
        { kind: "lines", name: "tools", label: "Tools", help: "One per line." },
        links(),
      ],
    },
  ],

  project: [
    {
      title: "Overview",
      fields: [
        { kind: "text", name: "title", label: "Title", required: true },
        { kind: "text", name: "slug", label: "URL identifier (slug)", help: "Lower-case letters, numbers and hyphens. Used as #project-slug." },
        { kind: "text", name: "category", label: "Category" },
        { kind: "select", name: "accent", label: "Category colour", options: opts(ACCENTS) },
        { kind: "text", name: "researchArea", label: "Research area" },
        { kind: "select", name: "status", label: "Status", options: opts(PROJECT_STATUSES) },
        { kind: "text", name: "context", label: "Context line", placeholder: "M.Sc. dissertation · Institute" },
        { kind: "text", name: "period", label: "Dates" },
        { kind: "checkbox", name: "featured", label: "Featured project (shown with the structure chapter)" },
        visibility,
      ],
    },
    {
      title: "Research",
      fields: [
        { kind: "textarea", name: "summary", label: "Short summary (card)", rows: 2, markup: "inline" },
        { kind: "textarea", name: "objective", label: "Research question or objective", rows: 3, markup: "rich" },
        { kind: "textarea", name: "background", label: "Scientific background", rows: 5, markup: "rich" },
        { kind: "lines", name: "methods", label: "Methods", help: "One per line." },
        { kind: "textarea", name: "workflow", label: "Analytical workflow", rows: 5, markup: "rich" },
        { kind: "lines", name: "tools", label: "Tools and technologies", help: "One per line." },
        { kind: "lines", name: "contribution", label: "Personal contribution", help: "One per line." },
      ],
    },
    {
      title: "Results & sources",
      description: "Only add results that are supported by actual material. Empty fields are hidden on the site.",
      fields: [
        { kind: "textarea", name: "results", label: "Results or conclusions", rows: 5, markup: "rich" },
        { kind: "textarea", name: "datasets", label: "Datasets and provenance", rows: 4, markup: "rich" },
        { kind: "textarea", name: "note", label: "Note on missing information", rows: 2, markup: "inline" },
        { kind: "url", name: "repoUrl", label: "Repository URL" },
        { kind: "url", name: "publicationUrl", label: "Publication or presentation URL" },
        links("links", "Other links"),
      ],
    },
    {
      title: "Media",
      fields: [
        assetField("cardImage", "Card image", "image"),
        {
          kind: "repeater",
          name: "media",
          label: "Images and media",
          itemLabel: "Media item",
          newItem: { asset: { mediaId: null, src: "", alt: "" }, caption: "" },
          max: 12,
          fields: [assetField("asset", "File", "any"), { kind: "text", name: "caption", label: "Caption" }],
        },
      ],
    },
  ],

  skillGroup: [
    {
      title: "Skill group",
      fields: [
        { kind: "text", name: "label", label: "Group name", required: true },
        visibility,
        {
          kind: "repeater",
          name: "items",
          label: "Skills",
          itemLabel: "Skill",
          newItem: { name: "", visible: true },
          max: 60,
          fields: [
            { kind: "text", name: "name", label: "Name", required: true },
            { kind: "checkbox", name: "visible", label: "Visible" },
          ],
        },
      ],
    },
  ],

  credential: [
    {
      title: "Record",
      fields: [
        { kind: "select", name: "kind", label: "Type", options: opts(CREDENTIAL_KINDS) },
        { kind: "text", name: "title", label: "Title", required: true },
        { kind: "text", name: "contributors", label: "Authors or contributors" },
        { kind: "text", name: "issuer", label: "Venue, issuer or publisher" },
        { kind: "text", name: "date", label: "Date or year" },
        { kind: "text", name: "doi", label: "DOI", placeholder: "10.xxxx/…" },
        { kind: "url", name: "url", label: "External link" },
        assetField("document", "Document", "pdf"),
        { kind: "textarea", name: "description", label: "Description", rows: 3, markup: "rich" },
        visibility,
      ],
    },
  ],
};

export interface AdminRoute {
  route: string;
  collection: CollectionName;
  title: string;
  description: string;
  list: boolean;
  previewAnchor?: string;
  /** Singular noun for list items. */
  noun?: string;
}

export const ADMIN_ROUTES: Record<string, AdminRoute> = {
  profile: { route: "profile", collection: "profile", title: "Profile & hero", description: "Name, introduction, biography, dissertation, contact details, profile links and the CV.", list: false, previewAnchor: "hero" },
  projects: { route: "projects", collection: "project", title: "Projects", description: "Research projects shown in the Projects section. The featured project also supplies the methods card in the structure chapter.", list: true, previewAnchor: "projects", noun: "project" },
  experience: { route: "experience", collection: "experience", title: "Experience", description: "Research positions, internships and training.", list: true, previewAnchor: "experience", noun: "position" },
  education: { route: "education", collection: "education", title: "Education", description: "Degrees and programmes, shown with Experience.", list: true, previewAnchor: "experience", noun: "degree" },
  skills: { route: "skills", collection: "skillGroup", title: "Skills", description: "Skill groups and the skills inside them. Rename, reorder or hide groups and individual skills.", list: true, previewAnchor: "skills", noun: "skill group" },
  credentials: { route: "credentials", collection: "credential", title: "Publications & credentials", description: "Publications, posters, presentations, certifications, workshops and awards.", list: true, previewAnchor: "credentials", noun: "record" },
  science: { route: "science", collection: "science", title: "Scientific text", description: "Chapter titles, explanations and scene notes of the molecular story. Keep explanations accurate: they describe what each 3D scene shows.", list: false, previewAnchor: "foundations" },
  annotations: { route: "annotations", collection: "labels", title: "Scene annotations", description: "Text of the labels attached to molecules in the 3D scenes.", list: false, previewAnchor: "foundations" },
  figures: { route: "figures", collection: "figures", title: "Figures", description: "Captions, axis labels and the simulated-data notice of the transcriptomics figures.", list: false, previewAnchor: "transcriptome" },
  sections: { route: "sections", collection: "sections", title: "Navigation & sections", description: "Top navigation, order and visibility of the portfolio sections, and section headings.", list: false },
  site: { route: "site", collection: "site", title: "Contact, footer & SEO", description: "Website title and description, sharing image, favicon, the contact section and footer text.", list: false, previewAnchor: "contact" },
  visual: { route: "visual", collection: "visual", title: "Visual settings", description: "Molecular representation styles, lighting, colours, motion and annotations. Every control is limited to safe ranges.", list: false, previewAnchor: "foundations" },
};
