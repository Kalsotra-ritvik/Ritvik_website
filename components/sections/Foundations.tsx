import { education, skillGroups } from "@/data/profile";
import { ChapterHeader, SceneNote } from "@/components/ui";

const BENCH = ["DNA and RNA isolation", "PCR and primer handling", "Agarose gel electrophoresis", "Spectrophotometric analysis", "Protein estimation techniques", "Cell culture handling"];

export default function Foundations() {
  const wetlab = skillGroups.find((g) => g.id === "wetlab")?.items ?? [];
  const bench = BENCH.filter((b) => wetlab.includes(b));
  return (
    <section id="foundations" data-chapter="foundations" className="relative min-h-[190vh] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-[60svh] px-4 sm:px-6 md:gap-[40vh] lg:gap-10 lg:px-8">
        <div className="panel max-w-2xl p-6 sm:p-9">
          <ChapterHeader index="02" label="Transcription" title={<>Reading the <span className="italic">template</span></>}>
            <p>
              RNA polymerase travels along the template strand, adding one nucleotide for every base pair it passes. The RNA it builds
              runs 5′→3′ and matches the coding strand, with uracil in place of thymine. Behind the enzyme the DNA zips back together.
            </p>
          </ChapterHeader>
        </div>

        <div className="lg:mt-[45vh]">
          <div data-reveal className="panel max-w-2xl p-6 sm:p-9">
            <p className="eyebrow">Training</p>
            <h3 className="display mt-3 text-3xl text-mist-100 sm:text-4xl">Biotechnology, at the bench and on the command line</h3>
            <ul className="mt-6 space-y-4">
              {education.map((e) => (
                <li key={e.degree} className="border-l border-amber-300/40 pl-4">
                  <p className="text-mist-100">
                    {e.degree} <span className="text-mist-400">· {e.period}</span>
                  </p>
                  <p className="text-sm text-mist-300">
                    {e.institution}, {e.location}
                  </p>
                </li>
              ))}
            </ul>
            <p className="prose-body mt-6">Wet-lab methods from the CV that sit closest to this part of the story:</p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected wet-lab techniques">
              {bench.map((b) => (
                <li key={b} className="chip">
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <SceneNote>
          The template strand is highlighted in blue. The enzyme is a schematic shell, cut away so the open bubble and the newly made RNA
          (amber) are visible; it advances exactly one base pair per nucleotide added. Molecules are not drawn to scale.
        </SceneNote>
      </div>
    </section>
  );
}
