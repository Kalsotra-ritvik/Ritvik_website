export interface Link {
  label: string;
  href: string;
}

export interface Profile {
  name: string;
  role: string;
  /** One-line positioning used in the hero. Paraphrased from the CV summary. */
  tagline: string;
  location: string;
  summary: string[];
  goal: string;
  email: string;
  /** Present in the CV. Hidden by default because the site is public. */
  phone?: string;
  showPhone: boolean;
  links: Link[];
  cv: { href: string; fileName: string };
}

export interface Education {
  degree: string;
  institution: string;
  location: string;
  period: string;
  detail: string;
  current?: boolean;
}

export interface Experience {
  role: string;
  organisation: string;
  location: string;
  period: string;
  mentor?: string;
  points: string[];
  current?: boolean;
}

export type ProjectCategory = "Structural bioinformatics" | "Transcriptomics" | "Presentation";

export interface Project {
  id: string;
  title: string;
  category: ProjectCategory;
  context: string;
  period: string;
  status: "Completed" | "Ongoing" | "Presented";
  objective: string;
  methods: string[];
  tools: string[];
  contribution: string[];
  /** Facts that would normally be shown but are not in the supplied material. */
  note?: string;
}

export interface SkillGroup {
  id: string;
  label: string;
  items: string[];
}

export interface Credential {
  title: string;
  issuer: string;
  date?: string;
  kind: "Conference" | "Poster" | "Certificate" | "Workshop";
}

export interface Mentor {
  name: string;
  title: string;
  organisation: string;
}
