import { profile } from "@/data/profile";
import { DownloadIcon, ExternalIcon } from "@/components/ui";

export default function Contact() {
  return (
    <section id="contact" data-chapter="contact" className="relative flex min-h-[130vh] flex-col justify-between pt-32 sm:pt-40">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="panel mt-[38svh] max-w-2xl p-6 sm:p-10 lg:mt-0">
          <p className="eyebrow">13 · Contact</p>
          <h2 className="display mt-4 text-[clamp(2.6rem,1.6rem+4vw,5rem)] text-mist-100">
            Sequence, structure, <span className="italic text-amber-300">next</span>
          </h2>
          <p className="prose-body mt-5">
            {profile.goal} For research positions, PhD opportunities or collaborations, email is the best way to reach me.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={`mailto:${profile.email}`} className="btn btn-primary">
              {profile.email}
            </a>
            {profile.links.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                {l.label} <ExternalIcon />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ))}
            <a href={profile.cv.href} download={profile.cv.fileName} className="btn btn-ghost">
              <DownloadIcon /> CV (PDF)
            </a>
          </div>
          {profile.showPhone && profile.phone && (
            <p className="mt-6 text-mist-300">
              Phone: <a href={`tel:${profile.phone.replace(/\s/g, "")}`} className="text-mist-100 underline-offset-4 hover:underline">{profile.phone}</a>
            </p>
          )}
        </div>
      </div>

      <footer className="mx-auto mt-24 w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="panel grid gap-4 p-5 text-xs leading-relaxed text-mist-400 sm:grid-cols-[1fr_auto] sm:p-6">
          <div className="space-y-1.5">
            <p>
              Structure data: PDB{" "}
              <a className="text-mist-200 underline-offset-4 hover:underline" href="https://www.rcsb.org/structure/7VSI" target="_blank" rel="noopener noreferrer">
                7VSI
              </a>{" "}
              (Niu et al., <em>Nature</em> 2022), distributed by the wwPDB under CC0. Molecular scenes are schematic and not to scale; the
              DNA sequence and transcript are illustrative; figures marked “simulated” do not show real data.
            </p>
            <p>Built with Next.js, three.js and GSAP.</p>
          </div>
          <p className="self-end">© {profile.name}</p>
        </div>
      </footer>
    </section>
  );
}
