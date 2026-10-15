import * as THREE from "three";
import { createRandom } from "@/lib/science/random";
import { PathSampler, randomCoilPath } from "@/lib/engine/path";
import { PALETTE, ParticleBuffer, chainColor, color, createLineMaterial, createParticleMaterial, disposeObject } from "@/lib/engine/materials";
import { sseg } from "@/lib/story/chapters";
import type { MolecularState } from "@/lib/story/molecularTimeline";
import type { ViewerMode } from "@/lib/story/store";
import { buildResidues, type StructureData } from "@/lib/science/structure";
import type { World } from "./world";

/**
 * Nascent polypeptide → folded SGLT2.
 *
 * The folded coordinates are the deposited Cα positions of PDB 7VSI chain A.
 * The path from the extended chain to that fold is an ILLUSTRATIVE interpolation
 * (helices form locally, then pack N→C). It is not a folding simulation, and in
 * cells SGLT2 is inserted into the ER membrane co-translationally.
 */
const SCALE = 0.1; // Å → world units (≈ nm)
const SPC = 0.33; // spacing along the extended chain

export function createProteinScene(
  world: World,
  data: StructureData,
  ptcWorld: THREE.Vector3,
  tunnelExitWorld: THREE.Vector3,
  quality: "high" | "low",
) {
  const high = quality === "high";
  const residues = buildResidues(data, "A");
  const N = residues.length;
  const group = new THREE.Group();
  group.position.copy(world.PROT);

  const F = residues.map((r) => new THREE.Vector3(r.folded[0], r.folded[1], r.folded[2]).multiplyScalar(SCALE));

  // Extended-chain path: P-site/PTC → up the exit tunnel → random coil.
  const ptcL = ptcWorld.clone().sub(world.PROT);
  const exitL = tunnelExitWorld.clone().sub(world.PROT);
  const rng = createRandom(2022);
  const up = exitL.clone().sub(ptcL).normalize();
  const coilPts = [
    ptcL,
    exitL,
    ...randomCoilPath(exitL.clone().addScaledVector(up, 0.9), up, new THREE.Vector3(0, 0.5, 0), N * SPC + 20, rng, {
      step: 0.75,
      persistence: 0.86,
      pull: 0.08,
      radius: 6.2,
    }),
  ];
  const coil = new PathSampler(coilPts, 5000);
  const Efull = residues.map((_, r) => coil.at((N - 1 - r) * SPC));

  // Helix runs (resolved residues only)
  const runs: [number, number][] = [];
  for (let r = 0; r < N; r++) {
    if (residues[r].helix && (r === 0 || !residues[r - 1].helix)) {
      let e = r;
      while (e + 1 < N && residues[e + 1].helix) e++;
      runs.push([r, e]);
    }
  }
  // Intermediate H: each helix takes its folded local shape around its position on the extended chain.
  const disp: (THREE.Vector3 | null)[] = new Array(N).fill(null);
  for (const [a, b] of runs) {
    const cF = new THREE.Vector3();
    const cE = new THREE.Vector3();
    for (let r = a; r <= b; r++) {
      cF.add(F[r]);
      cE.add(Efull[r]);
    }
    cF.divideScalar(b - a + 1);
    cE.divideScalar(b - a + 1);
    for (let r = a; r <= b; r++) disp[r] = cE.clone().add(F[r]).sub(cF).sub(Efull[r]);
  }
  const H = residues.map((_, r) => {
    if (disp[r]) return Efull[r].clone().add(disp[r]!);
    let lo = r - 1;
    while (lo >= 0 && !disp[lo]) lo--;
    let hi = r + 1;
    while (hi < N && !disp[hi]) hi++;
    const dl = lo >= 0 ? disp[lo]! : null;
    const dh = hi < N ? disp[hi]! : null;
    const d = dl && dh ? dl.clone().lerp(dh, (r - lo) / (hi - lo)) : (dl ?? dh ?? new THREE.Vector3());
    return Efull[r].clone().add(d);
  });

  // ---- Tube particles ---------------------------------------------------------------
  const sub = high ? 4 : 3;
  const ring = high ? 6 : 3;
  const segCount = (N - 1) * sub;
  const tubeCount = segCount * ring;
  const total = tubeCount + N;
  const mk = (size: number) => new THREE.BufferAttribute(new Float32Array(total * size), size).setUsage(THREE.DynamicDrawUsage);
  const aPos = mk(3), aNor = mk(3), aCol = mk(3), aSize = mk(1), aAlpha = mk(1);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", aPos);
  geom.setAttribute("aNormal", aNor);
  geom.setAttribute("aColor", aCol);
  geom.setAttribute("aSize", aSize);
  geom.setAttribute("aAlpha", aAlpha);
  const material = createParticleMaterial({ style: "bead", fogNear: 12, fogFar: 46 });
  material.uniforms.uRimColor.value = new THREE.Color(0xb9c7ff);
  const tube = new THREE.Points(geom, material);
  tube.frustumCulled = false;
  group.add(tube);

  // ---- MAP17 (chain B) and empagliflozin ----------------------------------------------
  const extras = new ParticleBuffer();
  const map17 = data.chains.find((c) => c.id === "B");
  const mapCol = color(PALETTE.map17);
  const map17Centroid = new THREE.Vector3();
  let mapCount = 0;
  for (const segment of map17?.segments ?? []) {
    for (let i = 0; i < segment.length - 1; i++) {
      const a = new THREE.Vector3(...segment[i].p).multiplyScalar(SCALE);
      const b = new THREE.Vector3(...segment[i + 1].p).multiplyScalar(SCALE);
      map17Centroid.add(a);
      mapCount++;
      for (let k = 0; k < 4; k++) {
        const p = a.clone().lerp(b, k / 4);
        extras.push(p, mapCol, 0.2, p.clone().normalize(), 1);
      }
    }
  }
  map17Centroid.divideScalar(Math.max(1, mapCount));
  const mapMat = createParticleMaterial({ style: "bead", fogNear: 12, fogFar: 46 });
  const mapPoints = new THREE.Points(extras.toGeometry(), mapMat);
  mapPoints.frustumCulled = false;
  group.add(mapPoints);

  const ligBuf = new ParticleBuffer();
  const ligandCentroid = new THREE.Vector3();
  const elColor: Record<string, number> = { C: PALETTE.ligand, O: 0xff6b5a, CL: 0x8fe39a };
  const ligPos = data.ligand.atoms.map((a) => new THREE.Vector3(...a.p).multiplyScalar(SCALE));
  ligPos.forEach((p, i) => {
    ligandCentroid.add(p);
    ligBuf.push(p, color(elColor[data.ligand.atoms[i].el] ?? 0xffffff), 0.16, p.clone().normalize(), 1);
  });
  ligandCentroid.divideScalar(ligPos.length);
  const ligMat = createParticleMaterial({ style: "bead", fogNear: 12, fogFar: 46 });
  const ligPoints = new THREE.Points(ligBuf.toGeometry(), ligMat);
  ligPoints.frustumCulled = false;
  ligPoints.renderOrder = 3;
  const bondBuf = new ParticleBuffer();
  for (const [i, j] of data.ligand.bonds) {
    bondBuf.push(ligPos[i], color(PALETTE.ligand), 1, [0, 1, 0], 0.9);
    bondBuf.push(ligPos[j], color(PALETTE.ligand), 1, [0, 1, 0], 0.9);
  }
  const bondMat = createLineMaterial({ fogNear: 12, fogFar: 46 });
  const bonds = new THREE.LineSegments(bondBuf.toGeometry(), bondMat);
  bonds.frustumCulled = false;
  const haloBuf = new ParticleBuffer();
  haloBuf.push(ligandCentroid, color(0xffc76b), 2.6, [0, 0, 1], 0.32);
  const haloMat = createParticleMaterial({ style: "glow", fogNear: 12, fogFar: 46, backAlpha: 1 });
  const halo = new THREE.Points(haloBuf.toGeometry(), haloMat);
  halo.frustumCulled = false;
  group.add(ligPoints, bonds, halo);

  // ---- Per-frame state ---------------------------------------------------------------
  const P = residues.map(() => new THREE.Vector3());
  const S = residues.map(() => new THREE.Vector3());
  const resAlpha = new Float32Array(N);
  const resColor = residues.map((_, r) => chainColor(r / (N - 1)));
  const dimColor = color(0x4a5568);
  const contactColor = color(PALETTE.contact);
  const helixFlag = residues.map((r) => r.helix);
  const mode = { cartoon: 1, trace: 0, site: 0 };
  let lastKey = "";

  const c0 = new THREE.Vector3(), c1 = new THREE.Vector3();
  const center = new THREE.Vector3(), prev = new THREE.Vector3(), tangent = new THREE.Vector3();
  const nrm = new THREE.Vector3(1, 0, 0), bin = new THREE.Vector3(), dir = new THREE.Vector3();
  const colA = new THREE.Color(), colB = new THREE.Color(), colC = new THREE.Color();

  const catmull = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, u: number, out: THREE.Vector3) => {
    const u2 = u * u, u3 = u2 * u;
    return out.set(0, 0, 0)
      .addScaledVector(p0, -0.5 * u3 + u2 - 0.5 * u)
      .addScaledVector(p1, 1.5 * u3 - 2.5 * u2 + 1)
      .addScaledVector(p2, -1.5 * u3 + 2 * u2 + 0.5 * u)
      .addScaledVector(p3, 0.5 * u3 - 0.5 * u2);
  };

  function residueColor(r: number, out: THREE.Color) {
    out.copy(resColor[r]);
    if (mode.site > 0.001) {
      const target = residues[r].contact ? contactColor : dimColor;
      out.lerp(target, mode.site);
    }
    return out;
  }

  function compute(ms: MolecularState, t: number) {
    const n = Math.min(N, ms.residues);
    const u = ms.fold;
    const p1 = sseg(u, 0, 0.45);
    for (let r = 0; r < N; r++) {
      if (u <= 0) {
        if (r < n) coil.at((n - 1 - r) * SPC, P[r]);
        else P[r].copy(ptcL);
      } else {
        const p2 = THREE.MathUtils.smoothstep(Math.min(1, Math.max(0, ((u - 0.35) / 0.65) * 1.35 - (r / N) * 0.35)), 0, 1);
        P[r].copy(Efull[r]).lerp(H[r], p1).lerp(F[r], p2);
      }
      const visible = r < n ? 1 : 0;
      const resolvedFade = residues[r].modeled ? 1 : 1 - sseg(u, 0.55, 0.92);
      // In binding-site mode, thin out everything except the contact residues so the pocket is visible.
      const siteFade = residues[r].contact ? 1 : 1 - 0.7 * mode.site;
      resAlpha[r] = visible * resolvedFade * siteFade;
    }
    // Cartoon: smooth helices toward their axes so they read as cylinders.
    const smoothW = mode.cartoon * sseg(u, 0.3, 0.7) + mode.site * sseg(u, 0.3, 0.7) * 0.6;
    for (let r = 0; r < N; r++) S[r].copy(P[r]);
    if (smoothW > 0.001) {
      for (const [a, b] of runs) {
        for (let pass = 0; pass < 3; pass++) {
          for (let r = a + 1; r < b; r++) {
            prev.copy(S[r - 1]).add(S[r + 1]).addScaledVector(S[r], 2).multiplyScalar(0.25);
            P[r].lerp(prev, smoothW);
          }
          for (let r = a; r <= b; r++) S[r].copy(P[r]);
        }
      }
    }

    const pos = aPos.array as Float32Array, nor = aNor.array as Float32Array, col = aCol.array as Float32Array;
    const siz = aSize.array as Float32Array, alp = aAlpha.array as Float32Array;
    const helixRadius = THREE.MathUtils.lerp(0.075, 0.24, (mode.cartoon + mode.site * 0.5) * sseg(u, 0.25, 0.65));
    let idx = 0;
    let first = true;
    for (let r = 0; r < N - 1; r++) {
      catmull(P[Math.max(0, r - 1)], P[r], P[r + 1], P[Math.min(N - 1, r + 2)], 0, c0);
      const inHelix = helixFlag[r] && helixFlag[r + 1];
      const radius = inHelix ? helixRadius : 0.07;
      const a = Math.min(resAlpha[r], resAlpha[r + 1]);
      residueColor(r, colA);
      residueColor(r + 1, colB);
      for (let k = 0; k < sub; k++) {
        const uu = k / sub;
        catmull(P[Math.max(0, r - 1)], P[r], P[r + 1], P[Math.min(N - 1, r + 2)], uu, center);
        catmull(P[Math.max(0, r - 1)], P[r], P[r + 1], P[Math.min(N - 1, r + 2)], Math.min(1, uu + 0.05), c1);
        tangent.subVectors(c1, center);
        if (tangent.lengthSq() < 1e-10) tangent.set(0, 1, 0);
        tangent.normalize();
        if (first) {
          nrm.set(0, 0, 1).cross(tangent);
          if (nrm.lengthSq() < 1e-6) nrm.set(1, 0, 0);
          first = false;
        }
        nrm.addScaledVector(tangent, -nrm.dot(tangent)).normalize();
        bin.crossVectors(tangent, nrm);
        colC.copy(colA).lerp(colB, uu);
        for (let j = 0; j < ring; j++) {
          const phi = (j / ring) * Math.PI * 2 + (r * sub + k) * 0.55;
          dir.copy(nrm).multiplyScalar(Math.cos(phi)).addScaledVector(bin, Math.sin(phi));
          pos[idx * 3] = center.x + dir.x * radius;
          pos[idx * 3 + 1] = center.y + dir.y * radius;
          pos[idx * 3 + 2] = center.z + dir.z * radius;
          nor[idx * 3] = dir.x; nor[idx * 3 + 1] = dir.y; nor[idx * 3 + 2] = dir.z;
          col[idx * 3] = colC.r; col[idx * 3 + 1] = colC.g; col[idx * 3 + 2] = colC.b;
          siz[idx] = a > 0 ? (inHelix ? 0.11 + helixRadius * 0.12 : 0.1) : 0;
          alp[idx] = a;
          idx++;
        }
      }
    }
    // Cα nodes: prominent as "amino acids" on the nascent chain and in trace mode.
    const nodeSize = Math.max(0.3 * (1 - sseg(u, 0, 0.25)), 0.19 * mode.trace);
    for (let r = 0; r < N; r++) {
      residueColor(r, colA);
      const contactBoost = residues[r].contact ? mode.site * 0.12 : 0;
      pos[idx * 3] = P[r].x; pos[idx * 3 + 1] = P[r].y; pos[idx * 3 + 2] = P[r].z;
      dir.copy(P[r]).normalize();
      nor[idx * 3] = dir.x; nor[idx * 3 + 1] = dir.y; nor[idx * 3 + 2] = dir.z;
      col[idx * 3] = colA.r; col[idx * 3 + 1] = colA.g; col[idx * 3 + 2] = colA.b;
      siz[idx] = resAlpha[r] > 0 ? nodeSize + contactBoost : 0;
      alp[idx] = resAlpha[r];
      idx++;
    }
    aPos.needsUpdate = aNor.needsUpdate = aCol.needsUpdate = aSize.needsUpdate = aAlpha.needsUpdate = true;
    void t;
  }

  const anchors = {
    chain: new THREE.Vector3(),
    nTerm: new THREE.Vector3(),
    cTerm: new THREE.Vector3(),
    ligand: new THREE.Vector3(),
    map17: new THREE.Vector3(),
    helix: new THREE.Vector3(),
  };
  const firstModeled = residues.findIndex((r) => r.modeled);
  const longest = runs.reduce((best, r) => (r[1] - r[0] > best[1] - best[0] ? r : best), runs[0]);
  const helixMid = Math.floor((longest[0] + longest[1]) / 2);

  function update(t: number, ms: MolecularState, target: { mode: ViewerMode; yaw: number; pitch: number }, dt: number, instant: boolean) {
    const k = instant ? 1 : Math.min(1, dt * 4);
    const want = target.mode === "trace" || target.mode === "site" ? target.mode : "cartoon";
    for (const m of ["cartoon", "trace", "site"] as const) mode[m] += ((want === m ? 1 : 0) - mode[m]) * k;
    if (Math.abs(mode[want] - 1) < 0.002) for (const m of ["cartoon", "trace", "site"] as const) mode[m] = want === m ? 1 : 0;

    const key = `${ms.residues}|${ms.fold.toFixed(4)}|${mode.cartoon.toFixed(3)}|${mode.trace.toFixed(3)}|${mode.site.toFixed(3)}`;
    if (key !== lastKey) {
      compute(ms, t);
      lastKey = key;
    }
    const visible = ms.residues > 0;
    group.visible = visible;
    material.uniforms.uOpacity.value = 1;

    // Structure extras appear once the chain has reached its folded state.
    const extrasOn = sseg(t, 4.96, 5.12);
    mapMat.uniforms.uOpacity.value = extrasOn * (1 - 0.65 * mode.site);
    mapPoints.visible = extrasOn > 0.01;
    const lig = extrasOn * THREE.MathUtils.lerp(0.75, 1, mode.site);
    ligMat.uniforms.uOpacity.value = lig;
    ligMat.uniforms.uSizeScale.value = THREE.MathUtils.lerp(1, 1.7, mode.site);
    bondMat.uniforms.uOpacity.value = lig;
    haloMat.uniforms.uOpacity.value = extrasOn * (0.35 + 0.65 * mode.site);
    ligPoints.visible = bonds.visible = halo.visible = extrasOn > 0.01;

    group.rotation.set(target.pitch, target.yaw, 0);
    group.updateMatrixWorld(true);
    const at = (v: THREE.Vector3, out: THREE.Vector3) => out.copy(v).applyMatrix4(group.matrixWorld);
    const n = Math.min(N, ms.residues);
    at(P[Math.max(0, n - 1 - Math.min(n - 1, 8))], anchors.chain);
    at(P[firstModeled], anchors.nTerm);
    at(P[N - 1], anchors.cTerm);
    at(ligandCentroid, anchors.ligand);
    at(map17Centroid, anchors.map17);
    at(P[helixMid], anchors.helix);
  }

  return {
    group,
    anchors,
    residues,
    source: data.source,
    contacts: data.contacts,
    update,
    dispose() {
      disposeObject(group);
    },
  };
}

export type ProteinScene = ReturnType<typeof createProteinScene>;
