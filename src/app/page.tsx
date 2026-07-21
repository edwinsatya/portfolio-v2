import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { NovaStage } from "@/components/nova/NovaStage";
import { BootSequence } from "@/components/nova/BootSequence";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Skills } from "@/components/sections/Skills";
import { Projects } from "@/components/sections/Projects";
import { Experience } from "@/components/sections/Experience";
import { Services } from "@/components/sections/Services";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Experience />
        <Services />
        <Contact />
      </main>
      <Footer />
      {/* Fixed layer above the page — NOVA, her speech bubble, and the chat. */}
      <NovaStage />
      <BootSequence />
    </>
  );
}
