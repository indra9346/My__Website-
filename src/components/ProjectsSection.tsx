
import { Github, ExternalLink, Code } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Project {
  id: number;
  title: string;
  description: string;
  image: string;
  tags: string[];
  github: string;
  demo: string;
}

const projects: Project[] = [
  {
    id: 1,
    title: "Smart Todo App",
    description: "A productivity application with AI-powered task prioritization, built with React and TensorFlow.js for task analysis.",
    image: "todo-app.jpg",
    tags: ["React", "TensorFlow.js", "Firebase", "Tailwind CSS"],
    github: "#",
    demo: "#"
  },
  {
    id: 2,
    title: "Weather Dashboard",
    description: "Interactive weather visualization tool that displays forecasts, historical data, and climate patterns using D3.js and the OpenWeather API.",
    image: "weather-app.jpg",
    tags: ["JavaScript", "D3.js", "API Integration", "SVG Animation"],
    github: "#",
    demo: "#"
  },
  {
    id: 3,
    title: "Virtual Study Room",
    description: "A collaborative space for students to study together virtually with shared whiteboards, timers, and chat functionality.",
    image: "study-room.jpg",
    tags: ["Next.js", "Socket.io", "WebRTC", "MongoDB"],
    github: "#",
    demo: "#"
  },
];

const ProjectsSection = () => {
  const [visibleProjects, setVisibleProjects] = useState<number[]>([]);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = Number(entry.target.getAttribute('data-project-id'));
            if (id && !visibleProjects.includes(id)) {
              setVisibleProjects(prev => [...prev, id]);
            }
          }
        });
      },
      { threshold: 0.2 }
    );
    
    const projectElements = document.querySelectorAll('.project-card');
    projectElements.forEach(el => observer.observe(el));
    
    return () => {
      projectElements.forEach(el => observer.unobserve(el));
    };
  }, [visibleProjects]);

  return (
    <section id="projects" className="py-24 bg-black/30">
      <div className="container mx-auto px-4">
        <h2 className="section-title">Projects</h2>
        <p className="text-gray-300 mb-12 max-w-2xl">
          Explore some of my recent work. Each project is a unique challenge that I approached with creativity and technical precision.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <div 
              key={project.id}
              data-project-id={project.id}
              className={`project-card card-3d glass p-5 rounded-xl transition-all duration-700 ${
                visibleProjects.includes(project.id) ? 'opacity-100' : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="relative h-48 mb-4 overflow-hidden rounded-lg group">
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10 opacity-70 group-hover:opacity-90 transition-opacity"></div>
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center text-4xl">
                  {/* Placeholder for project image */}
                  <Code size={48} className="text-neon-cyan" />
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                  <h3 className="text-xl font-bold text-white">{project.title}</h3>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-300 text-sm">{project.description}</p>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {project.tags.map((tag, index) => (
                  <span key={index} className="text-xs font-mono px-2 py-1 rounded-full bg-neon-blue/20 text-neon-blue">
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="flex justify-between mt-auto">
                <a 
                  href={project.github}
                  className="text-gray-400 hover:text-neon-cyan transition-colors" 
                  aria-label="GitHub repository"
                >
                  <Github size={20} />
                </a>
                <a 
                  href={project.demo}
                  className="text-gray-400 hover:text-neon-cyan transition-colors" 
                  aria-label="Live demo"
                >
                  <ExternalLink size={20} />
                </a>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <a href="#" className="btn-neon">
            View All Projects
          </a>
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;
