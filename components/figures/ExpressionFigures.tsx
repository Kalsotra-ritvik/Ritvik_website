"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { simulateCoverage, simulateHeatmap, simulateVolcano } from "@/lib/science/simulated";

type Tab = "heatmap" | "volcano" | "coverage";
const TABS: { id: Tab; label: string; caption: string }[] = [
  {
    id: "heatmap",
    label: "Expression heatmap",
    caption:
      "Rows are genes, columns are samples. Colour is a per-gene z-score of expression, so each row shows where that gene is relatively high (amber) or low (blue). Clustering rows like this exposes groups of genes that change together.",
  },
  {
    id: "volcano",
    label: "Differential expression",
    caption:
      "Each point is a gene. The x-axis is the log₂ fold change between conditions; the y-axis is −log₁₀ of the p-value. Genes beyond the dashed thresholds (|log₂FC| > 1 and p < 0.05) are flagged as up- or down-regulated.",
  },
  {
    id: "coverage",
    label: "Coverage & splicing",
    caption:
      "Read depth along a gene (top) and split reads joining exons (arcs, labelled with read counts). The arc from exon 1 to exon 3 is evidence of an isoform that skips exon 2 — the same event as the coral molecules in the 3D scene.",
  },
];

const W = 520;
const H = 300;

function diverging(z: number) {
  // Blue → ink → amber; colour-blind-safe pair.
  const c = Math.max(-2.2, Math.min(2.2, z)) / 2.2;
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const mid = [24, 32, 48];
  const end = c < 0 ? [92, 140, 230] : [240, 182, 96];
  const t = Math.abs(c);
  return `rgb(${lerp(mid[0], end[0], t)},${lerp(mid[1], end[1], t)},${lerp(mid[2], end[2], t)})`;
}

function Heatmap() {
  const data = useMemo(() => simulateHeatmap(), []);
  const left = 70;
  const top = 30;
  const cw = (W - left - 60) / data.samples.length;
  const ch = (H - top - 30) / data.genes.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Simulated heatmap of 14 genes across 3 control and 3 treated samples, showing one group of genes higher in treatment and another lower.">
      {data.samples.map((s, j) => (
        <text key={s} x={left + j * cw + cw / 2} y={top - 10} textAnchor="middle" className="fill-mist-400 font-mono text-[10px]">
          {s}
        </text>
      ))}
      {data.genes.map((g, i) => (
        <g key={g}>
          <text x={left - 8} y={top + i * ch + ch / 2 + 3} textAnchor="end" className="fill-mist-400 font-mono text-[10px]">
            {g}
          </text>
          {data.values[i].map((v, j) => (
            <rect key={j} x={left + j * cw + 1} y={top + i * ch + 1} width={cw - 2} height={ch - 2} rx="2" fill={diverging(v)} />
          ))}
        </g>
      ))}
      <line x1={left + 3 * cw} x2={left + 3 * cw} y1={top - 4} y2={top + data.genes.length * ch + 4} stroke="rgba(215,221,229,0.35)" strokeDasharray="3 3" />
      <g transform={`translate(${W - 44}, ${top})`}>
        {Array.from({ length: 9 }, (_, k) => (
          <rect key={k} x="0" y={k * 20} width="12" height="20" fill={diverging(2.2 - (k * 4.4) / 8)} />
        ))}
        <text x="18" y="10" className="fill-mist-400 font-mono text-[9px]">+2</text>
        <text x="18" y="94" className="fill-mist-400 font-mono text-[9px]">0</text>
        <text x="18" y="178" className="fill-mist-400 font-mono text-[9px]">−2</text>
        <text x="0" y="200" className="fill-mist-400 font-mono text-[9px]">z-score</text>
      </g>
    </svg>
  );
}

function Volcano() {
  const pts = useMemo(() => simulateVolcano(), []);
  const left = 44, right = 16, top = 16, bottom = 36;
  const xs = (x: number) => left + ((x + 5) / 10) * (W - left - right);
  const ys = (y: number) => H - bottom - (Math.min(y, 10) / 10) * (H - top - bottom);
  const threshY = -Math.log10(0.05);
  const up = pts.filter((p) => p.log2FoldChange > 1 && p.negLog10P > threshY).length;
  const down = pts.filter((p) => p.log2FoldChange < -1 && p.negLog10P > threshY).length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Simulated volcano plot of ${pts.length} genes: ${up} flagged up-regulated and ${down} down-regulated.`}>
      <line x1={left} x2={W - right} y1={H - bottom} y2={H - bottom} stroke="rgba(215,221,229,0.3)" />
      <line x1={left} x2={left} y1={top} y2={H - bottom} stroke="rgba(215,221,229,0.3)" />
      {[-4, -2, 0, 2, 4].map((x) => (
        <text key={x} x={xs(x)} y={H - bottom + 16} textAnchor="middle" className="fill-mist-400 font-mono text-[10px]">{x}</text>
      ))}
      {[0, 5, 10].map((y) => (
        <text key={y} x={left - 8} y={ys(y) + 3} textAnchor="end" className="fill-mist-400 font-mono text-[10px]">{y}</text>
      ))}
      <text x={(W + left) / 2} y={H - 4} textAnchor="middle" className="fill-mist-300 font-mono text-[10px]">log₂ fold change</text>
      <text x={12} y={H / 2} transform={`rotate(-90 12 ${H / 2})`} textAnchor="middle" className="fill-mist-300 font-mono text-[10px]">−log₁₀ p</text>
      {[xs(-1), xs(1)].map((x, i) => (
        <line key={i} x1={x} x2={x} y1={top} y2={H - bottom} stroke="rgba(215,221,229,0.25)" strokeDasharray="3 3" />
      ))}
      <line x1={left} x2={W - right} y1={ys(threshY)} y2={ys(threshY)} stroke="rgba(215,221,229,0.25)" strokeDasharray="3 3" />
      {pts.map((p, i) => {
        const sig = Math.abs(p.log2FoldChange) > 1 && p.negLog10P > threshY;
        const fill = !sig ? "rgba(138,151,168,0.45)" : p.log2FoldChange > 0 ? "#f0b660" : "#5c8ce6";
        return <circle key={i} cx={xs(p.log2FoldChange)} cy={ys(p.negLog10P)} r={sig ? 3 : 2.2} fill={fill} />;
      })}
      <text x={W - right - 4} y={top + 10} textAnchor="end" className="fill-amber-300 font-mono text-[10px]">up · {up}</text>
      <text x={left + 6} y={top + 10} className="fill-blue-400 font-mono text-[10px]">down · {down}</text>
    </svg>
  );
}

function Coverage() {
  const d = useMemo(() => simulateCoverage(), []);
  const left = 20, right = 20;
  const xs = (x: number) => left + (x / d.length) * (W - left - right);
  const base = 170;
  const maxD = 60;
  const area =
    `M${xs(0)} ${base} ` + d.depth.map((v, x) => `L${xs(x).toFixed(1)} ${(base - (v / maxD) * 120).toFixed(1)}`).join(" ") + ` L${xs(d.length - 1)} ${base} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Simulated read coverage over three exons with splice-junction arcs; one arc joins exon 1 directly to exon 3, indicating exon skipping.">
      <path d={area} fill="rgba(224,137,79,0.55)" stroke="#e0894f" strokeWidth="1" />
      {d.junctions.map(([a, b, n], i) => {
        const x1 = xs(a), x2 = xs(b);
        const h = i === 2 ? 70 : 40;
        const below = i === 2;
        const y = below ? base + 52 : base - 128;
        const cy = below ? y + h : y - h;
        return (
          <g key={i}>
            <path d={`M${x1} ${y} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y}`} fill="none" stroke={below ? "#e36a5c" : "#9fb7e8"} strokeWidth={1 + n / 12} />
            <text x={(x1 + x2) / 2} y={below ? cy - 14 : cy + 26} textAnchor="middle" className={`font-mono text-[10px] ${below ? "fill-coral-400" : "fill-mist-300"}`}>
              {n} reads
            </text>
          </g>
        );
      })}
      <line x1={xs(0)} x2={xs(d.length)} y1={base + 26} y2={base + 26} stroke="rgba(215,221,229,0.35)" />
      {d.exons.map(([a, b], i) => (
        <g key={i}>
          <rect x={xs(a)} y={base + 16} width={xs(b) - xs(a)} height="20" rx="3" fill={i === 1 ? "#c98a5a" : "#e0894f"} />
          <text x={(xs(a) + xs(b)) / 2} y={base + 30} textAnchor="middle" className="fill-ink-900 font-mono text-[10px]">exon {i + 1}</text>
        </g>
      ))}
      <text x={xs(0)} y={20} className="fill-mist-400 font-mono text-[10px]">read depth</text>
    </svg>
  );
}

export default function ExpressionFigures() {
  const [tab, setTab] = useState<Tab>("heatmap");
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = TABS.findIndex((t) => t.id === tab);

  const onKey = (e: KeyboardEvent) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (index + dir + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    refs.current[next]?.focus();
  };

  const active = TABS[index];
  return (
    <figure data-reveal className="panel p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Transcriptomics figure type" className="flex flex-wrap gap-1 rounded-full border border-white/10 p-1" onKeyDown={onKey}>
          {TABS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              id={`${id}-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`${id}-panel`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`min-h-[40px] rounded-full px-3 text-xs sm:text-sm ${tab === t.id ? "bg-amber-300 text-ink-900" : "text-mist-300 hover:text-mist-100"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="note rounded-full border border-coral-400/50 px-3 py-1 text-coral-400">Simulated data</span>
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} className="mt-5">
        {tab === "heatmap" && <Heatmap />}
        {tab === "volcano" && <Volcano />}
        {tab === "coverage" && <Coverage />}
      </div>
      <figcaption className="mt-4 space-y-2">
        <p className="text-sm leading-relaxed text-mist-200">{active.caption}</p>
        <p className="note">
          Values are generated from a fixed random seed to illustrate how RNA-seq results are read. They are not measurements and not
          results from any of Ritvik&apos;s projects.
        </p>
      </figcaption>
    </figure>
  );
}
