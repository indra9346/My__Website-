
import { Github, Linkedin, Twitter, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="py-12 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <a href="#" className="text-xl font-bold gradient-text">
              <span className="font-mono">{'<'}</span>
              Future<span className="text-neon-cyan">Folio</span>
              <span className="font-mono">{'/>'}</span>
            </a>
            <p className="mt-2 text-gray-400 text-sm">
              A futuristic portfolio for the next generation
            </p>
          </div>
          
          <div className="flex space-x-8">
            <div>
              <h3 className="font-semibold mb-3">Navigation</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#home" className="hover:text-neon-cyan transition-colors">Home</a></li>
                <li><a href="#about" className="hover:text-neon-cyan transition-colors">About</a></li>
                <li><a href="#projects" className="hover:text-neon-cyan transition-colors">Projects</a></li>
                <li><a href="#skills" className="hover:text-neon-cyan transition-colors">Skills</a></li>
                <li><a href="#contact" className="hover:text-neon-cyan transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Connect</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-neon-cyan transition-colors">GitHub</a></li>
                <li><a href="#" className="hover:text-neon-cyan transition-colors">LinkedIn</a></li>
                <li><a href="#" className="hover:text-neon-cyan transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-neon-cyan transition-colors">Blog (Coming Soon)</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-6 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} Future Folio. All rights reserved.
          </p>
          
          <div className="flex items-center gap-4">
            <a href="#" className="text-gray-500 hover:text-neon-cyan transition-colors">
              <Github size={18} />
            </a>
            <a href="#" className="text-gray-500 hover:text-neon-cyan transition-colors">
              <Linkedin size={18} />
            </a>
            <a href="#" className="text-gray-500 hover:text-neon-cyan transition-colors">
              <Twitter size={18} />
            </a>
          </div>
        </div>
        
        <div className="mt-6 text-center text-gray-500 text-sm flex items-center justify-center">
          <span>Built with</span>
          <Heart size={14} className="mx-1 text-neon-pink" />
          <span>using React & Tailwind</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
