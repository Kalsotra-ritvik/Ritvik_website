import * as THREE from "three";
import { chainColor } from "@/lib/engine/materials";
import type { ProteinMode, VisualSettings } from "@/lib/content/schema";
import type { StructureData, Vec3 } from "@/lib/science/structure";
import {
  bondInstances,
  gaussianSurface,
  mergeGeometries,
  moleculeMaterial,
  ribbonGeometry,
  setFade,
  sphereInstances,
  type Atom,
  type DensityPoint,
  type RibbonResidue,
} from "@/components/molecular/meshes";

/**
 * Static representations of the deposited 7VSI model (SGLT2 chain A, MAP17
 * chain B, empagliflozin), shown once the folding animation has finished:
 *
 *  - cartoon:  helices as bands, loops as tubes (from Cα; see ribbonGeometry)
 *  - trace:    Cα backbone tube with a sphere per residue
 *  - surface:  Gaussian molecular surface over every protein heavy atom
 *  - site:     faded cartoon, ligand and the side chains of every residue with
 *              a heavy atom within 4.5 Å of the ligand (computed from the entry)
 *  - beads:    handled by the particle model in proteinScene
 */
const SCALE = 0.1; // Å → world units

const ELEMENT: Record<string, number> = { N: 0x5b7cfa, O: 0xf2554a, S: 0xf3d25b, CL: 0x7fdc8a };

const v = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2]).multiplyScalar(SCALE);
const srgb = (hex: string | number) => (typeof hex === "number" ? new THREE.Color().setHex(hex) : new THREE.Color().setStyle(hex));

export type MeshWeights = Record<ProteinMode, number>;

export function createProteinStructure(data: StructureData, quality: "high" | "low", colors: VisualSettings["colors"]) {
  const high = quality === "high";
  const group = new THREE.Group();
  group.name = "protein-structure";

  const chainA = data.chains.find((c) => c.id === "A")!;
  const chainB = data.chains.find((c) => c.id === "B");
  const lenA = data.sequence.A.length;
  const contactSet = new Set(data.contacts.residues.map((r) => `${r.chain}${r.resSeq}`));
  const map17Color = srgb(colors.map17);
  const sglt2Color = srgb(colors.sglt2);
  const ligandColor = srgb(colors.ligand);

  // ---- Cartoon ---------------------------------------------------------------------
  const ribbonOpts = {
    samplesPerResidue: high ? 7 : 4,
    sides: high ? 12 : 8,
    coilRadius: 0.032,
    helixHalfWidth: 0.12,
    helixHalfThickness: 0.03,
  };
  const ribbons: THREE.BufferGeometry[] = [];
  for (const chain of [chainA, chainB]) {
    if (!chain) continue;
    for (const segment of chain.segments) {
      const res: RibbonResidue[] = segment.map((r) => ({
        p: v(r.p),
        helix: r.ss === "H",
        color: chain.id === "A" ? chainColor((r.n - 1) / (lenA - 1)) : map17Color.clone(),
      }));
      const g = ribbonGeometry(res, ribbonOpts);
      if (g) ribbons.push(g);
    }
  }
  const cartoonMat = moleculeMaterial({ roughness: 0.38, clearcoat: 0.45, side: THREE.DoubleSide });
  const cartoon = new THREE.Mesh(mergeGeometries(ribbons), cartoonMat);
  group.add(cartoon);

  // ---- Backbone trace ----------------------------------------------------------------
  const traceTubes: THREE.BufferGeometry[] = [];
  const traceAtoms: Atom[] = [];
  for (const chain of [chainA, chainB]) {
    if (!chain) continue;
    for (const segment of chain.segments) {
      const res: RibbonResidue[] = segment.map((r) => ({
        p: v(r.p),
        helix: false,
        color: chain.id === "A" ? chainColor((r.n - 1) / (lenA - 1)) : map17Color.clone(),
      }));
      const g = ribbonGeometry(res, { ...ribbonOpts, coilRadius: 0.026, sides: high ? 8 : 6, samplesPerResidue: high ? 5 : 3 });
      if (g) traceTubes.push(g);
      res.forEach((r) => traceAtoms.push({ p: r.p, color: r.color, radius: 0.062 }));
    }
  }
  const traceMat = moleculeMaterial({ roughness: 0.32, clearcoat: 0.5 });
  const traceTube = new THREE.Mesh(mergeGeometries(traceTubes), traceMat);
  const traceBeadMat = moleculeMaterial({ roughness: 0.3, clearcoat: 0.6, vertexColors: false });
  const traceBeads = sphereInstances(traceAtoms, traceBeadMat, high ? 2 : 1);
  const trace = new THREE.Group();
  trace.add(traceTube, traceBeads);
  group.add(trace);

  // ---- Ligand (ball-and-stick) -------------------------------------------------------
  const ligAtoms: Atom[] = data.ligand.atoms.map((a) => ({
    p: v(a.p),
    color: a.el === "C" ? ligandColor.clone() : srgb(ELEMENT[a.el] ?? 0xffffff),
    radius: a.el === "C" ? 0.05 : 0.056,
  }));
  // Instanced meshes carry per-instance colours, not vertex colours.
  const ligandMat = moleculeMaterial({ roughness: 0.25, clearcoat: 0.8, vertexColors: false });
  const ligandBondMat = moleculeMaterial({ roughness: 0.3, clearcoat: 0.6, vertexColors: false });
  const ligand = new THREE.Group();
  ligand.add(sphereInstances(ligAtoms, ligandMat, high ? 3 : 2), bondInstances(ligAtoms, data.ligand.bonds, 0.02, ligandBondMat));
  group.add(ligand);

  // ---- Binding-site side chains -------------------------------------------------------
  const site = new THREE.Group();
  const siteMat = moleculeMaterial({ roughness: 0.3, clearcoat: 0.5, vertexColors: false });
  const siteBondMat = moleculeMaterial({ roughness: 0.35, clearcoat: 0.4, vertexColors: false });
  const contactCarbon = srgb(0xe7ecf3);
  for (const residue of data.contacts.atoms ?? []) {
    const atoms: Atom[] = residue.atoms.map((a) => ({
      p: v(a.p),
      color: a.el === "C" ? contactCarbon.clone() : srgb(ELEMENT[a.el] ?? 0xffffff),
      radius: 0.028,
    }));
    if (atoms.length) site.add(sphereInstances(atoms, siteMat, 1));
    if (residue.bonds.length) site.add(bondInstances(atoms, residue.bonds, 0.016, siteBondMat));
  }
  group.add(site);

  // ---- Surface (built on first use) ----------------------------------------------------
  let surface: THREE.Mesh | null = null;
  const surfaceMat = moleculeMaterial({ roughness: 0.55, clearcoat: 0.15 });
  const pocketTint = ligandColor.clone().lerp(new THREE.Color(0xffffff), 0.15);
  function buildSurface() {
    const points: DensityPoint[] = [];
    if (data.heavy) {
      // All heavy atoms: a Gaussian molecular surface with atomic-scale texture.
      for (const [chain, flat] of Object.entries(data.heavy)) {
        for (let i = 0; i < flat.length; i += 4) {
          const pocket = contactSet.has(`${chain}${flat[i + 3]}`);
          points.push({
            p: new THREE.Vector3(flat[i], flat[i + 1], flat[i + 2]).multiplyScalar(SCALE / 10),
            color: chain === "A" ? (pocket ? pocketTint : sglt2Color) : map17Color,
          });
        }
      }
    } else {
      for (const chain of [chainA, chainB]) {
        if (!chain) continue;
        for (const segment of chain.segments) {
          for (const r of segment) {
            const pocket = contactSet.has(`${chain.id}${r.n}`);
            points.push({ p: v(r.p), color: chain.id === "A" ? (pocket ? pocketTint : sglt2Color) : map17Color });
          }
        }
      }
    }
    const geometry = data.heavy
      ? gaussianSurface(points, { sigma: 0.15, iso: 0.42, resolution: high ? 112 : 72, pad: 0.5 })
      : gaussianSurface(points, { sigma: 0.26, iso: 0.5, resolution: high ? 100 : 64, pad: 0.6 });
    surface = new THREE.Mesh(geometry, surfaceMat);
    surface.name = "protein-surface";
    group.add(surface);
  }

  const centroid = new THREE.Vector3();
  ligAtoms.forEach((a) => centroid.add(a.p));
  centroid.divideScalar(Math.max(1, ligAtoms.length));

  /** Fade representations; `w` is the eased weight of each viewer mode, `on` the overall visibility. */
  function update(w: MeshWeights, on: number) {
    if (on * w.surface > 0.01 && !surface) buildSurface();
    // Binding-site view: the cartoon stays as faint, desaturated context.
    const siteCartoon = 0.2 * w.site;
    setFade(cartoon, cartoonMat, on * Math.min(1, w.cartoon + siteCartoon));
    cartoonMat.color.setScalar(1 - 0.45 * w.site * (1 - w.cartoon));
    setFade(trace, traceMat, on * w.trace);
    setFade(traceBeads, traceBeadMat, on * w.trace);
    if (surface) setFade(surface, surfaceMat, on * w.surface);
    // The ligand is shown with every mesh representation; it is the subject of the binding-site view.
    const lig = on * Math.min(1, w.cartoon + w.trace + w.site + w.surface * 0.9);
    setFade(ligand, ligandMat, lig);
    setFade(ligand, ligandBondMat, lig);
    setFade(site, siteMat, on * w.site);
    setFade(site, siteBondMat, on * w.site);
    group.visible = on > 0.01;
  }

  return {
    group,
    ligandCentroid: centroid,
    update,
    /** Build the surface ahead of time (call when idle). */
    prepareSurface() {
      if (!surface) buildSurface();
    },
    dispose() {
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
      });
      [cartoonMat, traceMat, traceBeadMat, ligandMat, ligandBondMat, siteMat, siteBondMat, surfaceMat].forEach((m) => m.dispose());
    },
  };
}

export type ProteinStructure = ReturnType<typeof createProteinStructure>;
