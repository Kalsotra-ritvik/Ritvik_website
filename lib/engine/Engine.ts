import * as THREE from "three";
import { createDNA, type DNAModel } from "@/components/molecular/dna";
import { createWorld, type World } from "@/components/scenes/world";
import { createTranscriptScene, type TranscriptScene } from "@/components/scenes/transcriptScene";
import { createTranscriptomeScene } from "@/components/scenes/transcriptomeScene";
import { createPoreScene } from "@/components/scenes/poreScene";
import { createTranslationScene, type TranslationScene } from "@/components/scenes/translationScene";
import { createProteinScene, type ProteinScene } from "@/components/scenes/proteinScene";
import { createDust } from "@/components/scenes/dustScene";
import { buildGene, type Gene } from "@/lib/science/gene";
import { loadStructure } from "@/lib/science/structure";
import { molecularState, GENE_LAYOUT, type MolecularState } from "@/lib/story/molecularTimeline";
import { sseg, seg } from "@/lib/story/chapters";
import { story } from "@/lib/story/store";
import { SCENE_LABELS } from "@/lib/story/labels";
import { CameraDirector, applyFraming, portraitDistanceScale, vec3, type Shot } from "./camera";
import { sharedUniforms } from "./materials";
import type { QualityProfile } from "./quality";

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  labelsRoot: HTMLElement | null;
  profile: QualityProfile;
  onFailure: () => void;
  onFirstFrame: () => void;
}

const PROTEIN_RESIDUES = 672; // SGLT2 SEQRES length; used until the structure file has loaded

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (h: number) => void;
};
const idle = (cb: () => void): number => {
  const w = window as IdleWindow;
  return w.requestIdleCallback ? w.requestIdleCallback(cb, { timeout: 500 }) : window.setTimeout(cb, 32);
};
const cancelIdle = (h: number) => {
  const w = window as IdleWindow;
  if (w.cancelIdleCallback) w.cancelIdleCallback(h);
  else window.clearTimeout(h);
};

export class MolecularEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  private director: CameraDirector;
  private world: World;
  private gene: Gene;
  private dna: DNAModel;
  private dnaSpin = new THREE.Group();
  // Built progressively after the first frame (see scheduleBuild).
  private transcript: TranscriptScene | null = null;
  private transcriptome: ReturnType<typeof createTranscriptomeScene> | null = null;
  private pore: ReturnType<typeof createPoreScene> | null = null;
  private translation: TranslationScene | null = null;
  private buildSteps: (() => void)[] = [];
  private idleHandle = 0;
  private protein: ProteinScene | null = null;
  private dust: ReturnType<typeof createDust>;
  private ms: MolecularState;

  private t = 0;
  private time = 0;
  private spin = 0;
  private yaw = 0;
  private pointer = new THREE.Vector2();
  private introStart = -1;
  private raf = 0;
  private running = false;
  private disposed = false;
  private lastFrame = 0;
  private needsRender = true;
  private firstFrameDone = false;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private slowFrames = 0;
  private fastFrames = 0;
  private abort = new AbortController();
  private unsubscribe: () => void;
  private resizeObserver: ResizeObserver;
  private labelEls = new Map<string, HTMLElement>();
  private tabHidden = false;
  private onScreen = true;
  private intersection: IntersectionObserver;

  constructor(private opts: EngineOptions) {
    const { canvas, profile } = opts;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: profile.quality === "high",
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, profile.maxPixelRatio);
    this.renderer.setPixelRatio(this.pixelRatio);

    canvas.addEventListener("webglcontextlost", this.onContextLost, false);

    this.gene = buildGene(GENE_LAYOUT.basePairs, GENE_LAYOUT.txStart);
    this.world = createWorld(this.gene.preMrna.length);
    this.scene.add(this.world.dnaGroup);

    this.dna = createDNA({ basePairs: GENE_LAYOUT.basePairs, quality: profile.quality, sequence: this.gene.dnaCoding });
    this.dnaSpin.add(this.dna.group);
    this.world.dnaGroup.add(this.dnaSpin);


    const bounds = new THREE.Box3().setFromPoints([
      this.world.txStartW.clone().add(vec3(-14, -10, -14)),
      this.world.PROT.clone().add(vec3(14, 12, 10)),
    ]);
    bounds.expandByPoint(this.world.txEndW.clone().add(vec3(12, 0, 0)));
    this.dust = createDust(bounds, profile.dust);
    this.scene.add(this.dust.object);

    this.ms = molecularState(0, this.gene.preMrna.length, this.gene.codons.length, PROTEIN_RESIDUES);
    this.director = new CameraDirector(this.buildShots());

    if (opts.labelsRoot) {
      opts.labelsRoot.querySelectorAll<HTMLElement>("[data-label]").forEach((el) => this.labelEls.set(el.dataset.label!, el));
    }

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();

    this.intersection = new IntersectionObserver((entries) => {
      this.onScreen = entries.some((e) => e.isIntersecting);
      this.updateRunning();
    });
    this.intersection.observe(canvas);

    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("pointermove", this.onPointer, { passive: true });
    this.unsubscribe = story.subscribe(() => {
      this.needsRender = true;
      this.updateRunning();
    });

    this.scheduleBuild();

    this.t = story.get().target;
    this.updateRunning();
  }

  // ---------------------------------------------------------------------------------
  /**
   * Only the hero (DNA + dust) is built before the first frame. The other scenes
   * are built one per idle slice so start-up stays responsive; if the visitor
   * jumps ahead (e.g. via navigation) the remaining steps run immediately.
   */
  private scheduleBuild() {
    const q = this.opts.profile.quality;
    this.buildSteps = [
      () => {
        this.transcript = createTranscriptScene(this.world, this.gene, q);
        this.scene.add(this.transcript.group);
      },
      () => {
        this.transcriptome = createTranscriptomeScene(this.world, q);
        this.scene.add(this.transcriptome.group);
      },
      () => {
        this.pore = createPoreScene(this.world, q);
        this.scene.add(this.pore.group);
      },
      () => {
        this.translation = createTranslationScene(this.world, this.gene, PROTEIN_RESIDUES, q);
        this.scene.add(this.translation.group);
      },
      () => {
        const translation = this.translation!;
        loadStructure(undefined, this.abort.signal)
          .then((data) => {
            if (this.disposed) return;
            this.protein = createProteinScene(this.world, data, translation.ptcWorld(), translation.tunnelExitWorld(), q);
            this.scene.add(this.protein.group);
            this.needsRender = true;
            this.updateRunning();
          })
          .catch((err) => {
            if ((err as Error).name !== "AbortError") console.warn("Structure data unavailable:", err);
          });
      },
    ];
    const next = () => {
      if (this.disposed) return;
      const step = this.buildSteps.shift();
      if (!step) return;
      step();
      this.needsRender = true;
      this.idleHandle = idle(next);
    };
    this.idleHandle = idle(next);
  }

  private flushBuild() {
    cancelIdle(this.idleHandle);
    while (this.buildSteps.length) this.buildSteps.shift()!();
  }

  private buildShots(): Shot[] {
    const w = this.world;
    const fallback = { polymerase: new THREE.Vector3(), mid: new THREE.Vector3() };
    const tr = () => {
      if (this.transcript) return this.transcript.anchors;
      w.bpWorld(this.ms.polymeraseBp, fallback.polymerase);
      fallback.mid.copy(w.TC);
      return fallback;
    };
    const ligandFocus = () => {
      const p = this.protein;
      const site = this.siteWeight;
      if (!p) return w.PROT.clone();
      return w.PROT.clone().lerp(p.anchors.ligand, site * 0.85);
    };
    const proteinOffset = (base: THREE.Vector3) => () => base.clone().multiplyScalar(1 - 0.3 * this.siteWeight);
    return [
      { t: 0, target: () => w.heroTarget.clone().add(vec3(-1.2, 1.6, 0)), offset: () => vec3(1.8, -0.6, 18.5) },
      { t: 0.5, target: () => w.heroTarget.clone().lerp(w.txStartW, 0.6), offset: () => vec3(1.4, 0.6, 14.5) },
      { t: 0.98, target: () => tr().polymerase.clone(), offset: () => vec3(1.6, 1.8, 12.5) },
      { t: 1.45, target: () => tr().polymerase.clone().add(vec3(-1.4, 0.4, 0.8)), offset: () => vec3(1.0, 2.2, 16) },
      { t: 1.85, target: () => tr().polymerase.clone().add(vec3(-2.4, 1.4, 1)), offset: () => vec3(0.6, 2.6, 18) },
      { t: 2.15, target: () => tr().mid.clone(), offset: () => vec3(0, 1.2, 15) },
      { t: 2.45, target: () => w.TC.clone(), offset: () => vec3(0, 0.6, 13.5) },
      { t: 2.78, target: () => w.TC.clone().add(vec3(0, 0.3, -2.2)), offset: () => vec3(0, 1.6, 19.5) },
      { t: 3.05, target: () => w.NPC.clone().add(vec3(0, -1.2, 0)), offset: () => vec3(0, -0.4, 15) },
      { t: 3.26, target: () => w.NPC.clone().add(vec3(0, 2.2, 0)), offset: () => vec3(0, -0.2, 15) },
      { t: 3.47, target: () => w.RIB.clone().add(vec3(0, 0.6, 0)), offset: () => vec3(0, 0.8, 15.5) },
      { t: 3.75, target: () => w.RIB.clone().add(vec3(0, 1.0, 0)), offset: () => vec3(-1.2, 1.0, 13.5) },
      { t: 3.98, target: () => w.RIB.clone().add(vec3(0, 1.8, 0)), offset: () => vec3(0, 1.4, 15.5) },
      { t: 4.25, target: () => w.PROT.clone().add(vec3(0, -1.2, 0)), offset: () => vec3(0, 2, 27) },
      { t: 4.62, target: () => w.PROT.clone(), offset: () => vec3(0, 1, 23) },
      { t: 4.98, target: () => w.PROT.clone(), offset: () => vec3(0, 0.8, 18.5) },
      { t: 5.5, target: ligandFocus, offset: proteinOffset(vec3(0, 0.8, 18.5)) },
      { t: 6.0, target: ligandFocus, offset: proteinOffset(vec3(0, 0.8, 18.5)) },
      { t: 6.6, target: () => w.PROT.clone(), offset: () => vec3(-1.6, 1.4, 20) },
      { t: 7.0, target: () => w.PROT.clone(), offset: () => vec3(-2.4, 2, 21) },
    ];
  }

  private siteWeight = 0;

  // ---------------------------------------------------------------------------------
  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.stop();
    story.set({ webgl: "unavailable" });
    this.opts.onFailure();
  };

  private onVisibility = () => {
    this.tabHidden = document.hidden;
    this.updateRunning();
  };

  private onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  };

  private resize() {
    const canvas = this.opts.canvas;
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    sharedUniforms.uViewportH.value = h * this.pixelRatio;
    this.needsRender = true;
    this.updateRunning();
  }

  private setPixelRatio(pr: number) {
    this.pixelRatio = pr;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.width, this.height, false);
    sharedUniforms.uViewportH.value = this.height * pr;
  }

  private shouldRun() {
    const s = story.get();
    return !this.disposed && !this.tabHidden && this.onScreen && !s.covered;
  }

  private updateRunning() {
    if (this.shouldRun()) {
      if (!this.running) {
        this.running = true;
        this.lastFrame = performance.now();
        this.raf = requestAnimationFrame(this.frame);
      }
    } else this.stop();
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  // ---------------------------------------------------------------------------------
  private frame = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const s = story.get();
    const reduced = s.reducedMotion || s.userPaused;

    // Story time: eased toward the scroll target (instant with reduced motion).
    const target = s.target;
    const before = this.t;
    if (reduced) this.t = target;
    else {
      const gap = target - this.t;
      const rate = 3.2 + Math.min(6, Math.abs(gap) * 2.5);
      this.t += gap * (1 - Math.exp(-dt * rate));
      if (Math.abs(target - this.t) < 1e-4) this.t = target;
    }
    const tChanged = Math.abs(this.t - before) > 1e-6;

    const animating = !reduced;
    if (animating) this.time += dt;
    if (this.introStart < 0) this.introStart = now;
    const intro = reduced ? 1 : Math.min(1, (now - this.introStart) / 2200);

    if (animating || tChanged || this.needsRender || intro < 1) {
      this.updateScene(dt, intro, reduced);
      this.renderer.render(this.scene, this.camera);
      this.needsRender = false;
      if (!this.firstFrameDone) {
        this.firstFrameDone = true;
        story.set({ webgl: "ready" });
        this.opts.onFirstFrame();
      }
      this.adaptQuality(dt);
    }

    // With reduced motion and nothing changing, stop until the store changes.
    if (reduced && !tChanged && intro >= 1 && Math.abs(target - this.t) < 1e-4) {
      this.stop();
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private adaptQuality(dt: number) {
    if (dt > 0.034) {
      this.slowFrames++;
      this.fastFrames = 0;
    } else if (dt < 0.02) {
      this.fastFrames++;
      this.slowFrames = Math.max(0, this.slowFrames - 1);
    }
    const { maxPixelRatio, minPixelRatio } = this.opts.profile;
    if (this.slowFrames > 45 && this.pixelRatio > minPixelRatio) {
      this.setPixelRatio(Math.max(minPixelRatio, this.pixelRatio - 0.25));
      this.slowFrames = 0;
    } else if (this.fastFrames > 240 && this.pixelRatio < Math.min(maxPixelRatio, window.devicePixelRatio || 1)) {
      this.setPixelRatio(Math.min(maxPixelRatio, this.pixelRatio + 0.25));
      this.fastFrames = 0;
    }
  }

  private updateScene(dt: number, intro: number, reduced: boolean) {
    const t = this.t;
    const s = story.get();
    sharedUniforms.uTime.value = this.time;
    const ms = molecularState(t, this.gene.preMrna.length, this.gene.codons.length, this.protein?.residues.length ?? PROTEIN_RESIDUES);
    this.ms = ms;

    // DNA: gentle spin about its own axis in the hero, frozen once transcription starts.
    const spinSpeed = 0.32 * (1 - sseg(t, 0.15, 0.6));
    if (!reduced) this.spin += dt * spinSpeed;
    this.dnaSpin.rotation.y = this.spin;
    const dnaFade = 1 - sseg(t, 2.6, 3.0) * 0.85 - sseg(t, 3.0, 3.2) * 0.15;
    this.dna.update({
      open: ms.bubbleOpen,
      center: ms.polymeraseBp - 2,
      template: sseg(t, 0.7, 1.0) * (1 - sseg(t, 1.9, 2.2)),
      intro,
      opacity: Math.max(0, dnaFade),
    });

    if (this.buildSteps.length && t > 0.45) this.flushBuild();
    this.transcript?.update(t, ms);
    this.transcriptome?.update(ms.population, sseg(t, 2.85, 3.05));
    this.pore?.update(sseg(t, 2.72, 2.95) * (1 - sseg(t, 3.16, 3.3)));
    this.translation?.update(t, ms);

    // Viewer mode weight drives the camera's ligand focus.
    const site = s.viewerMode === "site" && t > 4.98 && t < 6.2 ? 1 : 0;
    this.siteWeight += (site - this.siteWeight) * (reduced ? 1 : Math.min(1, dt * 3));

    if (this.protein) {
      const autoYawSpeed = 0.14 * sseg(t, 4.36, 4.7) * (s.viewerMode === "site" ? 0.25 : 1);
      if (t < 4.34) this.yaw *= reduced ? 0 : 1 - Math.min(1, dt * 3);
      else if (!reduced) this.yaw += dt * autoYawSpeed;
      const inViewer = t > 4.9 && t < 6.3;
      this.protein.update(
        t,
        ms,
        { mode: inViewer ? s.viewerMode : "cartoon", yaw: this.yaw + (inViewer ? s.viewerYaw : 0), pitch: inViewer ? s.viewerPitch : 0 },
        dt,
        reduced,
      );
    }
    this.dust.setDrift(reduced ? 0 : 1);

    // Translation read-out for the DOM HUD.
    const codonIndex = t >= 3.44 && t < 4.02 ? Math.min(this.gene.codons.length - 1, ms.residues) : -1;
    if (codonIndex !== s.codonIndex) story.set({ codonIndex });

    // Camera
    this.director.evaluate(t);
    const aspect = this.width / this.height;
    // The long hero helix may crop on portrait screens; later subjects are pulled back to fit.
    const k = THREE.MathUtils.lerp(Math.min(1.15, portraitDistanceScale(aspect)), portraitDistanceScale(aspect), sseg(t, 0.3, 0.9));
    const pos = this.director.position.clone().sub(this.director.target).multiplyScalar(k).add(this.director.target);
    if (!reduced) {
      const heroWeight = 1 - seg(t, 0, 0.6);
      pos.x += Math.sin(this.time * 0.19) * 0.35 * heroWeight;
      pos.y += Math.sin(this.time * 0.27) * 0.22 * heroWeight;
      this.pointerSmoothed.lerp(this.pointer, Math.min(1, dt * 2.5));
      pos.x += this.pointerSmoothed.x * 0.45;
      pos.y -= this.pointerSmoothed.y * 0.3;
    }
    this.camera.position.copy(pos);
    // Portrait hero: roll the camera so the diagonal helix runs closer to vertical.
    const roll = aspect < 0.9 ? -0.85 * (1 - sseg(t, 0.25, 0.75)) : 0;
    this.camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    this.camera.lookAt(this.director.target);
    applyFraming(this.camera, this.width, this.height, t > 6.4 ? 0.2 : 0.17);

    this.updateLabels(t, aspect < 0.9);
  }

  private pointerSmoothed = new THREE.Vector2();
  private projected = new THREE.Vector3();

  private anchorFor(id: string): THREE.Vector3 | null {
    if (!this.transcript || !this.translation || !this.transcriptome) return null;
    const a = this.transcript.anchors;
    const tl = this.translation.anchors;
    const tm = this.transcriptome.anchors;
    const p = this.protein?.anchors;
    switch (id) {
      case "template": return a.template;
      case "polymerase": return a.polymerase.clone().add(vec3(0.8, 1.9, 0.4));
      case "rna5": return a.rna5;
      case "cap": return a.rna5;
      case "intron": return a.intron;
      case "polyA": return a.polyA;
      case "mrna": return tm.mrna;
      case "isoform": return tm.isoform;
      case "ncrna": return tm.ncrna;
      case "pore": return a.pore;
      case "small": return tl.small;
      case "large": return tl.large;
      case "siteA": return tl.siteA;
      case "siteP": return tl.siteP;
      case "siteE": return tl.siteE;
      case "trna": return tl.trna;
      case "tunnel": return tl.tunnel;
      case "chain": return p?.chain ?? null;
      case "helix": return p?.helix ?? null;
      case "ligand": return p?.ligand ?? null;
      case "map17": return p?.map17 ?? null;
      default: return null;
    }
  }

  private updateLabels(t: number, compact: boolean) {
    if (this.labelEls.size === 0) return;
    const s = story.get();
    for (const label of SCENE_LABELS) {
      const el = this.labelEls.get(label.id);
      if (!el) continue;
      let opacity = sseg(t, label.range[0], label.range[0] + 0.06) * (1 - sseg(t, label.range[1] - 0.06, label.range[1]));
      if (compact && !label.primary) opacity = 0;
      if (label.id === "ligand" && s.viewerMode === "trace") opacity *= 0.6;
      const anchor = opacity > 0.01 ? this.anchorFor(label.id) : null;
      if (!anchor) {
        if (el.style.opacity !== "0") el.style.opacity = "0";
        continue;
      }
      this.projected.copy(anchor).project(this.camera);
      const behind = this.projected.z > 1;
      const x = (this.projected.x * 0.5 + 0.5) * this.width;
      const y = (-this.projected.y * 0.5 + 0.5) * this.height;
      const inside = x > 8 && x < this.width - 8 && y > 60 && y < this.height - 8;
      el.style.opacity = behind || !inside ? "0" : opacity.toFixed(3);
      // Keep text on screen: flip to the left near the right edge, to the right near the left edge.
      const flip = label.flip ? x > 260 : x > this.width - 260;
      el.classList.toggle("is-flipped", flip);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  }

  // ---------------------------------------------------------------------------------
  dispose() {
    this.disposed = true;
    this.stop();
    this.abort.abort();
    this.unsubscribe();
    this.resizeObserver.disconnect();
    this.intersection.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("pointermove", this.onPointer);
    this.opts.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    cancelIdle(this.idleHandle);
    this.buildSteps = [];
    this.dna.dispose();
    this.transcript?.dispose();
    this.transcriptome?.dispose();
    this.pore?.dispose();
    this.translation?.dispose();
    this.protein?.dispose();
    this.dust.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
