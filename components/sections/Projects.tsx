import { projects } from "@/data/profile";
import { ChapterHeader } from "@/components/ui";

const ACCENT: Record<string, string> = {
  "Structural bioinformatics": "bg-[#6f8fe0]",
  Transcriptomics: "bg-[#e0894f]",
  Presentation: "bg-[#9275e8]",
};

export default function Projects() {
  return (
    <section id="projects" data-chapter="projects" className="on-light py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ChapterHeader index="07" label="Research" title={<>Projects</>} light>
          <p>Work described in the CV. Where the CV does not give methods or results, the card says so rather than filling the gap.</p>
        </ChapterHeader>

        <ul className="mt-12 grid gap-6 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id} data-reveal className="flex flex-col rounded-2xl border border-umber-900/10 bg-white/60 p-6 shadow-[0_20px_50px_-30px_rgba(29,26,22,0.35)] sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-taupe-700">
                  <span className={`h-2 w-2 rounded-full ${ACCENT[p.category]}`} aria-hidden="true" />
                  {p.category}
                </span>
                <span className="rounded-full border border-umber-900/15 px-2.5 py-0.5 font-mono text-[0.7rem] text-taupe-700">{p.status}</span>
              </div>
              <h3 className="display mt-5 text-[1.75rem] leading-tight text-umber-900">{p.title}</h3>
              <p className="mt-2 text-sm text-taupe-700">
                {p.context} · {p.period}
              </p>
              <p className="mt-4 leading-relaxed text-[#3b352c]">{p.objective}</p>

              <details className="group mt-6 border-t border-umber-900/10 pt-4">
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between text-sm font-medium text-umber-900">
                  Methods, tools &amp; contribution
                  <span aria-hidden="true" className="transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="mt-3 space-y-4 text-sm leading-relaxed text-[#3b352c]">
                  {p.methods.length > 0 && (
                    <div>
                      <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-taupe-500">Approach</p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5">
                        {p.methods.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-taupe-500">Contribution</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5">
                      {p.contribution.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                  {p.note && <p className="rounded-lg bg-stone-200/60 p-3 text-[0.8rem] text-taupe-700">{p.note}</p>}
                </div>
              </details>
              {p.tools.length > 0 && (
                <ul className="mt-auto flex flex-wrap gap-1.5 pt-5" aria-label="Tools">
                  {p.tools.map((t) => (
                    <li key={t} className="chip !py-0.5 !text-[0.75rem]">
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
