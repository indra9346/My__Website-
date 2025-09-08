"use client";

import { Github, ExternalLink, Code } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/utils/supabaseClient";

interface Project {
  id: string;
  title: string;
  Description: string;
  Image: string | null;
  Tags: string[]; // We'll parse JSON or comma-separated string
  github: string | null;
  Demo: string | null;
  Display_Order: number;
}

const ProjectsSection = () => {
  const [visibleProjects, setVisibleProjects] = useState<string[]>([]);

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("Display_Order", { ascending: true });

      if (error) throw error;

      // Parse Tags if stored as string
      return data?.map((proj) => ({
        ...proj,
        Tags: typeof proj.Tags === "string" ? JSON.parse(proj.Tags) : proj.Tags,
      })) as Project[];
    },
  });

  useEffect(() => {
    if (!projects) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-project-id");
          if (entry.isIntersecting && id && !visibleProjects.includes(id)) {
            setVisibleProjects((prev) => [...prev, id]);
          }
        });
      },
      { threshold: 0.2 }
    );

    const projectElements = document.querySelectorAll(".project-card");
    projectElements.forEach((el) => observer.observe(el));

    return () => projectElements.forEach((el) => observer.unobserve(el));
  }, [projects, visibleProjects]);

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
          ❌ Failed to load projects. Check console for details.
        </div>
      </section>
    );
  }

  return (
    <section id="projects" className="py-24 bg-black/30">
      <div className="container mx-auto px-4">
        <h2 className="section-title">Projects</h2>
        <p className="text-gray-300 mb-12 max-w-2xl">
          Explore some of my recent work. Each project is a unique challenge that I approached with creativity and technical precision.
        </p>

        {projects?.length === 0 && (
          <p className="text-center text-gray-400">⚠️ No projects found in Supabase.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects?.map((project) => (
            <div
              key={project.id}
              data-project-id={project.id}
              className={`project-card card-3d glass p-5 rounded-xl transition-all duration-700 ${
                visibleProjects.includes(project.id)
                  ? "opacity-100"
                  : "opacity-0 translate-y-10"
              }`}
            >
              <div className="relative h-48 mb-4 overflow-hidden rounded-lg group">
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10 opacity-70 group-hover:opacity-90 transition-opacity"></div>
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center text-4xl">
                  {project.Image ? (
                    <img
                      src={project.Image}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Code size={48} className="text-neon-cyan" />
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                  <h3 className="text-xl font-bold text-white">{project.title}</h3>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-gray-300 text-sm">{project.Description}</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {project.Tags?.map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs font-mono px-2 py-1 rounded-full bg-neon-blue/20 text-neon-blue"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex justify-between mt-auto">
                {project.github && (
                  <a
                    href={project.github}
                    className="text-gray-400 hover:text-neon-cyan transition-colors"
                    aria-label="GitHub repository"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github size={20} />
                  </a>
                )}
                {project.Demo && (
                  <a
                    href={project.Demo}
                    className="text-gray-400 hover:text-neon-cyan transition-colors"
                    aria-label="Live demo"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={20} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <a href="#contact" className="btn-neon">
            Contact Me
          </a>
        </div>
      </div>
    </section>
  );
};

export default ProjectsSection;
