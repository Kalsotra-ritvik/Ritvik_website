/** Small seeded PRNG (mulberry32) so procedural visuals and simulated figures are identical on every visit. */
export function createRandom(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    int: (min: number, maxExclusive: number) => Math.floor(min + (maxExclusive - min) * next()),
    pick: <T,>(items: readonly T[]) => items[Math.floor(next() * items.length)],
    /** Standard normal via Box–Muller. */
    normal: () => {
      const u = Math.max(next(), 1e-9);
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
}

export type Random = ReturnType<typeof createRandom>;
