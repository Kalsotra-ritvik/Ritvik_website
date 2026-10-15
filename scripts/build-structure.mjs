#!/usr/bin/env node
/**
 * Converts the deposited PDB entry 7VSI (human SGLT2–MAP17 bound to
 * empagliflozin; Niu et al., Nature 2022) into the compact JSON the 3D scenes use.
 *
 * Input:  data/raw/pdb7vsi.ent.gz  (wwPDB archive file, CC0)
 * Output: public/data/sglt2-7vsi.json
 *
 * Everything in the output is derived from the coordinate file. Nothing is
 * hand-placed: the contact residues are computed from atom–atom distances.
 *
 * Usage: node scripts/build-structure.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = resolve(root, "data/raw/pdb7vsi.ent.gz");
const OUTPUT = resolve(root, "public/data/sglt2-7vsi.json");
const LIGAND_CODE = "7R3"; // empagliflozin, as named in the entry's HETNAM record
const CONTACT_CUTOFF = 4.5; // Å, heavy-atom distance

const THREE_TO_ONE = {
  ALA: "A", ARG: "R", ASN: "N", ASP: "D", CYS: "C", GLN: "Q", GLU: "E", GLY: "G",
  HIS: "H", ILE: "I", LEU: "L", LYS: "K", MET: "M", PHE: "F", PRO: "P", SER: "S",
  THR: "T", TRP: "W", TYR: "Y", VAL: "V",
};

const text = gunzipSync(readFileSync(INPUT)).toString("utf8");
const lines = text.split("\n");

const atoms = [];
const seqres = {};
const helices = [];
for (const l of lines) {
  const rec = l.slice(0, 6).trim();
  if (rec === "ATOM" || rec === "HETATM") {
    const element = l.slice(76, 78).trim() || l.slice(12, 14).trim()[0];
    if (element === "H") continue;
    atoms.push({
      het: rec === "HETATM",
      name: l.slice(12, 16).trim(),
      resName: l.slice(17, 20).trim(),
      chain: l[21],
      resSeq: parseInt(l.slice(22, 26), 10),
      x: parseFloat(l.slice(30, 38)),
      y: parseFloat(l.slice(38, 46)),
      z: parseFloat(l.slice(46, 54)),
      element,
    });
  } else if (rec === "SEQRES") {
    const chain = l[11];
    const residues = l.slice(19).trim().split(/\s+/).filter(Boolean);
    seqres[chain] = (seqres[chain] ?? "") + residues.map((r) => THREE_TO_ONE[r] ?? "X").join("");
  } else if (rec === "HELIX") {
    helices.push({
      chain: l[19],
      start: parseInt(l.slice(21, 25), 10),
      end: parseInt(l.slice(33, 37), 10),
    });
  }
}

const header = (prefix) =>
  lines.filter((l) => l.startsWith(prefix)).map((l) => l.slice(10).trim()).join(" ").replace(/\s+/g, " ");

const caAtoms = atoms.filter((a) => !a.het && a.name === "CA");
// Backbone carbonyl O per residue: orients the cartoon ribbon (peptide-plane direction).
const oByKey = new Map(atoms.filter((a) => !a.het && a.name === "O").map((a) => [`${a.chain}${a.resSeq}`, a]));
const ligand = atoms.filter((a) => a.het && a.resName === LIGAND_CODE);
if (ligand.length === 0) throw new Error(`Ligand ${LIGAND_CODE} not found`);

// ---- Orientation --------------------------------------------------------
// Centre on the chain A Cα centroid, then rotate so the dominant helix-axis
// direction points along +Y. For this all-α membrane transporter that axis
// approximates the membrane normal, which gives a natural "upright" view.
const chainA = caAtoms.filter((a) => a.chain === "A");
const centroid = chainA.reduce((c, a) => [c[0] + a.x, c[1] + a.y, c[2] + a.z], [0, 0, 0]).map((v) => v / chainA.length);

const byKey = new Map(caAtoms.map((a) => [`${a.chain}${a.resSeq}`, a]));
const T = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
for (const h of helices) {
  const a = byKey.get(`${h.chain}${h.start}`);
  const b = byKey.get(`${h.chain}${h.end}`);
  if (!a || !b || h.end - h.start < 10) continue; // long helices only
  const d = [b.x - a.x, b.y - a.y, b.z - a.z];
  const n = Math.hypot(...d);
  const u = d.map((v) => v / n);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) T[i][j] += u[i] * u[j];
}
// Power iteration for the principal eigenvector of the orientation tensor.
let axis = [0, 1, 0];
for (let k = 0; k < 100; k++) {
  const next = [0, 1, 2].map((i) => T[i][0] * axis[0] + T[i][1] * axis[1] + T[i][2] * axis[2]);
  const n = Math.hypot(...next);
  axis = next.map((v) => v / n);
}
// Rotation taking `axis` onto +Y (Rodrigues).
function rotationTo(from, to) {
  const v = [from[1] * to[2] - from[2] * to[1], from[2] * to[0] - from[0] * to[2], from[0] * to[1] - from[1] * to[0]];
  const c = from[0] * to[0] + from[1] * to[1] + from[2] * to[2];
  const k = 1 / (1 + c);
  return [
    [v[0] * v[0] * k + c, v[1] * v[0] * k - v[2], v[2] * v[0] * k + v[1]],
    [v[0] * v[1] * k + v[2], v[1] * v[1] * k + c, v[2] * v[1] * k - v[0]],
    [v[0] * v[2] * k - v[1], v[1] * v[2] * k + v[0], v[2] * v[2] * k + c],
  ];
}
const R = rotationTo(axis, [0, 1, 0]);
const r2 = (v) => Math.round(v * 100) / 100;
const place = (a) => {
  const p = [a.x - centroid[0], a.y - centroid[1], a.z - centroid[2]];
  return [0, 1, 2].map((i) => r2(R[i][0] * p[0] + R[i][1] * p[1] + R[i][2] * p[2]));
};

// ---- Contacts -------------------------------------------------------------
const contactMap = new Map();
for (const a of atoms) {
  if (a.het) continue;
  let min = Infinity;
  for (const l of ligand) min = Math.min(min, Math.hypot(a.x - l.x, a.y - l.y, a.z - l.z));
  if (min <= CONTACT_CUTOFF) {
    const key = `${a.chain}${a.resSeq}`;
    const prev = contactMap.get(key);
    if (!prev || min < prev.minDistance) {
      contactMap.set(key, { chain: a.chain, resSeq: a.resSeq, resName: a.resName, minDistance: r2(min) });
    }
  }
}
const contacts = [...contactMap.values()].sort((a, b) => a.chain.localeCompare(b.chain) || a.resSeq - b.resSeq);

// ---- Ligand bonds by distance --------------------------------------------
const bonds = [];
for (let i = 0; i < ligand.length; i++) {
  for (let j = i + 1; j < ligand.length; j++) {
    const a = ligand[i], b = ligand[j];
    const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    const limit = a.element === "CL" || b.element === "CL" ? 1.9 : 1.7;
    if (d < limit) bonds.push([i, j]);
  }
}

// ---- Heavy atoms of the contact residues (for the binding-site view) ---------
const contactResidues = contacts.map((c) => {
  const resAtoms = atoms.filter((a) => !a.het && a.chain === c.chain && a.resSeq === c.resSeq);
  const resBonds = [];
  for (let i = 0; i < resAtoms.length; i++) {
    for (let j = i + 1; j < resAtoms.length; j++) {
      const a = resAtoms[i], b = resAtoms[j];
      if (Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1.9) resBonds.push([i, j]);
    }
  }
  return { chain: c.chain, resSeq: c.resSeq, resName: c.resName, atoms: resAtoms.map((a) => ({ name: a.name, el: a.element, p: place(a) })), bonds: resBonds };
});

// ---- Chains as contiguous segments ---------------------------------------
const inHelix = (chain, resSeq) => helices.some((h) => h.chain === chain && resSeq >= h.start && resSeq <= h.end);
function chainSegments(chain) {
  const cas = caAtoms.filter((a) => a.chain === chain);
  const segments = [];
  let current = [];
  for (let i = 0; i < cas.length; i++) {
    if (i > 0 && cas[i].resSeq - cas[i - 1].resSeq !== 1) {
      segments.push(current);
      current = [];
    }
    const a = cas[i];
    const o = oByKey.get(`${chain}${a.resSeq}`);
    current.push({ n: a.resSeq, aa: THREE_TO_ONE[a.resName] ?? "X", ss: inHelix(chain, a.resSeq) ? "H" : "C", p: place(a), ...(o ? { o: place(o) } : {}) });
  }
  if (current.length) segments.push(current);
  return segments;
}

const out = {
  source: {
    pdbId: "7VSI",
    title: header("TITLE"),
    method: header("EXPDTA"),
    resolutionAngstrom: parseFloat(header("REMARK   2 RESOLUTION").replace("RESOLUTION.", "")),
    citation: {
      authors: "Niu Y, Liu R, Guan C, Zhang Y, Chen Z, Hoerer S, Nar H, Chen L",
      title: "Structural basis of inhibition of the human SGLT2–MAP17 glucose transporter",
      journal: "Nature",
      volume: "601",
      pages: "280–284",
      year: 2022,
      doi: "10.1038/s41586-021-04212-9",
      pmid: "34880493",
    },
    license: "wwPDB data are available under CC0 1.0",
    processing:
      "Cα trace with backbone carbonyl O, all protein heavy atoms (for the surface) and the atoms of ligand-contact residues, from scripts/build-structure.mjs. Centred on the chain A Cα centroid and rotated so the mean long-helix axis is +Y. Units: Å.",
  },
  chains: [
    { id: "A", name: "SGLT2 (SLC5A2)", uniprot: "P31639", segments: chainSegments("A") },
    { id: "B", name: "MAP17 (PDZK1IP1)", uniprot: "Q13113", segments: chainSegments("B") },
  ],
  helices,
  sequence: { A: seqres.A, B: seqres.B },
  ligand: {
    code: LIGAND_CODE,
    name: "empagliflozin",
    atoms: ligand.map((a) => ({ el: a.element, p: place(a) })),
    bonds,
  },
  contacts: { cutoffAngstrom: CONTACT_CUTOFF, residues: contacts, atoms: contactResidues },
  // Every protein heavy atom as [x, y, z, resSeq] with coordinates in 0.1 Å (for the molecular surface).
  heavy: Object.fromEntries(
    ["A", "B"].map((chain) => [
      chain,
      atoms
        .filter((a) => !a.het && a.chain === chain)
        .flatMap((a) => [...place(a).map((v) => Math.round(v * 10)), a.resSeq]),
    ]),
  ),
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(out));
const counts = out.chains.map((c) => `${c.id}: ${c.segments.map((s) => `${s[0].n}-${s.at(-1).n}`).join(", ")}`);
console.log(`Wrote ${OUTPUT}`);
console.log(`  chains ${counts.join(" | ")}`);
console.log(`  helices ${helices.length}, ligand atoms ${ligand.length}, bonds ${bonds.length}, contact residues ${contacts.length}`);
console.log(`  contacts: ${contacts.map((c) => `${c.chain}:${c.resName}${c.resSeq}`).join(" ")}`);
