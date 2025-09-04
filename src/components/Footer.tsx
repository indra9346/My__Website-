import { Github, Linkedin, Twitter, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="py-10 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          
          {/* Left side - Name & tagline */}
          <div className="mb-6 md:mb-0 text-center md:text-left">
            <h2 className="text-xl font-bold gradient-text">K S INDRA KUMAR</h2>
            <p className="mt-1 text-gray-400 text-sm">
              Aspiring Software Developer | Java & Web Enthusiast
            </p>
          </div>

          {/* Right side - Social Links */}
          <div className="flex gap-6">
            <a 
              href="https://github.com/indra9346" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gray-400 hover:text-neon-cyan transition-colors"
            >
              <Github size={20} />
            </a>
            <a 
              href="https://www.linkedin.com/in/k-s-indra-kumar-7049b1289" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gray-400 hover:text-neon-cyan transition-colors"
            >
              <Linkedin size={20} />
            </a>
           
          </div>
        </div>

        {/* Bottom text */}
        <div className="mt-8 text-center text-gray-500 text-sm flex items-center justify-center">
          <span>© {new Date().getFullYear()} | Crafted with</span>
          <Heart size={14} className="mx-1 text-neon-pink" />
          <span>by Indra Kumar</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
