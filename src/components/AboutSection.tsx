import { Github, Linkedin, Cloud } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import myPhoto from '../assets/myphoto.jpg';

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
            <div className="relative">
              <motion.div
                className="relative w-64 h-64 mx-auto overflow-hidden rounded-xl"
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.3 }}
              >
                {/* Animated border glow */}
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-blue opacity-70 blur-sm animate-glow" />
                <div className="relative w-full h-full rounded-xl border-2 border-neon-cyan/50 overflow-hidden shadow-[0_0_20px_rgba(3,233,244,0.3)]">
                  <img src={myPhoto} alt="Indra Kumar" className="w-full h-full object-cover object-top" />
                </div>
              </motion.div>
              {/* Decorative corners */}
              <motion.div
                className="absolute top-[-15px] right-[-15px] w-32 h-32 border-t-2 border-r-2 border-neon-purple"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.5, duration: 0.5 }}
              />
              <motion.div
                className="absolute bottom-[-15px] left-[-15px] w-32 h-32 border-b-2 border-l-2 border-neon-blue"
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
            <h3 className="text-2xl font-bold mb-4">Student Developer & Tech Enthusiast</h3>
            <div className="space-y-4 text-gray-300">
              <p>
                Hey! I'm <strong>Indra Kumar</strong>, currently in my <strong>4th year</strong> of B.E. in
                <strong> Artificial Intelligence & Machine Learning</strong>. Over the years, I've found myself drawn towards
                building things that are not only functional but also meaningful.
              </p>
              <p>
                I've got a strong hold on <strong>Java</strong> and <strong>HTML</strong>, I'm pretty comfortable with <strong>CSS</strong>,
                and I've also worked with <strong>Hibernate</strong> and <strong>PostgreSQL</strong> for handling backend and database stuff.
              </p>
              <p>
                Even though my branch is AIML, what excites me the most is exploring <strong>AI tools</strong> and figuring out how
                to make them part of my workflow. I love the idea of using AI to make tasks faster, smarter, and more efficient.
              </p>
              <p>
                Outside of coding, I enjoy exploring new technologies, experimenting with AI tools, and working on ideas that could genuinely help people or industries in some way.
              </p>

              {/* Quick Facts with stagger */}
              <motion.div
                className="pt-4"
                variants={containerVariants}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
              >
                <h4 className="text-lg font-semibold mb-2">Quick Facts:</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    'Based in India',
                    'Final Year B.E. AIML Student',
                    'Skilled in Java, Hibernate & PostgreSQL',
                    'Exploring AI Tools & Real-world Applications',
                  ].map((fact, i) => (
                    <motion.li
                      key={i}
                      variants={staggerItem}
                      className="flex items-center"
                    >
                      <span className="text-neon-cyan mr-2">▹</span>
                      <span>{fact}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>
            <motion.a
              href="#contact"
              className="btn-neon inline-block mt-8"
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(3,233,244,0.4)' }}
              whileTap={{ scale: 0.95 }}
            >
              Get In Touch
            </motion.a>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default AboutSection;
