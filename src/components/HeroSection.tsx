import { ArrowDownCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

const HeroSection = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100); // slight delay for effect
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
          {/* Animated Text */}
          <div className={`md:w-1/2 ${isLoaded ? 'animate-slide-fade' : ''}`}>
            <h2 className="text-xl font-mono mb-2 text-neon-cyan">Hi, I’m</h2>
            <h1 className="text-4xl md:text-6xl font-bold mb-2">
              <span className="gradient-text">K S INDRA KUMAR</span>
            </h1>
            <h3 className="text-lg md:text-2xl text-gray-400 mb-6">
              Aspiring Software Developer | Java & Web Enthusiast
            </h3>
            <p className="text-lg md:text-xl mb-4 text-gray-300 max-w-lg">
              I’m a final-year AIML student passionate about <strong>Java development</strong> 
              and <strong>web technologies</strong>. Skilled in <strong>Java, HTML, CSS</strong>, with experience 
              in <strong>Hibernate</strong> and <strong>PostgreSQL</strong>. I enjoy exploring <strong>AI tools </strong>  
              to make my work smarter, faster, and more impactful. Always eager to learn, build, and collaborate 
              on ideas that create real-world value.
            </p>
            {/* Skills List */}
            <div className="mb-8">
              <h4 className="font-semibold text-neon-cyan mb-2">Skills:</h4>
              <ul className="flex flex-wrap gap-2 text-gray-200 text-base">
                <li className="bg-gray-800 px-3 py-1 rounded-full">Java</li>
                <li className="bg-gray-800 px-3 py-1 rounded-full">C</li>
                <li className="bg-gray-800 px-3 py-1 rounded-full">DSA</li>
                <li className="bg-gray-800 px-3 py-1 rounded-full">Hibernate</li>
                <li className="bg-gray-800 px-3 py-1 rounded-full">HTML</li>
                <li className="bg-gray-800 px-3 py-1 rounded-full">CSS (Intermediate)</li>
                <li className="bg-gray-800 px-3 py-1 rounded-full">SQL</li>
                <li className="bg-gray-800 px-3 py-1 rounded-full">PostgreSQL</li>
                <li className="bg-gray-800 px-3 py-1 rounded-full">Python (Intermediate)</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-4">
              <a href="#projects" className="btn-neon">See My Work</a>
              <a href="#contact" className="px-6 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 rounded-md transition-colors">
                Let’s Connect
              </a>
              <a
                href="/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black rounded-md transition-colors"
              >
                View Resume
              </a>
            </div>
          </div>
          {/* Animated Avatar */}
          <div className={`md:w-1/2 flex justify-center ${isLoaded ? 'animate-slide-fade' : ''}`}>
            <div className="relative w-72 h-72 md:w-96 md:h-96">
              {/* Avatar Container */}
              <div className="absolute inset-0 flex items-center justify-center animate-float">
                <div className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-gradient-to-br from-neon-blue to-neon-purple p-1">
                  <div className="w-full h-full rounded-full glass flex items-center justify-center overflow-hidden">
                    {/* Placeholder Avatar */}
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