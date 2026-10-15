import { dissertation, experience } from "@/data/profile";
import { ChapterHeader, SceneNote } from "@/components/ui";

export default function Folding() {
  const cdri = experience.find((e) => e.organisation.includes("CDRI"));
  return (
    <section id="folding" data-chapter="folding" className="relative min-h-[200vh] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-[60svh] px-4 sm:px-6 md:gap-[40vh] lg:gap-10 lg:px-8">
        <div className="panel max-w-2xl p-6 sm:p-9">
          <ChapterHeader index="05" label="Folding" title={<>A chain finds <span className="italic">its shape</span></>}>
            <p>
              Translation is condensed here: the full chain is 672 residues long. Once released, a polypeptide does not stay an
              extended string. Its sequence determines a three-dimensional fold, and that shape determines what the protein can bind and do.
            </p>
            <p>
              The protein in this story is the human sodium–glucose cotransporter SGLT2 — the drug target of Ritvik&apos;s dissertation.
            </p>
          </ChapterHeader>
        </div>

        <article data-reveal className="panel max-w-2xl p-6 sm:p-9 lg:mt-[40vh]" aria-labelledby="dissertation-title">
          <p className="eyebrow">M.Sc. dissertation · {dissertation.period}</p>
          <h3 id="dissertation-title" className="display mt-3 text-3xl leading-tight text-mist-100 sm:text-[2.4rem]">
            {dissertation.title}
          </h3>
          <p className="mt-3 text-mist-300">{dissertation.institute}</p>
          {cdri?.mentor && <p className="note mt-4">Mentor: {cdri.mentor}</p>}
        </article>

        <SceneNote title="What is real here">
          <p>
            The final fold is the experimentally determined structure of human SGLT2 (cryo-EM, PDB 7VSI, 2.95 Å; Niu et al., Nature 2022),
            one bead per resolved Cα. The route to it is an illustrative interpolation — helices form, then pack — not a folding simulation.
          </p>
          <p className="mt-2">
            In cells, SGLT2&apos;s transmembrane helices are inserted into the endoplasmic-reticulum membrane as they leave the ribosome;
            the membrane is omitted for clarity. Residues 1–20 and 575–640 are not resolved in the model and fade out.
          </p>
        </SceneNote>
      </div>
    </section>
  );
}
