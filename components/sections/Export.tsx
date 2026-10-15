import type { SiteContent } from "@/lib/content/schema";
import { Rich } from "@/components/Markup";
import { ChapterHeader, SceneNote } from "@/components/ui";

/** Nuclear export: its own chapter so the pore and its label never overlap translation. */
export default function Export({ content, index }: { content: SiteContent; index: string }) {
  const s = content.science.export;
  return (
    <section id="export" data-chapter="export" className="relative min-h-[130vh] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-[50svh] px-4 sm:px-6 md:gap-[35vh] lg:gap-10 lg:px-8">
        <div className="panel max-w-2xl p-6 sm:p-9">
          <ChapterHeader index={index} label={s.eyebrow} title={s.title} body={s.body} />
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
