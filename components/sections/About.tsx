import { dissertation, education, experience, profile } from "@/data/profile";
import { ChapterHeader, SceneNote } from "@/components/ui";

export default function About() {
  const current = experience.find((e) => e.current);
  const facts = [
    { k: "Now", v: current ? `${current.role}, ${current.organisation}` : "" },
    { k: "Dissertation", v: `${dissertation.institute} · ${dissertation.period}` },
    { k: "Degree", v: `${education[0].degree}, ${education[0].institution} · ${education[0].period}` },
    { k: "Aim", v: "PhD in structural bioinformatics" },
  ];
  return (
    <section id="about" data-chapter="about" className="relative min-h-[120vh] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-[60svh] px-4 sm:px-6 md:gap-[40vh] lg:gap-10 lg:px-8">
        <div className="panel max-w-2xl p-6 sm:p-9">
          <ChapterHeader index="01" label="About" title={<>From sequence <span className="italic">to structure</span></>}>
            {profile.summary.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p className="text-mist-100">{profile.goal}</p>
          </ChapterHeader>
          <dl data-reveal className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.k}>
                <dt className="note uppercase tracking-[0.14em]">{f.k}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-mist-100">{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <SceneNote>
          A DNA double helix drawn with B-form proportions (about 10.5 base pairs per turn, with distinct major and minor grooves).
          RNA polymerase now binds and separates a short stretch of the two strands — the transcription bubble. The base sequence is
          schematic, not a real gene.
        </SceneNote>
      </div>
    </section>
  );
}
