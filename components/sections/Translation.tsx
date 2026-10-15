import { ChapterHeader, SceneNote } from "@/components/ui";
import CodonTrack from "./CodonTrack";

const FOCUS = [
  { title: "Structure-based drug discovery", text: "Virtual screening, molecular docking and ADMET analysis to find and triage candidate ligands." },
  { title: "Molecular dynamics", text: "Simulating protein–ligand complexes to test whether a predicted binding mode is stable." },
  { title: "Machine learning for binding", text: "Combining physics-based descriptors with learned models to predict binding affinity." },
  { title: "Transcriptomics", text: "RNA-seq analysis and tool development, connecting gene activity to the proteins it produces." },
];

export default function Translation() {
  return (
    <section id="translation" data-chapter="translation" className="relative min-h-[260vh] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-[60svh] px-4 sm:px-6 md:gap-[40vh] lg:gap-10 lg:px-8">
        <div className="grid grid-cols-1 gap-[60svh] md:gap-[40vh] lg:gap-10">
        <div className="panel max-w-2xl p-6 sm:p-9">
          <ChapterHeader index="04" label="Translation" title={<>Codon <span className="italic">by codon</span></>}>
            <p>
              The finished mRNA leaves the nucleus through a nuclear pore, 5′ end first. In the cytoplasm the small ribosomal subunit,
              carrying the initiator Met-tRNA, finds the AUG start codon; the large subunit then joins.
            </p>
            <p>
              Each cycle, a tRNA whose anticodon pairs with the codon in the A site delivers one amino acid, a peptide bond forms, and the
              ribosome shifts one codon along: tRNAs move from A to P to E. The growing chain leaves through a tunnel in the large subunit.
            </p>
          </ChapterHeader>
        </div>

        {/* The read-out stays in view while the ribosome works, then scrolls away before the next card. */}
        <div className="flex min-h-[120vh] flex-col justify-end lg:justify-start">
          <div className="sticky bottom-3 z-10 max-w-2xl lg:bottom-auto lg:top-24">
            <CodonTrack />
          </div>
        </div>
        </div>

        <div data-reveal className="panel max-w-2xl p-6 sm:p-9">
          <p className="eyebrow">Research focus</p>
          <h3 className="display mt-3 text-3xl text-mist-100 sm:text-4xl">Where expression meets structure</h3>
          <p className="prose-body mt-4">
            Translation is the hinge of this story — the point where information about gene activity becomes a physical molecule. The
            work in the CV sits on both sides of it.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {FOCUS.map((f) => (
              <li key={f.title} className="rounded-xl border border-white/10 p-4">
                <p className="text-mist-100">{f.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-mist-300">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>

        <SceneNote>
          The ribosome is cut away to show the A, P and E sites. Anticodon bases are coloured as the complements of the codon they read
          (A·U, G·C). The amino-acid colours follow the chain from N-terminus (teal) to C-terminus (amber), the same scheme used for the
          folded protein.
        </SceneNote>
      </div>
    </section>
  );
}
