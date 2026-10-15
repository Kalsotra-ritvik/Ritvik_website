import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";
import { resolveAsset } from "@/lib/content/public";
import { Inline, Rich } from "@/components/Markup";
import { DownloadIcon, ExternalIcon, SmartLink } from "@/components/ui";

export default function Contact({ content, index }: { content: SiteContent; index: string }) {
  const { profile, site } = content;
  const cv = resolveAsset(profile.cv.asset, content.media);
  return (
    <section id="contact" data-chapter="contact" className="dark-enter relative flex min-h-[130vh] flex-col justify-between pt-32 sm:pt-40">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="panel mt-[38svh] max-w-2xl p-6 sm:p-10 lg:mt-0">
          <p className="eyebrow">
            {index} · {site.contact.eyebrow}
          </p>
          <h2 className="display mt-4 text-[clamp(2.6rem,1.6rem+4vw,5rem)] text-mist-100">
            <Inline text={site.contact.title} italicClass="italic text-amber-300" />
          </h2>
          <Rich text={site.contact.body} className="prose-body mt-5" />
          <div className="mt-8 flex flex-wrap gap-3">
            {profile.email && (
              <a href={`mailto:${profile.email}`} className="btn btn-primary">
                {profile.email}
              </a>
            )}
            {profile.links.map((l) => (
              <SmartLink key={l.href} href={l.href} className="btn btn-ghost">
                {l.label} {/^https?:/.test(l.href) && <ExternalIcon />}
              </SmartLink>
            ))}
            {cv && (
              <a href={cv.url} download={profile.cv.fileName || undefined} className="btn btn-ghost">
                <DownloadIcon /> {profile.cv.label || "CV"}
              </a>
            )}
          </div>
          {profile.showPhone && profile.phone && (
            <p className="mt-6 text-mist-300">
              Phone:{" "}
              <a href={`tel:${profile.phone.replace(/[^+\d]/g, "")}`} className="text-mist-100 underline-offset-4 hover:underline">
                {profile.phone}
              </a>
            </p>
          )}
        </div>
      </div>

      <footer className="mx-auto mt-24 w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="panel grid gap-4 p-5 text-xs leading-relaxed text-mist-400 sm:grid-cols-[1fr_auto] sm:p-6">
          <div className="space-y-1.5">
            <Rich text={site.footer.attribution} />
            {site.footer.builtWith && <p>{site.footer.builtWith}</p>}
          </div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-1 sm:justify-end">
            {site.footer.copyright && <p>{site.footer.copyright}</p>}
            {site.footer.adminLink && (
              <Link href="/admin/login" prefetch={false} rel="nofollow" className="text-mist-300 underline-offset-4 hover:text-mist-100 hover:underline">
                {site.footer.adminLink}
              </Link>
            )}
          </div>
        </div>
      </footer>
    </section>
  );
}
