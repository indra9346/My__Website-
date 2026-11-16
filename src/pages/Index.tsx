import { useEffect } from "react";
import NavBar from "../components/NavBar";
import HeroSection from "../components/HeroSection";
import AboutSection from "../components/AboutSection";
import ProjectsSection from "../components/ProjectsSection";
import SkillsSection from "../components/SkillsSection";
import ContactSection from "../components/ContactSection";
import Footer from "../components/Footer";
import ParticlesBackground from "../components/ParticlesBackground";
import { smoothScrollToId } from "../lib/smoothScroll";
import "../styles/home.css";

const Index = () => {
  useEffect(() => {
    // Every in-page link (#about, #projects, ...) travels with the same smooth scroll.
    // Links that already handled their own click (the project-group cards) are left alone.
    const handleClick = (e: Event) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href?.startsWith('#') || href.length < 2) return;
      e.preventDefault();
      smoothScrollToId(href.slice(1), { offset: 80 });
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      <ParticlesBackground />
      <NavBar />
      <HeroSection />
      <AboutSection />
      <ProjectsSection />
      <SkillsSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
