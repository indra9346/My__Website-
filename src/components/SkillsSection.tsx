
import { useEffect, useState } from 'react';

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

const SkillsSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'frontend' | 'backend' | 'other'>('all');
  
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
    
    const section = document.getElementById('skills');
    if (section) observer.observe(section);
    
    return () => {
      if (section) observer.unobserve(section);
    };
  }, []);

  const filteredSkills = activeCategory === 'all' 
    ? skills 
    : skills.filter(skill => skill.category === activeCategory);

  return (
    <section id="skills" className="py-24">
      <div className="container mx-auto px-4">
        <h2 className="section-title">Skills & Tech Stack</h2>
        <p className="text-gray-300 mb-8 max-w-2xl">
          The technologies, languages, and tools I work with to bring ideas to life.
        </p>
        
        {/* Category filters */}
        <div className="flex flex-wrap gap-3 mb-10">
          {['all', 'frontend', 'backend', 'other'].map((category) => (
            <button
              key={category}
              className={`px-4 py-2 rounded-full transition-all ${
                activeCategory === category 
                  ? 'bg-neon-cyan text-black' 
                  : 'bg-transparent border border-gray-700 text-gray-300 hover:border-neon-cyan hover:text-neon-cyan'
              }`}
              onClick={() => setActiveCategory(category as any)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
        
        {/* Skills grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSkills.map((skill, index) => (
            <div 
              key={skill.name}
              className={`glass p-6 rounded-lg transition-all duration-700 ${
                isVisible 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">{skill.name}</h3>
                <span className="text-sm text-neon-cyan">{skill.level}%</span>
              </div>
              
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-neon-blue to-neon-cyan transition-all duration-1000"
                  style={{ 
                    width: isVisible ? `${skill.level}%` : '0%'
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Tools and frameworks */}
        <div className={`mt-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h3 className="text-xl font-semibold mb-6">Tools & Frameworks I Love</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            {['Next.js', 'Figma', 'VS Code', 'GitHub','Hibernate', 'Firebase', 'Supabase'].map((tool) => (
              <div 
                key={tool} 
                className="glass px-6 py-3 rounded-full border border-gray-800 hover:border-neon-cyan hover:text-neon-cyan transition-colors"
              >
                {tool}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SkillsSection;
