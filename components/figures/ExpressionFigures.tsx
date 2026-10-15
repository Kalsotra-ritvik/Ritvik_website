"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Figures } from "@/lib/content/schema";
import { simulateCoverage, simulateHeatmap, simulateIsoforms, simulateVolcano } from "@/lib/science/simulated";
import { Rich } from "@/components/Markup";

type Tab = "heatmap" | "volcano" | "coverage" | "isoforms";
const TAB_ORDER: Tab[] = ["heatmap", "volcano", "coverage", "isoforms"];

const W = 520;
const H = 300;

/**
 * One colour language across all four figures:
 *   amber = higher / up / full-length, blue = lower / down, coral = exon-skipping, grey = not significant.
 */
const C = {
  up: "#f0b660",
  down: "#5c8ce6",
  skip: "#e36a5c",
  exon: "#e0894f",
  muted: "rgba(138,151,168,0.5)",
  axis: "rgba(215,221,229,0.35)",
};

function diverging(z: number) {
  const c = Math.max(-2.2, Math.min(2.2, z)) / 2.2;
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const mid = [24, 32, 48];
  const end = c < 0 ? [92, 140, 230] : [240, 182, 96];
  const t = Math.abs(c);
  return `rgb(${lerp(mid[0], end[0], t)},${lerp(mid[1], end[1], t)},${lerp(mid[2], end[2], t)})`;
}

function Heatmap({ axisLabel }: { axisLabel: string }) {
  const data = useMemo(() => simulateHeatmap(), []);
  const left = 70;
  const top = 40;
  const cw = (W - left - 70) / data.samples.length;
  const ch = (H - top - 30) / data.genes.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Simulated heatmap of 14 genes across 3 control and 3 treated samples, showing one group of genes higher in treatment and another lower.">
      <text x={left + 1.5 * cw} y={12} textAnchor="middle" className="fill-mist-300 font-mono text-[10px]">Control</text>
      <text x={left + 4.5 * cw} y={12} textAnchor="middle" className="fill-mist-300 font-mono text-[10px]">Treated</text>
      {data.samples.map((s, j) => (
        <text key={s} x={left + j * cw + cw / 2} y={top - 10} textAnchor="middle" className="fill-mist-400 font-mono text-[10px]">
          {s.split(" ")[1]}
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
      <line x1={left + 3 * cw} x2={left + 3 * cw} y1={top - 4} y2={top + data.genes.length * ch + 4} stroke={C.axis} strokeDasharray="3 3" />
      <g transform={`translate(${W - 52}, ${top})`}>
        {Array.from({ length: 9 }, (_, k) => (
          <rect key={k} x="0" y={k * 22} width="12" height="22" fill={diverging(2.2 - (k * 4.4) / 8)} />
        ))}
        <text x="18" y="10" className="fill-mist-400 font-mono text-[9px]">+2</text>
        <text x="18" y="103" className="fill-mist-400 font-mono text-[9px]">0</text>
        <text x="18" y="196" className="fill-mist-400 font-mono text-[9px]">−2</text>
        <text x="-2" y="216" className="fill-mist-400 font-mono text-[9px]">{axisLabel}</text>
      </g>
    </svg>
  );
}

function Volcano({ xLabel, yLabel }: { xLabel: string; yLabel: string }) {
  const pts = useMemo(() => simulateVolcano(), []);
  const left = 44, right = 16, top = 26, bottom = 36;
  const xs = (x: number) => left + ((x + 5) / 10) * (W - left - right);
  const ys = (y: number) => H - bottom - (Math.min(y, 10) / 10) * (H - top - bottom);
  const threshY = -Math.log10(0.05);
  const up = pts.filter((p) => p.log2FoldChange > 1 && p.negLog10P > threshY).length;
  const down = pts.filter((p) => p.log2FoldChange < -1 && p.negLog10P > threshY).length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Simulated volcano plot of ${pts.length} genes: ${up} flagged up-regulated and ${down} down-regulated.`}>
      <line x1={left} x2={W - right} y1={H - bottom} y2={H - bottom} stroke={C.axis} />
      <line x1={left} x2={left} y1={top} y2={H - bottom} stroke={C.axis} />
      {[-4, -2, 0, 2, 4].map((x) => (
        <text key={x} x={xs(x)} y={H - bottom + 16} textAnchor="middle" className="fill-mist-400 font-mono text-[10px]">{x}</text>
      ))}
      {[0, 5, 10].map((y) => (
        <text key={y} x={left - 8} y={ys(y) + 3} textAnchor="end" className="fill-mist-400 font-mono text-[10px]">{y}</text>
      ))}
      <text x={(W + left) / 2} y={H - 4} textAnchor="middle" className="fill-mist-300 font-mono text-[10px]">{xLabel}</text>
      <text x={12} y={H / 2} transform={`rotate(-90 12 ${H / 2})`} textAnchor="middle" className="fill-mist-300 font-mono text-[10px]">{yLabel}</text>
      {[xs(-1), xs(1)].map((x, i) => (
        <line key={i} x1={x} x2={x} y1={top} y2={H - bottom} stroke={C.axis} strokeDasharray="3 3" />
      ))}
      <line x1={left} x2={W - right} y1={ys(threshY)} y2={ys(threshY)} stroke={C.axis} strokeDasharray="3 3" />
      <text x={W - right - 2} y={ys(threshY) - 4} textAnchor="end" className="fill-mist-400 font-mono text-[9px]">p = 0.05</text>
      {pts.map((p, i) => {
        const sig = Math.abs(p.log2FoldChange) > 1 && p.negLog10P > threshY;
        const fill = !sig ? C.muted : p.log2FoldChange > 0 ? C.up : C.down;
        return <circle key={i} cx={xs(p.log2FoldChange)} cy={ys(p.negLog10P)} r={sig ? 3 : 2.2} fill={fill} />;
      })}
      <g className="font-mono text-[10px]">
        <circle cx={left + 8} cy={12} r="3.5" fill={C.down} />
        <text x={left + 16} y={15} className="fill-mist-300">down ({down})</text>
        <circle cx={left + 98} cy={12} r="3.5" fill={C.up} />
        <text x={left + 106} y={15} className="fill-mist-300">up ({up})</text>
        <circle cx={left + 168} cy={12} r="3" fill={C.muted} />
        <text x={left + 176} y={15} className="fill-mist-300">not significant</text>
      </g>
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
      <path d={area} fill="rgba(224,137,79,0.5)" stroke={C.exon} strokeWidth="1" />
      {d.junctions.map(([a, b, n], i) => {
        const x1 = xs(a), x2 = xs(b);
        const h = i === 2 ? 70 : 40;
        const below = i === 2;
        const y = below ? base + 52 : base - 128;
        const cy = below ? y + h : y - h;
        return (
          <g key={i}>
            <path d={`M${x1} ${y} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y}`} fill="none" stroke={below ? C.skip : "#9fb7e8"} strokeWidth={1 + n / 12} />
            <text x={(x1 + x2) / 2} y={below ? cy - 14 : cy + 26} textAnchor="middle" className={`font-mono text-[10px] ${below ? "fill-coral-400" : "fill-mist-300"}`}>
              {n} reads
            </text>
          </g>
        );
      })}
      <line x1={xs(0)} x2={xs(d.length)} y1={base + 26} y2={base + 26} stroke={C.axis} />
      {d.exons.map(([a, b], i) => (
        <g key={i}>
          <rect x={xs(a)} y={base + 16} width={xs(b) - xs(a)} height="20" rx="3" fill={i === 1 ? "#c98a5a" : C.exon} />
          <text x={(xs(a) + xs(b)) / 2} y={base + 30} textAnchor="middle" className="fill-ink-900 font-mono text-[10px]">exon {i + 1}</text>
        </g>
      ))}
      <text x={xs(0)} y={20} className="fill-mist-400 font-mono text-[10px]">read depth (reads per position)</text>
      <g className="font-mono text-[10px]">
        <line x1={W - 190} x2={W - 172} y1={16} y2={16} stroke="#9fb7e8" strokeWidth="2" />
        <text x={W - 166} y={19} className="fill-mist-300">exon-to-exon junction</text>
        <line x1={W - 190} x2={W - 172} y1={32} y2={32} stroke={C.skip} strokeWidth="2" />
        <text x={W - 166} y={35} className="fill-mist-300">exon-skipping junction</text>
      </g>
    </svg>
  );
}

function Isoforms({ unit }: { unit: string }) {
  const d = useMemo(() => simulateIsoforms(), []);
  const max = Math.max(...d.isoforms.flatMap((i) => i.tpm)) * 1.1;
  const colors = [C.up, C.skip];
  const exonX = [40, 120, 200];
  const barLeft = 290;
  const barW = (W - barLeft - 16) / d.samples.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Simulated abundance of two isoforms of one gene across six samples; the exon-skipping isoform increases in treated samples.">
      {d.isoforms.map((iso, k) => {
        const y = 70 + k * 110;
        return (
          <g key={iso.id}>
            <text x={20} y={y - 28} className="fill-mist-200 font-mono text-[10px]">{iso.label}</text>
            <line x1={40} x2={260} y1={y} y2={y} stroke={C.axis} />
            {iso.exons.map((e) => (
              <rect key={e} x={exonX[e - 1]} y={y - 10} width={56} height={20} rx="3" fill={colors[k]} />
            ))}
            {iso.exons.map((e) => (
              <text key={`t${e}`} x={exonX[e - 1] + 28} y={y + 4} textAnchor="middle" className="fill-ink-900 font-mono text-[10px]">
                {e}
              </text>
            ))}
            {iso.tpm.map((v, s) => {
              const h = (v / max) * 70;
              return (
                <g key={s}>
                  <rect x={barLeft + s * barW + 3} y={y + 20 - h} width={barW - 6} height={h} rx="2" fill={colors[k]} opacity={s < 3 ? 0.65 : 1} />
                  <text x={barLeft + s * barW + barW / 2} y={y + 20 - h - 4} textAnchor="middle" className="fill-mist-300 font-mono text-[9px]">{v}</text>
                </g>
              );
            })}
            <line x1={barLeft} x2={W - 16} y1={y + 20} y2={y + 20} stroke={C.axis} />
          </g>
        );
      })}
      {d.samples.map((s, i) => (
        <text key={s} x={barLeft + i * barW + barW / 2} y={H - 8} textAnchor="middle" className="fill-mist-400 font-mono text-[9px]">
          {s.replace(" ", "")}
        </text>
      ))}
      <text x={barLeft} y={16} className="fill-mist-400 font-mono text-[10px]">abundance ({unit})</text>
    </svg>
  );
}

export default function ExpressionFigures({ figures }: { figures: Figures }) {
  const [tab, setTab] = useState<Tab>("heatmap");
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = TAB_ORDER.indexOf(tab);
  const meta: Record<Tab, { label: string; caption: string }> = {
    heatmap: figures.heatmap,
    volcano: figures.volcano,
    coverage: figures.coverage,
    isoforms: figures.isoforms,
  };

  const onKey = (e: KeyboardEvent) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next = e.key === "Home" ? 0 : e.key === "End" ? TAB_ORDER.length - 1 : (index + dir + TAB_ORDER.length) % TAB_ORDER.length;
    setTab(TAB_ORDER[next]);
    refs.current[next]?.focus();
  };

  return (
    <figure data-reveal className="panel p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Transcriptomics figure type" className="flex flex-wrap gap-1 rounded-2xl border border-white/10 p-1" onKeyDown={onKey}>
          {TAB_ORDER.map((t, i) => (
            <button
              key={t}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              id={`${id}-tab-${t}`}
              aria-selected={tab === t}
              aria-controls={`${id}-panel`}
              tabIndex={tab === t ? 0 : -1}
              onClick={() => setTab(t)}
              className={`min-h-[40px] rounded-xl px-3 text-xs sm:text-sm ${tab === t ? "bg-amber-300 text-ink-900" : "text-mist-300 hover:text-mist-100"}`}
            >
              {meta[t].label}
            </button>
          ))}
        </div>
        {figures.simulatedBadge && <span className="note rounded-full border border-coral-400/50 px-3 py-1 text-coral-400">{figures.simulatedBadge}</span>}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} className="mt-5">
        {tab === "heatmap" && <Heatmap axisLabel={figures.heatmap.axisLabel} />}
        {tab === "volcano" && <Volcano xLabel={figures.volcano.xLabel} yLabel={figures.volcano.yLabel} />}
        {tab === "coverage" && <Coverage />}
        {tab === "isoforms" && <Isoforms unit={figures.isoforms.unit} />}
      </div>
      <figcaption className="mt-4 space-y-2">
        <Rich text={meta[tab].caption} className="text-sm leading-relaxed text-mist-200" />
        {figures.simulatedNotice && <p className="note">{figures.simulatedNotice}</p>}
      </figcaption>
    </figure>
  );
}
