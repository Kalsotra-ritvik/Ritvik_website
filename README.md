# Ritvik Kalsotra — From sequence to structure

An interactive research portfolio built as one continuous, scroll-driven molecular story:

**DNA → transcription → RNA processing → transcriptome → export → translation → polypeptide → folded protein → structural insight**

The protein the story arrives at is human **SGLT2**, the target of Ritvik's M.Sc. dissertation, drawn from its experimentally determined structure (PDB [7VSI](https://www.rcsb.org/structure/7VSI)). All personal content comes from the supplied CV.

---

## Quick start

Requirements: **Node.js ≥ 20.9**, npm, and **PostgreSQL** (14 or newer) for the admin dashboard.

```bash
npm ci
cp .env.example .env.local   # then set DATABASE_URL (and SITE_URL)
npm run db:migrate           # create the tables
npm run db:seed              # import the current portfolio content (safe to re-run)
npm run admin:create         # one-time: create the first administrator (prompts for ID and password)
npm run dev                  # http://localhost:3000 — admin at http://localhost:3000/admin/login
```

Without `DATABASE_URL` the public site still works and shows the built-in default content; the admin explains what is missing.

| Command | What it does |
|---|---|
| `npm run check` | TypeScript, ESLint and the Vitest suite |
| `npm test` | Unit tests; database tests run when `TEST_DATABASE_URL` points at a **disposable** database |
| `npm run test:e2e` | Playwright: builds, seeds `TEST_DATABASE_URL`, creates a throwaway admin, tests login/CRUD/publish/draft privacy |
| `npm run build` / `npm run start` | Production build / server |
| `npm run build:structure`, `npm run build:ribosome` | Regenerate the molecular data from the wwPDB files |
| `npm run build:worker` | Bundle the molecular-surface Web Worker into `public/workers/` (runs automatically before `dev` and `build`) |

> If a production build ever serves stale styles after large edits, run `rm -rf .next` and rebuild.

## Administration

### Signing in

- Login page: **`/admin/login`**. There is no public registration and no link to the admin from the public site; `/admin` is `noindex`, disallowed in `robots.txt` and cannot be framed.
- Create the first administrator once with `npm run admin:create` from a machine that can reach the database. It refuses to run if an administrator already exists. It prompts for the ID and password (input hidden). For automation, `ADMIN_LOGIN_ID` and `ADMIN_PASSWORD` can be supplied **for that single command only**, for example from a password manager; never store them in `.env` files or the repository. No default account exists.
- **Change the password** in the admin under *Account & security* (requires the current password; signs out every other session).
- **Lost password:** run `npm run admin:reset-password` with access to the database. There is deliberately no email reset, because the site has no mail service.

### Security model

- Passwords are hashed with **Argon2id** (19 MiB, 2 iterations), never stored or logged in plain text.
- Sessions are server-side rows in PostgreSQL. The browser holds a random 256-bit token in an **HttpOnly, SameSite=Lax** cookie (`__Host-` prefixed and **Secure** in production); the database stores only its SHA-256. Sessions end after 7 days of inactivity or 30 days in total, on sign-out, and when the password changes. Signing in replaces any previous session token.
- Failed sign-ins are throttled per administrator ID (5 per 15 minutes) and per IP address (20 per 15 minutes), with a 15-minute lock. Unknown IDs and wrong passwords get the same message and take the same time.
- Every admin page, Server Action and API route checks the session against the database itself (`lib/auth/dal.ts`); `proxy.ts` only does an early redirect when no cookie is present. Server Actions are protected against cross-site requests by Next.js's Origin check; API routes check the Origin header explicitly.
- Content is validated with Zod schemas on the server. Text fields support a tiny markup (`*italic*`, `**bold**`, `[link](https://…)`) that is rendered as React elements, never as HTML; links are restricted to `http(s)`, `mailto`, site paths and anchors.
- Uploads are identified from their bytes (not the file name or browser type). SVG, HTML and unknown formats are rejected; size limits apply per type; files are served with `nosniff` and a sandboxing CSP.

### What can be edited

| Admin page | Contents |
|---|---|
| Profile & hero | Name, positioning, hero text and buttons, summary, research interests, key facts, dissertation, contact details, profile links, profile image, CV file |
| Projects | Create, edit, duplicate, reorder, show/hide, publish/unpublish, delete (to trash); title, slug, category, status, dates, summary, objective, background, methods, workflow, tools, contribution, results, datasets, notes, links, card image, media gallery, featured flag |
| Experience, Education | Full records with dates, organisation, description, responsibilities, methods, tools, links, documents |
| Skills | Groups and individual skills: rename, reorder, hide |
| Publications & credentials | Publications, posters, presentations, conferences, certificates, workshops, awards; DOI, links, documents |
| Scientific text | Every chapter title, explanation and scene note of the molecular story |
| Scene annotations | Text of every label in the 3D scenes |
| Figures | Captions, axis labels and the simulated-data badge/notice |
| Navigation & sections | Nav links, order and visibility of the portfolio sections, section headings. The scientific story (DNA → … → structure) keeps its biological order |
| Contact, footer & SEO | Site title/description, Open Graph text and image, favicon, contact section, footer and data attribution |
| Visual settings | DNA/RNA/ribosome styles, default protein view, lighting, camera framing, glow, motion, scroll response, particle density, scene toggles, annotation visibility, colours; *Reset to defaults*. Only predefined, validated settings — no code or shader editing |
| Media library | Upload, preview, title and alt text, copy URL, replace in place (keeps every reference), delete (blocked while the file is used) |
| Revision history, Trash | Every save/publish/delete is recorded; restore any earlier version as a draft; restore deleted items |

### Drafts, preview and publishing

Every item has a **draft** and a **published** version. *Save draft* never changes the public site. *Preview* opens the site with your drafts in a new tab (Next.js Draft Mode, only honoured together with a valid admin session). *Publish* copies the draft to the published version and refreshes the public page cache immediately (`updateTag`). Concurrent edits are detected with a version number: if the item changed elsewhere, the save is refused with a *Reload the latest version* option. The editor warns before leaving a page with unsaved changes.

## Deployment (Vercel)

1. Create a PostgreSQL database (e.g. via the Vercel Marketplace: Neon or Supabase) and set **`DATABASE_URL`** in the project's environment variables. Use the pooled connection string if offered.
2. Set **`SITE_URL`**.
3. Deploy. The `vercel-build` script runs `db:migrate` before `next build`.
4. From your machine, once: `DATABASE_URL=<production url> npm run db:seed` and `DATABASE_URL=<production url> npm run admin:create`.
5. **Media uploads on Vercel need Cloudflare R2** (the serverless filesystem is not persistent, so local storage is refused there). Until R2 is configured, text editing and publishing work and the media library says that uploads are disabled. To enable: create a bucket with a public custom domain, an API token with read/write access to it, set `STORAGE_DRIVER=r2` and the five `R2_*` variables, and allow `PUT` from your site's origin in the bucket's CORS policy (files larger than ~4 MB are uploaded directly from the browser with a presigned URL and verified by the server afterwards).

See `.env.example` for every variable. None of them is needed in the browser, and none uses the `NEXT_PUBLIC_` prefix except the optional asset CDN URL.

## How the experience works

| Page section | Story time `t` | What the 3D scene shows | Content |
|---|---|---|---|
| Hero | 0 – 0.5 | B-form DNA double helix | Name, positioning, CV |
| About | 0.5 – 1 | RNA polymerase binds; transcription bubble opens | CV summary, key facts |
| Transcription | 1 – 2 | Polymerase moves 1 bp per nucleotide; nascent RNA leaves | Training, wet-lab methods |
| Transcriptomics | 2 – 2.85 | Capping, splicing (lariat), poly(A); a population of transcripts | CSIR–IHBT work; simulated RNA-seq figures |
| Export | 2.85 – 3.3 | Mature mRNA leaves through a nuclear pore | Export explanation |
| Translation | 3.3 – 4 | Ribosome (human 80S model) assembles; tRNAs cycle A→P→E | Live codon read-out; research focus |
| Folding | 4 – 5 | Full chain released; illustrative folding into SGLT2 | Dissertation title |
| Structure | 5 – 6 | Interactive SGLT2 viewer: cartoon, backbone, surface, beads, binding site | Dissertation methods, structure facts |
| Projects → Credentials | 6 (held) | Canvas covered and paused | Projects, experience, education, skills, credentials |
| Contact | 6 – 7 | Closing composition of the folded protein | Email, LinkedIn, CV |

### Architecture

```
app/
  page.tsx                   public page: published content (cached, tag "site-content"); drafts only in admin preview
  admin/                     /admin/login, dashboard, editors, media, history, trash, account; Server Actions
  api/admin/media/           upload endpoints (server upload, R2 presign + verify)
  media/[...key]/            serves files of the local storage driver
proxy.ts                     early redirect to the login page when no session cookie is present
components/
  Portfolio.tsx              renders the whole public page from a SiteContent object
  sections/, figures/        page sections and simulated transcriptomics figures
  admin/                     schema-driven editor, media library, pickers, unsaved-change guard
  molecular/                 DNA (beads / smooth), RNA strands, surfaces, PBR mesh builders
  scenes/                    world layout and scenes (transcription, transcriptome, pore,
                             translation + 80S ribosome model, protein + 7VSI representations)
lib/
  db/                        Drizzle schema and PostgreSQL client
  auth/                      Argon2id passwords, DB sessions, throttling, data-access layer
  content/                   Zod schemas, defaults (the original CV content), service (drafts,
                             publishing, revisions, conflicts), public cached reader
  media/, storage/           upload validation; local and Cloudflare R2 storage adapters
  admin/forms.ts             editor definitions for every content section
  engine/, story/, science/  renderer, story time, molecular timeline, labels, science helpers
drizzle/                     SQL migrations
scripts/                     db:migrate, db:seed, admin:create, admin:reset-password, structure builders
tests/                       Vitest (unit + database integration), tests/e2e (Playwright)
```

Content model: each editable record is a row in `content_entries` with a draft and a published JSON document (validated by the Zod schema of its collection), a version number for conflict detection, and a soft-delete marker. `content_revisions` keeps every change. Media metadata lives in `media`; files live in storage, never in the database. Administrators, sessions and login attempts have their own tables.

Key decisions:

- **One WebGL canvas, one world.** A fixed full-viewport canvas renders a single continuous molecular world. Every scene reads one scalar, *story time*, derived from native scroll position, so the camera, molecules and labels stay in step. There is no scroll hijacking and no GSAP pinning; the only "sticky" elements are two CSS-sticky panels (codon read-out, viewer controls).
- **Vanilla three.js** instead of React Three Fiber: the scene graph is updated imperatively from story time, so React never re-renders while scrolling. Two kinds of rendering share one scene: custom-shader particles (lit sphere impostors and additive glow sprites, used for the animated processes) and physically based meshes (DNA tubes and base slabs, RNA tube, protein cartoon/surface/ball-and-stick, ribosome surfaces) lit by a room environment map with ACES tone mapping and sRGB output. The "Glow" setting scales the additive glow sprites; there is no full-screen bloom pass.
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
- **Binding-site residues**: computed by the script as SGLT2 residues with any heavy atom within 4.5 Å of empagliflozin (24 residues), drawn as sticks from their deposited atoms. This is a distance cut-off, not an interaction analysis, and the site says so.
- **Protein representations** of 7VSI: the cartoon is built from Cα positions (helices from the HELIX records as flat bands oriented by the local Cα curvature, loops as tubes); the backbone view is a tube through the Cα atoms; the surface is a Gaussian surface over every protein heavy atom (σ ≈ 1.5 Å), not a solvent-excluded surface.
- **Ribosome**: PDB **4UG0**, cryo-EM structure of the human 80S ribosome, 3.6 Å. Khatter et al., *Structure of the human 80S ribosome*, **Nature 520, 640 (2015)**, doi:[10.1038/nature14427](https://doi.org/10.1038/nature14427). Title, method, resolution and citation were read from the mmCIF file itself (wwPDB archive snapshot on AWS Open Data). CC0 1.0. Processed by `scripts/build-ribosome.mjs` into `public/data/ribosome-4ug0.json`; the 5.5 MB source file is downloaded on demand and not committed.
- **Translation read-out residues**: the first 14 residues of SGLT2 (UniProt P31639), matching the SEQRES of 7VSI chain A. A unit test enforces this.

What is **schematic or illustrative**, and labelled as such on the page:

- The DNA sequence and the gene (exon/intron lengths, UTRs) are schematic. They are internally consistent: the pre-mRNA equals the coding strand over the transcribed region, introns use canonical GU…AG splice sites, and the ORF encodes the SGLT2 N-terminus. The codons are one valid choice per residue, **not** the native *SLC5A2* mRNA. Unit tests enforce all of this.
- RNA polymerase and the nuclear pore are schematic shells, not atomic models. Molecules are **not to scale**.
- The **ribosome** is drawn from the deposited human 80S model, but simplified: one point per residue (rRNA phosphorus, protein Cα), a Gaussian surface per subunit, uniformly scaled down, aligned on the model's initiator tRNA and cut away. The tRNAs and mRNA moving through it are schematic. The *beads* ribosome style shows a schematic shell instead; if you select it, update the translation scene note, which describes the deposited model.
- The transcriptome population (copy numbers, isoforms, ncRNAs) is illustrative.
- The heatmap, volcano plot and coverage/splice-junction figures use **simulated** data from fixed seeds. They are badged "Simulated data" and are not results from any project.
- The folding path is an illustrative interpolation (helices form, then pack N→C), **not** a folding simulation. The page notes that SGLT2 is inserted into the ER membrane co-translationally, which is not shown. Residues 1–20 and 575–640 are unresolved in 7VSI and fade out.

Order of events (binding → elongation → processing → export → small subunit → large subunit → elongation → folding) is checked by `tests/story.test.ts`.

### Regenerating the structure data

```bash
npm run build:structure   # data/raw/pdb7vsi.ent.gz → public/data/sglt2-7vsi.json
npm run build:ribosome    # data/raw/4ug0.cif.gz (downloaded if missing) → public/data/ribosome-4ug0.json
```

## Verification

See the final section of this README (*Verification of the CMS and graphics upgrade*) for what was run for this version.

## Static assets

Optional: the molecular data files can be served from object storage. Large files are referenced through `assetUrl()` (`lib/assets.ts`). To serve them from a bucket such as Cloudflare R2 with a public custom domain:

1. Upload the same paths (e.g. `data/sglt2-7vsi.json`).
2. Allow this site's origin in the bucket's CORS policy.
3. Set `NEXT_PUBLIC_ASSET_BASE_URL=https://assets.example.com` at build time.

With the variable unset, everything is served from `public/`. (This is separate from media uploads, which use the `R2_*` server variables.)

## Known limitations

- **Cloudflare R2 was not tested against a real bucket.** The adapter (presigned uploads, verification, deletion) is implemented and its configuration checks are unit-tested, but no R2 credentials were available. Local-disk storage was tested end to end.
- **No production database was used.** Everything was tested against a local PostgreSQL 16 server; managed providers (Neon, Supabase) were not tried.
- After each publish, Next.js logs one *"Unexpected cache miss after cache warming phase"* warning while the home page regenerates. The page that is served is correct (verified by the end-to-end tests); the warning comes from the framework's revalidation of the cached content.
- The cartoon is derived from Cα positions and the HELIX records; it does not show β-strands as arrows (7VSI has none annotated) or compute secondary structure itself.
- Colour and style settings apply when the page loads; an open page does not repaint until it is reloaded.
- Performance has only been measured with software WebGL in a headless browser, not on real phones. The new meshes (molecular surface, ribosome) add start-up work, done in idle time before the viewer is reached.
- The transcriptomics figures are explanatory simulations. Real figures from the IHBT work can replace them once they can be shared.
- Hit compounds and results from the dissertation are not shown because they are not in the CV.
- `npm audit` reports advisories in ESLint tooling dependencies (dev-only; not shipped to the browser).

## Verification of the CMS and graphics upgrade

Run in the development container (Node 22, PostgreSQL 16, headless Chromium 140 with SwiftShader software WebGL, no GPU):

- `npm run typecheck` and `npm run lint`: no errors.
- `npm test`: **59 tests passed** across 8 files (including the marching-cubes surface) — passwords (Argon2id), session storage/expiry/invalidation, login throttling (database), content lifecycle (draft privacy, publish, unpublish, discard, conflicts, server validation, unique slugs, revisions and restore, trash, duplicate, reorder, publish-all, media references), upload validation (content sniffing, SVG/HTML rejection, structure files, safe keys), storage configuration (R2 required on Vercel, local refused there), markup rendering safety, schema/default/form consistency, label–chapter synchronisation, and the existing science and story-timeline tests.
- `npm run test:e2e`: **5 Playwright tests passed** against a production build and a freshly seeded test database — unauthenticated access, generic login errors, cookie flags (`__Host-`, HttpOnly, Secure, SameSite=Lax), sign-out, draft privacy (including a draft-mode cookie without a session), publish making content visible, password change ending other sessions.
- Manual browser checks: media upload (PNG and PDF accepted; SVG and HTML-as-PNG rejected), files served with `nosniff` and a sandbox CSP, delete blocked while a file is referenced, cross-origin upload request refused (403); every protein representation, the ribosome, smooth DNA and RNA inspected in screenshots.
- No horizontal overflow on the public site or the admin pages (dashboard, editors, media, history, trash, account) at 320, 360, 390, 430, 768, 1024, 1280, 1440 and 1920 px.
- Lighthouse 12.8 on the production home page (software WebGL): mobile — Performance 58, Accessibility 100, Best Practices 100, SEO 100 (LCP 3.6 s, TBT 8.2 s); desktop — Performance 62, Accessibility 100, Best Practices 100, SEO 100 (LCP 0.7 s, TBT 4.1 s). Before this upgrade the same setup measured Performance 62–67; the lit meshes cost start-up time, reduced by building surfaces in a Web Worker and deferring the environment map and DNA shaders until after the first frame. Not measured on real devices.
