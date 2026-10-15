/**
 * Lightweight SVG double helix: the first paint before WebGL is ready, and the
 * permanent fallback when WebGL is unavailable. Deterministic, so it renders on the server.
 */
export default function StaticHelix() {
  const turns = 5.5;
  const steps = 132;
  const width = 1400;
  const amp = 72;
  // Rounded so server and client markup match exactly.
  const r = (v: number) => Math.round(v * 100) / 100;
  const pts = (phase: number) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const x = r((i / steps) * width);
      const a = (i / steps) * turns * Math.PI * 2 + phase;
      return { x, y: r(Math.sin(a) * amp), z: r(Math.cos(a)) };
    });
  const a = pts(0);
  const b = pts(2.4);
  const path = (p: { x: number; y: number }[]) => p.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" ");
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const rungs = a.filter((_, i) => i % 4 === 0).map((q, k) => ({ x: q.x, y1: q.y, y2: b[k * 4].y, front: (q.z + b[k * 4].z) / 2 }));

  return (
    <svg viewBox={`-40 -260 ${width + 80} 520`} preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <radialGradient id="fallback-glow" cx="62%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#1b3a4a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#070b12" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="-40" y="-260" width={width + 80} height="520" fill="url(#fallback-glow)" />
      <g transform={`rotate(-24 ${width / 2} 0) translate(140 10)`}>
        {rungs.map((g, i) => (
          <line key={i} x1={g.x} x2={g.x} y1={g.y1} y2={g.y2} stroke={i % 3 === 0 ? "#e8b45a" : "#9275e8"} strokeOpacity={r2(0.18 + (0.25 * (g.front + 1)) / 2)} strokeWidth="2" />
        ))}
        <path d={path(b)} fill="none" stroke="#6f8fe0" strokeOpacity="0.55" strokeWidth="7" strokeLinecap="round" />
        <path d={path(a)} fill="none" stroke="#5fb5a9" strokeOpacity="0.7" strokeWidth="7" strokeLinecap="round" />
        {a.filter((_, i) => i % 4 === 0).map((q, i) => (
          <circle key={i} cx={q.x} cy={q.y} r={q.z > 0 ? 5 : 3} fill="#f0c27a" fillOpacity={r2(0.25 + (0.5 * (q.z + 1)) / 2)} />
        ))}
      </g>
    </svg>
  );
}
