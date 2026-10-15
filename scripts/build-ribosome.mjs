#!/usr/bin/env node
/**
 * Coarse-grained point model of the human 80S ribosome from PDB 4UG0
 * (cryo-EM, 3.6 Å; Khatter et al., Nature 520, 640 (2015), doi:10.1038/nature14427).
 *
 * Input:  data/raw/4ug0.cif.gz (downloaded from the wwPDB archive if missing; not committed)
 * Output: public/data/ribosome-4ug0.json
 *
 * Keeps one point per residue: the phosphorus atom of each rRNA nucleotide and
 * the Cα of each ribosomal protein residue, labelled by subunit (40S/60S) and
 * by rRNA/protein. The site builds Gaussian surfaces from these points.
 *
 * Placement in the scene: the model's initiator Met-tRNA (entity 48, anticodon
 * CAU at positions 35–37, CCA end at 74–76) is mapped onto the schematic tRNA
 * used by the translation scene: anticodon → (0, 0.15, 0), CCA end → peptidyl
 * transferase position. The model is rotated so its centre of mass lies behind
 * the tRNA (−z), then uniformly scaled. The tRNA itself is omitted (the scene
 * draws schematic tRNAs).
 *
 * Usage: node scripts/build-ribosome.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = resolve(root, "data/raw/4ug0.cif.gz");
const OUTPUT = resolve(root, "public/data/ribosome-4ug0.json");
const SOURCE_URL = "https://files.wwpdb.org/pub/pdb/data/structures/divided/mmCIF/ug/4ug0.cif.gz";
const MIRROR_URL = "https://pdbsnapshots.s3.us-west-2.amazonaws.com/20240101/pub/pdb/data/structures/divided/mmCIF/ug/4ug0.cif.gz";

// Schematic targets (translation scene local units).
const TARGET_ANTICODON = [0, 0.15, 0];
const TARGET_CCA = [0.3, 1.72, 0.1];

if (!existsSync(INPUT)) {
  mkdirSync(dirname(INPUT), { recursive: true });
  let buf = null;
  for (const url of [SOURCE_URL, MIRROR_URL]) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        buf = Buffer.from(await res.arrayBuffer());
        console.log(`Downloaded ${url}`);
        break;
      }
    } catch {
      // try the next source
    }
  }
  if (!buf) throw new Error("Could not download 4UG0. Place 4ug0.cif.gz in data/raw/ manually.");
  writeFileSync(INPUT, buf);
}

const text = gunzipSync(readFileSync(INPUT)).toString("utf8");
const lines = text.split("\n");

// ---- Entities: name and type ------------------------------------------------------
const entityName = new Map();
{
  let i = lines.findIndex((l) => l.startsWith("_entity.details"));
  for (i = i + 1; i < lines.length && !lines[i].startsWith("#"); i++) {
    const m = lines[i].match(/^(\d+)\s+(\S+)\s+\S+\s+'([^']*)'/) ?? lines[i].match(/^(\d+)\s+(\S+)\s+\S+\s+(\S+)/);
    if (m) entityName.set(m[1], { type: m[2], name: m[3] });
  }
}
const classify = (entity) => {
  const e = entityName.get(entity);
  if (!e || e.type !== "polymer") return null;
  const n = e.name.toUpperCase();
  if (n.includes("TRNA")) return "trna";
  const rna = n.includes("RIBOSOMAL RNA");
  if (n.startsWith("18S") || n.includes("40S")) return rna ? "s40r" : "s40p";
  if (/^(28S|5S|5\.8S)/.test(n) || n.includes("60S")) return rna ? "s60r" : "s60p";
  // RACK1 (guanine nucleotide-binding protein subunit beta-2-like 1) is a 40S component.
  if (n.includes("BETA-2-LIKE 1")) return "s40p";
  return null;
};

// ---- Atoms ----------------------------------------------------------------------------
const cols = [];
for (const l of lines) {
  if (l.startsWith("_atom_site.")) cols.push(l.trim().slice("_atom_site.".length));
  else if (cols.length) break;
}
const col = (name) => cols.indexOf(name);
const C = {
  atom: col("label_atom_id"),
  entity: col("label_entity_id"),
  chain: col("auth_asym_id"),
  seq: col("auth_seq_id"),
  x: col("Cartn_x"),
  y: col("Cartn_y"),
  z: col("Cartn_z"),
  model: col("pdbx_PDB_model_num"),
};
const groups = { s40r: [], s40p: [], s60r: [], s60p: [] };
const chainIndex = new Map();
const trna = new Map();
for (const l of lines) {
  if (!l.startsWith("ATOM") && !l.startsWith("HETATM")) continue;
  const f = l.trim().split(/\s+/);
  if (f[C.model] !== "1") continue;
  const atom = f[C.atom].replace(/"/g, "");
  const kind = classify(f[C.entity]);
  if (!kind) continue;
  const p = [parseFloat(f[C.x]), parseFloat(f[C.y]), parseFloat(f[C.z])];
  if (kind === "trna") {
    if (atom === "P") trna.set(Number(f[C.seq]), p);
    continue;
  }
  const isRna = kind.endsWith("r");
  if ((isRna && atom !== "P") || (!isRna && atom !== "CA")) continue;
  const chain = f[C.chain];
  if (!chainIndex.has(chain)) chainIndex.set(chain, chainIndex.size);
  groups[kind].push([...p, chainIndex.get(chain)]);
}

// ---- Frame -------------------------------------------------------------------------------
const mean = (pts) => pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]).map((v) => v / pts.length);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const n = Math.hypot(...a);
  return a.map((v) => v / n);
};
const anticodon = mean([35, 36, 37].map((n) => trna.get(n)).filter(Boolean));
const cca = mean([74, 75, 76].map((n) => trna.get(n)).filter(Boolean));
if (!anticodon.every(Number.isFinite) || !cca.every(Number.isFinite)) throw new Error("tRNA anticodon/CCA phosphates not found");
const all = Object.values(groups).flat();
const center = mean(all);

// Source frame: Y along anticodon→CCA, Z toward the tRNA side (away from the 80S centre).
const ys = norm(sub(cca, anticodon));
let zs = sub(mean([anticodon, cca]), center);
zs = norm(sub(zs, ys.map((v) => v * dot(zs, ys))));
const xs = cross(ys, zs);
// Target frame: Y along the schematic anticodon→PTC vector, Z toward the camera.
const yt = norm(sub(TARGET_CCA, TARGET_ANTICODON));
let zt = [0, 0, 1];
zt = norm(sub(zt, yt.map((v) => v * dot(zt, yt))));
const xt = cross(yt, zt);
const scale = Math.hypot(...sub(TARGET_CCA, TARGET_ANTICODON)) / Math.hypot(...sub(cca, anticodon));

const place = (p) => {
  const d = sub(p, anticodon);
  const a = dot(d, xs), b = dot(d, ys), c = dot(d, zs);
  return [0, 1, 2].map((i) => TARGET_ANTICODON[i] + scale * (a * xt[i] + b * yt[i] + c * zt[i]));
};
const q = (v) => Math.round(v * 100); // 0.01 scene units

const out = {
  source: {
    pdbId: "4UG0",
    title: "Structure of the human 80S ribosome",
    method: "Electron microscopy (cryo-EM), 3.6 Å",
    citation: { authors: "Khatter et al.", journal: "Nature", volume: "520", firstPage: "640", year: 2015, doi: "10.1038/nature14427" },
    license: "wwPDB data are available under CC0 1.0",
    processing:
      "One point per residue (rRNA phosphorus, protein Cα) from scripts/build-ribosome.mjs; aligned on the model's initiator tRNA to the scene's schematic tRNA and uniformly scaled. Coordinates are integers in 1/100 scene units.",
    scale,
  },
  // Flat arrays of [x, y, z, chainIndex] per point.
  groups: Object.fromEntries(
    Object.entries(groups).map(([k, pts]) => [k, pts.flatMap((p) => [...place(p).map(q), p[3]])]),
  ),
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(out));
const sizes = Object.entries(groups).map(([k, v]) => `${k} ${v.length}`).join(", ");
console.log(`Wrote ${OUTPUT}\n  points: ${sizes}\n  chains: ${chainIndex.size}, tRNA phosphates: ${trna.size}, scale ${scale.toFixed(5)} units/Å`);
