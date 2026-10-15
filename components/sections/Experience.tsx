import type { SiteContent } from "@/lib/content/schema";
import { resolveAsset } from "@/lib/content/public";
import { Rich } from "@/components/Markup";
import { ChapterHeader, ExternalIcon, SmartLink } from "@/components/ui";

export default function Experience({ content, index }: { content: SiteContent; index: string }) {
  const { experience: hx, education: he } = content.sections.headings;
  return (
    <section id="experience" data-chapter="experience" className="on-light border-t border-umber-900/10 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <ChapterHeader index={index} label={hx.eyebrow} title={hx.title} body={hx.intro} light />
          <ol className="mt-10 space-y-10 border-l border-umber-900/15 pl-6">
            {content.experience.map((e) => (
              <li key={e.role + e.organisation} data-reveal className="relative">
                <span className={`absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full ${e.current ? "bg-rust-500" : "bg-taupe-500"}`} aria-hidden="true" />
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-taupe-500">{e.period}</p>
                <h3 className="mt-1 text-lg font-medium text-umber-900">{e.role}</h3>
                <p className="text-[#3b352c]">{[e.organisation, e.location].filter(Boolean).join(", ")}</p>
                {e.description && <Rich text={e.description} className="mt-2 text-sm leading-relaxed text-[#3b352c]" />}
                {e.points.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#3b352c]">
                    {e.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
                {[...e.methods, ...e.tools].length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Methods and tools">
                    {[...new Set([...e.methods, ...e.tools])].map((m) => (
                      <li key={m} className="chip !py-0.5 !text-[0.75rem]">
                        {m}
                      </li>
                    ))}
                  </ul>
                )}
                {e.mentor && <p className="mt-2 text-sm text-taupe-700">Mentor: {e.mentor}</p>}
                {e.links.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-3 text-sm">
                    {e.links.map((l) => (
                      <li key={l.href}>
                        <SmartLink href={l.href} className="inline-flex items-center gap-1 text-rust-500 underline-offset-4 hover:underline">
                          {l.label} <ExternalIcon />
                        </SmartLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <ChapterHeader index={`${index}b`} label={he.eyebrow} title={he.title} body={he.intro} light />
          <ol className="mt-10 space-y-10 border-l border-umber-900/15 pl-6">
            {content.education.map((e) => {
              const doc = resolveAsset(e.document, content.media);
              return (
                <li key={e.degree + e.institution} data-reveal className="relative">
                  <span className={`absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full ${e.current ? "bg-rust-500" : "bg-taupe-500"}`} aria-hidden="true" />
                  <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-taupe-500">{e.period}</p>
                  <h3 className="mt-1 text-lg font-medium text-umber-900">{e.degree}</h3>
                  <p className="text-[#3b352c]">{[e.institution, e.location].filter(Boolean).join(", ")}</p>
                  {e.detail && <p className="mt-2 text-sm text-taupe-700">{e.detail}</p>}
                  {e.achievements.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#3b352c]">
                      {e.achievements.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  )}
                  {(doc || e.links.length > 0) && (
                    <ul className="mt-2 flex flex-wrap gap-3 text-sm">
                      {doc && (
                        <li>
                          <SmartLink href={doc.url} className="text-rust-500 underline-offset-4 hover:underline">
                            {doc.alt || "Document"}
                          </SmartLink>
                        </li>
                      )}
                      {e.links.map((l) => (
                        <li key={l.href}>
                          <SmartLink href={l.href} className="inline-flex items-center gap-1 text-rust-500 underline-offset-4 hover:underline">
                            {l.label} <ExternalIcon />
                          </SmartLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
