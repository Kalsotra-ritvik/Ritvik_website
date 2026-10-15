import structure from "@/public/data/sglt2-7vsi.json";
import type { SiteContent } from "@/lib/content/schema";
import type { StructureData } from "@/lib/science/structure";
import { Inline, Rich } from "@/components/Markup";
import { ChapterHeader, ExternalIcon } from "@/components/ui";
import StructureViewerControls, { ViewerDragSurface } from "./StructureViewerControls";

const THREE_LETTER: Record<string, string> = {
  ALA: "Ala", ARG: "Arg", ASN: "Asn", ASP: "Asp", CYS: "Cys", GLN: "Gln", GLU: "Glu", GLY: "Gly", HIS: "His", ILE: "Ile",
  LEU: "Leu", LYS: "Lys", MET: "Met", PHE: "Phe", PRO: "Pro", SER: "Ser", THR: "Thr", TRP: "Trp", TYR: "Tyr", VAL: "Val",
};

export default function Structure({ content, index }: { content: SiteContent; index: string }) {
  const s = content.science.structure;
  const data = structure as unknown as StructureData;
  const src = data.source;
  const contacts = data.contacts.residues.filter((r) => r.chain === "A");
  const featured = content.projects.find((p) => p.featured);
  const helixCount = data.helices.filter((h) => h.chain === "A").length;
  const interactive = content.visual.enableProteinInteraction;
  return (
    <section id="structure" data-chapter="structure" className="relative min-h-[210vh] py-24 sm:py-32">
      {interactive && <ViewerDragSurface />}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-[60svh] px-4 sm:px-6 md:gap-[40vh] lg:gap-10 lg:px-8">
        <div className="panel max-w-2xl p-6 sm:p-9">
          <ChapterHeader index={index} label={s.eyebrow} title={s.title} body={s.body} />
        </div>

        <div className="flex min-h-[110vh] flex-col justify-end lg:min-h-[90vh] lg:justify-start">
          <div className="sticky bottom-3 z-10 max-w-xl lg:bottom-auto lg:top-24">
            <StructureViewerControls
              title={s.viewerTitle}
              modes={s.modes}
              defaultMode={content.visual.proteinMode}
              contactCount={contacts.length}
              interactive={interactive}
            />
          </div>
        </div>

        {featured && (featured.contribution.length > 0 || featured.methods.length > 0) && (
          <article data-reveal className="panel max-w-2xl p-6 sm:p-9" aria-labelledby="methods-title">
            <p className="eyebrow">
              {s.methodsEyebrow}
              {featured.period ? ` · ${featured.period}` : ""}
            </p>
            <h3 id="methods-title" className="display mt-3 text-3xl text-mist-100 sm:text-4xl">
              <Inline text={s.methodsTitle} />
            </h3>
            <p className="mt-2 text-mist-300">{featured.context}</p>
            <ol className="mt-6 space-y-4">
              {(featured.contribution.length ? featured.contribution : featured.methods).map((p, i) => (
                <li key={p} className="flex gap-4">
                  <span className="font-mono text-sm text-amber-300">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-mist-200">{p}</span>
                </li>
              ))}
            </ol>
            {s.methodsNote && (
              <p className="note mt-6">
                <Inline text={s.methodsNote} />
              </p>
            )}
          </article>
        )}

        <details data-reveal className="panel max-w-2xl p-6 sm:p-7">
          <summary className="cursor-pointer text-mist-100">{s.detailsSummary}</summary>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-mist-200">
            <p>
              <span className="text-mist-100">Structure of human SGLT2–MAP17 complex bound with empagliflozin.</span> Method:{" "}
              {src.method.toLowerCase()}, {src.resolutionAngstrom} Å. Chain A is SGLT2 (UniProt P31639); chain B is MAP17 (Q13113). The entry
              records {helixCount} helical segments in chain A and no β-sheets.
            </p>
            <p>
              Residues of SGLT2 with any heavy atom within {data.contacts.cutoffAngstrom} Å of empagliflozin ({contacts.length}):{" "}
              {contacts.map((c) => `${THREE_LETTER[c.resName] ?? c.resName}${c.resSeq}`).join(", ")}.
            </p>
            {s.detailsNote && (
              <p className="note">
                <Inline text={s.detailsNote} />
              </p>
            )}
            <p>
              {src.citation.authors}. {src.citation.title}. <em>{src.citation.journal}</em> {src.citation.volume}, {src.citation.pages} (
              {src.citation.year}).{" "}
              <a className="inline-flex items-center gap-1 text-amber-300 underline-offset-4 hover:underline" href={`https://doi.org/${src.citation.doi}`} rel="noopener noreferrer" target="_blank">
                doi:{src.citation.doi} <ExternalIcon />
              </a>{" "}
              ·{" "}
              <a className="inline-flex items-center gap-1 text-amber-300 underline-offset-4 hover:underline" href={`https://www.rcsb.org/structure/${src.pdbId}`} rel="noopener noreferrer" target="_blank">
                PDB {src.pdbId} <ExternalIcon />
              </a>
            </p>
            {s.sceneNote && <Rich text={s.sceneNote} />}
          </div>
        </details>
      </div>
    </section>
  );
}
