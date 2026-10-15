import * as THREE from "three";
import { createRandom } from "@/lib/science/random";
import { createParticleMaterial, disposeObject } from "@/lib/engine/materials";

/**
 * Renders a single-stranded nucleic acid (RNA) from per-nucleotide centre
 * positions: a beaded sugar-phosphate backbone plus one short unpaired base per
 * nucleotide. Positions are supplied by the caller each frame.
 */
export class StrandRenderer {
  readonly group = new THREE.Group();
  readonly maxNt: number;
  private readonly perNt: number;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly offsets: { phi: number; u: number; radius: number; base: number }[];
  private readonly position: THREE.BufferAttribute;
  private readonly normal: THREE.BufferAttribute;
  private readonly colorAttr: THREE.BufferAttribute;
  private readonly alpha: THREE.BufferAttribute;
  private readonly size: THREE.BufferAttribute;

  constructor(maxNt: number, quality: "high" | "low", seed = 3) {
    this.maxNt = maxNt;
    const rng = createRandom(seed);
    const backbone = quality === "high" ? 4 : 2;
    this.perNt = backbone + 2;
    this.offsets = [];
    for (let k = 0; k < backbone; k++) {
      this.offsets.push({ phi: rng.range(0, Math.PI * 2), u: k / backbone, radius: rng.range(0.07, 0.1), base: 0 });
    }
    this.offsets.push({ phi: 0, u: 0.5, radius: 0.2, base: 1 }, { phi: 0, u: 0.5, radius: 0.33, base: 2 });

    const n = maxNt * this.perNt;
    const mk = (size: number) => new THREE.BufferAttribute(new Float32Array(n * size), size).setUsage(THREE.DynamicDrawUsage);
    this.position = mk(3);
    this.normal = mk(3);
    this.colorAttr = mk(3);
    this.alpha = mk(1);
    this.size = mk(1);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", this.position);
    this.geometry.setAttribute("aNormal", this.normal);
    this.geometry.setAttribute("aColor", this.colorAttr);
    this.geometry.setAttribute("aAlpha", this.alpha);
    this.geometry.setAttribute("aSize", this.size);
    this.material = createParticleMaterial({ style: "bead", fogNear: 10, fogFar: 40 });
    this.material.uniforms.uRimColor.value = new THREE.Color(0xffc796);
    const points = new THREE.Points(this.geometry, this.material);
    points.frustumCulled = false;
    this.group.add(points);
  }

  private t = new THREE.Vector3();
  private nrm = new THREE.Vector3();
  private bin = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private p = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);
  private side = new THREE.Vector3(1, 0, 0);

  /**
   * @param centers nucleotide centres, xyz × count
   * @param count number of nucleotides drawn
   * @param backboneColor per-nucleotide backbone colour (rgb × count)
   * @param baseColor per-nucleotide base colour (rgb × count)
   * @param alpha per-nucleotide alpha
   */
  update(centers: Float32Array, count: number, backboneColor: Float32Array, baseColor: Float32Array, alpha: Float32Array, scale = 1) {
    const pos = this.position.array as Float32Array;
    const nor = this.normal.array as Float32Array;
    const col = this.colorAttr.array as Float32Array;
    const al = this.alpha.array as Float32Array;
    const sz = this.size.array as Float32Array;
    const { t, nrm, bin, dir, p } = this;
    for (let i = 0; i < this.maxNt; i++) {
      const visible = i < count;
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(count - 1, i + 1);
      if (visible && count > 1) {
        t.set(centers[i1 * 3] - centers[i0 * 3], centers[i1 * 3 + 1] - centers[i0 * 3 + 1], centers[i1 * 3 + 2] - centers[i0 * 3 + 2]);
        if (t.lengthSq() < 1e-8) t.set(0, 1, 0);
        t.normalize();
      } else t.set(0, 1, 0);
      nrm.crossVectors(t, Math.abs(t.y) > 0.9 ? this.side : this.up).normalize();
      bin.crossVectors(t, nrm).normalize();
      const twist = i * 0.57; // ~33° per nucleotide, as in an A-form-like single strand
      for (let k = 0; k < this.perNt; k++) {
        const o = this.offsets[k];
        const idx = i * this.perNt + k;
        const cx = centers[i * 3], cy = centers[i * 3 + 1], cz = centers[i * 3 + 2];
        if (o.base === 0) {
          const nx = Math.min(count - 1, i + 1);
          const ax = cx + (centers[nx * 3] - cx) * o.u;
          const ay = cy + (centers[nx * 3 + 1] - cy) * o.u;
          const az = cz + (centers[nx * 3 + 2] - cz) * o.u;
          dir.copy(nrm).multiplyScalar(Math.cos(o.phi)).addScaledVector(bin, Math.sin(o.phi));
          p.set(ax, ay, az).addScaledVector(dir, o.radius * scale);
          col[idx * 3] = backboneColor[i * 3];
          col[idx * 3 + 1] = backboneColor[i * 3 + 1];
          col[idx * 3 + 2] = backboneColor[i * 3 + 2];
          sz[idx] = 0.11 * scale;
        } else {
          dir.copy(nrm).multiplyScalar(Math.cos(twist)).addScaledVector(bin, Math.sin(twist));
          p.set(cx, cy, cz).addScaledVector(dir, o.radius * scale);
          col[idx * 3] = baseColor[i * 3];
          col[idx * 3 + 1] = baseColor[i * 3 + 1];
          col[idx * 3 + 2] = baseColor[i * 3 + 2];
          sz[idx] = (o.base === 2 ? 0.1 : 0.08) * scale;
        }
        pos[idx * 3] = p.x;
        pos[idx * 3 + 1] = p.y;
        pos[idx * 3 + 2] = p.z;
        nor[idx * 3] = dir.x;
        nor[idx * 3 + 1] = dir.y;
        nor[idx * 3 + 2] = dir.z;
        al[idx] = visible ? alpha[i] : 0;
        if (!visible) sz[idx] = 0;
      }
    }
    this.position.needsUpdate = true;
    this.normal.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.alpha.needsUpdate = true;
    this.size.needsUpdate = true;
  }

  setOpacity(o: number) {
    this.material.uniforms.uOpacity.value = o;
    this.group.visible = o > 0.002;
  }

  dispose() {
    disposeObject(this.group);
  }
}
