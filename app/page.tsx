import Nav from "@/components/Nav";
import StoryScroll from "@/components/StoryScroll";
import MolecularStage from "@/components/scenes/MolecularStage";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Foundations from "@/components/sections/Foundations";
import Transcriptome from "@/components/sections/Transcriptome";
import Translation from "@/components/sections/Translation";
import Folding from "@/components/sections/Folding";
import Structure from "@/components/sections/Structure";
import Projects from "@/components/sections/Projects";
import Experience from "@/components/sections/Experience";
import Skills from "@/components/sections/Skills";
import Credentials from "@/components/sections/Credentials";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <a href="#about" className="sr-only z-[60] rounded-md bg-amber-300 px-4 py-2 text-ink-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <MolecularStage />
      <Nav />
      <main id="content">
        <Hero />
        <About />
        <Foundations />
        <Transcriptome />
        <Translation />
        <Folding />
        <Structure />
        <Projects />
        <Experience />
        <Skills />
        <Credentials />
        <Contact />
      </main>
      <StoryScroll />
    </>
  );
}
