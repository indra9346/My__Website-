import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { FaGithub, FaLinkedin, FaEnvelope } from 'react-icons/fa';

const NavBar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navItems = [
    { name: 'Home', href: '#home' },
    { name: 'About Me', href: '#about' },
    { name: 'Work', href: '#projects' },
    { name: 'Skills', href: '#skills' },
    { name: 'Contact', href: '#contact' }
  ];
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header 
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? 'py-2 glass' : 'py-4 bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* Branding with Name */}
        <a href="#home" className="text-lg font-bold gradient-text tracking-wide">
          K S INDRA KUMAR
          <span className="block text-xs text-gray-400">Aspiring Software Developer</span>
        </a>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <a 
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-gray-300 hover:text-neon-cyan transition-colors relative group"
            >
              {item.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-neon-cyan transition-all duration-300 group-hover:w-full"></span>
            </a>
          ))}

          {/* Resume Button */}
          <a href="/resume.pdf" target="_blank" rel="noopener noreferrer">
            <Button className="btn-neon">Resume</Button>
          </a>

          {/* Social Links */}
          <a href="https://github.com/indra9346" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white text-xl">
            <FaGithub />
          </a>
          <a href="https://www.linkedin.com/in/k-s-indra-kumar-7049b1289" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white text-xl">
            <FaLinkedin />
          </a>
          <a href="mailto:ik9893344@gmail.com" className="text-gray-300 hover:text-white text-xl">
            <FaEnvelope />
          </a>
        </nav>
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-gray-300 hover:text-white"
          onClick={toggleMobileMenu}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full glass py-4 px-6 shadow-lg">
          <nav className="flex flex-col space-y-4">
            {navItems.map((item) => (
              <a 
                key={item.name}
                href={item.href}
                className="text-base font-medium text-gray-300 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
            <a href="/resume.pdf" target="_blank" rel="noopener noreferrer">
              <Button className="btn-neon w-full">Resume</Button>
            </a>

            {/* Social Links (Mobile) */}
            <div className="flex space-x-6 pt-2">
              <a href="https://github.com/indra9346" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white text-xl">
                <FaGithub />
              </a>
              <a href="https://www.linkedin.com/in/k-s-indra-kumar-7049b1289" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white text-xl">
                <FaLinkedin />
              </a>
              <a href="mailto:ik9893344@gmail.com" className="text-gray-300 hover:text-white text-xl">
                <FaEnvelope />
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default NavBar;
