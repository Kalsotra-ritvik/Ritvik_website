/* eslint-disable @next/next/no-img-element -- media-library images can live on any configured host */
import type { SiteContent } from "@/lib/content/schema";
import { resolveAsset } from "@/lib/content/public";
import { Inline, Rich } from "@/components/Markup";
import { ChapterHeader, ExternalIcon, SmartLink } from "@/components/ui";

const ACCENT: Record<string, string> = {
  blue: "bg-[#6f8fe0]",
  amber: "bg-[#e0894f]",
  violet: "bg-[#9275e8]",
  teal: "bg-[#5fb5a9]",
  coral: "bg-[#e36a5c]",
};

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-taupe-500">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export default function Projects({ content, index }: { content: SiteContent; index: string }) {
  const h = content.sections.headings.projects;
  return (
    <section id="projects" data-chapter="projects" className="on-light on-light-enter py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ChapterHeader index={index} label={h.eyebrow} title={h.title} body={h.intro} light />

        <ul className="mt-12 grid gap-6 lg:grid-cols-3">
          {content.projects.map((p) => {
            const card = resolveAsset(p.cardImage, content.media);
            const gallery = p.media.map((m) => ({ ...m, resolved: resolveAsset(m.asset, content.media) })).filter((m) => m.resolved);
            const hasDetails =
              p.methods.length || p.contribution.length || p.background || p.workflow || p.results || p.datasets || gallery.length || p.note || p.links.length;
            return (
              <li
                key={p.slug}
                id={`project-${p.slug}`}
                data-reveal
                className="flex flex-col overflow-hidden rounded-2xl border border-umber-900/10 bg-white/60 shadow-[0_20px_50px_-30px_rgba(29,26,22,0.35)]"
              >
                {card && card.mime?.startsWith("image/") !== false && (
                  <img src={card.url} alt={card.alt} className="aspect-[16/9] w-full object-cover" loading="lazy" />
                )}
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-taupe-700">
                      <span className={`h-2 w-2 rounded-full ${ACCENT[p.accent] ?? ACCENT.blue}`} aria-hidden="true" />
                      {p.category}
                    </span>
                    <span className="rounded-full border border-umber-900/15 px-2.5 py-0.5 font-mono text-[0.7rem] text-taupe-700">{p.status}</span>
                  </div>
                  <h3 className="display mt-5 text-[1.75rem] leading-tight text-umber-900">{p.title}</h3>
                  <p className="mt-2 text-sm text-taupe-700">{[p.context, p.period].filter(Boolean).join(" · ")}</p>
                  {(p.summary || p.objective) && (
                    <p className="mt-4 leading-relaxed text-[#3b352c]">
                      <Inline text={p.summary || p.objective} />
                    </p>
                  )}

                  {hasDetails ? (
                    <details className="group mt-6 border-t border-umber-900/10 pt-4">
                      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between text-sm font-medium text-umber-900">
                        Methods, tools &amp; contribution
                        <span aria-hidden="true" className="transition-transform group-open:rotate-45">
                          +
                        </span>
                      </summary>
                      <div className="mt-3 space-y-4 text-sm leading-relaxed text-[#3b352c]">
                        {p.objective && p.summary && p.objective !== p.summary && (
                          <Block label="Research question">
                            <Rich text={p.objective} />
                          </Block>
                        )}
                        {p.background && (
                          <Block label="Background">
                            <Rich text={p.background} className="mt-1 first:mt-0" />
                          </Block>
                        )}
                        {p.methods.length > 0 && (
                          <Block label="Approach">
                            <ul className="list-disc space-y-1 pl-5">
                              {p.methods.map((m) => (
                                <li key={m}>{m}</li>
                              ))}
                            </ul>
                          </Block>
                        )}
                        {p.workflow && (
                          <Block label="Workflow">
                            <Rich text={p.workflow} />
                          </Block>
                        )}
                        {p.contribution.length > 0 && (
                          <Block label="Contribution">
                            <ul className="list-disc space-y-1 pl-5">
                              {p.contribution.map((m) => (
                                <li key={m}>{m}</li>
                              ))}
                            </ul>
                          </Block>
                        )}
                        {p.results && (
                          <Block label="Results">
                            <Rich text={p.results} />
                          </Block>
                        )}
                        {p.datasets && (
                          <Block label="Data & provenance">
                            <Rich text={p.datasets} />
                          </Block>
                        )}
                        {gallery.length > 0 && (
                          <div className="grid gap-3">
                            {gallery.map((g) =>
                              g.resolved!.mime?.startsWith("video/") ? (
                                <figure key={g.resolved!.url}>
                                  <video src={g.resolved!.url} controls preload="metadata" className="w-full rounded-lg" aria-label={g.resolved!.alt} />
                                  {g.caption && <figcaption className="mt-1 text-xs text-taupe-700">{g.caption}</figcaption>}
                                </figure>
                              ) : g.resolved!.mime?.startsWith("image/") || !g.resolved!.mime ? (
                                <figure key={g.resolved!.url}>
                                  <img src={g.resolved!.url} alt={g.resolved!.alt} className="w-full rounded-lg" loading="lazy" />
                                  {g.caption && <figcaption className="mt-1 text-xs text-taupe-700">{g.caption}</figcaption>}
                                </figure>
                              ) : (
                                <SmartLink key={g.resolved!.url} href={g.resolved!.url} className="underline underline-offset-4">
                                  {g.caption || g.resolved!.alt || "Attached file"}
                                </SmartLink>
                              ),
                            )}
                          </div>
                        )}
                        {p.note && (
                          <p className="rounded-lg bg-stone-200/60 p-3 text-[0.8rem] text-taupe-700">
                            <Inline text={p.note} />
                          </p>
                        )}
                      </div>
                    </details>
                  ) : null}

                  {(p.repoUrl || p.publicationUrl || p.links.length > 0) && (
                    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                      {p.repoUrl && (
                        <li>
                          <SmartLink href={p.repoUrl} className="inline-flex items-center gap-1 text-rust-500 underline-offset-4 hover:underline">
                            Repository <ExternalIcon />
                          </SmartLink>
                        </li>
                      )}
                      {p.publicationUrl && (
                        <li>
                          <SmartLink href={p.publicationUrl} className="inline-flex items-center gap-1 text-rust-500 underline-offset-4 hover:underline">
                            Publication <ExternalIcon />
                          </SmartLink>
                        </li>
                      )}
                      {p.links.map((l) => (
                        <li key={l.href}>
                          <SmartLink href={l.href} className="inline-flex items-center gap-1 text-rust-500 underline-offset-4 hover:underline">
                            {l.label} <ExternalIcon />
                          </SmartLink>
                        </li>
                      ))}
                    </ul>
                  )}

                  {p.tools.length > 0 && (
                    <ul className="mt-auto flex flex-wrap gap-1.5 pt-5" aria-label="Tools">
                      {p.tools.map((t) => (
                        <li key={t} className="chip !py-0.5 !text-[0.75rem]">
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
