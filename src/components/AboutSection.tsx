import { Github, Linkedin, Cloud } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import myPhoto from '../assets/myphoto.jpg';
import RobotAssistant from './RobotAssistant';

const AboutSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15 } },
  };

  const slideLeft = {
    hidden: { opacity: 0, x: -60 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: 'easeOut' as const } },
  };

  const slideRight = {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: 'easeOut' as const } },
  };

  const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const socialLinks = [
    { href: 'https://github.com/indra9346', icon: Github, label: 'GitHub' },
    { href: 'https://www.linkedin.com/in/k-s-indra-kumar-7049b1289', icon: Linkedin, label: 'LinkedIn' },
    { href: 'https://www.cloudskillsboost.google/public_profiles/18bad5eb-bfc2-4f59-b0a9-2546e0d921bb', icon: Cloud, label: 'Google Cloud Skills Boost' },
  ];

  return (
    <section id="about" className="py-24 min-h-screen flex items-center">
      <motion.div
        ref={ref}
        className="container mx-auto px-4"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
      >
        <motion.h2 variants={staggerItem} className="section-title">About Me</motion.h2>
        <div className="flex flex-col md:flex-row gap-10 mt-10">
          {/* Image side */}
          <motion.div variants={slideLeft} className="md:w-2/5">
            <div className="relative overflow-hidden p-4">
              <motion.div
                className="relative w-64 h-64 mx-auto overflow-hidden rounded-xl"
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-blue opacity-70 blur-sm animate-glow" />
                <div className="relative w-full h-full rounded-xl border-2 border-neon-cyan/50 overflow-hidden shadow-[0_0_20px_rgba(3,233,244,0.3)]">
                  <img src={myPhoto} alt="Indra Kumar" className="w-full h-full object-cover object-top" />
                </div>
              </motion.div>
              <motion.div
                className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-neon-purple"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.5, duration: 0.5 }}
              />
              <motion.div
                className="absolute bottom-0 left-0 w-24 h-24 border-b-2 border-l-2 border-neon-blue"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.6, duration: 0.5 }}
              />
            </div>
            {/* Social links with bounce hover */}
            <div className="flex justify-center mt-8 space-x-4">
              {socialLinks.map((s, i) => (
                <motion.a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-700 text-muted-foreground hover:text-neon-cyan hover:border-neon-cyan hover:shadow-[0_0_15px_rgba(3,233,244,0.3)] transition-all duration-300"
                  aria-label={s.label}
                  whileHover={{ y: -4, scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
                >
                  <s.icon size={20} />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Text side */}
          <motion.div variants={slideRight} className="md:w-3/5">
            <h3 className="text-2xl font-bold mb-4 text-neon-cyan font-mono">Full-Stack Developer & AI Enthusiast</h3>
            <div className="space-y-4 text-gray-300">
              <p>
                Hi! I'm <strong>Indra Kumar</strong>, a <strong>B.E. graduate</strong> in <strong>Artificial Intelligence & Machine Learning</strong> with a passion for building modern, scalable, and user-friendly web applications. I enjoy turning ideas into practical solutions through clean code, thoughtful design, and continuous learning.
              </p>
              <p>
                I have hands-on experience developing end-to-end web applications using <strong>Java, React.js, JavaScript, HTML, CSS, Hibernate, PostgreSQL, and Supabase</strong>. From designing responsive user interfaces to building backend APIs and managing databases, I enjoy working across the full development lifecycle.
              </p>
              <p>
                Beyond web development, I'm passionate about <strong>Artificial Intelligence</strong> and regularly explore AI-powered tools and workflows to improve productivity, automate tasks, and build smarter applications. I believe AI is transforming software development, and I'm excited to be part of that journey.
              </p>
              <p>
                I'm always looking for opportunities to learn new technologies, solve real-world problems, and contribute to products that create meaningful impact.
              </p>

              {/* Quick Facts with stagger */}
              <motion.div
                className="pt-4"
                variants={containerVariants}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
              >
                <h4 className="text-lg font-semibold mb-3 font-mono text-neon-cyan">Quick Facts</h4>
                <ul className="grid grid-cols-1 gap-2.5">
                  {[
                    '📍 Based in India',
                    '🎓 B.E. Graduate in Artificial Intelligence & Machine Learning (2026)',
                    '💻 Full-Stack Developer',
                    '⚡ Java • React.js • JavaScript • HTML • CSS • Hibernate • PostgreSQL • Supabase',
                    '🤖 Interested in AI, Automation & Modern Web Technologies',
                    '🚀 Passionate about building scalable, user-focused applications',
                  ].map((fact, i) => (
                    <motion.li
                      key={i}
                      variants={staggerItem}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="text-neon-cyan mt-1 select-none">▹</span>
                      <span>{fact}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              {/* Get In Touch */}
              <div className="pt-4 space-y-2">
                <h4 className="text-lg font-semibold font-mono text-neon-cyan">Get In Touch</h4>
                <p className="text-sm">
                  I'm always open to discussing software development, AI, full-stack engineering, internships, and exciting opportunities. Feel free to reach out if you'd like to collaborate or connect.
                </p>
              </div>
            </div>
            <motion.a
              href="#contact"
              className="btn-neon inline-block mt-6"
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(3,233,244,0.4)' }}
              whileTap={{ scale: 0.95 }}
            >
              Get In Touch
            </motion.a>
          </motion.div>
        </div>

        {/* Education and AI Assistant Sub-section */}
        <div className="mt-20 pt-16 border-t border-gray-800 flex flex-col lg:flex-row gap-12 items-start">
          {/* Left Column: Robot Assistant */}
          <div className="w-full lg:w-5/12 flex flex-col items-center">
            <h3 className="text-xl font-mono text-neon-cyan mb-6 self-start flex items-center gap-2">
              <span className="text-neon-cyan">&lt;</span>
              AI Core Interface
              <span className="text-neon-cyan">/&gt;</span>
            </h3>
            <RobotAssistant />
          </div>

          {/* Right Column: High-tech Timeline */}
          <div className="w-full lg:w-7/12">
            <h3 className="text-xl font-mono text-neon-cyan mb-6 flex items-center gap-2">
              <span className="text-neon-cyan">&lt;</span>
              Academic Core Matrix
              <span className="text-neon-cyan">/&gt;</span>
            </h3>

            <div className="relative pl-6 border-l-2 border-dashed border-gray-800/80 space-y-10">
              {/* SJC Institute of Technology */}
              <div className="relative group">
                {/* Node circle */}
                <div className="absolute -left-[33px] top-1.5 w-4 h-4 rounded-full bg-gray-900 border-2 border-neon-cyan shadow-[0_0_10px_#03e9f4] group-hover:scale-125 transition-transform duration-300" />
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                  <div>
                    <h4 className="text-lg font-bold text-white group-hover:text-neon-cyan transition-colors duration-300">
                      SJC Institute of Technology
                    </h4>
                    <p className="text-sm font-mono text-gray-400 mt-1">
                      B.E. in Artificial Intelligence & Machine Learning
                    </p>
                  </div>
                  <div className="text-left md:text-right flex flex-col items-start md:items-end">
                    <span className="text-xs font-mono bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan px-2.5 py-0.5 rounded-full">
                      2026
                    </span>
                    <span className="text-xs font-mono text-gray-400 mt-1">
                      CGPA: 8.59
                    </span>
                  </div>
                </div>
              </div>

              {/* LRG Naidu JR. College */}
              <div className="relative group">
                {/* Node circle */}
                <div className="absolute -left-[33px] top-1.5 w-4 h-4 rounded-full bg-gray-900 border-2 border-neon-purple shadow-[0_0_10px_#7B2CBF] group-hover:scale-125 transition-transform duration-300" />
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                  <div>
                    <h4 className="text-lg font-bold text-white group-hover:text-neon-purple transition-colors duration-300">
                      LRG Naidu JR. College
                    </h4>
                    <p className="text-sm font-mono text-gray-400 mt-1">
                      PUC (Physics, Chemistry, Mathematics)
                    </p>
                  </div>
                  <div className="text-left md:text-right flex flex-col items-start md:items-end">
                    <span className="text-xs font-mono bg-neon-purple/10 border border-neon-purple/20 text-neon-purple px-2.5 py-0.5 rounded-full">
                      2022
                    </span>
                    <span className="text-xs font-mono text-gray-400 mt-1">
                      Score: 85.3%
                    </span>
                  </div>
                </div>
              </div>

              {/* LRG Vidyalayam */}
              <div className="relative group">
                {/* Node circle */}
                <div className="absolute -left-[33px] top-1.5 w-4 h-4 rounded-full bg-gray-900 border-2 border-neon-blue shadow-[0_0_10px_#5B8FB9] group-hover:scale-125 transition-transform duration-300" />
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                  <div>
                    <h4 className="text-lg font-bold text-white group-hover:text-neon-blue transition-colors duration-300">
                      LRG Vidyalayam (EM)
                    </h4>
                    <p className="text-sm font-mono text-gray-400 mt-1">
                      SSLC (Secondary School Leaving Certificate)
                    </p>
                  </div>
                  <div className="text-left md:text-right flex flex-col items-start md:items-end">
                    <span className="text-xs font-mono bg-neon-blue/10 border border-neon-blue/20 text-neon-blue px-2.5 py-0.5 rounded-full">
                      2020
                    </span>
                    <span className="text-xs font-mono text-gray-400 mt-1">
                      Score: 78.5%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default AboutSection;
