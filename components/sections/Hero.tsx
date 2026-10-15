import type { SiteContent } from "@/lib/content/schema";
import { resolveAsset } from "@/lib/content/public";
import { Inline } from "@/components/Markup";
import { ArrowIcon, DownloadIcon } from "@/components/ui";

export default function Hero({ content }: { content: SiteContent }) {
  const { profile } = content;
  const cv = resolveAsset(profile.cv.asset, content.media);
  const words = profile.name.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : null;
  return (
    <section id="hero" data-chapter="hero" className="relative flex min-h-[100svh] items-end pb-16 pt-28 lg:items-center lg:pb-24">
      <div className="hero-scrim pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          {profile.heroEyebrow && <p className="eyebrow">{profile.heroEyebrow}</p>}
          <h1 className="display mt-5 text-[clamp(3.2rem,2rem+6vw,7.2rem)] text-mist-100">
            {words.join(" ")}
            {last && (
              <>
                <br />
                <span className="italic text-amber-300">{last}</span>
              </>
            )}
          </h1>
          <p className="mt-6 max-w-lg text-[clamp(1.05rem,0.95rem+0.4vw,1.3rem)] leading-relaxed text-mist-200">
            <Inline text={profile.heroIntro} />
            {profile.heroIntroMuted && (
              <span className="text-mist-400">
                {" "}
                <Inline text={profile.heroIntroMuted} />
              </span>
            )}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            {profile.heroCtaPrimary && (
              <a href="#about" className="btn btn-primary">
                {profile.heroCtaPrimary} <ArrowIcon />
              </a>
            )}
            {cv && profile.heroCtaCv && (
              <a href={cv.url} download={profile.cv.fileName || undefined} className="btn btn-ghost">
                <DownloadIcon /> {profile.heroCtaCv}
              </a>
            )}
            {profile.heroCtaContact && (
              <a href="#contact" className="btn btn-ghost">
                {profile.heroCtaContact}
              </a>
            )}
          </div>
        </div>
      </div>
      {profile.heroScrollCue && (
        <a href="#about" className="note absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-mist-300 sm:flex">
          <span>
            <span className="sr-only">Start the story: </span>
            {profile.heroScrollCue}
          </span>
          <span className="scroll-cue block h-6 w-px bg-mist-300/60" aria-hidden="true" />
        </a>
      )}
    </section>
  );
}
