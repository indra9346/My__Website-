
import { Github, Linkedin, Twitter } from 'lucide-react';
import { useEffect, useState } from 'react';

const AboutSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    
    const section = document.getElementById('about');
    if (section) observer.observe(section);
    
    return () => {
      if (section) observer.unobserve(section);
    };
  }, []);

  return (
    <section id="about" className="py-24 min-h-screen flex items-center">
      <div className="container mx-auto px-4">
        <h2 className="section-title">About Me</h2>
        
        <div className="flex flex-col md:flex-row gap-10 mt-10">
          <div className={`md:w-2/5 transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0 translate-x-[-20px]'}`}>
            <div className="relative">
              {/* Profile image with neon border effect */}
              <div className="relative w-64 h-64 mx-auto overflow-hidden rounded-xl border-2 border-neon-cyan shadow-[0_0_15px_rgba(3,233,244,0.3)]">
                {/* This would be replaced with your actual profile photo */}
                <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center text-6xl">
                  👨‍💻
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute top-[-15px] right-[-15px] w-32 h-32 border-t-2 border-r-2 border-neon-purple"></div>
              <div className="absolute bottom-[-15px] left-[-15px] w-32 h-32 border-b-2 border-l-2 border-neon-blue"></div>
            </div>
            
            {/* Social links */}
            <div className="flex justify-center mt-8 space-x-4">
              <a href="#" className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-700 text-gray-400 hover:text-neon-cyan hover:border-neon-cyan transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-700 text-gray-400 hover:text-neon-cyan hover:border-neon-cyan transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-700 text-gray-400 hover:text-neon-cyan hover:border-neon-cyan transition-colors">
                <Twitter size={20} />
              </a>
            </div>
          </div>
          
          <div className={`md:w-3/5 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100' : 'opacity-0 translate-x-[20px]'}`}>
            <h3 className="text-2xl font-bold mb-4">Student Developer & Tech Enthusiast</h3>
            
            <div className="space-y-4 text-gray-300">
              <p>
                Hey there! I'm a passionate student developer with a focus on creating intuitive and visually appealing web applications. Currently pursuing my degree in Computer Science, I'm constantly exploring new technologies and methodologies.
              </p>
              
              <p>
                My journey in programming began when I was 15, tinkering with HTML and CSS to build simple websites. Since then, I've expanded my skill set to include modern frameworks and languages that enable me to create more complex applications.
              </p>
              
              <p>
                When I'm not coding, you can find me playing chess, hiking in nature, or diving into a good sci-fi novel. I believe that diverse interests fuel creativity in problem-solving.
              </p>
              
              <div className="pt-4">
                <h4 className="text-lg font-semibold mb-2">Quick Facts:</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <li className="flex items-center">
                    <span className="text-neon-cyan mr-2">▹</span> 
                    <span>Based in San Francisco, CA</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-neon-cyan mr-2">▹</span> 
                    <span>CS Student at Tech University</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-neon-cyan mr-2">▹</span> 
                    <span>Intern at Future Tech Co.</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-neon-cyan mr-2">▹</span> 
                    <span>Open Source Contributor</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <a href="#contact" className="btn-neon inline-block mt-8">Get In Touch</a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
