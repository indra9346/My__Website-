"use client";

import { Github, ExternalLink, Code } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useInView } from "framer-motion";
import PromoBanner from "./PromoBanner";
import {
  COMPANY_CATEGORY,
  PROJECTS_QUERY_KEY,
  Project,
  fetchProjects,
  groupProjectsByCategory,
  groupProjectsByCompany,
} from "@/lib/projects";

const ProjectCard = ({ project, index }: { project: Project; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -10, y: x * 10 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
      className="group"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: 'transform 0.15s ease-out',
      }}
    >
      <div className="glass p-5 rounded-xl transition-all duration-500 hover:shadow-[0_0_30px_rgba(3,233,244,0.15)] hover:-translate-y-2 border border-transparent hover:border-neon-cyan/20">
        <div className="relative h-48 mb-4 overflow-hidden rounded-lg">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10 opacity-70 group-hover:opacity-90 transition-opacity" />
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center text-4xl">
            {project.Image ? (
              <img
                src={project.Image}
                alt={project.title || "Project"}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <Code size={48} className="text-neon-cyan" />
            )}
          </div>
          {project.status === 'ongoing' && (
            <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 text-xs font-mono bg-black/70 border border-emerald-500/40 text-emerald-400 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ongoing
            </span>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
            <h3 className="text-xl font-bold text-white">{project.title}</h3>
          </div>
        </div>
        <div className="mb-4">
          <p className="text-gray-300 text-sm">{project.Description}</p>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {project.Tags?.map((tag, index) => (
            <span key={index} className="text-xs font-mono px-2 py-1 rounded-full bg-neon-blue/20 text-neon-blue">{tag}</span>
          ))}
        </div>
        <div className="flex justify-between mt-auto">
          {project.github && (
            <motion.a
              href={project.github}
              className="text-muted-foreground hover:text-neon-cyan transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.3, rotate: 10 }}
            >
              <Github size={20} />
            </motion.a>
          )}
          {project.Demo && (
            <motion.a
              href={project.Demo}
              className="text-muted-foreground hover:text-neon-cyan transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.2, x: 3 }}
            >
              <ExternalLink size={20} />
            </motion.a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const ProjectGrid = ({ projects }: { projects: Project[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    {projects.map((project, index) => (
      <ProjectCard key={project.id} project={project} index={index} />
    ))}
  </div>
);

const CompanyProjects = ({ projects }: { projects: Project[] }) => (
  <div className="space-y-14">
    {groupProjectsByCompany(projects).map(group => (
      <div key={group.name}>
        <div className="flex items-center gap-4 mb-8">
          {group.company && (
            <div className="h-12 min-w-12 px-2 rounded-xl bg-black/90 border border-neon-cyan/30 flex items-center justify-center shrink-0 overflow-hidden">
              <img src={group.company.logo} alt={`${group.name} logo`} className="h-8 w-auto max-w-[96px] object-contain" />
            </div>
          )}
          <div>
            <h4 className="text-xl font-bold text-white">{group.name}</h4>
            {group.company && <p className="text-sm text-gray-400">{group.company.role}</p>}
          </div>
        </div>
        {group.ongoing.length > 0 && (
          <div className="mb-10">
            <h5 className="text-sm font-mono uppercase tracking-wider text-emerald-400 mb-5">Ongoing Projects</h5>
            <ProjectGrid projects={group.ongoing} />
          </div>
        )}
        {group.completed.length > 0 && (
          <div>
            <h5 className="text-sm font-mono uppercase tracking-wider text-gray-400 mb-5">Completed Projects</h5>
            <ProjectGrid projects={group.completed} />
          </div>
        )}
      </div>
    ))}
  </div>
);

const ProjectsSection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const { data: projects, isLoading, error } = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: fetchProjects,
  });

  const groupedProjects = projects && groupProjectsByCategory(projects);

  if (isLoading) {
    return (
      <section id="projects" className="py-24 bg-black/30">
        <div className="container mx-auto px-4">
          <h2 className="section-title">Projects</h2>
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-cyan"></div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="projects" className="py-24 bg-black/30">
        <div className="container mx-auto px-4 text-center text-red-400">
          ❌ Failed to load projects.
        </div>
      </section>
    );
  }

  return (
    <section id="projects" className="py-24 bg-black/30" ref={sectionRef}>
      <div className="container mx-auto px-4">
        <h2 className="section-title">Projects</h2>
        <p className="text-gray-300 mb-12 max-w-2xl">
          Explore some of my recent work. Each project is a unique challenge
          that I approached with creativity and technical precision.
        </p>

        {(!projects || projects.length === 0) && (
          <p className="text-center text-muted-foreground">No projects yet.</p>
        )}

        {groupedProjects && Object.entries(groupedProjects).map(([category, categoryProjects]) => (
          <div key={category} className="mb-16">
            <h3 className="text-2xl font-bold text-neon-cyan mb-8 border-b border-neon-cyan/30 pb-3">
              {category}
            </h3>
            {category === "Client Projects" && <PromoBanner />}
            {category === COMPANY_CATEGORY ? (
              <CompanyProjects projects={categoryProjects} />
            ) : (
              <ProjectGrid projects={categoryProjects} />
            )}
          </div>
        ))}

        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
        >
          <motion.a
            href="#contact"
            className="btn-neon"
            whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(3,233,244,0.4)' }}
            whileTap={{ scale: 0.95 }}
          >
            Contact Me
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default ProjectsSection;
