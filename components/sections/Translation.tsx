import type { SiteContent } from "@/lib/content/schema";
import { Inline, Rich } from "@/components/Markup";
import { ChapterHeader, SceneNote } from "@/components/ui";
import CodonTrack from "./CodonTrack";

export default function Translation({ content, index }: { content: SiteContent; index: string }) {
  const s = content.science.translation;
  return (
    <section id="translation" data-chapter="translation" className="relative min-h-[240vh] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-[60svh] px-4 sm:px-6 md:gap-[40vh] lg:gap-10 lg:px-8">
        <div className="grid grid-cols-1 gap-[60svh] md:gap-[40vh] lg:gap-10">
          <div className="panel max-w-2xl p-6 sm:p-9">
            <ChapterHeader index={index} label={s.eyebrow} title={s.title} body={s.body} />
          </div>

          {/* The read-out stays in view while the ribosome works, then scrolls away before the next card. */}
          <div className="flex min-h-[120vh] flex-col justify-end lg:justify-start">
            <div className="sticky bottom-3 z-10 max-w-2xl lg:bottom-auto lg:top-24">
              <CodonTrack note={s.codonNote} noteShort={s.codonNoteShort} />
            </div>
          </div>
        </div>

        {s.focusItems.length > 0 && (
          <div data-reveal className="panel max-w-2xl p-6 sm:p-9">
            {s.focusEyebrow && <p className="eyebrow">{s.focusEyebrow}</p>}
            <h3 className="display mt-3 text-3xl text-mist-100 sm:text-4xl">
              <Inline text={s.focusTitle} />
            </h3>
            {s.focusIntro && <Rich text={s.focusIntro} className="prose-body mt-4" />}
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {s.focusItems.map((f) => (
                <li key={f.title} className="rounded-xl border border-white/10 p-4">
                  <p className="text-mist-100">{f.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-mist-300">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
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
