import { ArrowDownCircle } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

const roles = [
  'Aspiring Software Developer',
  'Java Developer',
  'AI/ML Enthusiast',
  'Web Developer',
];

const HeroSection = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [roleIndex, setRoleIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 50);
  }, []);

  // Typing effect
  useEffect(() => {
    const currentRole = roles[roleIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (displayText.length < currentRole.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentRole.slice(0, displayText.length + 1));
        }, 80);
      } else {
        timeout = setTimeout(() => setIsDeleting(true), 2000);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 40);
      } else {
        setIsDeleting(false);
        setRoleIndex((prev) => (prev + 1) % roles.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, roleIndex]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
  };

  const skillBadgeVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      transition: { delay: 0.8 + i * 0.05, duration: 0.3 },
    }),
  };

  return (
    <section
      id="home"
      className="min-h-screen flex flex-col justify-center relative overflow-hidden px-4 sm:px-6 lg:px-12 pb-16"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 hero-gradient-bg" />
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.png')] bg-repeat opacity-10" />
      
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-neon-cyan/40"
          style={{
            top: `${15 + i * 15}%`,
            left: `${10 + i * 14}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Glowing orbs */}
      <motion.div
        className="absolute top-20 left-10 w-48 sm:w-64 h-48 sm:h-64 bg-neon-blue/20 rounded-full filter blur-3xl"
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-10 right-10 w-72 sm:w-96 h-72 sm:h-96 bg-neon-purple/20 rounded-full filter blur-3xl"
        animate={{ y: [0, 20, 0], x: [0, -15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      <div className="container mx-auto z-10">
        <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-12 md:gap-20 pt-16 sm:pt-20">
          
          {/* Profile Photo Avatar with floating + glowing border */}
          <motion.div
            className="md:w-1/2 flex justify-center mt-10 md:mt-0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isLoaded ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              className="relative w-52 h-52 sm:w-64 sm:h-64 md:w-80 md:h-80 group"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Animated rotating glow */}
              <motion.div
                className="absolute -inset-2 rounded-full opacity-60 blur-lg"
                style={{
                  background: 'conic-gradient(from 0deg, #a855f7, #6366f1, #22d3ee, #a855f7)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              />
              {/* Gradient border ring */}
              <div
                className="absolute inset-0 rounded-full p-[3px] animate-pulse-glow"
                style={{
                  background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #22d3ee 100%)',
                }}
              >
                <div className="w-full h-full rounded-full bg-gray-900 overflow-hidden">
                  <img
                    src="/mypic.jpg"
                    alt="K S Indra Kumar"
                    className="w-full h-full object-cover object-top rounded-full transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
              </div>
              {/* Reflection */}
              <div className="avatar-reflection" />
            </motion.div>
          </motion.div>
          
          {/* Animated Text */}
          <motion.div
            className="md:w-1/2 text-center max-w-2xl lg:max-w-3xl space-y-3 sm:space-y-4 md:space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate={isLoaded ? 'visible' : 'hidden'}
          >
            <motion.h1 variants={itemVariants} className="text-xl sm:text-3xl font-bold leading-tight">
              <span className="gradient-text">K S INDRA KUMAR</span>
            </motion.h1>

            {/* Typing animation */}
            <motion.h3
              variants={itemVariants}
              className="text-sm sm:text-lg text-neon-cyan leading-snug font-semibold font-mono h-7"
            >
              {displayText}
              <span className="inline-block w-0.5 h-5 bg-neon-cyan ml-1 animate-blink align-middle" />
            </motion.h3>

            <motion.p variants={itemVariants} className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto leading-relaxed px-1 sm:px-0">
              Java development and web technologies. Skilled in{' '}
              <strong className="text-foreground">Java, HTML, CSS</strong>, with experience in <strong className="text-foreground">Hibernate</strong> and <strong className="text-foreground">PostgreSQL</strong>. I enjoy exploring <strong className="text-foreground">AI tools</strong> to make my work smarter, faster, and more impactful.
            </motion.p>

            {/* Skills List */}
            <motion.div variants={itemVariants} className="pt-2">
              <h4 className="font-semibold text-neon-cyan mb-2">Skills:</h4>
              <ul className="flex flex-wrap gap-2 justify-center text-gray-200 text-xs sm:text-sm">
                {['Java', 'JavaScript', 'React', 'C', 'DSA', 'Hibernate', 'HTML', 'CSS (Intermediate)', 'SQL', 'PostgreSQL', 'Python (Intermediate)'].map((skill, i) => (
                  <motion.li
                    key={skill}
                    custom={i}
                    variants={skillBadgeVariants}
                    className="bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700/50 hover:border-neon-cyan/50 hover:bg-gray-700/60 transition-all duration-300"
                  >
                    {skill}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Action Buttons */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 pt-4">
              <motion.a
                href="#projects"
                className="text-center px-8 py-3 rounded-full font-semibold tracking-wide text-sm sm:text-base transition-all duration-300 hero-btn-primary"
                whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(0, 201, 255, 0.6), 0 0 50px rgba(146, 254, 157, 0.3)' }}
                whileTap={{ scale: 0.97 }}
              >
                See My Work
              </motion.a>

              <motion.a
                href="#contact"
                className="text-center px-8 py-3 rounded-full border border-gray-500/60 text-gray-300 hover:text-white hover:border-neon-cyan hover:bg-white/5 transition-all duration-300 text-sm sm:text-base"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                Let's Connect
              </motion.a>

              <motion.a
                href="/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-center px-8 py-3 rounded-full font-semibold tracking-wide text-sm sm:text-base transition-all duration-300 hero-btn-primary"
                whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(0, 201, 255, 0.6), 0 0 50px rgba(146, 254, 157, 0.3)' }}
                whileTap={{ scale: 0.97 }}
              >
                View Resume
              </motion.a>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <a href="#about" aria-label="Scroll down">
          <ArrowDownCircle className="text-gray-400 hover:text-neon-cyan transition-colors" size={28} />
        </a>
      </motion.div>
    </section>
  );
};

export default HeroSection;
