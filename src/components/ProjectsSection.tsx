"use client";

import { Github, ExternalLink, Code, Star } from "lucide-react";
import { useState, useRef } from "react";
import type { MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useInView } from "framer-motion";
import PromoBanner from "./PromoBanner";
import ProjectGroupMark from "./projects/ProjectGroupMark";
import {
  PROJECTS_QUERY_KEY,
  Project,
  ProjectGroup,
  buildProjectGroups,
  fetchProjects,
  projectGroupMeta,
} from "@/lib/projects";
import { goToProjectGroup } from "@/lib/smoothScroll";

const ProjectCard = ({ project, index }: { project: Project; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  // Keep the two requested featured projects visually complete even if their
  // older Supabase rows have not received the matching image yet.
  const title = project.title?.toLowerCase() ?? '';
  const bannerImage = project.Image || (
    title.includes('sanchari') ? '/projects/sanchari-trips.jpg' :
    title.includes('grain') && title.includes('bazar') ? '/projects/grain-bazar.jpg' :
    null
  );

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
            {bannerImage ? (
              <img
                src={bannerImage}
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
          {project.is_favorite && (
            <span className="absolute top-3 right-3 z-20 inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-black/70 px-2.5 py-1 text-xs font-medium text-amber-200">
              <Star size={13} fill="currentColor" aria-hidden="true" /> Favorite
            </span>
          )}
        </div>
        <div className="mb-4">
          <p className="text-gray-300 text-sm whitespace-pre-line">{project.Description}</p>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {project.Tags?.map((tag, index) => (
            <span key={index} className="text-xs font-mono px-2 py-1 rounded-full bg-neon-blue/20 text-neon-blue">{tag}</span>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 mt-auto">
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
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-neon-cyan/40 px-3 py-1.5 text-sm text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.03, x: 2 }}
            >
              Live site <ExternalLink size={16} />
            </motion.a>
          )}
          {!project.Demo && <span className="ml-auto text-xs text-gray-500">Live URL not added yet</span>}
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

// Work done at a company: what is still being built first, then what is finished.
const CompanyProjects = ({ group }: { group: ProjectGroup }) => (
  <>
    {group.ongoing.length > 0 && (
      <div className="mb-10">
        <h4 className="text-sm font-mono uppercase tracking-wider text-emerald-400 mb-5">Ongoing Projects</h4>
        <ProjectGrid projects={group.ongoing} />
      </div>
    )}
    {group.completed.length > 0 && (
      <div>
        <h4 className="text-sm font-mono uppercase tracking-wider text-gray-400 mb-5">Completed Projects</h4>
        <ProjectGrid projects={group.completed} />
      </div>
    )}
  </>
);

const openGroup = (event: MouseEvent<HTMLAnchorElement>, anchor: string) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  event.preventDefault();
  goToProjectGroup(anchor);
};

const ProjectsSection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const { data: projects, isLoading, error } = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: fetchProjects,
  });

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

  // The same groups, in the same order, as the cards under the photo on the home page.
  const groups = buildProjectGroups(projects ?? []);

  return (
    <section id="projects" className="py-24 bg-black/30" ref={sectionRef}>
      <div className="container mx-auto px-4">
        <h2 className="section-title">Projects</h2>
        <p className="text-gray-300 mb-8 max-w-2xl">
          Explore some of my recent work. Each project is a unique challenge
          that I approached with creativity and technical precision.
        </p>

        <nav aria-label="Jump to a project group" className="flex flex-wrap gap-2 mb-14">
          {groups.map((group) => (
            <a
              key={group.id}
              href={`#${group.anchor}`}
              onClick={(event) => openGroup(event, group.anchor)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gray-700 text-sm text-gray-300 hover:border-neon-cyan hover:text-neon-cyan transition-colors"
            >
              {group.title}
              <span className="text-xs font-mono text-neon-cyan/80">{group.count}</span>
            </a>
          ))}
        </nav>

        {groups.map((group) => (
          <section key={group.id} id={group.anchor} className="project-group mb-16" aria-labelledby={`${group.anchor}-title`}>
            <div className="project-group-head flex flex-wrap items-center gap-x-4 gap-y-3 mb-8 px-3 -mx-3 pt-3 pb-4 border-b border-neon-cyan/30">
              <ProjectGroupMark id={group.id} large />
              <div className="min-w-0 flex-1 basis-56">
                <h3 id={`${group.anchor}-title`} data-group-heading tabIndex={-1} className="text-2xl font-bold text-neon-cyan outline-none">
                  {group.title}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {group.company && <span className="text-gray-200 font-medium">{group.company.role} · </span>}
                  {group.summary}
                </p>
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-gray-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full whitespace-nowrap">
                {projectGroupMeta(group)}
              </span>
            </div>

            {group.id === 'client' && <PromoBanner />}
            {group.company ? (
              <CompanyProjects group={group} />
            ) : (
              <ProjectGrid projects={group.projects} />
            )}
          </section>
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
