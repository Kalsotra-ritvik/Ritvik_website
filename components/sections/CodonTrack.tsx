"use client";

import { useEffect, useState } from "react";
import { story } from "@/lib/story/store";
import { AMINO_ACID_NAMES, translateCodon } from "@/lib/science/geneticCode";
import { SGLT2_N_TERMINUS, buildGene } from "@/lib/science/gene";
import { GENE_LAYOUT } from "@/lib/story/molecularTimeline";

const gene = buildGene(GENE_LAYOUT.basePairs, GENE_LAYOUT.txStart);

/** Codon → amino acid read-out that follows the ribosome in the 3D scene. */
export default function CodonTrack({ note, noteShort }: { note: string; noteShort: string }) {
  const [index, setIndex] = useState(-1);
  const [webgl, setWebgl] = useState<"pending" | "ready" | "unavailable">("pending");
  useEffect(
    () =>
      story.subscribe((s) => {
        setIndex(s.codonIndex);
        setWebgl(s.webgl);
      }),
    [],
  );
  // Without the live scene (no WebGL), show the whole read-out.
  const shown = webgl === "unavailable" ? gene.codons.length - 1 : index;
  const current = shown >= 0 ? gene.codons[shown] : null;

  return (
    <div className="panel p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="note uppercase tracking-[0.14em] text-teal-400">Reading frame</p>
        <p className="note" aria-live="polite">
          {current ? (
            <>
              codon {shown + 1}: <span className="text-amber-300">{current}</span> → {AMINO_ACID_NAMES[translateCodon(current)]}
            </>
          ) : (
            "waiting for the ribosome"
          )}
        </p>
      </div>
      <ol className="mt-4 hidden grid-cols-8 gap-1.5 sm:grid" aria-label="Codons and the amino acids they encode">
        {gene.codons.map((c, i) => {
          const done = i <= shown;
          const now = i === shown;
          return (
            <li
              key={i}
              className={`codon rounded-md border px-1 py-1.5 text-center ${
                now ? "border-amber-300 bg-amber-300/15 text-amber-300" : done ? "border-white/15 text-mist-100" : "border-white/5 text-mist-400"
              }`}
            >
              <span className="block text-[11px] tracking-wider">{c}</span>
              <span className={`block text-[10px] ${done ? "text-mist-300" : "text-mist-400/60"}`}>{AMINO_ACID_NAMES[translateCodon(c)]}</span>
            </li>
          );
        })}
        <li className={`codon rounded-md border border-dashed px-1 py-1.5 text-center ${webgl === "unavailable" ? "border-coral-400/60 text-coral-400" : "border-white/10 text-mist-400"}`}>
          <span className="block text-[11px] tracking-wider">{gene.stopCodon}</span>
          <span className="block text-[10px]">Stop</span>
        </li>
      </ol>
      <p className="mt-3 font-mono text-sm tracking-[0.3em] text-mist-100 sm:mt-4" aria-label={`Peptide so far: ${SGLT2_N_TERMINUS.slice(0, Math.max(0, shown + 1))}`}>
        N–{SGLT2_N_TERMINUS.slice(0, Math.max(0, shown + 1)).split("").join("·") || "…"}
      </p>
      {note && <p className="note mt-3 hidden sm:block">{note}</p>}
      {noteShort && <p className="note mt-2 sm:hidden">{noteShort}</p>}
    </div>
  );
}
