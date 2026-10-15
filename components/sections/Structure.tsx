import structure from "@/public/data/sglt2-7vsi.json";
import { experience } from "@/data/profile";
import { ChapterHeader, ExternalIcon } from "@/components/ui";
import type { StructureData } from "@/lib/science/structure";
import StructureViewerControls, { ViewerDragSurface } from "./StructureViewerControls";

const THREE_LETTER: Record<string, string> = {
  ALA: "Ala", ARG: "Arg", ASN: "Asn", ASP: "Asp", CYS: "Cys", GLN: "Gln", GLU: "Glu", GLY: "Gly", HIS: "His", ILE: "Ile",
  LEU: "Leu", LYS: "Lys", MET: "Met", PHE: "Phe", PRO: "Pro", SER: "Ser", THR: "Thr", TRP: "Trp", TYR: "Tyr", VAL: "Val",
};

export default function Structure() {
  const data = structure as unknown as StructureData;
  const src = data.source;
  const contacts = data.contacts.residues.filter((r) => r.chain === "A");
  const cdri = experience.find((e) => e.organisation.includes("CDRI"));
  const helixCount = data.helices.filter((h) => h.chain === "A").length;
  return (
    <section id="structure" data-chapter="structure" className="relative min-h-[210vh] py-24 sm:py-32">
      <ViewerDragSurface />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-[60svh] px-4 sm:px-6 md:gap-[40vh] lg:gap-10 lg:px-8">
        <div className="panel max-w-2xl p-6 sm:p-9">
          <ChapterHeader index="06" label="Structural biology" title={<>From shape <span className="italic">to insight</span></>}>
            <p>
              A structure turns a sequence into testable geometry. In this cryo-EM structure, the inhibitor empagliflozin occupies the
              sugar-binding site and the external vestibule of SGLT2, holding the transporter in an outward-open state (Niu et al., 2022).
            </p>
            <p>
              Pockets like this are what structure-based screening works with: candidate molecules are docked into the site, ranked, and
              the most promising complexes are tested for stability with molecular dynamics.
            </p>
          </ChapterHeader>
        </div>

        <div className="flex min-h-[110vh] flex-col justify-end lg:min-h-[90vh] lg:justify-start">
          <div className="sticky bottom-3 z-10 max-w-xl lg:bottom-auto lg:top-24">
            <StructureViewerControls contactCount={contacts.length} />
          </div>
        </div>

        {cdri && (
          <article data-reveal className="panel max-w-2xl p-6 sm:p-9" aria-labelledby="cdri-title">
            <p className="eyebrow">Dissertation methods · {cdri.period}</p>
            <h3 id="cdri-title" className="display mt-3 text-3xl text-mist-100 sm:text-4xl">
              Screening, simulation, prediction
            </h3>
            <p className="mt-2 text-mist-300">{cdri.organisation}</p>
            <ol className="mt-6 space-y-4">
              {cdri.points.map((p, i) => (
                <li key={p} className="flex gap-4">
                  <span className="font-mono text-sm text-amber-300">0{i + 1}</span>
                  <span className="text-mist-200">{p}</span>
                </li>
              ))}
            </ol>
            <p className="note mt-6">
              The structure shown is a published SGLT2 structure, included for context. The specific targets, compound libraries and results
              of the dissertation are not shown here.
            </p>
          </article>
        )}

        <details data-reveal className="panel max-w-2xl p-6 sm:p-7">
          <summary className="cursor-pointer text-mist-100">About this structure (text description)</summary>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-mist-200">
            <p>
              <span className="text-mist-100">{src.title.charAt(0) + src.title.slice(1).toLowerCase().replace("sglt2-map17", "SGLT2–MAP17")}.</span>{" "}
              Method: {src.method.toLowerCase()}, {src.resolutionAngstrom} Å. Chain A is SGLT2 (UniProt P31639); chain B is MAP17 (Q13113). The
              entry records {helixCount} helical segments in chain A and no β-sheets.
            </p>
            <p>
              Residues of SGLT2 with any heavy atom within {data.contacts.cutoffAngstrom} Å of empagliflozin ({contacts.length}):{" "}
              {contacts.map((c) => `${THREE_LETTER[c.resName] ?? c.resName}${c.resSeq}`).join(", ")}.
            </p>
            <p className="note">
              Computed by this site from the deposited coordinates (scripts/build-structure.mjs). A distance cut-off identifies nearby residues;
              it does not by itself establish specific interactions.
            </p>
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
          </div>
        </details>
      </div>
    </section>
  );
}
