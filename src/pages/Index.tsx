import { useEffect } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import HeroSection from "../components/HeroSection";
import AboutSection from "../components/AboutSection";
import ProjectsSection from "../components/ProjectsSection";
import SkillsSection from "../components/SkillsSection";
import ContactSection from "../components/ContactSection";
import Footer from "../components/Footer";
import { initAdminUser } from "../utils/initAdminUser"; // <-- changed from "@/utils/initAdminUser"

const Index = () => {
  useEffect(() => {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href') || '');
        if (target) {
          window.scrollTo({
            top: target.getBoundingClientRect().top + window.pageYOffset - 80, // Offset for navbar
            behavior: 'smooth'
          });
        }
      });
    });
    
    // Initialize admin user
    initAdminUser();
    
    // Clean up event listeners
    return () => {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.removeEventListener('click', function () {});
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <HeroSection />
      <AboutSection />
      <ProjectsSection />
      <SkillsSection />
      <ContactSection />
      <Footer />
      
      {/* Admin link (only visible in development) */}
      <div className="fixed bottom-4 right-4 z-50">
        <Link 
          to="/admin" 
          className="glass text-xs px-3 py-1 rounded-full opacity-50 hover:opacity-100 transition-opacity"
        >
          Admin
        </Link>
      </div>
    </div>
  );
};

export default Index;
