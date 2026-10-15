/* eslint-disable @next/next/no-img-element -- media-library images can live on any configured host */
import type { SiteContent } from "@/lib/content/schema";
import { resolveAsset } from "@/lib/content/public";
import { Rich } from "@/components/Markup";
import { ChapterHeader, SceneNote } from "@/components/ui";

export default function About({ content, index }: { content: SiteContent; index: string }) {
  const { profile, science } = content;
  const portrait = resolveAsset(profile.profileImage, content.media);
  return (
    <section id="about" data-chapter="about" className="relative min-h-[120vh] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-[60svh] px-4 sm:px-6 md:gap-[40vh] lg:gap-10 lg:px-8">
        <div className="panel max-w-2xl p-6 sm:p-9">
          {portrait && (
            <img src={portrait.url} alt={portrait.alt} className="mb-6 h-20 w-20 rounded-full object-cover ring-1 ring-white/15" width={80} height={80} />
          )}
          <ChapterHeader index={index} label={science.about.eyebrow} title={science.about.title} body={profile.summary}>
            {profile.goal && <p className="text-mist-100">{profile.goal}</p>}
          </ChapterHeader>
          {profile.facts.length > 0 && (
            <dl data-reveal className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
              {profile.facts.map((f) => (
                <div key={f.label + f.value}>
                  <dt className="note uppercase tracking-[0.14em]">{f.label}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-mist-100">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {profile.researchInterests.length > 0 && (
            <div data-reveal className="mt-6 border-t border-white/10 pt-6">
              <p className="note uppercase tracking-[0.14em]">Research interests</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {profile.researchInterests.map((r) => (
                  <li key={r} className="chip">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {science.about.sceneNote && (
          <SceneNote title={science.about.sceneNoteTitle}>
            <Rich text={science.about.sceneNote} />
          </SceneNote>
        )}
      </div>
    </section>
  );
}
