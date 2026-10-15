import type { SiteContent } from "@/lib/content/schema";
import { Inline, Rich } from "@/components/Markup";
import { ChapterHeader, SceneNote } from "@/components/ui";

export default function Foundations({ content, index }: { content: SiteContent; index: string }) {
  const s = content.science.transcription;
  return (
    <section id="foundations" data-chapter="foundations" className="relative min-h-[190vh] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-[60svh] px-4 sm:px-6 md:gap-[40vh] lg:gap-10 lg:px-8">
        <div className="panel max-w-2xl p-6 sm:p-9">
          <ChapterHeader index={index} label={s.eyebrow} title={s.title} body={s.body} />
        </div>

        <div className="lg:mt-[45vh]">
          <div data-reveal className="panel max-w-2xl p-6 sm:p-9">
            {s.trainingEyebrow && <p className="eyebrow">{s.trainingEyebrow}</p>}
            <h3 className="display mt-3 text-3xl text-mist-100 sm:text-4xl">
              <Inline text={s.trainingTitle} />
            </h3>
            {content.education.length > 0 && (
              <ul className="mt-6 space-y-4">
                {content.education.map((e) => (
                  <li key={e.degree + e.institution} className="border-l border-amber-300/40 pl-4">
                    <p className="text-mist-100">
                      {e.degree} {e.period && <span className="text-mist-400">· {e.period}</span>}
                    </p>
                    <p className="text-sm text-mist-300">{[e.institution, e.location].filter(Boolean).join(", ")}</p>
                  </li>
                ))}
              </ul>
            )}
            {s.benchItems.length > 0 && (
              <>
                {s.benchIntro && (
                  <p className="prose-body mt-6">
                    <Inline text={s.benchIntro} />
                  </p>
                )}
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected wet-lab techniques">
                  {s.benchItems.map((b) => (
                    <li key={b} className="chip">
                      {b}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {s.sceneNote && (
          <SceneNote title={s.sceneNoteTitle}>
            <Rich text={s.sceneNote} />
          </SceneNote>
        )}
      </div>
    </section>
  );
}
