import { useRef, useState, useEffect } from 'react';
import { motion, useInView, animate } from 'framer-motion';

interface Skill {
  name: string;
  level: number;
  category: 'frontend' | 'backend' | 'other';
}

const skills: Skill[] = [
  { name: 'JavaScript', level: 75, category: 'frontend' },
  { name: 'React', level: 75, category: 'frontend' },
  { name: 'TypeScript', level: 75, category: 'frontend' },
  { name: 'HTML/CSS', level: 75, category: 'frontend' },
  { name: 'Java', level: 80, category: 'backend' },
  { name: 'Express', level: 70, category: 'backend' },
  { name: 'PostgreSQL', level: 65, category: 'backend' },
  { name: 'MongoDB', level: 60, category: 'backend' },
  { name: 'Git', level: 60, category: 'other' },
  { name: 'UI/UX Design', level: 50, category: 'other' },
];

const CountUp = ({ target, isInView }: { target: number; isInView: boolean }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, target, {
      duration: 1.5,
      ease: 'easeOut',
      onUpdate: (v) => setCount(Math.round(v)),
    });
    return () => controls.stop();
  }, [isInView, target]);

  return <span>{count}%</span>;
};

const SkillsSection = () => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'frontend' | 'backend' | 'other'>('all');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const filteredSkills = activeCategory === 'all'
    ? skills
    : skills.filter(skill => skill.category === activeCategory);

  return (
    <section id="skills" className="py-24" ref={ref}>
      <div className="container mx-auto px-4">
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          Skills & Tech Stack
        </motion.h2>
        <motion.p
          className="text-gray-300 mb-8 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          The technologies, languages, and tools I work with to bring ideas to life.
        </motion.p>

        {/* Category filters */}
        <div className="flex flex-wrap gap-3 mb-10">
          {(['all', 'frontend', 'backend', 'other'] as const).map((category) => (
            <motion.button
              key={category}
              className={`px-4 py-2 rounded-full transition-all duration-300 ${
                activeCategory === category
                  ? 'bg-neon-cyan text-black shadow-[0_0_15px_rgba(3,233,244,0.3)]'
                  : 'bg-transparent border border-gray-700 text-gray-300 hover:border-neon-cyan hover:text-neon-cyan'
              }`}
              onClick={() => setActiveCategory(category)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </motion.button>
          ))}
        </div>

        {/* Skills grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          layout
        >
          {filteredSkills.map((skill, index) => (
            <motion.div
              key={skill.name}
              layout
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="glass p-6 rounded-lg hover:shadow-[0_0_20px_rgba(3,233,244,0.1)] hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">{skill.name}</h3>
                <span className="text-sm text-neon-cyan font-mono">
                  <CountUp target={skill.level} isInView={isInView} />
                </span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full skill-bar-glow"
                  style={{ background: 'linear-gradient(90deg, hsl(var(--primary)), #03e9f4)' }}
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${skill.level}%` } : { width: 0 }}
                  transition={{ duration: 1.2, delay: 0.3 + index * 0.08, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Tools section */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h3 className="text-xl font-semibold mb-6">Tools & Frameworks I Love</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {['Next.js', 'Figma', 'VS Code', 'GitHub', 'Hibernate', 'Firebase', 'Supabase'].map((tool, i) => (
              <motion.div
                key={tool}
                className="glass px-6 py-3 rounded-full border border-gray-800 hover:border-neon-cyan hover:text-neon-cyan hover:shadow-[0_0_15px_rgba(3,233,244,0.2)] transition-all duration-300 cursor-default tool-card"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.6 + i * 0.08, duration: 0.4 }}
                whileHover={{ y: -4, scale: 1.05 }}
              >
                {tool}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SkillsSection;
