import { experience, skillGroups } from "@/data/profile";
import { ChapterHeader, SceneNote } from "@/components/ui";
import ExpressionFigures from "@/components/figures/ExpressionFigures";


const LEGEND = [
  { swatch: "bg-[#e0894f]", label: "Protein-coding mRNA" },
  { swatch: "bg-[#e36a5c]", label: "Alternative isoform — middle exon skipped (shorter molecule)" },
  { swatch: "bg-[#a58be8]", label: "Non-coding RNA — hairpin shape, not translated" },
];

export default function Transcriptome() {
  const ihbt = experience.find((e) => e.organisation.includes("IHBT"));
  const methods = skillGroups.find((g) => g.id === "methods")?.items ?? [];
  const related = methods.filter((m) => /transcript|NGS|pipeline|network/i.test(m));
  return (
    <section id="transcriptome" data-chapter="transcriptome" className="relative min-h-[240vh] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-[60svh] px-4 sm:px-6 md:gap-[40vh] lg:gap-10 lg:px-8">
        <div className="panel max-w-2xl p-6 sm:p-9">
          <ChapterHeader index="03" label="Transcriptomics" title={<>Many transcripts, <span className="italic">one snapshot</span></>}>
            <p>
              The new RNA is processed before it leaves the nucleus: a 5′ cap is added, introns are spliced out and the exons joined, and a
              poly(A) tail is added at the 3′ end.
            </p>
            <p>
              A cell holds many such molecules from thousands of genes, plus RNAs that are never translated. RNA-seq samples this whole
              population: it sequences RNA fragments and counts them per gene and per isoform, giving a snapshot of which genes are active.
            </p>
          </ChapterHeader>
        </div>

        {ihbt && (
          <article data-reveal className="panel max-w-2xl p-6 sm:p-9 lg:mt-[30vh]" aria-labelledby="ihbt-title">
            <p className="eyebrow">Current work · {ihbt.period}</p>
            <h3 id="ihbt-title" className="display mt-3 text-3xl text-mist-100 sm:text-4xl">
              {ihbt.role}
            </h3>
            <p className="mt-2 text-mist-300">
              {ihbt.organisation}, {ihbt.location}
            </p>
            <ul className="mt-5 space-y-2 text-mist-200">
              {ihbt.points.map((p) => (
                <li key={p} className="flex gap-3">
                  <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-amber-300" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
            {ihbt.mentor && <p className="note mt-5">Guided by {ihbt.mentor}</p>}
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Related methods from the CV">
              {related.map((m) => (
                <li key={m} className="chip">
                  {m}
                </li>
              ))}
            </ul>
          </article>
        )}

        <div className="max-w-2xl lg:mt-[10vh]">
          <ExpressionFigures />
        </div>

        <SceneNote title="Reading the scene">
          <ul className="space-y-2">
            {LEGEND.map((l) => (
              <li key={l.label} className="flex items-start gap-3">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${l.swatch}`} aria-hidden="true" />
                <span>{l.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            The number of copies of each molecule stands for that gene&apos;s expression level. Counts and lengths are illustrative.
          </p>
        </SceneNote>
      </div>
    </section>
  );
}
