import type { SiteContent } from "@/lib/content/schema";
import { Rich } from "@/components/Markup";
import { ChapterHeader, SceneNote } from "@/components/ui";

export default function Folding({ content, index }: { content: SiteContent; index: string }) {
  const s = content.science.folding;
  const d = content.profile.dissertation;
  return (
    <section id="folding" data-chapter="folding" className="relative min-h-[200vh] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-[60svh] px-4 sm:px-6 md:gap-[40vh] lg:gap-10 lg:px-8">
        <div className="panel max-w-2xl p-6 sm:p-9">
          <ChapterHeader index={index} label={s.eyebrow} title={s.title} body={s.body} />
        </div>

        {d.title && (
          <article data-reveal className="panel max-w-2xl p-6 sm:p-9 lg:mt-[40vh]" aria-labelledby="dissertation-title">
            <p className="eyebrow">
              {s.dissertationEyebrow}
              {d.period ? ` · ${d.period}` : ""}
            </p>
            <h3 id="dissertation-title" className="display mt-3 text-3xl leading-tight text-mist-100 sm:text-[2.4rem]">
              {d.title}
            </h3>
            {d.institute && <p className="mt-3 text-mist-300">{d.institute}</p>}
            {d.mentor && <p className="note mt-4">Mentor: {d.mentor}</p>}
          </article>
        )}

        {s.sceneNote && (
          <SceneNote title={s.sceneNoteTitle}>
            <Rich text={s.sceneNote} />
          </SceneNote>
        )}
      </div>
    </section>
  );
}
