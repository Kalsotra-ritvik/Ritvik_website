import { education, experience } from "@/data/profile";
import { ChapterHeader } from "@/components/ui";

export default function Experience() {
  return (
    <section id="experience" data-chapter="experience" className="on-light border-t border-umber-900/10 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <ChapterHeader index="08" label="Experience" title={<>Research training</>} light />
          <ol className="mt-10 space-y-10 border-l border-umber-900/15 pl-6">
            {experience.map((e) => (
              <li key={e.organisation} data-reveal className="relative">
                <span className={`absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full ${e.current ? "bg-rust-500" : "bg-taupe-500"}`} aria-hidden="true" />
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-taupe-500">{e.period}</p>
                <h3 className="mt-1 text-lg font-medium text-umber-900">{e.role}</h3>
                <p className="text-[#3b352c]">
                  {e.organisation}, {e.location}
                </p>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#3b352c]">
                  {e.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                {e.mentor && <p className="mt-2 text-sm text-taupe-700">Mentor: {e.mentor}</p>}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <ChapterHeader index="09" label="Education" title={<>Degrees</>} light />
          <ol className="mt-10 space-y-10 border-l border-umber-900/15 pl-6">
            {education.map((e) => (
              <li key={e.degree} data-reveal className="relative">
                <span className={`absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full ${e.current ? "bg-rust-500" : "bg-taupe-500"}`} aria-hidden="true" />
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-taupe-500">{e.period}</p>
                <h3 className="mt-1 text-lg font-medium text-umber-900">{e.degree}</h3>
                <p className="text-[#3b352c]">
                  {e.institution}, {e.location}
                </p>
                <p className="mt-2 text-sm text-taupe-700">{e.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
