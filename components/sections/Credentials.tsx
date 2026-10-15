import type { Credential, SiteContent } from "@/lib/content/schema";
import { resolveAsset } from "@/lib/content/public";
import { Rich } from "@/components/Markup";
import { ChapterHeader, ExternalIcon, SmartLink } from "@/components/ui";

const TALKS = new Set(["Publication", "Poster", "Presentation", "Conference"]);

function List({ items, media }: { items: Credential[]; media: SiteContent["media"] }) {
  return (
    <ul className="mt-6 divide-y divide-umber-900/10 border-y border-umber-900/10">
      {items.map((c) => {
        const doc = resolveAsset(c.document, media);
        return (
          <li key={c.title + c.issuer} data-reveal className="grid gap-1 py-5 sm:grid-cols-[7rem_1fr] sm:gap-6">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-taupe-500">
              {c.kind}
              {c.date ? ` · ${c.date}` : ""}
            </p>
            <div>
              <p className="text-umber-900">{c.title}</p>
              {c.contributors && <p className="text-sm text-[#3b352c]">{c.contributors}</p>}
              <p className="text-sm text-taupe-700">{c.issuer}</p>
              {c.description && <Rich text={c.description} className="mt-2 text-sm text-[#3b352c]" />}
              {(c.doi || c.url || doc) && (
                <p className="mt-2 flex flex-wrap gap-3 text-sm">
                  {c.doi && (
                    <SmartLink href={`https://doi.org/${c.doi}`} className="inline-flex items-center gap-1 text-rust-500 underline-offset-4 hover:underline">
                      doi:{c.doi} <ExternalIcon />
                    </SmartLink>
                  )}
                  {c.url && (
                    <SmartLink href={c.url} className="inline-flex items-center gap-1 text-rust-500 underline-offset-4 hover:underline">
                      Link <ExternalIcon />
                    </SmartLink>
                  )}
                  {doc && (
                    <SmartLink href={doc.url} className="text-rust-500 underline-offset-4 hover:underline">
                      {doc.alt || "Document"}
                    </SmartLink>
                  )}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function Credentials({ content, index }: { content: SiteContent; index: string }) {
  const talks = content.credentials.filter((c) => TALKS.has(c.kind));
  const learning = content.credentials.filter((c) => !TALKS.has(c.kind));
  const { presentations, learning: hl } = content.sections.headings;
  if (!talks.length && !learning.length) return null;
  return (
    <section id="credentials" data-chapter="credentials" className="on-light border-t border-umber-900/10 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        {talks.length > 0 && (
          <div>
            <ChapterHeader index={index} label={presentations.eyebrow} title={presentations.title} body={presentations.intro} light />
            <List items={talks} media={content.media} />
          </div>
        )}
        {learning.length > 0 && (
          <div>
            <ChapterHeader index={`${index}b`} label={hl.eyebrow} title={hl.title} body={hl.intro} light />
            <List items={learning} media={content.media} />
          </div>
        )}
      </div>
    </section>
  );
}
