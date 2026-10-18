// Facts ARIA (the assistant in AI mode) is allowed to use.
//
// Shared by the in-browser answer engine (src/components/ai/aria) and the
// optional aria-chat edge function, so both always say the same thing.
// Sources: public/resume.pdf, the portfolio's own sections, and each
// project's repository. Keep it plain TypeScript (no Deno/Vite/React imports).

export interface AriaProject {
  slug: string;
  title: string;
  /** Other ways visitors refer to it (lower case, without punctuation). */
  aliases: string[];
  category: "Client project" | "Personal project";
  summary: string;
  highlights: string[];
  stack: string[];
  github: string | null;
  demo: string | null;
}

export interface AriaRole {
  company: string;
  title: string;
  status: string;
  summary: string;
}

export interface AriaEducation {
  school: string;
  qualification: string;
  year: string;
  score: string;
}

export interface AriaSkillGroup {
  label: string;
  items: string[];
}

export const ARIA_PROFILE = {
  name: "K S Indra Kumar",
  shortName: "Indra",
  headline: "Full Stack Developer",
  summary:
    "Indra is a full-stack developer and a B.E. graduate in Artificial Intelligence & Machine Learning from SJC Institute of Technology. He builds web applications end to end with Java, React.js, JavaScript, HTML, CSS, Hibernate, PostgreSQL and Supabase.",
  location: "Bengaluru, Karnataka, India",
  email: "ik9893344@gmail.com",
  phone: "+91 9346476951",
  phoneHref: "tel:+919346476951",
  github: "https://github.com/indra9346",
  linkedin: "https://www.linkedin.com/in/k-s-indra-kumar-7049b1289",
  googleSkills: "https://www.skills.google/public_profiles/18bad5eb-bfc2-4f59-b0a9-2546e0d921bb",
  resume: "/resume.pdf",
  site: "https://indraportfolio-psi.vercel.app/",
  availability:
    "He is open to full-time software development roles and takes on client website projects.",
  roles: [
    {
      company: "Swan Digital Solutions",
      title: "Full Stack Developer",
      status: "Present",
      summary:
        "Designing and developing full-stack web applications, scalable APIs, database architecture and modern responsive user interfaces.",
    },
    {
      company: "Hosting Baba",
      title: "Full Stack Developer",
      status: "Present",
      summary:
        "Building responsive web solutions, backend integrations, hosting infrastructure services and performance-tuned web features.",
    },
  ] as AriaRole[],
  education: [
    {
      school: "SJC Institute of Technology",
      qualification: "B.E. in Artificial Intelligence & Machine Learning",
      year: "2026",
      score: "CGPA 8.59",
    },
    {
      school: "LRG Naidu Jr. College",
      qualification: "PUC (Physics, Chemistry, Mathematics)",
      year: "2022",
      score: "85.3%",
    },
    {
      school: "LRG Vidyalayam (EM)",
      qualification: "SSLC",
      year: "2020",
      score: "78.5%",
    },
  ] as AriaEducation[],
  skills: [
    { label: "Frontend", items: ["JavaScript", "TypeScript", "React.js", "HTML", "CSS (intermediate)"] },
    { label: "Backend", items: ["Java", "Hibernate", "Node.js & Express", "SQL"] },
    { label: "Databases", items: ["PostgreSQL", "Supabase", "MongoDB", "Firebase"] },
    { label: "Also codes in", items: ["C", "Python"] },
    {
      label: "Tools",
      items: ["Git & GitHub", "VS Code", "IntelliJ IDEA", "JShell", "Jupyter Notebook", "Next.js", "Figma", "AI-assisted development tools (Lovable, Antigravity CLI)"],
    },
    { label: "Learning", items: ["Data structures & algorithms with Java (in progress)"] },
  ] as AriaSkillGroup[],
  certifications: [
    "Google Cloud Skills Boost: earned multiple skill badges with hands-on cloud labs",
    "Advanced from the Silver League to the Gold League on Google Cloud Skills Boost",
    "Completed several courses on cloud technologies",
    "Mastering DSA with Java (in progress)",
  ],
  projects: [
    {
      slug: "tolethub",
      title: "ToLetHub",
      aliases: ["tolethub", "to let hub", "tolet hub", "tolet", "to let", "to-let", "rental platform", "rental app", "pg finder"],
      category: "Personal project",
      summary:
        "A full-stack rental platform that connects accommodation seekers directly with PGs, rooms and houses across India, so they can skip broker fees.",
      highlights: [
        "Interactive Leaflet maps with automated distance calculation",
        "Smart property listings with locality, property-type and budget search",
        "Gemini-powered chatbot for questions about listings",
        "Planned next: online payments and real-time tenant-owner chat",
      ],
      stack: ["Angular", "TypeScript", "SCSS", "Leaflet", "Node.js", "Express", "MongoDB", "Gemini API"],
      github: "https://github.com/indra9346/TOLET",
      demo: "https://tolet-iota.vercel.app/",
    },
    {
      slug: "student-data-management",
      title: "Student Data Management System",
      aliases: ["student data management", "student data", "student management", "student management system", "student records", "hibernate crud", "hibernate project", "crud project", "crud app"],
      category: "Personal project",
      summary:
        "A CRUD application for student records that demonstrates ORM concepts, built with Java and Hibernate on a PostgreSQL database.",
      highlights: [
        "Create, read, update and delete student records",
        "Java application integrated with PostgreSQL",
        "Hibernate ORM to simplify database operations",
      ],
      stack: ["Java", "Hibernate", "PostgreSQL", "Maven"],
      github: "https://github.com/indra9346/hibernate-crud-demo",
      demo: null,
    },
    {
      slug: "dj-video-editing",
      title: "DJ Video Editing Services",
      aliases: ["dj video editing services", "dj video editing", "dj video", "dj website", "video editing website", "video editing services", "deepak jain"],
      category: "Client project",
      summary:
        "A responsive website for a real client, built to the client's requirements, to showcase video-editing services (YouTube, Reels and ads), with Supabase for backend features and deployment on Vercel.",
      highlights: ["Services, portfolio and testimonials pages", "Supabase-backed features", "Live on Vercel"],
      stack: ["React", "Vite", "TypeScript", "Tailwind CSS", "Supabase", "Vercel"],
      github: "https://github.com/indra9346/dj-video-editing-services",
      demo: "https://dj-video-editing-services.vercel.app/",
    },
    {
      slug: "kbk-film-studios",
      title: "KBK Film Studios",
      aliases: ["kbk film studios", "kbk films", "kbk film", "kbk", "film studio", "wedding films", "wedding film studio"],
      category: "Client project",
      summary:
        "Website for KBK Films, a wedding and pre-wedding film studio in Hindupur, with services and pricing, a showcase of their films, service booking and order tracking.",
      highlights: ["Services, pricing and film showcase", "Online service booking", "Track-my-service for clients"],
      stack: ["TypeScript", "Express", "Supabase", "PostgreSQL"],
      github: null,
      demo: "https://kbk-film-studios-lake.vercel.app/",
    },
    {
      slug: "i-mall",
      title: "I-Mall",
      aliases: ["i mall", "imall", "i-mall", "online mall", "mall project", "shopping site", "ecommerce", "e commerce"],
      category: "Personal project",
      summary:
        "A front-end online mall with product categories, best sellers, deals, a monthly Lucky Spin discount wheel and an account sign-up form.",
      highlights: ["Product categories, best sellers and deals", "Lucky Spin discount wheel", "Account creation form"],
      stack: ["HTML", "CSS", "JavaScript"],
      github: "https://github.com/indra9346/I_Mall",
      demo: "https://indra9346.github.io/I_Mall/",
    },
  ] as AriaProject[],
} as const;

export type AriaProfile = typeof ARIA_PROFILE;

/**
 * Plain-text version of the facts, used to ground the optional LLM backend.
 * Deterministic, so the prompt prefix stays cacheable.
 */
export function buildAriaKnowledgeDocument(): string {
  const p = ARIA_PROFILE;
  const lines: string[] = [];
  lines.push(`# ${p.name} (${p.headline})`, p.summary, `Location: ${p.location}`, `Availability: ${p.availability}`);
  lines.push("", "## Current work");
  for (const r of p.roles) lines.push(`- ${r.title} at ${r.company} (${r.status}): ${r.summary}`);
  lines.push("", "## Education");
  for (const e of p.education) lines.push(`- ${e.qualification}, ${e.school}, ${e.year}, ${e.score}`);
  lines.push("", "## Skills");
  for (const g of p.skills) lines.push(`- ${g.label}: ${g.items.join(", ")}`);
  lines.push("", "## Certifications and achievements");
  for (const c of p.certifications) lines.push(`- ${c}`);
  lines.push("", "## Projects");
  for (const pr of p.projects) {
    lines.push(`### ${pr.title} (${pr.category})`, pr.summary, `Highlights: ${pr.highlights.join("; ")}`, `Stack: ${pr.stack.join(", ")}`);
    if (pr.demo) lines.push(`Live: ${pr.demo}`);
    if (pr.github) lines.push(`Code: ${pr.github}`);
  }
  lines.push("", "## Contact");
  lines.push(`- Email: ${p.email}`, `- Phone: ${p.phone}`, `- GitHub: ${p.github}`, `- LinkedIn: ${p.linkedin}`, `- Resume: ${p.site.replace(/\/$/, "")}${p.resume}`);
  return lines.join("\n");
}
