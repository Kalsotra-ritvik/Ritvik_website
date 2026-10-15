import * as THREE from "three";

/**
 * Particle materials shared by every molecular scene.
 *
 *  - "bead": opaque sphere impostors (lit as small spheres) with stochastic
 *    transparency, so fading beads still depth-sort correctly. Gives the
 *    particle-covered tube look of the reference imagery.
 *  - "glow": additive soft sprites for highlights (base-pair nodes, H-bonds).
 *
 * Scenes can inject GLSL that edits `p` (position), `n` (normal), `c` (colour),
 * `a` (alpha) and `s` (size) before projection.
 */
// All materials are custom shaders that write sRGB values directly, so colours
// are used exactly as specified (no linear conversion).
THREE.ColorManagement.enabled = false;

export type ParticleStyle = "bead" | "glow";

export interface ParticleMaterialOptions {
  style: ParticleStyle;
  header?: string;
  displace?: string;
  uniforms?: Record<string, THREE.IUniform>;
  fogNear?: number;
  fogFar?: number;
  intensity?: number;
  /** Alpha multiplier for particles whose normal faces away from the camera. */
  backAlpha?: number;
  /** For beads: fade beads whose normal faces the camera (cut-away view). */
  cutaway?: number;
}

export const FOG_COLOR = new THREE.Color(0x070b12);

export const sharedUniforms = {
  uViewportH: { value: 800 },
  uTime: { value: 0 },
};

const VERTEX = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
attribute vec3 aNormal;
uniform float uViewportH;
uniform float uTime;
uniform float uOpacity;
uniform float uSizeScale;
uniform float uFogNear;
uniform float uFogFar;
uniform float uBackAlpha;
uniform float uCutaway;
varying vec3 vColor;
varying float vAlpha;
varying float vLight;
varying float vFog;
__HEADER__
void main() {
  vec3 p = position;
  vec3 n = aNormal;
  vec3 c = aColor;
  float a = aAlpha;
  float s = aSize;
  __DISPLACE__
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 nv = normalize(normalMatrix * n + vec3(1e-5));
  vec3 V = normalize(-mv.xyz);
  float facing = dot(nv, V);
  vec3 L1 = normalize(vec3(0.45, 0.75, 0.55));
  vec3 L2 = normalize(vec3(-0.6, -0.25, 0.35));
  float key = max(dot(nv, L1), 0.0);
  float fill = max(dot(nv, L2), 0.0);
  float rim = pow(1.0 - max(facing, 0.0), 2.0);
  vLight = 0.42 + 0.7 * key + 0.22 * fill + 0.45 * rim;
  a *= mix(uBackAlpha, 1.0, smoothstep(-0.25, 0.35, facing));
  // Cut-away: remove the camera-facing half of a shell, like a sectioned illustration.
  a *= 1.0 - uCutaway * step(0.18, facing);
  s *= 1.0 - uCutaway * step(0.18, facing);
  float dist = max(-mv.z, 0.01);
  vFog = smoothstep(uFogNear, uFogFar, dist);
  gl_PointSize = max(s * uSizeScale * uViewportH * projectionMatrix[1][1] * 0.5 / dist, 0.0);
  gl_Position = projectionMatrix * mv;
  vColor = c;
  vAlpha = a * uOpacity;
}
`;

const FRAGMENT_GLOW = /* glsl */ `
uniform float uIntensity;
varying vec3 vColor;
varying float vAlpha;
varying float vLight;
varying float vFog;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float core = exp(-r2 * 3.2);
  float alpha = core * vAlpha * (1.0 - 0.85 * vFog);
  if (alpha < 0.003) discard;
  gl_FragColor = vec4(vColor * vLight * uIntensity, alpha);
}
`;

const FRAGMENT_BEAD = /* glsl */ `
uniform vec3 uFogColor;
uniform vec3 uRimColor;
varying vec3 vColor;
varying float vAlpha;
varying float vLight;
varying float vFog;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  q.y = -q.y;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  if (vAlpha < 0.999 && hash(gl_FragCoord.xy) > vAlpha) discard;
  vec3 sn = vec3(q, sqrt(1.0 - r2));
  vec3 L = normalize(vec3(0.42, 0.62, 0.66));
  float diff = max(dot(sn, L), 0.0);
  float spec = pow(max(dot(reflect(-L, sn), vec3(0.0, 0.0, 1.0)), 0.0), 22.0);
  float rim = pow(1.0 - sn.z, 2.4);
  vec3 col = vColor * (0.2 + 0.78 * diff) * (0.65 + 0.45 * vLight);
  col += vec3(1.0, 0.93, 0.82) * spec * 0.32 + uRimColor * rim * 0.42;
  col = mix(col, uFogColor, vFog * 0.92);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createParticleMaterial(opts: ParticleMaterialOptions): THREE.ShaderMaterial {
  const glow = opts.style === "glow";
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX.replace("__HEADER__", opts.header ?? "").replace("__DISPLACE__", opts.displace ?? ""),
    fragmentShader: glow ? FRAGMENT_GLOW : FRAGMENT_BEAD,
    uniforms: {
      ...sharedUniforms,
      uOpacity: { value: 1 },
      uSizeScale: { value: 1 },
      uFogNear: { value: opts.fogNear ?? 10 },
      uFogFar: { value: opts.fogFar ?? 40 },
      uBackAlpha: { value: opts.backAlpha ?? (glow ? 0.5 : 1) },
      uCutaway: { value: opts.cutaway ?? 0 },
      uIntensity: { value: opts.intensity ?? 1 },
      uFogColor: { value: FOG_COLOR },
      uRimColor: { value: new THREE.Color(0x7fd4d8) },
      ...opts.uniforms,
    },
    transparent: true,
    depthWrite: !glow,
    depthTest: true,
    blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

const LINE_VERTEX = /* glsl */ `
attribute vec3 aColor;
attribute float aAlpha;
uniform float uOpacity;
uniform float uFogNear;
uniform float uFogFar;
varying vec3 vColor;
varying float vAlpha;
__HEADER__
void main() {
  vec3 p = position;
  vec3 c = aColor;
  float a = aAlpha;
  float s = 1.0;
  vec3 n = vec3(0.0, 1.0, 0.0);
  __DISPLACE__
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float fog = smoothstep(uFogNear, uFogFar, -mv.z);
  vColor = c;
  vAlpha = a * uOpacity * (1.0 - 0.85 * fog);
  gl_Position = projectionMatrix * mv;
}
`;

const LINE_FRAGMENT = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  if (vAlpha < 0.003) discard;
  gl_FragColor = vec4(vColor, vAlpha);
}
`;

export function createLineMaterial(opts: Omit<ParticleMaterialOptions, "style"> = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: LINE_VERTEX.replace("__HEADER__", opts.header ?? "").replace("__DISPLACE__", opts.displace ?? ""),
    fragmentShader: LINE_FRAGMENT,
    uniforms: {
      uOpacity: { value: 1 },
      uFogNear: { value: opts.fogNear ?? 10 },
      uFogFar: { value: opts.fogFar ?? 40 },
      ...opts.uniforms,
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/** Growable typed-array builder for particle attributes. */
export class ParticleBuffer {
  positions: number[] = [];
  colors: number[] = [];
  normals: number[] = [];
  sizes: number[] = [];
  alphas: number[] = [];
  extra: Record<string, { size: number; data: number[] }> = {};

  constructor(extraAttributes: Record<string, number> = {}) {
    for (const [name, size] of Object.entries(extraAttributes)) this.extra[name] = { size, data: [] };
  }

  get count() {
    return this.sizes.length;
  }

  push(
    p: THREE.Vector3 | [number, number, number],
    color: THREE.Color,
    size: number,
    normal: THREE.Vector3 | [number, number, number],
    alpha = 1,
    extra: Record<string, number | number[]> = {},
  ) {
    const pa = Array.isArray(p) ? p : [p.x, p.y, p.z];
    const na = Array.isArray(normal) ? normal : [normal.x, normal.y, normal.z];
    this.positions.push(pa[0], pa[1], pa[2]);
    this.colors.push(color.r, color.g, color.b);
    this.normals.push(na[0], na[1], na[2]);
    this.sizes.push(size);
    this.alphas.push(alpha);
    for (const [name, attr] of Object.entries(this.extra)) {
      const v = extra[name] ?? 0;
      if (Array.isArray(v)) attr.data.push(...v);
      else attr.data.push(v);
    }
  }

  toGeometry(dynamic = false): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    const attr = (data: number[], size: number) => {
      const a = new THREE.BufferAttribute(new Float32Array(data), size);
      if (dynamic) a.setUsage(THREE.DynamicDrawUsage);
      return a;
    };
    g.setAttribute("position", attr(this.positions, 3));
    g.setAttribute("aColor", attr(this.colors, 3));
    g.setAttribute("aNormal", attr(this.normals, 3));
    g.setAttribute("aSize", attr(this.sizes, 1));
    g.setAttribute("aAlpha", attr(this.alphas, 1));
    for (const [name, { size, data }] of Object.entries(this.extra)) g.setAttribute(name, attr(data, size));
    return g;
  }
}

export function color(hex: number, mixWith?: number, amount = 0): THREE.Color {
  const c = new THREE.Color().setHex(hex);
  if (mixWith !== undefined) c.lerp(new THREE.Color().setHex(mixWith), amount);
  return c;
}

/** Palette with fixed scientific meaning across every scene. */
export const PALETTE = {
  dnaCoding: 0x5fb5a9, // DNA coding (non-template) strand — teal
  dnaTemplate: 0x6f8fe0, // DNA template strand — blue-violet
  silver: 0xdfe5ee,
  baseA: 0xe8b45a,
  baseT: 0xc4622d,
  baseG: 0x9275e8,
  baseC: 0x7fd4d8,
  baseU: 0xe07a5f,
  node: 0xf0c27a, // amber base-pair nodes
  rnaExon: 0xe0894f, // mRNA / exons — warm amber-rust
  rnaIntron: 0x8c84a8, // introns — muted violet-grey
  ncRna: 0xa58be8, // non-coding RNA — violet
  isoform: 0xe36a5c, // alternative isoform — coral
  polymerase: 0xb89b7a, // RNA polymerase — warm taupe
  ribosomeSmall: 0xd8c9b0,
  ribosomeLarge: 0xc2ad8c,
  trna: 0x9fd0c9,
  pore: 0x8fa3b8,
  envelope: 0x55657a,
  map17: 0x9a8f80,
  ligand: 0xf2c46b,
  contact: 0xff8a65,
  dust: 0xc8d2de,
} as const;

/** N→C gradient shared by the nascent chain and the folded protein. */
const CHAIN_STOPS = [0x5fb5a9, 0x6f8fe0, 0x9275e8, 0xd07a8c, 0xe0894f].map((h) => new THREE.Color().setHex(h));
export function chainColor(f: number, target = new THREE.Color()): THREE.Color {
  const x = Math.min(0.9999, Math.max(0, f)) * (CHAIN_STOPS.length - 1);
  const i = Math.floor(x);
  return target.copy(CHAIN_STOPS[i]).lerp(CHAIN_STOPS[i + 1], x - i);
}

export function disposeObject(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose?.();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose?.();
  });
}
