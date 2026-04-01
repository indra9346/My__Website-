import { useState, useEffect, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import { FaGithub, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import { motion } from 'framer-motion';
import MobileNavOverlay from './nav/MobileNavOverlay';

const NavBar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [pendingSectionId, setPendingSectionId] = useState<string | null>(null);

  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;

    const offset = 80;
    const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const scrollY = window.scrollY;

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen || !pendingSectionId) return;

    const nextSectionId = pendingSectionId;
    setPendingSectionId(null);

    requestAnimationFrame(() => {
      scrollToSection(nextSectionId);
    });
  }, [isMobileMenuOpen, pendingSectionId, scrollToSection]);

  const handleMobileNavSelect = useCallback((sectionId: string) => {
    setPendingSectionId(sectionId);
    setIsMobileMenuOpen(false);
  }, []);

  const navItems = [
    { name: 'Home', href: '#home' },
    { name: 'About Me', href: '#about' },
    { name: 'Work', href: '#projects' },
    { name: 'Skills', href: '#skills' },
    { name: 'Contact', href: '#contact' },
  ];

  const socialLinks = [
    { href: 'https://github.com/indra9346', icon: <FaGithub />, label: 'GitHub' },
    { href: 'https://www.linkedin.com/in/k-s-indra-kumar-7049b1289', icon: <FaLinkedin />, label: 'LinkedIn' },
    { href: 'mailto:ik9893344@gmail.com', icon: <FaEnvelope />, label: 'Email' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // Active section detection
      const sections = ['home', 'about', 'projects', 'skills', 'contact'];
      for (const id of sections.reverse()) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 150) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.header
        className={`fixed w-full z-50 transition-all duration-500 ${
          isScrolled
            ? 'py-2 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-black/20'
            : 'py-4 bg-transparent'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Branding */}
          <motion.a
            href="#home"
            className="text-lg font-bold gradient-text tracking-wide"
            onClick={(event) => {
              event.preventDefault();
              setIsMobileMenuOpen(false);
              scrollToSection('home');
            }}
            whileHover={{ scale: 1.03 }}
          >
            K S INDRA KUMAR
            <span className="block text-xs text-muted-foreground">Aspiring Software Developer</span>
          </motion.a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => {
              const sectionId = item.href.replace('#', '');
              const isActive = activeSection === sectionId;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-medium transition-colors relative group ${
                    isActive ? 'text-neon-cyan' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.name}
                  <span
                    className={`absolute -bottom-1 left-0 h-0.5 bg-neon-cyan transition-all duration-300 ${
                      isActive ? 'w-full' : 'w-0 group-hover:w-full'
                    }`}
                  />
                </a>
              );
            })}

            {/* Resume Buttons */}
            <div className="flex items-center space-x-2">
              <motion.a
                href="/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-md font-medium text-sm border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all"
                whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(3,233,244,0.4)' }}
                whileTap={{ scale: 0.95 }}
              >
                View Resume
              </motion.a>
              <motion.a
                href="/resume.pdf"
                download="K_S_Indra_Kumar_Resume.pdf"
                className="px-4 py-2 rounded-md font-medium text-sm bg-neon-purple text-white hover:bg-neon-purple/80 transition-all"
                whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(123,44,191,0.4)' }}
                whileTap={{ scale: 0.95 }}
              >
                Download Resume
              </motion.a>
            </div>

            {/* Social Links */}
            {socialLinks.map((s) => (
              <motion.a
                key={s.label}
                href={s.href}
                target={s.href.startsWith('mailto') ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-xl"
                whileHover={{ scale: 1.2, y: -2 }}
              >
                {s.icon}
              </motion.a>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.header>

      <MobileNavOverlay
        isOpen={isMobileMenuOpen}
        activeSection={activeSection}
        navItems={navItems}
        socialLinks={socialLinks}
        onClose={() => setIsMobileMenuOpen(false)}
        onSectionSelect={handleMobileNavSelect}
      />
    </>
  );
};

export default NavBar;
