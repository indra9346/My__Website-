import { Github, Linkedin } from 'lucide-react';
import { useEffect, useState } from 'react';
import myPhoto from '../assets/myphoto.jpg'; // <-- Import your photo

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
                <img
                  src={myPhoto}
                  alt="Indra Kumar"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Decorative elements */}
              <div className="absolute top-[-15px] right-[-15px] w-32 h-32 border-t-2 border-r-2 border-neon-purple"></div>
              <div className="absolute bottom-[-15px] left-[-15px] w-32 h-32 border-b-2 border-l-2 border-neon-blue"></div>
            </div>
            {/* Social links */}
            <div className="flex justify-center mt-8 space-x-4">
              <a
                href="https://github.com/indra9346"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-700 text-gray-400 hover:text-neon-cyan hover:border-neon-cyan transition-colors"
                aria-label="GitHub"
              >
                <Github size={20} />
              </a>
              <a
                href="https://www.linkedin.com/in/k-s-indra-kumar-7049b1289"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-700 text-gray-400 hover:text-neon-cyan hover:border-neon-cyan transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={20} />
              </a>
            </div>
          </div>
          <div className={`md:w-3/5 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100' : 'opacity-0 translate-x-[20px]'}`}>
            <h3 className="text-2xl font-bold mb-4">Student Developer & Tech Enthusiast</h3>
            <div className="space-y-4 text-gray-300">
              <p>
                Hey! I’m <strong>Indra Kumar</strong>, currently in my <strong>4th year </strong> of B.E. in 
                <strong>Artificial Intelligence & Machine Learning</strong>. Over the years, I’ve found myself drawn towards 
                building things that are not only functional but also meaningful.
              </p>
              <p>
                I’ve got a strong hold on <strong>Java</strong> and <strong>HTML</strong>, I’m pretty comfortable with <strong>CSS</strong>, 
                and I’ve also worked with <strong>Hibernate</strong> and <strong>PostgreSQL</strong> for handling backend and database stuff.
              </p>
              <p>
                Even though my branch is AIML, what excites me the most is exploring <strong>AI tools</strong> and figuring out how 
                to make them part of my workflow. I love the idea of using AI to make tasks faster, smarter, and more efficient—almost 
                like having an extra pair of hands while working on projects.
              </p>
              <p>
                Outside of coding, I enjoy exploring new technologies, experimenting with AI tools, and working on ideas that could genuinely help people or industries in some way. I believe every small step in learning and experimenting adds up to something bigger.
              </p>
              <div className="pt-4">
                <h4 className="text-lg font-semibold mb-2">Quick Facts:</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <li className="flex items-center">
                    <span className="text-neon-cyan mr-2">▹</span> 
                    <span>Based in India</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-neon-cyan mr-2">▹</span> 
                    <span>Final Year B.E. AIML Student</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-neon-cyan mr-2">▹</span> 
                    <span>Skilled in Java, Hibernate & PostgreSQL</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-neon-cyan mr-2">▹</span> 
                    <span>Exploring AI Tools & Real-world Applications</span>
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