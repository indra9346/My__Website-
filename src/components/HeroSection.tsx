
import { ArrowDownCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

const HeroSection = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <section id="home" className="min-h-screen flex flex-col justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-900/20 to-transparent"></div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.png')] bg-repeat opacity-20"></div>
      
      {/* Animated particles/circles */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-neon-blue/20 rounded-full filter blur-3xl animate-float"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-neon-purple/20 rounded-full filter blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      
      <div className="container mx-auto px-4 z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className={`md:w-1/2 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h2 className="text-xl font-mono mb-2 text-neon-cyan">Hello, I'm</h2>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="gradient-text">Student Developer</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 text-gray-300 max-w-lg">
              Building innovative web experiences with cutting-edge technology. 
              Focused on clean code and creative solutions.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <a href="#projects" className="btn-neon">View My Projects</a>
              <a href="#contact" className="px-6 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 rounded-md transition-colors">
                Contact Me
              </a>
            </div>
          </div>
          
          <div className={`md:w-1/2 flex justify-center transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="relative w-72 h-72 md:w-96 md:h-96">
              {/* 3D Model/Avatar Container */}
              <div className="absolute inset-0 flex items-center justify-center animate-float">
                <div className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple p-1">
                  <div className="w-full h-full rounded-full glass flex items-center justify-center overflow-hidden">
                    {/* This would be replaced with an actual 3D model/avatar */}
                    <div className="text-9xl animate-spin-slow">⚡</div>
                  </div>
                </div>
              </div>
              
              {/* Orbital rings */}
              <div className="absolute inset-0 border-2 border-dashed border-neon-blue/30 rounded-full animate-spin-slow"></div>
              <div className="absolute inset-4 border-2 border-dashed border-neon-purple/30 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '12s' }}></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
        <a href="#about" aria-label="Scroll down">
          <ArrowDownCircle className="text-gray-400 hover:text-neon-cyan transition-colors" size={32} />
        </a>
      </div>
    </section>
  );
};

export default HeroSection;
