import { ArrowDownCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

const HeroSection = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Shorter timeout for fast loading feel
    setTimeout(() => setIsLoaded(true), 50); 
  }, []);

  return (
    <section
      id="home"
      // Added padding-bottom to ensure content isn't cut off on small screens
      className="min-h-screen flex flex-col justify-center relative overflow-hidden px-4 sm:px-6 lg:px-12 pb-16" 
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-900/20 to-transparent"></div>
      {/* Grid pattern overlay - Reduced opacity for a more subtle dark feel */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.png')] bg-repeat opacity-10"></div> 
      {/* Animated particles/circles */}
      <div className="absolute top-20 left-10 w-48 sm:w-64 h-48 sm:h-64 bg-neon-blue/20 rounded-full filter blur-3xl animate-float"></div>
      <div
        className="absolute bottom-10 right-10 w-72 sm:w-96 h-72 sm:h-96 bg-neon-purple/20 rounded-full filter blur-3xl animate-float"
        style={{ animationDelay: '2s' }}
      ></div>

      <div className="container mx-auto z-10">
        {/* Changed flex-row to flex-col-reverse on mobile to put the image below the text, matching the screenshot */}
        <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-12 md:gap-20 pt-16 sm:pt-20"> 
          
          {/* Profile Photo Avatar (Appears below text on mobile due to flex-col-reverse) */}
          <div
            className={`md:w-1/2 flex justify-center mt-10 md:mt-0 ${
              isLoaded ? 'animate-slide-fade' : ''
            }`}
          >
            {/* Adjusted size to match the screenshot better */}
            <div className="relative w-40 h-40 sm:w-52 sm:h-52 md:w-72 md:h-72"> 
              <div className="absolute inset-0 flex items-center justify-center animate-float">
                {/* Neon Pulse Glow */}
                <div className="w-full h-full rounded-full bg-gradient-to-br from-neon-blue to-neon-purple p-1 animate-pulse-glow">
                  {/* Used a solid dark color instead of 'glass' for more contrast, matching the screenshot */}
                  <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden"> 
                    <img
                      // NOTE: Ensure your image is correctly named or update the source path
                      src="/myphoto.jpg" 
                      alt="K S Indra Kumar"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>
              </div>
              {/* Orbital rings */}
              <div className="absolute inset-0 border border-dashed border-neon-blue/30 rounded-full animate-spin-slow"></div> 
              <div
                className="absolute inset-2 border border-dashed border-neon-purple/30 rounded-full animate-spin-slow"
                style={{ animationDirection: 'reverse', animationDuration: '12s' }}
              ></div>
            </div>
          </div>
          
          {/* Animated Text (Appears above image on mobile) */}
          <div
            // Kept text-center for mobile to match the screenshot
            className={`md:w-1/2 text-center ${ 
              isLoaded ? 'animate-slide-fade' : ''
            } max-w-2xl lg:max-w-3xl space-y-3 sm:space-y-4 md:space-y-6`} 
          >
            {/* Removed "Hi, I'm" and tagline to match the screenshot's primary content */}
            <h1 className="text-xl sm:text-3xl font-bold leading-tight"> 
              <span className="gradient-text">K S INDRA KUMAR</span>
            </h1>
            <h3 className="text-sm sm:text-lg text-gray-400 leading-snug font-semibold"> 
              Aspiring Software Developer
            </h3>
            {/* Updated the paragraph content to exactly match the screenshot */}
            <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto leading-relaxed px-1 sm:px-0">
              Java development and web technologies. Skilled in {' '}
              **Java, HTML, CSS**, with experience in **Hibernate** and **PostgreSQL**. I enjoy exploring **AI tools** to make my work smarter, faster, and more impactful. Always eager to learn, build, and collaborate on ideas that create real-world value.
            </p>

            {/* Skills List - Wrapped in a dark container for better definition */}
            <div className="pt-2"> 
              <h4 className="font-semibold text-neon-cyan mb-2">Skills:</h4>
              <ul className="flex flex-wrap gap-2 justify-center text-gray-200 text-xs sm:text-sm">
                {/* Applied styling to match the dark, rounded skill tags in the screenshot */}
                <li className="bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700/50">Java</li> 
                <li className="bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700/50">C</li>
                <li className="bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700/50">DSA</li>
                <li className="bg-gray-800/80 px-3 py-1 rounded-full">Hibernate</li>
                <li className="bg-gray-800/80 px-3 py-1 rounded-full">HTML</li>
                <li className="bg-gray-800/80 px-3 py-1 rounded-full">CSS (Intermediate)</li>
                <li className="bg-gray-800/80 px-3 py-1 rounded-full">SQL</li>
                <li className="bg-gray-800/80 px-3 py-1 rounded-full">PostgreSQL</li>
                <li className="bg-gray-800/80 px-3 py-1 rounded-full">Python (Intermediate)</li>
              </ul>
            </div>

            {/* Action Buttons - Stacked on mobile (full width) to match the screenshot */}
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 pt-4"> 
                {/* SEE MY WORK - Primary Button (Using inline style to replicate the bright glow/gradient) */}
                <a 
                  href="#projects" 
                  // w-full on mobile, sm:w-auto on desktop
                  className="w-full sm:w-auto text-center px-6 py-3 rounded-lg font-semibold tracking-wide text-sm sm:text-base transition-shadow" 
                  style={{ 
                      // Custom gradient that looks like the bright button in the screenshot
                      background: 'linear-gradient(90deg, #00C9FF 0%, #92FE9D 100%)', 
                      color: '#1f2937', // Dark text on bright button
                      boxShadow: '0 0 10px rgba(0, 201, 255, 0.5), 0 0 20px rgba(146, 254, 157, 0.3)'
                  }}
                  >
                  See My Work
                </a>
                
                {/* LET'S CONNECT - Secondary Button (Matching the subtle outline style) */}
                <a
                  href="#contact"
                  className="w-full sm:w-auto text-center px-6 py-3 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 rounded-lg transition-colors text-sm sm:text-base"
                >
                  Let’s Connect
                </a>

                {/* VIEW RESUME - Tertiary Button (Matching the neon outline style) */}
                <a
                  href="/resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto text-center px-6 py-3 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black rounded-lg transition-colors text-sm sm:text-base"
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