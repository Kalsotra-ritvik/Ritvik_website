import { profile } from "@/data/profile";
import { ArrowIcon, DownloadIcon } from "@/components/ui";

export default function Hero() {
  return (
    <section id="hero" data-chapter="hero" className="relative flex min-h-[100svh] items-end pb-16 pt-28 lg:items-center lg:pb-24">
      <div className="hero-scrim pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow">Portfolio · {profile.role}</p>
          <h1 className="display mt-5 text-[clamp(3.2rem,2rem+6vw,7.2rem)] text-mist-100">
            Ritvik
            <br />
            <span className="italic text-amber-300">Kalsotra</span>
          </h1>
          <p className="mt-6 max-w-lg text-[clamp(1.05rem,0.95rem+0.4vw,1.3rem)] leading-relaxed text-mist-200">
            Structural bioinformatics and computational drug discovery, now extending into transcriptomics.
            <span className="text-mist-400"> A scroll-through story from DNA sequence to protein structure.</span>
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#about" className="btn btn-primary">
              Begin <ArrowIcon />
            </a>
            <a href={profile.cv.href} download={profile.cv.fileName} className="btn btn-ghost">
              <DownloadIcon /> Download CV
            </a>
            <a href="#contact" className="btn btn-ghost">
              Contact
            </a>
          </div>
        </div>
      </div>
      <a href="#about" className="note absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-mist-300 sm:flex" >
        <span>
          <span className="sr-only">Start the story: </span>DNA → RNA → protein → structure
        </span>
        <span className="scroll-cue block h-6 w-px bg-mist-300/60" aria-hidden="true" />
      </a>
    </section>
  );
}
