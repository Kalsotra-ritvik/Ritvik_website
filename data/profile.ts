/**
 * Single source of truth for portfolio content.
 *
 * Every entry below comes from "Ritvik_Kalsotra_CV_Final.pdf" (October 2026).
 * Edit this file to update the site; no animation code needs to change.
 * Do not add results, numbers or affiliations that are not in the CV.
 */
import type { Credential, Education, Experience, Mentor, Profile, Project, SkillGroup } from "@/types/content";

export const profile: Profile = {
  name: "Ritvik Kalsotra",
  role: "M.Sc. Biotechnology",
  tagline: "Structural bioinformatics, molecular modelling and transcriptomics",
  location: "India",
  summary: [
    "I am an M.Sc. Biotechnology student at Lovely Professional University, Punjab, with a foundation in structural bioinformatics, molecular modelling and computational drug discovery.",
    "My dissertation at CSIR–Central Drug Research Institute, Lucknow, combined machine learning with structure-based methods to look for selective and potent SGLT2 inhibitors. I am now in a skill development programme in transcriptomics and bioinformatics tool development at CSIR–Institute of Himalayan Bioresource Technology, Palampur.",
  ],
  goal: "I aim to pursue a PhD in structural bioinformatics and contribute computational approaches to rational drug design.",
  email: "kalsotraritvik@gmail.com",
  phone: "+91 9418775921",
  showPhone: false,
  links: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/ritvik-kalsotra-227959308" }],
  cv: { href: "/cv/Ritvik_Kalsotra_CV.pdf", fileName: "Ritvik_Kalsotra_CV.pdf" },
};

export const education: Education[] = [
  {
    degree: "M.Sc. Biotechnology",
    institution: "Lovely Professional University",
    location: "Phagwara, Punjab",
    period: "2024 – 2026",
    detail: "SGPA — Semester 1: 8.44 · Semester 2: 8.56 · Semester 3: 8.79",
    current: true,
  },
  {
    degree: "B.Sc. Biotechnology",
    institution: "University of Himachal Pradesh",
    location: "Shimla, Himachal Pradesh",
    period: "2021 – 2024",
    detail: "Graduated with first-class honours (CGPA 6.9)",
  },
];

export const experience: Experience[] = [
  {
    role: "Skill Development Programme Trainee",
    organisation: "CSIR–Institute of Himalayan Bioresource Technology (IHBT)",
    location: "Palampur",
    period: "Ongoing",
    mentor: "Dr. Vishal Acharya, Scientist E",
    points: [
      "Learning transcriptomics data-analysis workflows (RNA-seq).",
      "Developing bioinformatics tools and pipelines.",
    ],
    current: true,
  },
  {
    role: "Dissertation Trainee (6 months)",
    organisation: "CSIR–Central Drug Research Institute (CDRI)",
    location: "Lucknow",
    period: "January – June 2026",
    mentor: "Dr. Mohammad Imran Siddiqi, Scientist G",
    points: [
      "Structure-based virtual screening of compound libraries against the SGLT2 receptor with AutoDock Vina and AutoDock 4.",
      "Molecular dynamics simulations in GROMACS to assess binding stability and conformational dynamics of lead compounds.",
      "Machine-learning models that integrate physics-based descriptors (docking scores, MM-GBSA energies) to predict binding affinity.",
    ],
  },
];

export const dissertation = {
  title: "Integrated machine learning & structure-based approach for identification of selective and potent SGLT2 inhibitors",
  shortTitle: "AI/ML and structural bioinformatics to identify a potential SGLT2 inhibitor",
  institute: "CSIR–Central Drug Research Institute, Lucknow",
  period: "January – June 2026",
};

export const projects: Project[] = [
  {
    id: "sglt2",
    title: "AI/ML and structural bioinformatics approach to identify a potential SGLT2 inhibitor",
    category: "Structural bioinformatics",
    context: "M.Sc. dissertation · CSIR–CDRI, Lucknow",
    period: "Jan – Jun 2026",
    status: "Completed",
    objective:
      "Identify selective and potent SGLT2 inhibitors by combining structure-based screening with machine learning.",
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
  },
  {
    id: "ihbt",
    title: "Transcriptomics workflows and bioinformatics tool development",
    category: "Transcriptomics",
    context: "Skill development programme · CSIR–IHBT, Palampur",
    period: "Ongoing",
    status: "Ongoing",
    objective: "Learn RNA-seq data-analysis workflows and develop bioinformatics tools and pipelines.",
    methods: ["RNA-seq analysis workflows", "Bioinformatics tool and pipeline development"],
    tools: ["Linux", "Python", "R"],
    contribution: ["Working under the guidance of Dr. Vishal Acharya, Scientist E."],
    note: "Ongoing work; specific datasets and tools will be added when they can be shared.",
  },
  {
    id: "poster",
    title: "Exploring the therapeutic potentials of phytochemicals against type 2 diabetes",
    category: "Presentation",
    context: "Poster · Bioinnovate 2025",
    period: "2025",
    status: "Presented",
    objective: "Poster presented at “Bioinnovate 2025: Bridging Science and Society for Sustainable Development Goals”.",
    methods: [],
    tools: [],
    contribution: ["Presented the poster at the conference."],
    note: "The CV gives the title and venue only; methods and findings are not described there.",
  },
];

export const skillGroups: SkillGroup[] = [
  { id: "programming", label: "Programming", items: ["Python", "R"] },
  {
    id: "structural",
    label: "Structural & modelling software",
    items: ["AutoDock Vina", "AutoDock 4", "SwissDock", "GROMACS", "Modeller", "PyMOL", "Chimera", "Discovery Studio", "Avogadro", "RDKit"],
  },
  { id: "systems", label: "Systems & networks", items: ["Linux", "Cytoscape"] },
  {
    id: "methods",
    label: "Methods & concepts",
    items: [
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
    ],
  },
  {
    id: "wetlab",
    label: "Wet lab & molecular biology",
    items: [
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
    ],
  },
];

export const credentials: Credential[] = [
  {
    title: "Poster: “Exploring the Therapeutic Potentials of Phytochemicals against Type 2 Diabetes”",
    issuer: "Bioinnovate 2025: Bridging Science and Society for Sustainable Development Goals",
    date: "2025",
    kind: "Poster",
  },
  {
    title: "Participant",
    issuer: "Bioinnovate 2025: Bridging Science and Society for Sustainable Development Goals",
    date: "2025",
    kind: "Conference",
  },
  {
    title: "Workshop on Network Biology and Visualization through Cytoscape and GSEA",
    issuer: "BRIC–National Centre for Cell Science (BRIC-NCCS), Pune",
    date: "May 2026",
    kind: "Workshop",
  },
  { title: "Python for Genomic Data Science", issuer: "Johns Hopkins University (Coursera)", kind: "Certificate" },
  {
    title: "Biology Meets Programming: Bioinformatics for Beginners",
    issuer: "University of California San Diego (Coursera)",
    kind: "Certificate",
  },
  { title: "Bacterial Bioinformatics", issuer: "University of Virginia (Coursera)", kind: "Certificate" },
];

export const mentors: Mentor[] = [
  { name: "Dr. Mohammad Imran Siddiqi", title: "Scientist G", organisation: "CSIR–Central Drug Research Institute, Lucknow" },
  { name: "Dr. Vishal Acharya", title: "Scientist E", organisation: "CSIR–Institute of Himalayan Bioresource Technology, Palampur" },
];
