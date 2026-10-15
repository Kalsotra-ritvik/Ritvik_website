import { describe, expect, it } from "vitest";
import { CHAPTERS } from "@/lib/story/chapters";
import { SCENE_LABELS } from "@/lib/story/labels";
import { PHASES } from "@/lib/story/molecularTimeline";
import { LABEL_IDS } from "@/lib/content/schema";
import { defaultLabels } from "@/lib/content/defaults";

const chapter = (id: string) => CHAPTERS.find((c) => c.id === id)!;

describe("scene labels and story chapters", () => {
  it("every label lies inside the chapters it belongs to", () => {
    for (const label of SCENE_LABELS) {
      const ranges = label.stages.map((s) => chapter(s).t);
      const lo = Math.min(...ranges.map((r) => r[0]));
      const hi = Math.max(...ranges.map((r) => r[1]));
      expect(label.range[0], label.id).toBeGreaterThanOrEqual(lo);
      expect(label.range[1], label.id).toBeLessThanOrEqual(hi);
      expect(label.range[0], label.id).toBeLessThan(label.range[1]);
    }
  });

  it("the nuclear pore label never appears during translation", () => {
    const pore = SCENE_LABELS.find((l) => l.id === "pore")!;
    expect(pore.stages).toEqual(["export"]);
    expect(pore.range[1]).toBeLessThanOrEqual(chapter("translation").t[0]);
    expect(pore.range[1]).toBeLessThanOrEqual(PHASES.smallSubunit[0]);
  });

  it("ribosome labels only appear once the ribosome exists", () => {
    for (const id of ["small", "large", "siteA", "siteP", "siteE", "trna", "tunnel"]) {
      const l = SCENE_LABELS.find((x) => x.id === id)!;
      expect(l.range[0], id).toBeGreaterThanOrEqual(PHASES.smallSubunit[0]);
    }
    const large = SCENE_LABELS.find((x) => x.id === "large")!;
    expect(large.range[0]).toBeGreaterThanOrEqual(PHASES.largeSubunit[0]);
  });

  it("structure labels only appear after folding", () => {
    for (const id of ["ligand", "map17", "sglt2"]) {
      const l = SCENE_LABELS.find((x) => x.id === id)!;
      expect(l.range[0], id).toBeGreaterThanOrEqual(PHASES.fold[1]);
    }
  });

  it("every label id is defined once and has default text", () => {
    const ids = SCENE_LABELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of LABEL_IDS) expect(defaultLabels[id], id).toBeTruthy();
    for (const id of ids) expect(LABEL_IDS).toContain(id);
  });
});
