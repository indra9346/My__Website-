import { ArrowDownCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

const HeroSection = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 50);
  }, []);

  return (
    <section
      id="home"
      className="min-h-screen flex flex-col justify-center relative overflow-hidden px-4 sm:px-6 lg:px-12 pb-16"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-900/20 to-transparent"></div>
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.png')] bg-repeat opacity-10"></div>
      {/* Animated particles/circles */}
      <div className="absolute top-20 left-10 w-48 sm:w-64 h-48 sm:h-64 bg-neon-blue/20 rounded-full filter blur-3xl animate-float"></div>
      <div
        className="absolute bottom-10 right-10 w-72 sm:w-96 h-72 sm:h-96 bg-neon-purple/20 rounded-full filter blur-3xl animate-float"
        style={{ animationDelay: '2s' }}
      ></div>

      <div className="container mx-auto z-10">
        <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-12 md:gap-20 pt-16 sm:pt-20">
         
          {/* Profile Photo Avatar - Professional Static Glow */}
          <div
            className={`md:w-1/2 flex justify-center mt-10 md:mt-0 ${
              isLoaded ? 'animate-slide-fade' : ''
            }`}
          >
            <div className="relative w-52 h-52 sm:w-64 sm:h-64 md:w-80 md:h-80 group">
              {/* Outer glow effect */}
              <div 
                className="absolute -inset-1 rounded-full opacity-75 blur-md"
                style={{
                  background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #22d3ee 100%)',
                }}
              />
              {/* Gradient border ring */}
              <div 
                className="absolute inset-0 rounded-full p-[3px]"
                style={{
                  background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #22d3ee 100%)',
                }}
              >
                {/* Inner dark background */}
                <div className="w-full h-full rounded-full bg-gray-900 overflow-hidden">
                  <img
                    src="/mypic.jpg"
                    alt="K S Indra Kumar"
                    className="w-full h-full object-cover object-top rounded-full transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </div>
            </div>
          </div>
         
          {/* Animated Text */}
          <div
            className={`md:w-1/2 text-center ${
              isLoaded ? 'animate-slide-fade' : ''
            } max-w-2xl lg:max-w-3xl space-y-3 sm:space-y-4 md:space-y-6`}
          >
            <h1 className="text-xl sm:text-3xl font-bold leading-tight">
              <span className="gradient-text">K S INDRA KUMAR</span>
            </h1>
            <h3 className="text-sm sm:text-lg text-gray-400 leading-snug font-semibold">
              Aspiring Software Developer
            </h3>
            <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto leading-relaxed px-1 sm:px-0">
              Java development and web technologies. Skilled in{' '}
              <strong className="text-foreground">Java, HTML, CSS</strong>, with experience in <strong className="text-foreground">Hibernate</strong> and <strong className="text-foreground">PostgreSQL</strong>. I enjoy exploring <strong className="text-foreground">AI tools</strong> to make my work smarter, faster, and more impactful. Always eager to learn, build, and collaborate on ideas that create real-world value.
            </p>

            {/* Skills List */}
            <div className="pt-2">
              <h4 className="font-semibold text-neon-cyan mb-2">Skills:</h4>
              <ul className="flex flex-wrap gap-2 justify-center text-gray-200 text-xs sm:text-sm">
                <li className="bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700/50">Java</li>
                <li className="bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700/50">C</li>
                <li className="bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700/50">DSA</li>
                <li className="bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700/50">Hibernate</li>
                <li className="bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700/50">HTML</li>
                <li className="bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700/50">CSS (Intermediate)</li>
                <li className="bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700/50">SQL</li>
                <li className="bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700/50">PostgreSQL</li>
                <li className="bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700/50">Python (Intermediate)</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 pt-4">
              <a
                href="#projects"
                className="inline-block px-6 py-3 rounded-lg font-semibold tracking-wide text-sm sm:text-base transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(90deg, #00C9FF 0%, #92FE9D 100%)',
                  color: '#1f2937',
                  boxShadow: '0 0 10px rgba(0, 201, 255, 0.5), 0 0 20px rgba(146, 254, 157, 0.3)'
                }}
              >
                See My Work
              </a>

              <a
                href="#contact"
                className="inline-block px-6 py-3 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 rounded-lg transition-colors text-sm sm:text-base"
              >
                Let's Connect
              </a>

              <a
                href="/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black rounded-lg transition-colors text-sm sm:text-base"
              >
                View Resume
              </a>
            </div>

          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-bounce z-20">
        <a href="#about" aria-label="Scroll down">
          <ArrowDownCircle
            className="text-gray-400 hover:text-neon-cyan transition-colors"
            size={28}
          />
        </a>
      </div>
    </section>
  );
};

export default HeroSection;
