import { Github, Linkedin, Heart, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

const Footer = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAdmin(!!data.session?.user);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

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
        <div className="mt-8 text-center text-gray-500 text-sm flex items-center justify-center gap-4">
          <span className="flex items-center">
            <span>© {new Date().getFullYear()} | Crafted with</span>
            <Heart size={14} className="mx-1 text-neon-pink" />
            <span>by Indra Kumar</span>
          </span>
          {isAdmin && (
            <Link to="/admin" className="flex items-center gap-1 text-neon-cyan hover:text-neon-cyan/80 transition-colors">
              <Settings size={14} />
              <span>Admin</span>
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
