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

/**
 * Smooth single strand: a lit tube through the nucleotide centres with one
 * short base stick per nucleotide. Same inputs as StrandRenderer. A nucleotide
 * with alpha < 1 is drawn thinner (and vanishes at 0) instead of transparent.
 */
export class SmoothStrandRenderer {
  readonly group = new THREE.Group();
  readonly maxNt: number;
  private readonly ring: number;
  private readonly tube: THREE.Mesh;
  private readonly tubeMat: THREE.MeshPhysicalMaterial;
  private readonly bases: THREE.InstancedMesh;
  private readonly baseMat: THREE.MeshPhysicalMaterial;
  private readonly pos: THREE.BufferAttribute;
  private readonly nor: THREE.BufferAttribute;
  private readonly col: THREE.BufferAttribute;
  private static readonly R = 0.085;

  constructor(maxNt: number, quality: "high" | "low") {
    this.maxNt = maxNt;
    this.ring = quality === "high" ? 10 : 6;
    const rings = maxNt * 2; // one ring at each nucleotide, one halfway to the next
    const verts = rings * (this.ring + 1);
    const mk = (size: number) => new THREE.BufferAttribute(new Float32Array(verts * size), size).setUsage(THREE.DynamicDrawUsage);
    this.pos = mk(3);
    this.nor = mk(3);
    this.col = mk(3);
    const index: number[] = [];
    for (let r = 0; r < rings - 1; r++) {
      for (let k = 0; k < this.ring; k++) {
        const a = r * (this.ring + 1) + k;
        const b = a + this.ring + 1;
        index.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", this.pos);
    geometry.setAttribute("normal", this.nor);
    geometry.setAttribute("color", this.col);
    geometry.setIndex(index);
    this.tubeMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.45, clearcoatRoughness: 0.3 });
    this.tube = new THREE.Mesh(geometry, this.tubeMat);
    this.tube.frustumCulled = false;

    const stick = new THREE.CylinderGeometry(1, 1, 1, quality === "high" ? 8 : 6, 1, false);
    stick.translate(0, 0.5, 0);
    this.baseMat = new THREE.MeshPhysicalMaterial({ roughness: 0.32, clearcoat: 0.5 });
    this.bases = new THREE.InstancedMesh(stick, this.baseMat, maxNt);
    this.bases.frustumCulled = false;
    this.bases.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.tube, this.bases);
  }

  private t = new THREE.Vector3();
  private nrm = new THREE.Vector3(1, 0, 0);
  private bin = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private c = new THREE.Vector3();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private y = new THREE.Vector3(0, 1, 0);
  private color = new THREE.Color();
  private last = new THREE.Vector3();

  update(centers: Float32Array, count: number, backboneColor: Float32Array, baseColor: Float32Array, alpha: Float32Array, scale = 1) {
    const pos = this.pos.array as Float32Array;
    const nor = this.nor.array as Float32Array;
    const col = this.col.array as Float32Array;
    const { t, nrm, bin, dir, c, color } = this;
    const R = SmoothStrandRenderer.R * scale;
    let v = 0;
    this.last.set(centers[0], centers[1], centers[2]);
    for (let i = 0; i < this.maxNt; i++) {
      const visible = i < count;
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(Math.max(0, count - 1), i + 1);
      t.set(centers[i1 * 3] - centers[i0 * 3], centers[i1 * 3 + 1] - centers[i0 * 3 + 1], centers[i1 * 3 + 2] - centers[i0 * 3 + 2]);
      if (t.lengthSq() < 1e-10) t.set(0, 1, 0);
      t.normalize();
      // Parallel transport keeps the ring orientation stable along the strand.
      nrm.addScaledVector(t, -nrm.dot(t));
      if (nrm.lengthSq() < 1e-6) {
        nrm.set(t.y, -t.x, 0);
        if (nrm.lengthSq() < 1e-6) nrm.set(0, t.z, -t.y);
      }
      nrm.normalize();
      bin.crossVectors(t, nrm);
      const a0 = visible ? alpha[i] : 0;
      const nx = Math.min(Math.max(0, count - 1), i + 1);
      const a1 = visible && i + 1 < count ? Math.min(a0, alpha[nx]) : 0;
      color.setRGB(backboneColor[i * 3], backboneColor[i * 3 + 1], backboneColor[i * 3 + 2]).convertSRGBToLinear();
      if (a0 > 0) this.last.set(centers[i * 3], centers[i * 3 + 1], centers[i * 3 + 2]);
      for (let half = 0; half < 2; half++) {
        // Hidden nucleotides collapse onto the last visible one, so the tube never
        // stretches toward an invisible stretch (e.g. a spliced-out intron).
        const u = half === 1 && a1 > 0 ? 0.5 : 0;
        if (a0 > 0)
          c.set(
            centers[i * 3] + (centers[nx * 3] - centers[i * 3]) * u,
            centers[i * 3 + 1] + (centers[nx * 3 + 1] - centers[i * 3 + 1]) * u,
            centers[i * 3 + 2] + (centers[nx * 3 + 2] - centers[i * 3 + 2]) * u,
          );
        else c.copy(this.last);
        const r = R * (half === 0 ? a0 : a1);
        for (let k = 0; k <= this.ring; k++) {
          const phi = (k / this.ring) * Math.PI * 2;
          dir.copy(nrm).multiplyScalar(Math.cos(phi)).addScaledVector(bin, Math.sin(phi));
          pos[v * 3] = c.x + dir.x * r;
          pos[v * 3 + 1] = c.y + dir.y * r;
          pos[v * 3 + 2] = c.z + dir.z * r;
          nor[v * 3] = dir.x;
          nor[v * 3 + 1] = dir.y;
          nor[v * 3 + 2] = dir.z;
          col[v * 3] = color.r;
          col[v * 3 + 1] = color.g;
          col[v * 3 + 2] = color.b;
          v++;
        }
      }
      // Base: a short stick rotating ~33° per nucleotide around the strand.
      const twist = i * 0.57;
      dir.copy(nrm).multiplyScalar(Math.cos(twist)).addScaledVector(bin, Math.sin(twist));
      this.q.setFromUnitVectors(this.y, dir);
      const len = 0.3 * scale * a0;
      this.s.set(0.05 * scale * (a0 > 0 ? 1 : 0), len, 0.05 * scale * (a0 > 0 ? 1 : 0));
      c.set(centers[i * 3], centers[i * 3 + 1], centers[i * 3 + 2]);
      this.m.compose(c, this.q, this.s);
      this.bases.setMatrixAt(i, this.m);
      color.setRGB(baseColor[i * 3], baseColor[i * 3 + 1], baseColor[i * 3 + 2]).convertSRGBToLinear();
      this.bases.setColorAt(i, color);
    }
    this.pos.needsUpdate = this.nor.needsUpdate = this.col.needsUpdate = true;
    this.bases.instanceMatrix.needsUpdate = true;
    if (this.bases.instanceColor) this.bases.instanceColor.needsUpdate = true;
  }

  setOpacity(o: number) {
    for (const m of [this.tubeMat, this.baseMat]) {
      m.opacity = o;
      m.transparent = o < 0.999;
    }
    this.group.visible = o > 0.002;
  }

  dispose() {
    disposeObject(this.group);
  }
}
