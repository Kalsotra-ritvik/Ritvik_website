import type { SiteContent } from "@/lib/content/schema";
import { Inline, Rich } from "@/components/Markup";
import { ChapterHeader, SceneNote } from "@/components/ui";
import ExpressionFigures from "@/components/figures/ExpressionFigures";

export default function Transcriptome({ content, index }: { content: SiteContent; index: string }) {
  const s = content.science.transcriptomics;
  const current = content.experience.find((e) => e.current);
  const legend = [
    { swatch: "bg-[#e0894f]", label: s.legend.mrna },
    { swatch: "bg-[#e36a5c]", label: s.legend.isoform },
    { swatch: "bg-[#a58be8]", label: s.legend.ncrna },
  ].filter((l) => l.label);
  return (
    <section id="transcriptome" data-chapter="transcriptome" className="relative min-h-[220vh] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-[60svh] px-4 sm:px-6 md:gap-[40vh] lg:gap-10 lg:px-8">
        <div className="panel max-w-2xl p-6 sm:p-9">
          <ChapterHeader index={index} label={s.eyebrow} title={s.title} body={s.body} />
        </div>

        {current && (
          <article data-reveal className="panel max-w-2xl p-6 sm:p-9 lg:mt-[30vh]" aria-labelledby="current-work-title">
            <p className="eyebrow">
              {s.currentWorkEyebrow}
              {current.period ? ` · ${current.period}` : ""}
            </p>
            <h3 id="current-work-title" className="display mt-3 text-3xl text-mist-100 sm:text-4xl">
              {current.role}
            </h3>
            <p className="mt-2 text-mist-300">{[current.organisation, current.location].filter(Boolean).join(", ")}</p>
            {current.description && <Rich text={current.description} className="mt-4 text-mist-200" />}
            {current.points.length > 0 && (
              <ul className="mt-5 space-y-2 text-mist-200">
                {current.points.map((p) => (
                  <li key={p} className="flex gap-3">
                    <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-amber-300" aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
            )}
            {current.mentor && <p className="note mt-5">Guided by {current.mentor}</p>}
            {s.relatedMethods.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2" aria-label={s.relatedMethodsLabel}>
                {s.relatedMethods.map((m) => (
                  <li key={m} className="chip">
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </article>
        )}

        <div className="max-w-2xl lg:mt-[10vh]">
          <ExpressionFigures figures={content.figures} />
        </div>

        <SceneNote title={s.sceneNoteTitle}>
          {legend.length > 0 && (
            <ul className="space-y-2">
              {legend.map((l) => (
                <li key={l.label} className="flex items-start gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${l.swatch}`} aria-hidden="true" />
                  <span>{l.label}</span>
                </li>
              ))}
            </ul>
          )}
          {s.legendNote && (
            <p>
              <Inline text={s.legendNote} />
            </p>
          )}
          {s.sceneNote && <Rich text={s.sceneNote} />}
        </SceneNote>
      </div>
    </section>
  );
}
