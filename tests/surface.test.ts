import { describe, expect, it } from "vitest";
import { computeGaussianSurface } from "@/components/molecular/gaussianSurface";

describe("Gaussian surface (marching cubes)", () => {
  // One Gaussian of width σ: the iso-surface f = iso is a sphere of radius σ·sqrt(2·ln(1/iso)).
  const sigma = 1, iso = 0.5;
  const expected = sigma * Math.sqrt(2 * Math.log(1 / iso));
  const s = computeGaussianSurface({
    xyz: new Float32Array([2, -1, 3]),
    rgb: new Float32Array([0.2, 0.4, 0.6]),
    weight: new Float32Array([1]),
    opts: { sigma, iso, resolution: 48 },
  });

  it("produces a closed sphere of the expected radius", () => {
    expect(s.position.length).toBeGreaterThan(300);
    expect(s.position.length % 9).toBe(0);
    for (let i = 0; i < s.position.length; i += 3) {
      const r = Math.hypot(s.position[i] - 2, s.position[i + 1] + 1, s.position[i + 2] - 3);
      expect(Math.abs(r - expected)).toBeLessThan(0.08);
    }
  });

  it("has outward normals and the point's colour", () => {
    for (let i = 0; i < s.position.length; i += 3) {
      const d = [s.position[i] - 2, s.position[i + 1] + 1, s.position[i + 2] - 3];
      expect(d[0] * s.normal[i] + d[1] * s.normal[i + 1] + d[2] * s.normal[i + 2]).toBeGreaterThan(0);
      expect(s.color[i + 1]).toBeCloseTo(0.4, 4);
    }
  });
});
