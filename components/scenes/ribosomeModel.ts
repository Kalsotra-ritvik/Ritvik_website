import * as THREE from "three";
import { assetUrl } from "@/lib/assets";
import { gaussianSurfaceAsync, moleculeMaterial, setFade, type DensityPoint } from "@/components/molecular/meshes";

/**
 * Human 80S ribosome surfaces from PDB 4UG0 (see scripts/build-ribosome.mjs).
 * Each subunit is a Gaussian envelope over one point per residue, coloured by
 * component: ribosomal RNA in warm ivory/sand, ribosomal proteins in cool
 * tones that vary slightly from chain to chain. A clipping plane cuts away the
 * front so the schematic tRNAs and mRNA in the intersubunit space stay visible.
 */
export interface RibosomeData {
  source: { pdbId: string; title: string; method: string; citation: Record<string, string | number>; license: string; processing: string; scale: number };
  groups: Record<"s40r" | "s40p" | "s60r" | "s60p", number[]>;
}

export async function loadRibosome(signal?: AbortSignal): Promise<RibosomeData> {
  const res = await fetch(assetUrl("/data/ribosome-4ug0.json"), { signal });
  if (!res.ok) throw new Error(`Failed to load ribosome model (${res.status})`);
  return (await res.json()) as RibosomeData;
}

const RNA_40S = 0xd4b98c;
const RNA_60S = 0xbf9466;
const PROTEIN_40S = [0x6f9bb5, 0x7caea6, 0x6a8cc0, 0x86a3c4];
const PROTEIN_60S = [0x7083bd, 0x8878b8, 0x6a8ab2, 0x8e93c4];
/** Fit the model to the framing used by the translation shots. */
const DISPLAY_SCALE = 0.8;

function points(flat: number[], palette: number[] | number): DensityPoint[] {
  const out: DensityPoint[] = [];
  const cols = (Array.isArray(palette) ? palette : [palette]).map((h) => new THREE.Color().setHex(h));
  for (let i = 0; i < flat.length; i += 4) {
    out.push({
      p: new THREE.Vector3(flat[i] / 100, flat[i + 1] / 100, flat[i + 2] / 100),
      color: cols[flat[i + 3] % cols.length],
    });
  }
  return out;
}

/** Builds both subunit surfaces (in a worker where available). */
export async function createRibosomeModel(data: RibosomeData, quality: "high" | "low") {
  const high = quality === "high";
  // ~5 Å Gaussian width in scene units, independent of the scale chosen at build time.
  const sigma = 5 * data.source.scale;
  const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

  async function subunit(rna: number[], protein: number[], rnaColor: number, proteinPalette: number[]) {
    const pts = [...points(rna, rnaColor).map((p) => ({ ...p, weight: 1.25 })), ...points(protein, proteinPalette)];
    const geometry = await gaussianSurfaceAsync(pts, { sigma, iso: 0.85, resolution: high ? 84 : 56, pad: sigma * 3 });
    const material = moleculeMaterial({ roughness: 0.55, clearcoat: 0.15, side: THREE.DoubleSide });
    material.clippingPlanes = [clip];
    material.clipShadows = true;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(DISPLAY_SCALE);
    const group = new THREE.Group();
    group.add(mesh);
    return {
      group,
      set(assemble: number, opacity = 1) {
        setFade(group, material, assemble * opacity);
      },
      dispose() {
        geometry.dispose();
        material.dispose();
      },
    };
  }

  const [small, large] = await Promise.all([
    subunit(data.groups.s40r, data.groups.s40p, RNA_40S, PROTEIN_40S),
    subunit(data.groups.s60r, data.groups.s60p, RNA_60S, PROTEIN_60S),
  ]);
  return {
    small,
    large,
    /** Cut away everything in front of world-space z = `z`. */
    setCut(z: number) {
      clip.constant = z;
    },
    source: data.source,
  };
}

export type RibosomeModel = Awaited<ReturnType<typeof createRibosomeModel>>;
