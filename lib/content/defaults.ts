/**
 * Default content: the original CV-derived portfolio content and all site copy.
 *
 * Used to seed the database (npm run db:seed) and as the fallback when no
 * database is configured. Every fact comes from "Ritvik_Kalsotra_CV_Final.pdf"
 * (October 2026). After seeding, edit content in the admin dashboard instead.
 */
import type {
  Credential,
  Education,
  Experience,
  Figures,
  Labels,
  Profile,
  Project,
  Science,
  Sections,
  Site,
  SiteContent,
  SkillGroup,
  VisualSettings,
} from "./schema";
import { emptyAsset } from "./schema";

const asset = (src = "", alt = "") => ({ mediaId: null, src, alt });

export const defaultProfile: Profile = {
  name: "Ritvik Kalsotra",
  role: "M.Sc. Biotechnology",
  tagline: "Structural bioinformatics, molecular modelling and transcriptomics",
  location: "India",
  heroEyebrow: "Portfolio · M.Sc. Biotechnology",
  heroIntro: "Structural bioinformatics and computational drug discovery, now extending into transcriptomics.",
  heroIntroMuted: "A scroll-through story from DNA sequence to protein structure.",
  heroCtaPrimary: "Begin",
  heroCtaCv: "Download CV",
  heroCtaContact: "Contact",
  heroScrollCue: "DNA → RNA → protein → structure",
  summary:
    "I am an M.Sc. Biotechnology student at Lovely Professional University, Punjab, with a foundation in structural bioinformatics, molecular modelling and computational drug discovery.\n\nMy dissertation at CSIR–Central Drug Research Institute, Lucknow, combined machine learning with structure-based methods to look for selective and potent SGLT2 inhibitors. I am now in a skill development programme in transcriptomics and bioinformatics tool development at CSIR–Institute of Himalayan Bioresource Technology, Palampur.",
  goal: "I aim to pursue a PhD in structural bioinformatics and contribute computational approaches to rational drug design.",
  researchInterests: [
    "Structural bioinformatics",
    "Structure-based drug discovery",
    "Molecular dynamics",
    "Machine learning for binding-affinity prediction",
    "Transcriptomics (RNA-seq)",
  ],
  currentStatus: "Skill Development Programme Trainee, CSIR–IHBT, Palampur",
  affiliation: "Lovely Professional University, Phagwara, Punjab",
  facts: [
    { label: "Now", value: "Skill Development Programme Trainee, CSIR–Institute of Himalayan Bioresource Technology (IHBT)" },
    { label: "Dissertation", value: "CSIR–Central Drug Research Institute, Lucknow · January – June 2026" },
    { label: "Degree", value: "M.Sc. Biotechnology, Lovely Professional University · 2024 – 2026" },
    { label: "Aim", value: "PhD in structural bioinformatics" },
  ],
  profileImage: { ...emptyAsset },
  email: "kalsotraritvik@gmail.com",
  phone: "+91 9418775921",
  showPhone: false,
  links: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/ritvik-kalsotra-227959308" }],
  cv: { asset: asset("/cv/Ritvik_Kalsotra_CV.pdf", "CV of Ritvik Kalsotra (PDF)"), label: "Download CV", fileName: "Ritvik_Kalsotra_CV.pdf" },
  dissertation: {
    title: "Integrated machine learning & structure-based approach for identification of selective and potent SGLT2 inhibitors",
    shortTitle: "AI/ML and structural bioinformatics to identify a potential SGLT2 inhibitor",
    institute: "CSIR–Central Drug Research Institute, Lucknow",
    period: "January – June 2026",
    mentor: "Dr. Mohammad Imran Siddiqi, Scientist G",
  },
};

export const defaultScience: Science = {
  about: {
    eyebrow: "About",
    title: "From sequence *to structure*",
    sceneNoteTitle: "In the scene",
    sceneNote:
      "A DNA double helix drawn with B-form proportions (about 10.5 base pairs per turn, with distinct major and minor grooves). RNA polymerase now binds and separates a short stretch of the two strands — the transcription bubble. The base sequence is schematic, not a real gene.",
  },
  transcription: {
    eyebrow: "Transcription",
    title: "Reading the *template*",
    body: "RNA polymerase travels along the template strand, adding one nucleotide for every base pair it passes. The RNA it builds runs 5′→3′ and matches the coding strand, with uracil in place of thymine. Behind the enzyme the DNA zips back together.",
    sceneNoteTitle: "In the scene",
    sceneNote:
      "The template strand is highlighted in blue. The enzyme is a schematic shell, cut away so the open bubble and the newly made RNA (amber) are visible; it advances exactly one base pair per nucleotide added. Molecules are not drawn to scale.",
    trainingEyebrow: "Training",
    trainingTitle: "Biotechnology, at the bench and on the command line",
    benchIntro: "Wet-lab methods from the CV that sit closest to this part of the story:",
    benchItems: [
      "DNA and RNA isolation",
      "PCR and primer handling",
      "Agarose gel electrophoresis",
      "Spectrophotometric analysis",
      "Protein estimation techniques",
      "Cell culture handling",
    ],
  },
  transcriptomics: {
    eyebrow: "Transcriptomics",
    title: "Many transcripts, *one snapshot*",
    body: "The new RNA is processed before it leaves the nucleus: a 5′ cap is added, introns are spliced out and the exons joined, and a poly(A) tail is added at the 3′ end.\n\nA cell holds many such molecules from thousands of genes, plus RNAs that are never translated. RNA-seq samples this whole population: it sequences RNA fragments and counts them per gene and per isoform, giving a snapshot of which genes are active.",
    sceneNoteTitle: "Reading the scene",
    sceneNote: "",
    currentWorkEyebrow: "Current work",
    relatedMethodsLabel: "Related methods from the CV",
    relatedMethods: ["Network pharmacogenomics", "NGS and transcriptomics (RNA-seq analysis)", "Bioinformatics tool and pipeline development"],
    legend: {
      mrna: "Protein-coding mRNA",
      isoform: "Alternative isoform — middle exon skipped (shorter molecule)",
      ncrna: "Non-coding RNA — hairpin shape, not translated",
    },
    legendNote: "The number of copies of each molecule stands for that gene's expression level. Counts and lengths are illustrative.",
  },
  export: {
    eyebrow: "Export",
    title: "Through the *nuclear pore*",
    body: "Only the processed message leaves the nucleus. Packaged with export proteins, the mature mRNA passes through a nuclear pore complex — a large channel through the double membrane of the nuclear envelope — and enters the cytoplasm 5′ end first.",
    sceneNoteTitle: "In the scene",
    sceneNote:
      "The pore is drawn as a schematic ring with the complex's eight-fold symmetry; the real complex is assembled from roughly thirty different nucleoporins. The mRNA keeps its 5′ cap (bright bead) and poly(A) tail.",
  },
  translation: {
    eyebrow: "Translation",
    title: "Codon *by codon*",
    body: "In the cytoplasm the small ribosomal subunit, carrying the initiator Met-tRNA, binds near the 5′ cap and scans to the AUG start codon; the large subunit then joins.\n\nEach cycle, a tRNA whose anticodon pairs with the codon in the A site delivers one amino acid, a peptide bond forms, and the ribosome shifts one codon along: tRNAs move from A to P to E. The growing chain leaves through a tunnel in the large subunit.",
    sceneNoteTitle: "In the scene",
    sceneNote:
      "The ribosome surface is computed from a deposited cryo-EM model of the human 80S ribosome (see the structure notes), scaled down and cut away so the tRNA sites are visible. tRNAs and mRNA are schematic. Anticodon bases are coloured as the complements of the codon they read (A·U, G·C); amino-acid colours follow the chain from N-terminus (teal) to C-terminus (amber).",
    codonNote:
      "Residues: the first 14 amino acids of human SGLT2 (UniProt P31639). Codons: one valid codon per residue, chosen for display — not the native mRNA sequence.",
    codonNoteShort: "First residues of human SGLT2; codons chosen for display.",
    focusEyebrow: "Research focus",
    focusTitle: "Where expression meets structure",
    focusIntro:
      "Translation is the hinge of this story — the point where information about gene activity becomes a physical molecule. The work in the CV sits on both sides of it.",
    focusItems: [
      { title: "Structure-based drug discovery", text: "Virtual screening, molecular docking and ADMET analysis to find and triage candidate ligands." },
      { title: "Molecular dynamics", text: "Simulating protein–ligand complexes to test whether a predicted binding mode is stable." },
      { title: "Machine learning for binding", text: "Combining physics-based descriptors with learned models to predict binding affinity." },
      { title: "Transcriptomics", text: "RNA-seq analysis and tool development, connecting gene activity to the proteins it produces." },
    ],
  },
  folding: {
    eyebrow: "Folding",
    title: "A chain finds *its shape*",
    body: "Translation is condensed here: the full chain is 672 residues long. Once released, a polypeptide does not stay an extended string. Its sequence determines a three-dimensional fold, and that shape determines what the protein can bind and do.\n\nThe protein in this story is the human sodium–glucose cotransporter SGLT2 — the drug target of Ritvik's dissertation.",
    sceneNoteTitle: "What is real here",
    sceneNote:
      "The final fold is the experimentally determined structure of human SGLT2 (cryo-EM, PDB 7VSI, 2.95 Å; Niu et al., Nature 2022). The route to it is an illustrative interpolation — helices form, then pack — not a folding simulation.\n\nIn cells, SGLT2's transmembrane helices are inserted into the endoplasmic-reticulum membrane as they leave the ribosome; the membrane is omitted for clarity. Residues 1–20 and 575–640 are not resolved in the model and fade out.",
    dissertationEyebrow: "M.Sc. dissertation",
  },
  structure: {
    eyebrow: "Structural biology",
    title: "From shape *to insight*",
    body: "A structure turns a sequence into testable geometry. In this cryo-EM structure, the inhibitor empagliflozin occupies the sugar-binding site and the external vestibule of SGLT2, holding the transporter in an outward-open state (Niu et al., 2022).\n\nPockets like this are what structure-based screening works with: candidate molecules are docked into the site, ranked, and the most promising complexes are tested for stability with molecular dynamics.",
    sceneNoteTitle: "",
    sceneNote: "",
    viewerTitle: "Explore the structure",
    modes: {
      cartoon: "Ribbon cartoon built from the backbone: α-helices as flat ribbons, loops as tubes. SGLT2 is coloured from N-terminus (teal) to C-terminus (amber); MAP17 is shown in sand.",
      trace: "Backbone trace: a smooth tube through the Cα atoms, with one sphere per resolved residue.",
      surface: "Molecular surface computed from every heavy atom in the deposited model (Gaussian surface), coloured by chain.",
      beads: "The particle style used during the scroll story: beads along a smoothed backbone.",
      site: "Empagliflozin as bound in the structure, with SGLT2 residues that have any heavy atom within 4.5 Å of it drawn as sticks.",
    },
    methodsEyebrow: "Dissertation methods",
    methodsTitle: "Screening, simulation, prediction",
    methodsNote:
      "The structure shown is a published SGLT2 structure, included for context. The specific targets, compound libraries and results of the dissertation are not shown here.",
    detailsSummary: "About this structure (text description)",
    detailsNote:
      "Computed by this site from the deposited coordinates (scripts/build-structure.mjs). A distance cut-off identifies nearby residues; it does not by itself establish specific interactions.",
  },
};

export const defaultLabels: Labels = {
  template: "Template strand",
  polymerase: "RNA polymerase (schematic)",
  rna5: "Nascent RNA, 5′ end",
  cap: "5′ cap",
  intron: "Intron removed as a lariat",
  polyA: "Poly(A) tail",
  mrna: "Protein-coding mRNA",
  isoform: "Alternative isoform (exon skipped)",
  ncrna: "Non-coding RNA (not translated)",
  pore: "Nuclear pore complex",
  small: "Small subunit (40S)",
  large: "Large subunit (60S)",
  siteE: "E",
  siteP: "P",
  siteA: "A",
  trna: "tRNA",
  tunnel: "Nascent chain leaves the exit tunnel",
  chain: "Unfolded polypeptide",
  helix: "α-helix",
  ligand: "Empagliflozin (as bound in 7VSI)",
  map17: "MAP17 (chain B)",
  sglt2: "SGLT2 (chain A)",
};

export const defaultFigures: Figures = {
  simulatedBadge: "Simulated data",
  simulatedNotice:
    "Values are generated from a fixed random seed to illustrate how RNA-seq results are read. They are not measurements and not results from any of Ritvik's projects.",
  heatmap: {
    label: "Expression heatmap",
    caption:
      "Rows are genes, columns are samples. Colour is a per-gene z-score of expression, so each row shows where that gene is relatively high (amber) or low (blue). Clustering rows like this exposes groups of genes that change together.",
    axisLabel: "z-score",
  },
  volcano: {
    label: "Differential expression",
    caption:
      "Each point is a gene. The x-axis is the log₂ fold change between conditions; the y-axis is −log₁₀ of the p-value. Genes beyond the dashed thresholds (|log₂FC| > 1 and p < 0.05) are flagged as up- or down-regulated.",
    xLabel: "log₂ fold change",
    yLabel: "−log₁₀ p",
  },
  coverage: {
    label: "Coverage & splicing",
    caption:
      "Read depth along a gene (top) and split reads joining exons (arcs, labelled with read counts). The arc from exon 1 to exon 3 is evidence of an isoform that skips exon 2 — the same event as the coral molecules in the 3D scene.",
  },
  isoforms: {
    label: "Isoforms",
    caption:
      "One gene, two transcripts: the full-length isoform and one that skips exon 2. Bars show each isoform's estimated abundance per sample (transcripts per million). Here the skipping isoform rises in the treated samples — a change in isoform usage that gene-level counts alone would hide.",
    unit: "TPM",
  },
};

export const defaultSections: Sections = {
  nav: [
    { target: "about", label: "About", visible: true },
    { target: "transcriptome", label: "Transcriptomics", visible: true },
    { target: "structure", label: "Structure", visible: true },
    { target: "projects", label: "Projects", visible: true },
    { target: "experience", label: "Experience", visible: true },
    { target: "skills", label: "Skills", visible: true },
    { target: "contact", label: "Contact", visible: true },
  ],
  documentOrder: ["projects", "experience", "skills", "credentials"],
  documentVisible: { projects: true, experience: true, skills: true, credentials: true },
  headings: {
    projects: {
      eyebrow: "Research",
      title: "Projects",
      intro: "Work described in the CV. Where the CV does not give methods or results, the card says so rather than filling the gap.",
    },
    experience: { eyebrow: "Experience", title: "Research training", intro: "" },
    education: { eyebrow: "Education", title: "Degrees", intro: "" },
    skills: {
      eyebrow: "Skills",
      title: "Methods & tools",
      intro: "Listed as in the CV, grouped by kind. No proficiency ratings — the projects above show where each was used.",
    },
    presentations: { eyebrow: "Conferences", title: "Presentations", intro: "" },
    learning: { eyebrow: "Learning", title: "Certificates & workshops", intro: "" },
  },
  storyLabels: {
    hero: "Home",
    about: "About",
    foundations: "Transcription",
    transcriptome: "Transcriptomics",
    export: "Export",
    translation: "Translation",
    folding: "Folding",
    structure: "Structure",
  },
};

export const defaultSite: Site = {
  title: "Ritvik Kalsotra · Structural bioinformatics & transcriptomics",
  description:
    "Ritvik Kalsotra — M.Sc. Biotechnology. Structural bioinformatics, molecular modelling, computational drug discovery and transcriptomics. An interactive journey from DNA to protein structure.",
  ogTitle: "Ritvik Kalsotra · From sequence to structure",
  ogDescription: "An interactive research portfolio: from DNA sequence to the structure of SGLT2.",
  ogImage: { ...emptyAsset },
  favicon: { ...emptyAsset },
  contact: {
    eyebrow: "Contact",
    title: "Sequence, structure, *next*",
    body: "I aim to pursue a PhD in structural bioinformatics and contribute computational approaches to rational drug design. For research positions, PhD opportunities or collaborations, email is the best way to reach me.",
  },
  footer: {
    attribution:
      "Structure data: PDB [7VSI](https://www.rcsb.org/structure/7VSI) (Niu et al., *Nature* 2022) and the human 80S ribosome model credited in the README, distributed by the wwPDB under CC0. Molecular scenes are schematic and not to scale; the DNA sequence and transcript are illustrative; figures marked “simulated” do not show real data.",
    builtWith: "Built with Next.js, three.js and GSAP.",
    copyright: "© Ritvik Kalsotra",
  },
};

export const defaultVisual: VisualSettings = {
  dnaStyle: "hybrid",
  rnaStyle: "smooth",
  ribosomeStyle: "surface",
  proteinMode: "cartoon",
  lighting: "studio",
  cameraPreset: "cinematic",
  bloom: 0.35,
  particleDensity: 1,
  motionIntensity: 1,
  transitionSpeed: 1,
  showAnnotations: true,
  hiddenAnnotations: [],
  showDust: true,
  showTranscriptPopulation: true,
  enableProteinInteraction: true,
  enablePointerParallax: true,
  colors: {
    accent: "#f0c27a",
    dnaCoding: "#5fb5a9",
    dnaTemplate: "#6f8fe0",
    rna: "#e0894f",
    sglt2: "#5fb5a9",
    map17: "#c9b48f",
    ligand: "#f2c46b",
  },
};

export const defaultEducation: Education[] = [
  {
    degree: "M.Sc. Biotechnology",
    subject: "Biotechnology",
    institution: "Lovely Professional University",
    location: "Phagwara, Punjab",
    period: "2024 – 2026",
    current: true,
    detail: "SGPA — Semester 1: 8.44 · Semester 2: 8.56 · Semester 3: 8.79",
    achievements: [],
    links: [],
    document: { ...emptyAsset },
    visible: true,
    order: 0,
  },
  {
    degree: "B.Sc. Biotechnology",
    subject: "Biotechnology",
    institution: "University of Himachal Pradesh",
    location: "Shimla, Himachal Pradesh",
    period: "2021 – 2024",
    current: false,
    detail: "Graduated with first-class honours (CGPA 6.9)",
    achievements: [],
    links: [],
    document: { ...emptyAsset },
    visible: true,
    order: 1,
  },
];

export const defaultExperience: Experience[] = [
  {
    role: "Skill Development Programme Trainee",
    organisation: "CSIR–Institute of Himalayan Bioresource Technology (IHBT)",
    location: "Palampur",
    period: "Ongoing",
    current: true,
    description: "",
    points: ["Learning transcriptomics data-analysis workflows (RNA-seq).", "Developing bioinformatics tools and pipelines."],
    methods: ["RNA-seq analysis", "Bioinformatics tool and pipeline development"],
    tools: [],
    mentor: "Dr. Vishal Acharya, Scientist E",
    links: [],
    visible: true,
    order: 0,
  },
  {
    role: "Dissertation Trainee (6 months)",
    organisation: "CSIR–Central Drug Research Institute (CDRI)",
    location: "Lucknow",
    period: "January – June 2026",
    current: false,
    description: "",
    points: [
      "Structure-based virtual screening of compound libraries against the SGLT2 receptor with AutoDock Vina and AutoDock 4.",
      "Molecular dynamics simulations in GROMACS to assess binding stability and conformational dynamics of lead compounds.",
      "Machine-learning models that integrate physics-based descriptors (docking scores, MM-GBSA energies) to predict binding affinity.",
    ],
    methods: ["Virtual screening", "Molecular docking", "Molecular dynamics", "Machine learning"],
    tools: ["AutoDock Vina", "AutoDock 4", "GROMACS"],
    mentor: "Dr. Mohammad Imran Siddiqi, Scientist G",
    links: [],
    visible: true,
    order: 1,
  },
];

const projectBase = {
  researchArea: "",
  background: "",
  workflow: "",
  results: "",
  datasets: "",
  media: [],
  cardImage: { ...emptyAsset },
  repoUrl: "",
  publicationUrl: "",
  links: [],
  featured: false,
  visible: true,
};

export const defaultProjects: Project[] = [
  {
    ...projectBase,
    title: "AI/ML and structural bioinformatics approach to identify a potential SGLT2 inhibitor",
    slug: "sglt2-inhibitor-ml-structure",
    category: "Structural bioinformatics",
    accent: "blue",
    researchArea: "Structure-based drug discovery",
    status: "Completed",
    context: "M.Sc. dissertation · CSIR–CDRI, Lucknow",
    period: "Jan – Jun 2026",
    summary: "Identify selective and potent SGLT2 inhibitors by combining structure-based screening with machine learning.",
    objective: "Identify selective and potent SGLT2 inhibitors by combining structure-based screening with machine learning.",
    methods: [
      "Structure-based virtual screening of compound libraries against SGLT2",
      "Molecular dynamics simulations of lead compounds",
      "Binding-affinity prediction from physics-based descriptors",
    ],
    tools: ["AutoDock Vina", "AutoDock 4", "GROMACS", "MM-GBSA", "Python"],
    contribution: [
      "Ran the virtual screening campaign with AutoDock Vina and AutoDock 4.",
      "Ran GROMACS simulations to assess binding stability and conformational dynamics.",
      "Built ML models that combine docking scores and MM-GBSA energies.",
    ],
    note: "Hit compounds, scores and other results are not listed here because they were not part of the supplied material.",
    featured: true,
    order: 0,
  },
  {
    ...projectBase,
    title: "Transcriptomics workflows and bioinformatics tool development",
    slug: "ihbt-transcriptomics-tools",
    category: "Transcriptomics",
    accent: "amber",
    researchArea: "Transcriptomics",
    status: "Ongoing",
    context: "Skill development programme · CSIR–IHBT, Palampur",
    period: "Ongoing",
    summary: "Learn RNA-seq data-analysis workflows and develop bioinformatics tools and pipelines.",
    objective: "Learn RNA-seq data-analysis workflows and develop bioinformatics tools and pipelines.",
    methods: ["RNA-seq analysis workflows", "Bioinformatics tool and pipeline development"],
    tools: ["Linux", "Python", "R"],
    contribution: ["Working under the guidance of Dr. Vishal Acharya, Scientist E."],
    note: "Ongoing work; specific datasets and tools will be added when they can be shared.",
    order: 1,
  },
  {
    ...projectBase,
    title: "Exploring the therapeutic potentials of phytochemicals against type 2 diabetes",
    slug: "phytochemicals-type-2-diabetes-poster",
    category: "Presentation",
    accent: "violet",
    status: "Presented",
    context: "Poster · Bioinnovate 2025",
    period: "2025",
    summary: "Poster presented at “Bioinnovate 2025: Bridging Science and Society for Sustainable Development Goals”.",
    objective: "Poster presented at “Bioinnovate 2025: Bridging Science and Society for Sustainable Development Goals”.",
    methods: [],
    tools: [],
    contribution: ["Presented the poster at the conference."],
    note: "The CV gives the title and venue only; methods and findings are not described there.",
    order: 2,
  },
];

const items = (names: string[]) => names.map((name) => ({ name, visible: true }));

export const defaultSkillGroups: SkillGroup[] = [
  { label: "Programming", items: items(["Python", "R"]), visible: true, order: 0 },
  {
    label: "Structural & modelling software",
    items: items(["AutoDock Vina", "AutoDock 4", "SwissDock", "GROMACS", "Modeller", "PyMOL", "Chimera", "Discovery Studio", "Avogadro", "RDKit"]),
    visible: true,
    order: 1,
  },
  { label: "Systems & networks", items: items(["Linux", "Cytoscape"]), visible: true, order: 2 },
  {
    label: "Methods & concepts",
    items: items([
      "Machine learning",
      "Deep learning",
      "Network pharmacogenomics",
      "NGS and transcriptomics (RNA-seq analysis)",
      "Molecular docking",
      "Molecular dynamics simulations",
      "Structure-based drug discovery",
      "Homology modelling",
      "Virtual screening",
      "ADMET analysis",
      "Bioinformatics tool and pipeline development",
    ]),
    visible: true,
    order: 3,
  },
  {
    label: "Wet lab & molecular biology",
    items: items([
      "DNA and RNA isolation",
      "Agarose gel electrophoresis",
      "PCR and primer handling",
      "Microbial culture techniques",
      "Media preparation and sterilisation",
      "Pipetting and solution preparation",
      "Spectrophotometric analysis",
      "Protein estimation techniques",
      "Basic chromatography techniques",
      "Cell culture handling",
      "Biochemical assays",
      "Laboratory safety and GLP practices",
    ]),
    visible: true,
    order: 4,
  },
];

const credentialBase = { contributors: "", doi: "", url: "", document: { ...emptyAsset }, description: "", visible: true };

export const defaultCredentials: Credential[] = [
  {
    ...credentialBase,
    kind: "Poster",
    title: "Poster: “Exploring the Therapeutic Potentials of Phytochemicals against Type 2 Diabetes”",
    issuer: "Bioinnovate 2025: Bridging Science and Society for Sustainable Development Goals",
    date: "2025",
    order: 0,
  },
  {
    ...credentialBase,
    kind: "Conference",
    title: "Participant",
    issuer: "Bioinnovate 2025: Bridging Science and Society for Sustainable Development Goals",
    date: "2025",
    order: 1,
  },
  {
    ...credentialBase,
    kind: "Workshop",
    title: "Workshop on Network Biology and Visualization through Cytoscape and GSEA",
    issuer: "BRIC–National Centre for Cell Science (BRIC-NCCS), Pune",
    date: "May 2026",
    order: 2,
  },
  { ...credentialBase, kind: "Certificate", title: "Python for Genomic Data Science", issuer: "Johns Hopkins University (Coursera)", date: "", order: 3 },
  {
    ...credentialBase,
    kind: "Certificate",
    title: "Biology Meets Programming: Bioinformatics for Beginners",
    issuer: "University of California San Diego (Coursera)",
    date: "",
    order: 4,
  },
  { ...credentialBase, kind: "Certificate", title: "Bacterial Bioinformatics", issuer: "University of Virginia (Coursera)", date: "", order: 5 },
];

export function defaultContent(): SiteContent {
  return structuredClone({
    profile: defaultProfile,
    science: defaultScience,
    labels: defaultLabels,
    figures: defaultFigures,
    sections: defaultSections,
    site: defaultSite,
    visual: defaultVisual,
    education: defaultEducation,
    experience: defaultExperience,
    projects: defaultProjects,
    skillGroups: defaultSkillGroups,
    credentials: defaultCredentials,
    media: {},
  });
}

/** Default value per singleton collection. */
export const SINGLETON_DEFAULTS = {
  profile: defaultProfile,
  science: defaultScience,
  labels: defaultLabels,
  figures: defaultFigures,
  sections: defaultSections,
  site: defaultSite,
  visual: defaultVisual,
};

/** Blank records used by "Add new" in the admin. */
export const LIST_TEMPLATES = {
  education: {
    degree: "",
    subject: "",
    institution: "",
    location: "",
    period: "",
    current: false,
    detail: "",
    achievements: [],
    links: [],
    document: { ...emptyAsset },
    visible: true,
    order: 0,
  } satisfies Education,
  experience: {
    role: "",
    organisation: "",
    location: "",
    period: "",
    current: false,
    description: "",
    points: [],
    methods: [],
    tools: [],
    mentor: "",
    links: [],
    visible: true,
    order: 0,
  } satisfies Experience,
  project: {
    ...projectBase,
    title: "",
    slug: "",
    category: "",
    accent: "blue",
    status: "Ongoing",
    context: "",
    period: "",
    summary: "",
    objective: "",
    methods: [],
    tools: [],
    contribution: [],
    note: "",
    media: [],
    links: [],
    order: 0,
  } satisfies Project,
  skillGroup: { label: "", items: [], visible: true, order: 0 } satisfies SkillGroup,
  credential: { ...credentialBase, kind: "Certificate", title: "", issuer: "", date: "", order: 0 } satisfies Credential,
};
