# Ritvik Kalsotra — From sequence to structure

An interactive research portfolio built as one continuous, scroll-driven molecular story:

**DNA → transcription → RNA processing → transcriptome → export → translation → polypeptide → folded protein → structural insight**

The protein the story arrives at is human **SGLT2**, the target of Ritvik's M.Sc. dissertation, drawn from its experimentally determined structure (PDB [7VSI](https://www.rcsb.org/structure/7VSI)). All personal content comes from the supplied CV.

---

## Quick start

Requirements: **Node.js ≥ 20.9** (the Next.js 16 minimum) and npm.

```bash
npm ci            # install exact dependency versions
npm run dev       # http://localhost:3000
npm run check     # typecheck + lint + unit tests
npm run build     # production build (statically prerendered)
npm run start     # serve the production build
```

No environment variables are required.

> If a production build ever serves stale styles after large edits, run `rm -rf .next` and rebuild.

## Editing the content

All CV-derived content lives in **`data/profile.ts`** (typed by `types/content.ts`). Update text there; no animation code needs to change.

- `profile.showPhone` is `false` by default because the site is public. The number from the CV is stored but not rendered.
- The downloadable CV is `public/cv/Ritvik_Kalsotra_CV.pdf`. Replace the file (keep the name) or change `profile.cv`.
- Projects only show what the CV states. Each card has a `note` explaining what is missing (results, datasets) instead of filling the gap.

## How the experience works

| Page section | Story time `t` | What the 3D scene shows | Content |
|---|---|---|---|
| Hero | 0 – 0.5 | B-form DNA double helix | Name, positioning, CV |
| About | 0.5 – 1 | RNA polymerase binds; transcription bubble opens | CV summary, key facts |
| Transcription | 1 – 2 | Polymerase moves 1 bp per nucleotide; nascent RNA leaves | Training, wet-lab methods |
| Transcriptomics | 2 – 3 | Capping, splicing (lariat), poly(A); a population of transcripts | CSIR–IHBT work; simulated RNA-seq figures |
| Translation | 3 – 4 | Export through a nuclear pore; ribosome assembly; tRNAs cycle A→P→E | Live codon read-out; research focus |
| Folding | 4 – 5 | Full chain released; illustrative folding into SGLT2 | Dissertation title |
| Structure | 5 – 6 | Interactive SGLT2 viewer (helices / Cα trace / binding site) | Dissertation methods, structure facts |
| Projects → Credentials | 6 (held) | Canvas covered and paused | Projects, experience, education, skills, credentials |
| Contact | 6 – 7 | Closing composition of the folded protein | Email, LinkedIn, CV |

### Architecture

```
app/                     layout (fonts, metadata), page composition, global styles, icon
components/
  Nav.tsx, StoryScroll.tsx   navigation; scroll → story-time binding (GSAP ScrollTrigger)
  ui.tsx                     shared presentational pieces
  sections/                  one file per page section (server components where possible)
  figures/                   simulated transcriptomics figures (SVG)
  molecular/                 reusable builders: DNA, macromolecular surfaces, RNA strands
  scenes/                    complete scenes (world layout, transcription, transcriptome,
                             nuclear pore, translation, protein, dust) + the React stage host
lib/
  engine/                    renderer lifecycle, camera director, particle materials, paths, quality
  story/                     chapters/story time, molecular timeline, shared store, 3D labels
  science/                   genetic code, schematic gene, structure helpers, seeded simulations
  assets.ts                  asset URL helper (see "Moving assets to object storage")
data/profile.ts              all CV-derived content
data/raw/pdb7vsi.ent.gz      original wwPDB file (CC0)
public/data/sglt2-7vsi.json  processed structure used by the site
scripts/build-structure.mjs  PDB → JSON converter
tests/                       unit tests (Vitest)
```

Key decisions:

- **One WebGL canvas, one world.** A fixed full-viewport canvas renders a single continuous molecular world. Every scene reads one scalar, *story time*, derived from native scroll position, so the camera, molecules and labels stay in step. There is no scroll hijacking and no GSAP pinning; the only "sticky" elements are two CSS-sticky panels (codon read-out, viewer controls).
- **Vanilla three.js with custom shaders** instead of React Three Fiber: the scene graph is updated imperatively from story time, so React never re-renders while scrolling. Particles are drawn either as lit sphere impostors ("beads", with stochastic transparency so fading beads still depth-sort) or as additive glow sprites.
- **Deterministic procedural geometry.** Seeded random numbers make every visit identical.
- **Progressive start-up.** The engine and three.js load in a separate chunk after the page's `load` event and an idle period. Only the hero DNA is built before the first frame. Other scenes are built in idle slices, or immediately if the visitor jumps ahead. Structure data is fetched last.
- **Render only when useful.** Rendering stops when the tab is hidden, when the canvas is off screen or covered by the light sections, and, with reduced motion, whenever nothing changes. The pixel ratio is capped (2 high / 1.5 low) and lowered automatically if frames are slow.

### Accessibility

- All content is server-rendered HTML and fully readable without JavaScript or WebGL. Without WebGL, an SVG helix replaces the canvas and the codon read-out shows in full.
- `prefers-reduced-motion` and the **Pause motion** button stop camera movement, idle rotation and particle drift. The scene then shows a stable, resolved state for each chapter.
- Keyboard: skip link, visible focus styles, an accessible tab pattern for the figures, a radio group for viewer modes, and arrow-key rotation of the protein. Drag-to-rotate is mouse/pen only, so touch scrolling is never trapped.
- The 3D canvas is `aria-hidden`; its stage has a text description, and the structure section includes a full text description (method, resolution, contact residues, citation).

## Scientific accuracy and provenance

What is **real data**:

- **Structure**: PDB **7VSI**, cryo-EM structure of human SGLT2–MAP17 with empagliflozin, 2.95 Å. Niu Y, Liu R, Guan C, Zhang Y, Chen Z, Hoerer S, Nar H, Chen L. *Structural basis of inhibition of the human SGLT2–MAP17 glucose transporter.* **Nature 601, 280–284 (2022)**. doi:[10.1038/s41586-021-04212-9](https://doi.org/10.1038/s41586-021-04212-9). The file was obtained from the wwPDB archive snapshot on AWS Open Data (`pdbsnapshots`, 2024-01-01). wwPDB data are available under **CC0 1.0**.
- **Cα coordinates, helix records, SEQRES, ligand atoms**: read directly from that file by `scripts/build-structure.mjs`.
- **Binding-site residues**: computed by the script as SGLT2 residues with any heavy atom within 4.5 Å of empagliflozin (24 residues). This is a distance cut-off, not an interaction analysis, and the site says so.
- **Translation read-out residues**: the first 14 residues of SGLT2 (UniProt P31639), matching the SEQRES of 7VSI chain A. A unit test enforces this.

What is **schematic or illustrative**, and labelled as such on the page:

- The DNA sequence and the gene (exon/intron lengths, UTRs) are schematic. They are internally consistent: the pre-mRNA equals the coding strand over the transcribed region, introns use canonical GU…AG splice sites, and the ORF encodes the SGLT2 N-terminus. The codons are one valid choice per residue, **not** the native *SLC5A2* mRNA. Unit tests enforce all of this.
- RNA polymerase, ribosome and nuclear pore are schematic shells, not atomic models. Molecules are **not to scale**.
- The transcriptome population (copy numbers, isoforms, ncRNAs) is illustrative.
- The heatmap, volcano plot and coverage/splice-junction figures use **simulated** data from fixed seeds. They are badged "Simulated data" and are not results from any project.
- The folding path is an illustrative interpolation (helices form, then pack N→C), **not** a folding simulation. The page notes that SGLT2 is inserted into the ER membrane co-translationally, which is not shown. Residues 1–20 and 575–640 are unresolved in 7VSI and fade out.

Order of events (binding → elongation → processing → export → small subunit → large subunit → elongation → folding) is checked by `tests/story.test.ts`.

### Regenerating the structure data

```bash
npm run build:structure   # data/raw/pdb7vsi.ent.gz → public/data/sglt2-7vsi.json
```

## Verification

Checks run for this version:

- `npm run check`: TypeScript, ESLint, and 19 Vitest tests (genetic code, gene consistency, structure parsing, timeline order, story-time mapping, determinism).
- `npm run build`: the route `/` prerenders as static content.
- Headless Chromium (Playwright) at 320, 360, 390, 430, 768, 1024, 1280, 1440 and 1920 px wide: no horizontal overflow and no console errors while scrolling the whole page.
- Viewer modes, drag rotation, nav jumps, skills filter/search, mobile menu (incl. Escape), resize/orientation change, reduced motion (static frames), WebGL disabled (fallback).
- Lighthouse 12.8 on the production build: Accessibility 100, Best Practices 100, SEO 100 (mobile and desktop). Performance ≈ 62–67, with desktop LCP 0.7 s and mobile LCP 3.4 s. The main remaining cost is WebGL start-up (blocking time 1.3–2.6 s across runs). The test machine had no GPU and rendered WebGL in software (SwiftShader), so these numbers are likely pessimistic for real devices. They have not been measured on real phones.

## Deployment (Vercel)

The project is a standard Next.js 16 App Router app with no environment variables, server secrets, or local absolute paths. On Vercel, import the repository and keep the defaults (framework preset Next.js, `npm run build`). See [Vercel's Next.js docs](https://vercel.com/docs/frameworks/full-stack/nextjs).

### Moving assets to object storage (optional, later)

Large files are referenced through `assetUrl()` (`lib/assets.ts`). To serve them from a bucket such as Cloudflare R2 with a public custom domain:

1. Upload the same paths (e.g. `data/sglt2-7vsi.json`).
2. Allow this site's origin in the bucket's CORS policy.
3. Set `NEXT_PUBLIC_ASSET_BASE_URL=https://assets.example.com` at build time.

Nothing currently depends on R2; with the variable unset, everything is served from `public/`.

## Known limitations

- Performance has only been measured with software WebGL in a headless browser, not on real mobile devices.
- The transcriptomics figures are explanatory simulations. Real figures from the IHBT work can replace them once they can be shared.
- Hit compounds and results from the dissertation are not shown because they are not in the CV.
- `npm audit` reports advisories in ESLint tooling dependencies (dev-only; not shipped to the browser).
