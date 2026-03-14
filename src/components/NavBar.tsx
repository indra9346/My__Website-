import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { FaGithub, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

const NavBar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const navItems = [
    { name: 'Home', href: '#home' },
    { name: 'About Me', href: '#about' },
    { name: 'Work', href: '#projects' },
    { name: 'Skills', href: '#skills' },
    { name: 'Contact', href: '#contact' },
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

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
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
          {[
            { href: 'https://github.com/indra9346', icon: <FaGithub /> },
            { href: 'https://www.linkedin.com/in/k-s-indra-kumar-7049b1289', icon: <FaLinkedin /> },
            { href: 'mailto:ik9893344@gmail.com', icon: <FaEnvelope /> },
          ].map((s, i) => (
            <motion.a
              key={i}
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
        <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="md:hidden absolute top-full left-0 w-full bg-background border-b border-border py-4 px-6 shadow-xl z-50"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => {
                const sectionId = item.href.replace('#', '');
                const isActive = activeSection === sectionId;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`text-base font-medium ${isActive ? 'text-neon-cyan' : 'text-muted-foreground'}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </a>
                );
              })}
              <div className="flex flex-col space-y-2">
                <a href="/resume.pdf" target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 rounded-md font-medium text-sm text-center border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all">
                  View Resume
                </a>
                <a href="/resume.pdf" download="K_S_Indra_Kumar_Resume.pdf"
                  className="px-4 py-2 rounded-md font-medium text-sm text-center bg-neon-purple text-white hover:bg-neon-purple/80 transition-all">
                  Download Resume
                </a>
              </div>
              <div className="flex space-x-6 pt-2">
                <a href="https://github.com/indra9346" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground text-xl"><FaGithub /></a>
                <a href="https://www.linkedin.com/in/k-s-indra-kumar-7049b1289" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground text-xl"><FaLinkedin /></a>
                <a href="mailto:ik9893344@gmail.com" className="text-muted-foreground hover:text-foreground text-xl"><FaEnvelope /></a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default NavBar;
