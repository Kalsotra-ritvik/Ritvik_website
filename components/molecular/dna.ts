import * as THREE from "three";
import { createRandom } from "@/lib/science/random";
import {
  PALETTE,
  ParticleBuffer,
  color,
  createLineMaterial,
  createParticleMaterial,
  disposeObject,
} from "@/lib/engine/materials";
import { linear } from "./meshes";

/**
 * Procedural DNA double helix with B-form proportions, scaled so the helix
 * radius is 1 world unit (≈1 nm). The base sequence is decorative, not a real
 * gene; pairing follows Watson–Crick rules (A·T with 2 H-bonds, G·C with 3).
 *
 * Local frame: helix axis = +Y. Strand 0 is the coding strand, strand 1 the
 * template strand. Transcription opens a bubble around `center` (in bp).
 */
export const DNA = {
  radius: 1,
  rise: 0.341, // 3.4 Å rise / ~10 Å radius
  turn: (Math.PI * 2) / 10.5,
  offset: 2.4, // angular offset between backbones → distinct major/minor grooves
};

const PAIR: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };
const BASE_COLOR: Record<string, number> = { A: PALETTE.baseA, T: PALETTE.baseT, G: PALETTE.baseG, C: PALETTE.baseC };

export function dnaAxisY(bp: number, basePairs: number) {
  return bp * DNA.rise - ((basePairs - 1) * DNA.rise) / 2;
}

export function dnaStrandPoint(bp: number, strand: 0 | 1, basePairs: number, out = new THREE.Vector3()) {
  const theta = bp * DNA.turn + strand * DNA.offset;
  return out.set(Math.cos(theta) * DNA.radius, dnaAxisY(bp, basePairs), Math.sin(theta) * DNA.radius);
}

const HEADER = /* glsl */ `
attribute float aBp;
attribute float aStrand;
attribute float aKind;
attribute float aSeed;
uniform float uOpen;
uniform float uCenter;
uniform float uHalf;
uniform float uTemplate;
uniform float uIntro;
uniform float uTurn;
uniform float uOffsetAngle;
`;

// Kinds: 0 backbone bead, 1 base (rung) bead, 2 hydrogen bond, 3 node, 4 halo.
const DISPLACE = /* glsl */ `
  float w = (1.0 - smoothstep(uHalf, uHalf + 2.5, abs(aBp - uCenter))) * uOpen;
  float theta = aBp * uTurn + aStrand * uOffsetAngle;
  vec3 radial = vec3(cos(theta), 0.0, sin(theta));
  // Strands separate locally; base halves travel with their own strand.
  p += radial * w * (0.85 + 0.25 * aStrand);
  if (aKind > 1.5 && aKind < 2.5) a *= 1.0 - smoothstep(0.05, 0.4, w);
  if (aStrand > 0.5) { c = mix(c, c * 1.35 + vec3(0.04, 0.05, 0.1), uTemplate); }
  else { c = mix(c, c * 0.7, uTemplate * 0.6); }
  float intro = clamp(uIntro * 1.25 - aSeed * 0.25, 0.0, 1.0);
  float scatter = (1.0 - intro) * (1.0 - intro);
  p += n * scatter * (0.8 + aSeed * 2.2);
  a *= intro;
`;

export type DNAStyle = "smooth" | "hybrid" | "beads";

export interface DNAOptions {
  basePairs: number;
  /** smooth: lit tubes and base slabs; hybrid: smooth plus glow details; beads: particles only. */
  style?: DNAStyle;
  /** Strand colours (sRGB hex strings) from the visual settings. */
  colors?: { coding: string; template: string };
  /** Coding-strand sequence (A/C/G/T). Random if omitted. */
  sequence?: string;
  quality: "high" | "low";
  seed?: number;
}

export interface DNAState {
  open: number;
  center: number;
  template: number;
  intro: number;
  opacity: number;
}

export function createDNA({ basePairs, quality, sequence: given, seed = 42, style = "beads", colors }: DNAOptions) {
  const rng = createRandom(seed);
  const high = quality === "high";
  const substeps = high ? 10 : 6;
  const perStep = high ? 5 : 3;
  const tubeRadius = 0.13;

  const extras = { aBp: 1, aStrand: 1, aKind: 1, aSeed: 1 };
  const beads = new ParticleBuffer(extras);
  const glow = new ParticleBuffer(extras);
  const lines = new ParticleBuffer(extras);

  const sequence = given ? [...given] : Array.from({ length: basePairs }, () => rng.pick(["A", "T", "G", "C"] as const));

  const coding = colors ? new THREE.Color().setStyle(colors.coding).getHex() : PALETTE.dnaCoding;
  const template = colors ? new THREE.Color().setStyle(colors.template).getHex() : PALETTE.dnaTemplate;
  const strandColors = [color(coding, PALETTE.silver, 0.25), color(template, PALETTE.silver, 0.2)];
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const c = new THREE.Color();

  // Backbones -------------------------------------------------------------
  for (const strand of [0, 1] as const) {
    let prev: THREE.Vector3 | null = null;
    for (let i = 0; i <= (basePairs - 1) * substeps; i++) {
      const s = i / substeps;
      dnaStrandPoint(s, strand, basePairs, tmpA);
      dnaStrandPoint(s + 0.01, strand, basePairs, tmpB);
      tangent.subVectors(tmpB, tmpA).normalize();
      const theta = s * DNA.turn + strand * DNA.offset;
      radial.set(Math.cos(theta), 0, Math.sin(theta));
      binormal.crossVectors(tangent, radial).normalize();
      for (let k = 0; k < perStep; k++) {
        const phi = rng.range(0, Math.PI * 2);
        offset.copy(radial).multiplyScalar(Math.cos(phi)).addScaledVector(binormal, Math.sin(phi));
        const pos = tmpA.clone().addScaledVector(offset, tubeRadius * rng.range(0.85, 1.1));
        const normal = offset.clone().multiplyScalar(0.75).addScaledVector(radial, 0.25).normalize();
        c.copy(strandColors[strand]).multiplyScalar(rng.range(0.82, 1.12));
        if (rng.next() < 0.025) c.setHex(PALETTE.node); // sparse warm beads, as in the reference
        beads.push(pos, c, rng.range(0.075, 0.115), normal, 1, { aBp: s, aStrand: strand, aKind: 0, aSeed: rng.next() });
      }
      const center = tmpA.clone();
      if (prev) {
        const col = strandColors[strand];
        lines.push(prev, col, 1, radial, 0.35, { aBp: s - 1 / substeps, aStrand: strand, aKind: 0, aSeed: 0 });
        lines.push(center, col, 1, radial, 0.35, { aBp: s, aStrand: strand, aKind: 0, aSeed: 0 });
      }
      prev = center;
    }
  }

  // Base pairs ----------------------------------------------------------------
  for (let bp = 0; bp < basePairs; bp++) {
    const b0 = sequence[bp];
    const b1 = PAIR[b0];
    const pA = dnaStrandPoint(bp, 0, basePairs, new THREE.Vector3());
    const pB = dnaStrandPoint(bp, 1, basePairs, new THREE.Vector3());
    const mid = pA.clone().add(pB).multiplyScalar(0.5);
    const sideNormal = new THREE.Vector3(mid.x, 0, mid.z).normalize();
    const dots = high ? 9 : 6;
    for (const [strand, base, from, to] of [
      [0, b0, 0.1, 0.45],
      [1, b1, 0.55, 0.9],
    ] as const) {
      const col = color(BASE_COLOR[base]);
      for (let d = 0; d < dots; d++) {
        const f = from + ((to - from) * d) / (dots - 1);
        const pos = pA.clone().lerp(pB, f);
        const end = d === 0 || d === dots - 1;
        beads.push(pos, col, end ? 0.085 : 0.06, sideNormal, 1, { aBp: bp, aStrand: strand, aKind: 1, aSeed: rng.next() });
      }
      lines.push(pA.clone().lerp(pB, from), col, 1, sideNormal, 0.22, { aBp: bp, aStrand: strand, aKind: 1, aSeed: 0 });
      lines.push(pA.clone().lerp(pB, to), col, 1, sideNormal, 0.22, { aBp: bp, aStrand: strand, aKind: 1, aSeed: 0 });
    }
    // Hydrogen bonds in the gap: 2 for A·T, 3 for G·C.
    const hb = b0 === "G" || b0 === "C" ? 3 : 2;
    for (let h = 0; h < hb; h++) {
      const f = 0.47 + (0.06 * (h + 0.5)) / hb;
      const pos = pA.clone().lerp(pB, f);
      pos.y += (h - (hb - 1) / 2) * 0.05;
      glow.push(pos, color(0xffffff), 0.05, sideNormal, 0.9, { aBp: bp, aStrand: h % 2, aKind: 2, aSeed: rng.next() });
    }
    // Bright nodes and halos where each base joins its backbone.
    for (const [strand, p] of [
      [0, pA],
      [1, pB],
    ] as const) {
      const node = color(PALETTE.node, strandColors[strand].getHex(), 0.25);
      const n = new THREE.Vector3(p.x, 0, p.z).normalize();
      glow.push(p, node, 0.2, n, 0.9, { aBp: bp, aStrand: strand, aKind: 3, aSeed: rng.next() });
      if (bp % 2 === 0) glow.push(p, node, 0.75, n, 0.16, { aBp: bp, aStrand: strand, aKind: 4, aSeed: rng.next() });
    }
  }

  const uniforms = {
    uOpen: { value: 0 },
    uCenter: { value: basePairs / 2 },
    uHalf: { value: 6 },
    uTemplate: { value: 0 },
    uIntro: { value: 1 },
    uTurn: { value: DNA.turn },
    uOffsetAngle: { value: DNA.offset },
  };

  const beadMaterial = createParticleMaterial({ style: "bead", header: HEADER, displace: DISPLACE, uniforms, fogNear: 12, fogFar: 42 });
  const glowMaterial = createParticleMaterial({
    style: "glow",
    header: HEADER,
    displace: DISPLACE,
    uniforms,
    fogNear: 12,
    fogFar: 42,
    intensity: 1.1,
  });
  const lineMaterial = createLineMaterial({ header: HEADER, displace: DISPLACE, uniforms, fogNear: 12, fogFar: 42 });

  const group = new THREE.Group();
  group.name = "dna";
  const beadPoints = new THREE.Points(beads.toGeometry(), beadMaterial);
  const glowPoints = new THREE.Points(glow.toGeometry(), glowMaterial);
  const lineSegments = new THREE.LineSegments(lines.toGeometry(), lineMaterial);
  glowPoints.renderOrder = 2;
  lineSegments.renderOrder = 1;
  for (const o of [beadPoints, glowPoints, lineSegments]) o.frustumCulled = false;
  group.add(beadPoints, lineSegments, glowPoints);

  // Smooth representation ---------------------------------------------------------
  // Lit meshes read the strand colours directly (no silver tint, which the lighting already supplies).
  const pureStrands = [color(coding), color(template)];
  const smooth = style === "beads" ? null : createSmoothDNA(basePairs, sequence, pureStrands, uniforms, high);
  if (smooth) {
    group.add(smooth.mesh);
    beadPoints.visible = false;
    if (style === "smooth") lineSegments.visible = false;
  }
  const glowScale = style === "smooth" ? 0.55 : 1;

  return {
    group,
    sequence,
    basePairs,
    particleCount: beads.count + glow.count,
    update(s: DNAState) {
      uniforms.uOpen.value = s.open;
      uniforms.uCenter.value = s.center;
      uniforms.uTemplate.value = s.template;
      uniforms.uIntro.value = s.intro;
      beadMaterial.uniforms.uOpacity.value = s.opacity;
      glowMaterial.uniforms.uOpacity.value = s.opacity * glowScale;
      lineMaterial.uniforms.uOpacity.value = s.opacity;
      if (smooth) {
        const o = s.opacity * s.intro;
        smooth.material.opacity = o;
        smooth.material.transparent = o < 0.999;
        smooth.material.depthWrite = o > 0.6;
        smooth.mesh.visible = o > 0.01;
      }
      group.visible = s.opacity > 0.002;
    },
    dispose() {
      disposeObject(group);
    },
  };
}

/**
 * Lit B-DNA: a tube per backbone and a slab per base, coloured by base, with
 * the same transcription-bubble displacement as the particle model.
 */
function createSmoothDNA(
  basePairs: number,
  sequence: string[],
  strandColors: THREE.Color[],
  uniforms: Record<string, THREE.IUniform>,
  high: boolean,
) {
  const pos: number[] = [], nor: number[] = [], col: number[] = [], bpA: number[] = [], stA: number[] = [];
  const index: number[] = [];
  const push = (p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color, bp: number, strand: number) => {
    pos.push(p.x, p.y, p.z);
    nor.push(n.x, n.y, n.z);
    col.push(c.r, c.g, c.b);
    bpA.push(bp);
    stA.push(strand);
    return pos.length / 3 - 1;
  };
  const sub = high ? 8 : 5;
  const ring = high ? 12 : 8;
  const R = 0.16;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), t = new THREE.Vector3(), radial = new THREE.Vector3(), bin = new THREE.Vector3();
  const p = new THREE.Vector3(), n = new THREE.Vector3();

  for (const strand of [0, 1] as const) {
    const c = linear(strandColors[strand]);
    const steps = (basePairs - 1) * sub;
    const start = pos.length / 3;
    for (let i = 0; i <= steps; i++) {
      const s = i / sub;
      dnaStrandPoint(s, strand, basePairs, a);
      dnaStrandPoint(s + 0.01, strand, basePairs, b);
      t.subVectors(b, a).normalize();
      const theta = s * DNA.turn + strand * DNA.offset;
      radial.set(Math.cos(theta), 0, Math.sin(theta));
      radial.sub(t.clone().multiplyScalar(radial.dot(t))).normalize();
      bin.crossVectors(t, radial).normalize();
      for (let k = 0; k <= ring; k++) {
        const phi = (k / ring) * Math.PI * 2;
        n.copy(radial).multiplyScalar(Math.cos(phi)).addScaledVector(bin, Math.sin(phi));
        p.copy(a).addScaledVector(n, R);
        push(p, n, c, s, strand);
      }
    }
    for (let i = 0; i < steps; i++) {
      for (let k = 0; k < ring; k++) {
        const v0 = start + i * (ring + 1) + k;
        const v1 = v0 + ring + 1;
        index.push(v0, v1, v0 + 1, v1, v1 + 1, v0 + 1);
      }
    }
  }

  // Base slabs: each base spans from its backbone to just short of the helix axis.
  const box = new THREE.BoxGeometry(1, 1, 1);
  const bpos = box.attributes.position, bnor = box.attributes.normal, bidx = box.index!;
  const m = new THREE.Matrix4(), basis = new THREE.Matrix4(), nm = new THREE.Matrix3();
  const x = new THREE.Vector3(), y = new THREE.Vector3(0, 1, 0), z = new THREE.Vector3();
  for (let bp = 0; bp < basePairs; bp++) {
    const pA = dnaStrandPoint(bp, 0, basePairs, new THREE.Vector3());
    const pB = dnaStrandPoint(bp, 1, basePairs, new THREE.Vector3());
    const span = pA.distanceTo(pB);
    x.subVectors(pB, pA).normalize();
    z.crossVectors(x, y).normalize();
    for (const [strand, base, from, to] of [
      [0, sequence[bp], 0.1, 0.485],
      [1, PAIR[sequence[bp]], 0.515, 0.9],
    ] as const) {
      const c = linear(new THREE.Color().setHex(BASE_COLOR[base]));
      const center = pA.clone().lerp(pB, (from + to) / 2);
      basis.makeBasis(x, y, z);
      m.compose(center, new THREE.Quaternion().setFromRotationMatrix(basis), new THREE.Vector3(span * (to - from), 0.075, 0.26));
      nm.getNormalMatrix(m);
      const base0 = pos.length / 3;
      for (let i = 0; i < bpos.count; i++) {
        p.fromBufferAttribute(bpos, i).applyMatrix4(m);
        n.fromBufferAttribute(bnor, i).applyMatrix3(nm).normalize();
        push(p, n, c, bp, strand);
      }
      for (let i = 0; i < bidx.count; i++) index.push(base0 + bidx.getX(i));
    }
  }
  box.dispose();

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geometry.setAttribute("aBp", new THREE.Float32BufferAttribute(bpA, 1));
  geometry.setAttribute("aStrand", new THREE.Float32BufferAttribute(stA, 1));
  geometry.setIndex(index);

  const material = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.4, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.3 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uOpen: uniforms.uOpen, uCenter: uniforms.uCenter, uHalf: uniforms.uHalf, uTemplate: uniforms.uTemplate, uTurn: uniforms.uTurn, uOffsetAngle: uniforms.uOffsetAngle });
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute float aBp;
attribute float aStrand;
uniform float uOpen, uCenter, uHalf, uTurn, uOffsetAngle;
varying float vStrand;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
float w = (1.0 - smoothstep(uHalf, uHalf + 2.5, abs(aBp - uCenter))) * uOpen;
float theta = aBp * uTurn + aStrand * uOffsetAngle;
transformed += vec3(cos(theta), 0.0, sin(theta)) * w * (0.85 + 0.25 * aStrand);
vStrand = aStrand;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
uniform float uTemplate;
varying float vStrand;`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
// While the template strand is being read it is brightened; the coding strand recedes.
if (vStrand > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.6 + vec3(0.01, 0.015, 0.04), uTemplate);
else diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.55, uTemplate * 0.6);`,
      );
  };
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return { mesh, material };
}

export type DNAModel = ReturnType<typeof createDNA>;
