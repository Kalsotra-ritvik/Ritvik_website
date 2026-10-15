import type { ChapterId } from "@/lib/story/chapters";
import type { DocumentSectionId, SiteContent, StorySectionId } from "@/lib/content/schema";
import { STORY_SECTIONS } from "@/lib/content/schema";
import { resolveAsset } from "@/lib/content/public";
import Nav, { type NavItem } from "@/components/Nav";
import StoryScroll from "@/components/StoryScroll";
import MolecularStage from "@/components/scenes/MolecularStage";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Foundations from "@/components/sections/Foundations";
import Transcriptome from "@/components/sections/Transcriptome";
import Export from "@/components/sections/Export";
import Translation from "@/components/sections/Translation";
import Folding from "@/components/sections/Folding";
import Structure from "@/components/sections/Structure";
import Projects from "@/components/sections/Projects";
import Experience from "@/components/sections/Experience";
import Skills from "@/components/sections/Skills";
import Credentials from "@/components/sections/Credentials";
import Contact from "@/components/sections/Contact";

const num = (n: number) => String(n).padStart(2, "0");

/**
 * The complete public page for a given content snapshot. Story chapters keep
 * their fixed biological order; document sections follow the configured order.
 */
export default function Portfolio({ content, banner }: { content: SiteContent; banner?: React.ReactNode }) {
  const { sections } = content;
  const documents = sections.documentOrder.filter((id) => sections.documentVisible[id] && hasContent(content, id));
  const story: StorySectionId[] = [...STORY_SECTIONS];
  const order: ChapterId[] = [...story, ...documents, "contact"];
  // Section numbers encode the reading sequence (the hero is unnumbered).
  const index = (id: ChapterId) => num(order.indexOf(id));
  const navItems: NavItem[] = sections.nav.filter((n) => n.visible && order.includes(n.target)).map((n) => ({ target: n.target, label: n.label }));
  const cvAsset = resolveAsset(content.profile.cv.asset, content.media);
  const cv = cvAsset ? { url: cvAsset.url, fileName: content.profile.cv.fileName, label: content.profile.cv.label } : null;

  const doc = (id: DocumentSectionId) => {
    switch (id) {
      case "projects":
        return <Projects key={id} content={content} index={index(id)} />;
      case "experience":
        return <Experience key={id} content={content} index={index(id)} />;
      case "skills":
        return <Skills key={id} groups={content.skillGroups} heading={sections.headings.skills} index={index(id)} />;
      case "credentials":
        return <Credentials key={id} content={content} index={index(id)} />;
    }
  };

  return (
    <>
      <a href="#about" className="sr-only z-[60] rounded-md bg-amber-300 px-4 py-2 text-ink-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      {banner}
      <AccentStyle accent={content.visual.colors.accent} />
      <MolecularStage visual={content.visual} labels={content.labels} />
      <Nav items={navItems} order={order} name={content.profile.name} cv={cv} />
      <main id="content">
        <Hero content={content} />
        <About content={content} index={index("about")} />
        <Foundations content={content} index={index("foundations")} />
        <Transcriptome content={content} index={index("transcriptome")} />
        <Export content={content} index={index("export")} />
        <Translation content={content} index={index("translation")} />
        <Folding content={content} index={index("folding")} />
        <Structure content={content} index={index("structure")} />
        {documents.map(doc)}
        <Contact content={content} index={index("contact")} />
      </main>
      <StoryScroll />
    </>
  );
}

function hasContent(content: SiteContent, id: DocumentSectionId) {
  switch (id) {
    case "projects":
      return content.projects.length > 0;
    case "experience":
      return content.experience.length > 0 || content.education.length > 0;
    case "skills":
      return content.skillGroups.some((g) => g.items.some((i) => i.visible));
    case "credentials":
      return content.credentials.length > 0;
  }
}

/** Accent colour from the visual settings (validated as #rrggbb, so safe to inline). */
function AccentStyle({ accent }: { accent: string }) {
  if (!/^#[0-9a-fA-F]{6}$/.test(accent) || accent.toLowerCase() === "#f0c27a") return null;
  const n = parseInt(accent.slice(1), 16);
  const darker = [16, 8, 0].map((shift) => Math.round(((n >> shift) & 255) * 0.88));
  const hover = `#${darker.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  return <style>{`:root{--color-amber-300:${accent};--color-amber-400:${hover}}`}</style>;
}
