/**
 * Types and helpers for the processed PDB 7VSI data (public/data/sglt2-7vsi.json,
 * produced by scripts/build-structure.mjs).
 */
import { assetUrl } from "@/lib/assets";

export type Vec3 = [number, number, number];

export interface ResidueCA {
  n: number;
  aa: string;
  ss: "H" | "C";
  p: Vec3;
  /** Backbone carbonyl O, when resolved. */
  o?: Vec3;
}

export interface ContactResidueAtoms {
  chain: string;
  resSeq: number;
  resName: string;
  atoms: { name: string; el: string; p: Vec3 }[];
  bonds: [number, number][];
}

export interface StructureData {
  source: {
    pdbId: string;
    title: string;
    method: string;
    resolutionAngstrom: number;
    citation: { authors: string; title: string; journal: string; volume: string; pages: string; year: number; doi: string; pmid: string };
    license: string;
    processing: string;
  };
  chains: { id: string; name: string; uniprot: string; segments: ResidueCA[][] }[];
  helices: { chain: string; start: number; end: number }[];
  sequence: Record<string, string>;
  ligand: { code: string; name: string; atoms: { el: string; p: Vec3 }[]; bonds: [number, number][] };
  contacts: {
    cutoffAngstrom: number;
    residues: { chain: string; resSeq: number; resName: string; minDistance: number }[];
    atoms?: ContactResidueAtoms[];
  };
  /** Protein heavy atoms per chain, flat [x, y, z, resSeq] with coordinates in 0.1 Å. */
  heavy?: Record<string, number[]>;
}

export interface ResidueModel {
  /** 1-based residue number (UniProt numbering, as in the entry). */
  number: number;
  aa: string;
  modeled: boolean;
  helix: boolean;
  contact: boolean;
  /** Folded Cα position in Å. For unresolved residues this is a placeholder that is never shown in the final state. */
  folded: Vec3;
}

/** Build a per-residue model for the full chain A sequence (SEQRES), marking which residues are resolved. */
export function buildResidues(data: StructureData, chainId = "A"): ResidueModel[] {
  const seq = data.sequence[chainId];
  const chain = data.chains.find((c) => c.id === chainId);
  if (!seq || !chain) throw new Error(`Chain ${chainId} missing`);
  const byNumber = new Map<number, ResidueCA>();
  for (const s of chain.segments) for (const r of s) byNumber.set(r.n, r);
  const contacts = new Set(data.contacts.residues.filter((c) => c.chain === chainId).map((c) => c.resSeq));

  const residues: ResidueModel[] = [...seq].map((aa, i) => {
    const number = i + 1;
    const ca = byNumber.get(number);
    return {
      number,
      aa,
      modeled: Boolean(ca),
      helix: ca?.ss === "H",
      contact: contacts.has(number),
      folded: ca ? ([...ca.p] as Vec3) : [0, 0, 0],
    };
  });

  // Placeholders for unresolved stretches: interpolate between the flanking
  // resolved residues with an outward bulge. They fade out as the chain folds.
  const centroid: Vec3 = [0, 0, 0];
  let m = 0;
  for (const r of residues) if (r.modeled) {
    centroid[0] += r.folded[0]; centroid[1] += r.folded[1]; centroid[2] += r.folded[2]; m++;
  }
  centroid.forEach((_, k) => (centroid[k] /= Math.max(1, m)));
  let i = 0;
  while (i < residues.length) {
    if (residues[i].modeled) { i++; continue; }
    let j = i;
    while (j < residues.length && !residues[j].modeled) j++;
    const before = i > 0 ? residues[i - 1].folded : null;
    const after = j < residues.length ? residues[j].folded : null;
    for (let k = i; k < j; k++) {
      const u = (k - i + 1) / (j - i + 1);
      let p: Vec3;
      if (before && after) {
        p = [0, 1, 2].map((d) => before[d] + (after[d] - before[d]) * u) as Vec3;
        const out = [0, 1, 2].map((d) => p[d] - centroid[d]);
        const len = Math.hypot(...out) || 1;
        const bulge = Math.sin(Math.PI * u) * 22;
        p = [0, 1, 2].map((d) => p[d] + (out[d] / len) * bulge) as Vec3;
      } else {
        const anchor = (before ?? after)!;
        const steps = before ? k - i + 1 : j - k;
        const out = [0, 1, 2].map((d) => anchor[d] - centroid[d]);
        const len = Math.hypot(...out) || 1;
        p = [0, 1, 2].map((d) => anchor[d] + (out[d] / len) * steps * 3.2) as Vec3;
      }
      residues[k].folded = p;
    }
    i = j;
  }
  return residues;
}

export async function loadStructure(url = assetUrl("/data/sglt2-7vsi.json"), signal?: AbortSignal): Promise<StructureData> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to load structure (${res.status})`);
  return (await res.json()) as StructureData;
}
