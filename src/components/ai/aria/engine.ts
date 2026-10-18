// ARIA's on-device answer engine. Pure TypeScript (no React, no DOM) so it can
// be tested in Node. It understands a question, resolves follow-ups against
// the previous answer, and returns structured blocks built only from
// ARIA_PROFILE. Nothing here invents facts.

import { ARIA_PROFILE, type AriaProject } from "../../../../supabase/functions/_shared/aria-knowledge";

export type AriaIntent =
  | "greeting"
  | "thanks"
  | "goodbye"
  | "about_assistant"
  | "bio"
  | "experience"
  | "projects"
  | "project"
  | "skills"
  | "skill_check"
  | "education"
  | "certifications"
  | "contact"
  | "resume"
  | "location"
  | "availability"
  | "ai_world"
  | "personal"
  | "off_topic"
  | "unknown";

export type ProjectFocus = "overview" | "stack" | "links";
export type ContactFocus = "all" | "email" | "phone" | "linkedin" | "github";

export interface SkillCheck {
  term: string;
  status: "listed" | "used-in-project" | "degree" | "not-listed";
  group?: string;
  item?: string;
  projects: string[];
}

export type AriaBlock =
  | { kind: "text"; text: string }
  | { kind: "bio" }
  | { kind: "experience" }
  | { kind: "projects" }
  | { kind: "project"; slug: string; focus: ProjectFocus }
  | { kind: "skills"; check?: SkillCheck }
  | { kind: "education" }
  | { kind: "certifications" }
  | { kind: "contact"; focus: ContactFocus }
  | { kind: "resume" };

export interface AriaReply {
  intent: AriaIntent;
  blocks: AriaBlock[];
  /** Plain-text version (for screen readers and conversation history). */
  text: string;
  suggestions: string[];
}

export interface AriaContext {
  lastIntent?: AriaIntent;
  lastProject?: string;
}

const P = ARIA_PROFILE;

export const DEFAULT_SUGGESTIONS = ["Bio", "Experience", "Projects", "ToLetHub", "Skills", "Education", "Contact", "Resume"];

// ---------------------------------------------------------------------------
// Text normalisation
// ---------------------------------------------------------------------------

export function normalize(input: string): string {
  let s = ` ${input.toLowerCase()} `;
  s = s.replace(/[‘’`]/g, "'");
  s = s
    .replace(/c\+\+/g, " cpp ")
    .replace(/c#/g, " csharp ")
    .replace(/\.net\b/g, " dotnet ")
    .replace(/\bnode\.?js\b/g, " nodejs ")
    .replace(/\bnext\.?js\b/g, " nextjs ")
    .replace(/\breact\.?js\b/g, " react ")
    .replace(/\bvue\.?js\b/g, " vue ")
    .replace(/\bexpress\.?js\b/g, " express ")
    .replace(/\bthree\.?js\b/g, " threejs ")
    .replace(/\bb\.\s?e\b\.?/g, " be_degree ")
    .replace(/\bb\.?\s?tech\b\.?/g, " btech ")
    .replace(/\bai\s*[/&]\s*ml\b/g, " aiml ");
  s = s
    .replace(/\bwhat's\b/g, "what is")
    .replace(/\bwho's\b/g, "who is")
    .replace(/\bwhere's\b/g, "where is")
    .replace(/\bhow's\b/g, "how is")
    .replace(/\bhe's\b/g, "he is")
    .replace(/\bit's\b/g, "it is")
    .replace(/\bcan't\b/g, "can not")
    .replace(/\bwon't\b/g, "will not")
    .replace(/n't\b/g, " not")
    .replace(/'re\b/g, " are")
    .replace(/'ll\b/g, " will")
    .replace(/'ve\b/g, " have")
    .replace(/'m\b/g, " am")
    .replace(/'d\b/g, " would")
    .replace(/'s\b/g, "");
  s = s.replace(/[^a-z0-9_ ]+/g, " ").replace(/\s+/g, " ").trim();
  return s;
}

function tokensOf(normalized: string): string[] {
  return normalized ? normalized.split(" ") : [];
}

function hasPhrase(normalized: string, phrase: string): boolean {
  return ` ${normalized} `.includes(` ${phrase} `);
}

/** Damerau-Levenshtein (optimal string alignment) distance, capped for speed. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Short words must match exactly; longer ones tolerate a typo or two. */
function fuzzyEqual(token: string, target: string): boolean {
  if (token === target) return true;
  if (target.length < 6 || token.length < 5) return false;
  const limit = target.length >= 9 ? 2 : 1;
  return editDistance(token, target) <= limit;
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

function findProject(normalized: string, tokens: string[]): AriaProject | undefined {
  // Exact phrase matches first, preferring the longest alias.
  let best: { project: AriaProject; length: number } | undefined;
  for (const project of P.projects) {
    for (const alias of [project.title, ...project.aliases, "dj", "mall"].map(normalize)) {
      if (!alias) continue;
      const isGenericExtra = alias === "dj" ? project.slug !== "dj-video-editing" : alias === "mall" ? project.slug !== "i-mall" : false;
      if (isGenericExtra) continue;
      if (hasPhrase(normalized, alias) && (!best || alias.length > best.length)) best = { project, length: alias.length };
    }
  }
  if (best) return best.project;

  // Then typo-tolerant matches ("toletub", "tolet hub") against one-word names
  // only; multi-word aliases must match exactly so "all projects" never reads
  // as "mall project".
  const candidates = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) candidates.push(tokens[i] + tokens[i + 1]);
  for (let i = 0; i < tokens.length - 2; i++) candidates.push(tokens[i] + tokens[i + 1] + tokens[i + 2]);
  for (const project of P.projects) {
    const targets = [project.title, ...project.aliases]
      .map(normalize)
      .filter((a) => !a.includes(" ") && a.length >= 6);
    if (candidates.some((c) => targets.some((t) => fuzzyEqual(c, t)))) return project;
  }
  return undefined;
}

interface TechEntry {
  display: string;
  aliases: string[];
  /** Skill item (from ARIA_PROFILE.skills) this maps to, if listed. */
  item?: string;
  special?: "degree" | "certification";
}

/** Technologies visitors ask about. Listed ones map to a skill item; others are "not listed". */
const TECH: TechEntry[] = [
  { display: "Java", aliases: ["java", "core java", "advanced java"], item: "Java" },
  { display: "JavaScript", aliases: ["javascript", "js", "es6", "vanilla js"], item: "JavaScript" },
  { display: "TypeScript", aliases: ["typescript", "ts"], item: "TypeScript" },
  { display: "React", aliases: ["react", "reactjs"], item: "React.js" },
  { display: "HTML", aliases: ["html", "html5"], item: "HTML" },
  { display: "CSS", aliases: ["css", "css3", "scss", "sass"], item: "CSS (intermediate)" },
  { display: "Hibernate", aliases: ["hibernate", "jpa", "orm"], item: "Hibernate" },
  { display: "Node.js", aliases: ["nodejs", "node", "node js"], item: "Node.js & Express" },
  { display: "Express", aliases: ["express", "expressjs"], item: "Node.js & Express" },
  { display: "SQL", aliases: ["sql"], item: "SQL" },
  { display: "PostgreSQL", aliases: ["postgresql", "postgres", "psql", "pgadmin"], item: "PostgreSQL" },
  { display: "Supabase", aliases: ["supabase"], item: "Supabase" },
  { display: "MongoDB", aliases: ["mongodb", "mongo", "mongoose"], item: "MongoDB" },
  { display: "Firebase", aliases: ["firebase"], item: "Firebase" },
  { display: "C", aliases: ["c language", "c programming", "c lang"], item: "C" },
  { display: "Python", aliases: ["python", "py"], item: "Python" },
  { display: "Git", aliases: ["git", "version control"], item: "Git & GitHub" },
  { display: "GitHub", aliases: ["github"], item: "Git & GitHub" },
  { display: "VS Code", aliases: ["vscode", "vs code", "visual studio code"], item: "VS Code" },
  { display: "IntelliJ IDEA", aliases: ["intellij", "intellij idea"], item: "IntelliJ IDEA" },
  { display: "JShell", aliases: ["jshell"], item: "JShell" },
  { display: "Jupyter", aliases: ["jupyter", "jupyter notebook"], item: "Jupyter Notebook" },
  { display: "Next.js", aliases: ["nextjs", "next js"], item: "Next.js" },
  { display: "Figma", aliases: ["figma"], item: "Figma" },
  { display: "DSA", aliases: ["dsa", "data structures", "algorithms", "data structure"], item: "Data structures & algorithms with Java (in progress)" },
  { display: "AI tools", aliases: ["lovable", "antigravity", "ai tools", "ai assisted", "copilot", "chatgpt", "claude"], item: "AI-assisted development tools (Lovable, Antigravity CLI)" },
  { display: "Angular", aliases: ["angular", "angularjs"] },
  { display: "Leaflet", aliases: ["leaflet", "maps api"] },
  { display: "Maven", aliases: ["maven"] },
  { display: "Vite", aliases: ["vite"] },
  { display: "Tailwind CSS", aliases: ["tailwind", "tailwindcss", "tailwind css"] },
  { display: "Gemini API", aliases: ["gemini", "gemini api", "generative ai"] },
  { display: "AI & ML", aliases: ["machine learning", "ml", "ai", "artificial intelligence", "deep learning", "aiml"], special: "degree" },
  { display: "Google Cloud", aliases: ["google cloud", "gcp", "cloud"], special: "certification" },
  // Not on his list (answered honestly).
  ...[
    "kotlin", "swift", "rust", "golang", "ruby", "rails", "php", "laravel", "django", "flask", "fastapi",
    "spring", "spring boot", "springboot", "cpp", "csharp", "dotnet", "vue", "svelte", "flutter", "dart",
    "react native", "aws", "azure", "docker", "kubernetes", "k8s", "tensorflow", "pytorch", "pandas",
    "numpy", "redis", "graphql", "mysql", "oracle", "sqlite", "jenkins", "terraform", "unity", "wordpress",
    "shopify", "solidity", "blockchain", "power bi", "tableau", "excel", "android", "ios", "selenium",
  ].map((name) => ({ display: displayTech(name), aliases: [name] })),
];

function displayTech(name: string): string {
  const map: Record<string, string> = {
    cpp: "C++", csharp: "C#", dotnet: ".NET", aws: "AWS", k8s: "Kubernetes", php: "PHP", ios: "iOS",
    mysql: "MySQL", sqlite: "SQLite", graphql: "GraphQL", golang: "Go", fastapi: "FastAPI", "power bi": "Power BI",
    "spring boot": "Spring Boot", springboot: "Spring Boot", "react native": "React Native", tensorflow: "TensorFlow",
    pytorch: "PyTorch", numpy: "NumPy", wordpress: "WordPress",
  };
  return map[name] ?? name.replace(/\b\w/g, (c) => c.toUpperCase());
}

function findTech(normalized: string, tokens: string[]): TechEntry | undefined {
  let best: { entry: TechEntry; length: number } | undefined;
  for (const entry of TECH) {
    for (const alias of entry.aliases) {
      if (hasPhrase(normalized, alias) && (!best || alias.length > best.length)) best = { entry, length: alias.length };
    }
  }
  if (best) return best.entry;
  // A bare "c" counts only in a clear skill question ("does he know c?").
  if (tokens.includes("c") && /\b(know|knows|use|uses|used|code|codes|coding|learn|learned|good|skill|skills|language|program|programming|experience)\b/.test(normalized)) {
    return TECH.find((t) => t.display === "C");
  }
  for (const token of tokens) {
    if (token.length < 6) continue;
    const entry = TECH.find((t) => t.aliases.some((a) => !a.includes(" ") && a.length >= 6 && fuzzyEqual(token, a)));
    if (entry) return entry;
  }
  return undefined;
}

/** Projects whose stack lists this technology as a whole word ("C" never matches "SCSS"). */
function projectsUsing(display: string): string[] {
  const needle = normalize(display);
  return P.projects.filter((p) => p.stack.some((s) => hasPhrase(normalize(s), needle))).map((p) => p.title);
}

function skillGroupOf(item: string): string | undefined {
  return P.skills.find((g) => g.items.includes(item))?.label;
}

export function checkSkill(entry: TechEntry): SkillCheck {
  if (entry.special === "degree") return { term: entry.display, status: "degree", projects: projectsUsing("Gemini") };
  if (entry.special === "certification") return { term: entry.display, status: "listed", group: "Certifications", item: "Google Cloud Skills Boost badges", projects: [] };
  const projects = projectsUsing(entry.display);
  if (entry.item) return { term: entry.display, status: "listed", group: skillGroupOf(entry.item), item: entry.item, projects };
  if (projects.length) return { term: entry.display, status: "used-in-project", projects };
  return { term: entry.display, status: "not-listed", projects: [] };
}

// ---------------------------------------------------------------------------
// Intent scoring
// ---------------------------------------------------------------------------

type Cues = Record<string, number>;

const INTENT_CUES: Partial<Record<AriaIntent, Cues>> = {
  about_assistant: {
    "who are you": 6, "what are you": 5, "your name": 5, "are you a bot": 6, "are you ai": 6, "are you an ai": 6,
    "are you real": 5, "are you human": 6, "what can you do": 6, "how can you help": 5, "what do you do": 3,
    "who made you": 6, "who built you": 6, "who created you": 6, "who designed you": 6, aria: 2, "introduce yourself": 5,
    "tell me about yourself": 4, "how do you work": 5,
  },
  bio: {
    "who is indra": 6, "who is he": 5, "who is this": 3, "about indra": 5, "about him": 5, "tell me about him": 6,
    "tell me about indra": 6, "introduce him": 5, introduction: 3, summary: 4, profile: 3, bio: 5, biography: 5,
    background: 3, "basic info": 6, "basic information": 6, "basic details": 6, overview: 4, "what does he do": 5,
    "what does indra do": 6, "indra kumar": 1.5, "k s indra": 2, "who is": 1.5, "tell me more": 3,
  },
  experience: {
    experience: 4, "work experience": 6, job: 4, jobs: 4, working: 2, "work at": 5, "works at": 5, "working at": 5,
    "where does he work": 7, "where is he working": 7, "where do you work": 7, "current role": 6, "current job": 6,
    "current position": 6, currently: 2, company: 4, companies: 4, employer: 5, employed: 5, employment: 5,
    position: 2, designation: 5, designations: 5, swan: 5, "swan digital": 6, "hosting baba": 6, baba: 4, career: 3,
    profession: 3, professional: 2, role: 2, roles: 2, internship: 3, internships: 3, "years of experience": 7,
    "how many years": 5, fresher: 4, "full stack developer": 2,
  },
  projects: {
    project: 3, projects: 4.5, portfolio: 2, "work samples": 5, built: 2, build: 1.5, made: 1.5, created: 1.5,
    developed: 1.5, apps: 2.5, applications: 2.5, repositories: 4, repos: 4, repo: 2, "github projects": 5,
    "show me his work": 6, "his work": 3, "your work": 3, "client work": 5, "client projects": 6, "client project": 5,
    "client websites": 6, clients: 2, "personal projects": 6, websites: 2, "what has he built": 6, "what did he build": 6,
    "live projects": 5, "other projects": 6, "all projects": 6, work: 1,
  },
  skills: {
    skills: 6, skill: 5, "tech stack": 6, stack: 3, technologies: 5, technology: 3, tech: 2, languages: 3,
    "programming languages": 6, programming: 2, tools: 2.5, frameworks: 3, expertise: 5, strengths: 4, "good at": 3,
    proficient: 3, competencies: 5, coding: 2, "what can he do": 4,
  },
  education: {
    education: 6, educational: 5, qualification: 6, qualifications: 6, degree: 6, college: 6, university: 5, study: 4,
    studied: 5, studies: 4, studying: 4, cgpa: 7, gpa: 6, marks: 5, percentage: 5, score: 3, scored: 4, grades: 5,
    grade: 3, puc: 7, sslc: 7, "10th": 7, "12th": 7, tenth: 6, twelfth: 6, "pre university": 6, school: 5,
    schooling: 6, graduate: 3, graduated: 5, graduation: 5, be_degree: 6, btech: 5, engineering: 4, sjc: 6, sjcit: 6,
    vtu: 5, academic: 5, academics: 5, "passing year": 5, "passed out": 5, batch: 3, aiml: 3, lrg: 6,
  },
  certifications: {
    certification: 7, certifications: 7, certificate: 6, certificates: 6, certified: 6, badge: 6, badges: 6,
    courses: 5, course: 4, "google cloud": 6, "cloud skills": 7, "skills boost": 7, achievement: 6, achievements: 6,
    awards: 5, award: 5, league: 5, "gold league": 7, gcp: 5,
  },
  contact: {
    contact: 7, "contact details": 7, email: 7, "e mail": 7, mail: 4, gmail: 6, phone: 7, "phone number": 7,
    number: 3, mobile: 6, call: 4, whatsapp: 6, reach: 4, "reach out": 6, "get in touch": 7, connect: 3, linkedin: 7,
    github: 3, social: 3, socials: 3, "message him": 5, "talk to him": 5, instagram: 5, twitter: 5,
  },
  resume: { resume: 8, cv: 8, "curriculum vitae": 8, biodata: 7, download: 2, pdf: 3 },
  location: {
    "where is he from": 7, "where does he live": 7, "where is he based": 7, "where is he located": 7, location: 6,
    located: 5, based: 3, "based in": 5, city: 5, hometown: 6, native: 3, "which city": 7, "which country": 6,
    live: 1.5, lives: 3, bangalore: 3, bengaluru: 3, relocate: 5, relocation: 5, remote: 4,
  },
  availability: {
    hire: 7, "hire him": 8, hiring: 6, available: 6, availability: 7, freelance: 7, freelancer: 7, freelancing: 7,
    "open to work": 8, "looking for job": 7, "looking for a job": 7, "job opportunity": 7, opportunity: 3,
    opportunities: 3, collaborate: 5, collaboration: 5, "work with him": 7, "work together": 6, rates: 6, rate: 3,
    pricing: 6, price: 5, cost: 5, charges: 5, charge: 3, quote: 5, budget: 3, "build my website": 7,
    "build a website": 7, "make a website": 7, "website for me": 7, "need a website": 7, salary: 6,
    "notice period": 6, joining: 3,
  },
  ai_world: {
    "what is this place": 7, "where am i": 7, "ai world": 6, "ai mode": 6, "this world": 5, doors: 6, door: 5,
    robot: 5, drone: 5, drones: 5, uav: 5, "how does this work": 6, "how to exit": 7, "how do i exit": 7,
    "how to leave": 7, "go back": 4, vlogs: 5, vlog: 5, "ai creations": 6, locked: 3, "how was this built": 6,
    "how is this made": 6, threejs: 5, "what is this": 3,
  },
  personal: {
    age: 4, "how old": 7, birthday: 7, "date of birth": 7, dob: 7, married: 7, marriage: 6, wife: 7, girlfriend: 7,
    family: 5, father: 6, mother: 6, religion: 7, caste: 7, "phone password": 7,
  },
  off_topic: {
    weather: 6, joke: 6, jokes: 6, news: 5, cricket: 6, football: 6, movie: 5, movies: 5, song: 5, songs: 5,
    recipe: 6, "capital of": 6, president: 5, "prime minister": 6, stock: 3, stocks: 5, bitcoin: 5, crypto: 5,
    "what time": 5, "time now": 5, "today date": 5, "write me": 5, "write a": 3, "write code": 7,
    "write a program": 7, "write a script": 7, script: 2, homework: 7, assignment: 5, solve: 4, calculate: 5,
    translate: 6, poem: 6, essay: 6, story: 3,
  },
};

const SMALL_TALK: Partial<Record<AriaIntent, Cues>> = {
  greeting: {
    hi: 3, hello: 3, hey: 3, hii: 3, hiii: 3, heyy: 3, helo: 3, namaste: 3, namaskara: 3, hola: 3, "good morning": 3,
    "good afternoon": 3, "good evening": 3, yo: 2, sup: 2, greetings: 3,
  },
  thanks: {
    thanks: 4, "thank you": 4, thankyou: 4, thx: 4, ty: 3, great: 2, awesome: 2, cool: 2, nice: 2, perfect: 2,
    "got it": 3, ok: 2, okay: 2,
  },
  goodbye: { bye: 4, goodbye: 4, "see you": 4, "see ya": 4, cya: 4 },
};

function firstCueIndex(normalized: string, cues: Cues): number {
  const padded = ` ${normalized} `;
  let first = Infinity;
  for (const phrase of Object.keys(cues)) {
    const i = padded.indexOf(` ${phrase} `);
    if (i >= 0 && i < first) first = i;
  }
  return first;
}

function scoreCues(normalized: string, cues: Cues): number {
  let score = 0;
  for (const [phrase, weight] of Object.entries(cues)) if (hasPhrase(normalized, phrase)) score += weight;
  return score;
}

const STACK_CUES = ["stack", "tech", "technology", "technologies", "built with", "made with", "built using", "made using", "framework", "frameworks", "language", "languages", "tools", "backend", "frontend", "database", "use", "used", "uses"];
const LINK_CUES = ["link", "links", "demo", "live", "url", "website", "site", "github", "code", "source", "repo", "repository", "deployed", "visit", "open", "see it"];
const MORE_CUES = ["more", "details", "detail", "elaborate", "explain", "features", "feature", "about it", "describe"];
const REFERENCE_CUES = ["it", "its", "this", "that", "the project", "this project", "that project", "them", "there"];
const CHECK_CUES = ["does he know", "do you know", "does indra know", "can he", "is he good", "has he used", "has he worked", "did he use", "experience with", "experience in", "experience", "worked with", "work with", "knowledge of", "familiar with", "know", "knows", "use", "uses", "used", "skilled", "proficient", "good at"];

function matchesAny(normalized: string, cues: string[]): boolean {
  return cues.some((c) => hasPhrase(normalized, c));
}

function projectFocus(normalized: string): ProjectFocus {
  if (matchesAny(normalized, LINK_CUES)) return "links";
  if (matchesAny(normalized, STACK_CUES)) return "stack";
  return "overview";
}

function contactFocus(normalized: string): ContactFocus {
  if (matchesAny(normalized, ["email", "e mail", "mail", "gmail"])) return "email";
  if (matchesAny(normalized, ["phone", "number", "mobile", "call", "whatsapp"])) return "phone";
  if (hasPhrase(normalized, "linkedin")) return "linkedin";
  if (hasPhrase(normalized, "github")) return "github";
  return "all";
}

export interface Understanding {
  intent: AriaIntent;
  project?: string;
  focus?: ProjectFocus;
  contact?: ContactFocus;
  tech?: TechEntry;
  secondary?: AriaIntent;
  scores: Partial<Record<AriaIntent, number>>;
}

const COMBINABLE: AriaIntent[] = ["bio", "experience", "projects", "skills", "education", "certifications", "contact", "resume", "location", "availability"];

export function understand(question: string, ctx: AriaContext = {}): Understanding {
  const normalized = normalize(question);
  const tokens = tokensOf(normalized);
  const scores: Partial<Record<AriaIntent, number>> = {};
  for (const [intent, cues] of Object.entries(INTENT_CUES) as [AriaIntent, Cues][]) {
    const s = scoreCues(normalized, cues);
    if (s > 0) scores[intent] = s;
  }

  if (!tokens.length) return { intent: "unknown", scores };

  const project = findProject(normalized, tokens);
  const tech = findTech(normalized, tokens);

  // 1. A named project wins, unless the question is clearly about something else
  //    (e.g. "is the kbk site a client project?" is still about KBK).
  if (project) {
    return { intent: "project", project: project.slug, focus: projectFocus(normalized), scores };
  }

  // 2. Follow-ups about the previous project ("what tech did it use?", "show me the code").
  if (ctx.lastIntent === "project" && ctx.lastProject) {
    const refers = matchesAny(normalized, REFERENCE_CUES);
    const short = tokens.length <= 5;
    const asksStack = matchesAny(normalized, STACK_CUES);
    const asksLinks = matchesAny(normalized, LINK_CUES);
    const asksMore = matchesAny(normalized, MORE_CUES);
    const strongOther = Object.entries(scores).some(([k, v]) => k !== "projects" && k !== "skills" && (v ?? 0) >= 6);
    if (!strongOther && (asksStack || asksLinks || asksMore) && (refers || short) && !(tech && !refers)) {
      return { intent: "project", project: ctx.lastProject, focus: projectFocus(normalized), scores };
    }
  }

  // 3. "Does he know X?" style questions, or a bare technology name ("python?").
  if (tech) {
    const otherTop = Math.max(0, ...Object.entries(scores).filter(([k]) => k !== "skills").map(([, v]) => v ?? 0));
    const asks = matchesAny(normalized, CHECK_CUES);
    const bare = tokens.length <= 2 && otherTop < 3;
    if ((asks && otherTop < 6) || bare) {
      return { intent: "skill_check", tech, scores };
    }
  }

  // 4. Best-scoring intent.
  const ranked = (Object.entries(scores) as [AriaIntent, number][]).sort((a, b) => b[1] - a[1]);
  let [top, topScore] = ranked[0] ?? ["unknown", 0];

  // Small talk only counts when nothing substantive was asked.
  if (topScore < 3) {
    for (const [intent, cues] of Object.entries(SMALL_TALK) as [AriaIntent, Cues][]) {
      const s = scoreCues(normalized, cues);
      if (s >= 2 && tokens.length <= 6 && s > topScore) {
        top = intent;
        topScore = s;
      }
    }
  }

  if (topScore < 2.5) {
    if (tech) return { intent: "skill_check", tech, scores };
    if (ctx.lastIntent === "project" && ctx.lastProject && matchesAny(normalized, MORE_CUES)) {
      return { intent: "project", project: ctx.lastProject, focus: "overview", scores };
    }
    return { intent: "unknown", scores };
  }

  // Off-topic only wins when nothing about the portfolio scored close to it.
  if (top === "off_topic") {
    const portfolio = ranked.find(([k]) => k !== "off_topic" && k !== "personal");
    if (portfolio && portfolio[1] >= topScore) top = portfolio[0];
  }

  let secondary: AriaIntent | undefined;
  if (hasPhrase(normalized, "and") || hasPhrase(normalized, "also") || normalized.includes(" plus ")) {
    const second = ranked.find(([k, v]) => k !== top && v >= 4 && COMBINABLE.includes(k));
    if (second && COMBINABLE.includes(top)) {
      secondary = second[0];
      // Answer in the order the visitor asked ("projects and contact").
      if (firstCueIndex(normalized, INTENT_CUES[secondary]!) < firstCueIndex(normalized, INTENT_CUES[top]!)) {
        [top, secondary] = [secondary, top];
      }
    }
  }

  return {
    intent: top,
    contact: top === "contact" ? contactFocus(normalized) : undefined,
    secondary,
    scores,
  };
}

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

function projectBySlug(slug: string): AriaProject {
  return P.projects.find((p) => p.slug === slug) ?? P.projects[0];
}

function rolesLine(): string {
  return P.roles.map((r) => `${r.title} at ${r.company}`).join(" and ");
}

function blocksFor(u: Understanding, intent: AriaIntent): { blocks: AriaBlock[]; text: string } {
  switch (intent) {
    case "greeting":
      return {
        blocks: [{ kind: "text", text: `Hello! I'm ARIA. Ask me anything about ${P.shortName}'s projects, experience, skills, education or how to reach him.` }],
        text: `Hello! I'm ARIA. Ask me about ${P.shortName}'s projects, experience, skills, education or contact details.`,
      };
    case "thanks":
      return { blocks: [{ kind: "text", text: "You're welcome! Anything else you'd like to know about Indra's work?" }], text: "You're welcome!" };
    case "goodbye":
      return {
        blocks: [{ kind: "text", text: `Thanks for visiting! You can reach Indra any time at ${P.email}. Press Esc or EXIT WORLD to go back to the portfolio.` }],
        text: "Goodbye!",
      };
    case "about_assistant":
      return {
        blocks: [
          {
            kind: "text",
            text: `I'm ARIA, the assistant inside ${P.shortName}'s AI world. ${P.shortName} built me into this portfolio to answer questions about his projects, experience, skills, education and contact details. My answers come only from the facts on this site and his resume, so if something isn't there, I'll tell you.`,
          },
        ],
        text: "I'm ARIA, the assistant in this portfolio's AI world. I answer from the facts on this site and Indra's resume.",
      };
    case "bio":
      return { blocks: [{ kind: "bio" }], text: `${P.summary} He currently works as ${rolesLine()}.` };
    case "experience":
      return {
        blocks: [{ kind: "experience" }],
        text: `${P.shortName} currently works as ${rolesLine()}. Start dates aren't listed on the portfolio.`,
      };
    case "projects":
      return { blocks: [{ kind: "projects" }], text: `Projects: ${P.projects.map((p) => `${p.title} (${p.category.toLowerCase()})`).join(", ")}.` };
    case "project": {
      const project = projectBySlug(u.project ?? "");
      const focus = u.focus ?? "overview";
      const links = [project.demo ? `Live: ${project.demo}` : "", project.github ? `Code: ${project.github}` : ""].filter(Boolean).join(" ");
      const text =
        focus === "stack"
          ? `${project.title} is built with ${project.stack.join(", ")}.`
          : focus === "links"
          ? `${project.title}: ${links || "no public links are listed."}`
          : `${project.title}: ${project.summary}`;
      return { blocks: [{ kind: "project", slug: project.slug, focus }], text };
    }
    case "skills":
      return {
        blocks: [{ kind: "skills" }],
        text: `Skills: ${P.skills.map((g) => `${g.label}: ${g.items.join(", ")}`).join(". ")}.`,
      };
    case "skill_check": {
      const check = checkSkill(u.tech!);
      return { blocks: [{ kind: "skills", check }], text: skillCheckSentence(check) };
    }
    case "education":
      return {
        blocks: [{ kind: "education" }],
        text: P.education.map((e) => `${e.qualification}, ${e.school} (${e.year}, ${e.score})`).join("; "),
      };
    case "certifications":
      return { blocks: [{ kind: "certifications" }], text: P.certifications.join("; ") };
    case "contact":
      return {
        blocks: [{ kind: "contact", focus: u.contact ?? "all" }],
        text: `Email ${P.email}, phone ${P.phone}, LinkedIn ${P.linkedin}, GitHub ${P.github}.`,
      };
    case "resume":
      return { blocks: [{ kind: "resume" }], text: `Indra's resume: ${P.site.replace(/\/$/, "")}${P.resume}` };
    case "location":
      return {
        blocks: [
          {
            kind: "text",
            text: `${P.shortName} is based in ${P.location}. For relocation or remote work questions, it's best to ask him directly at ${P.email}.`,
          },
        ],
        text: `Based in ${P.location}.`,
      };
    case "availability":
      return {
        blocks: [
          {
            kind: "text",
            text: `${P.availability} Rates and salary expectations aren't published here, so email ${P.email} with what you have in mind and he'll get back to you.`,
          },
          { kind: "contact", focus: "all" },
        ],
        text: P.availability,
      };
    case "ai_world":
      return {
        blocks: [
          {
            kind: "text",
            text: "You're in Indra's AI world: a 3D scene built with React Three Fiber (three.js). Use the doors at the bottom: Ask ARIA opens this chat, Projects takes you back to the projects section, and Vlogs & Media and AI Creations are coming soon. Press Esc or EXIT WORLD to return to the portfolio.",
          },
        ],
        text: "This is Indra's AI world. Use the doors at the bottom, or press Esc / EXIT WORLD to go back.",
      };
    case "personal":
      return {
        blocks: [{ kind: "text", text: "That's personal information I don't share. I can tell you about Indra's work, skills, education and how to contact him." }],
        text: "That's personal information I don't share.",
      };
    case "off_topic":
      return {
        blocks: [{ kind: "text", text: "I can only help with questions about Indra and his work: projects, experience, skills, education and contact details." }],
        text: "I only answer questions about Indra and his work.",
      };
    default:
      return {
        blocks: [
          {
            kind: "text",
            text: `I don't have that detail in Indra's portfolio. You can ask him directly at ${P.email}, or try one of the topics below.`,
          },
        ],
        text: "I don't have that detail in Indra's portfolio.",
      };
  }
}

export function skillCheckSentence(check: SkillCheck): string {
  const where = check.projects.length ? ` He used it in ${listJoin(check.projects)}.` : "";
  const item = check.item ?? check.term;
  switch (check.status) {
    case "listed":
      if (check.group === "Certifications") return "Yes. He has earned Google Cloud Skills Boost badges and moved from the Silver to the Gold League.";
      if (check.group === "Learning") {
        const topic = item.replace(/ \(in progress\)$/, "");
        return `He's currently learning ${topic.charAt(0).toLowerCase()}${topic.slice(1)}.`;
      }
      if (check.group === "Also codes in") return `Yes. He also codes in ${item}.${where}`;
      if (check.group === "Tools") return `Yes. ${item} is one of the tools he works with.${where}`;
      if (check.group === "Databases") return `Yes. ${item} is one of the databases he works with.${where}`;
      return `Yes. ${item} is one of his ${check.group ? `${check.group.toLowerCase()} ` : ""}skills.${where}`;
    case "used-in-project":
      return `Yes. He used ${check.term} in ${listJoin(check.projects)}.`;
    case "degree":
      return "His B.E. is in Artificial Intelligence & Machine Learning. In his work he focuses on full-stack web development, uses AI-assisted tools, and built a Gemini-powered chatbot into ToLetHub.";
    default:
      return `${check.term} isn't on Indra's skill list. His main stack is Java, React.js, JavaScript, Hibernate and PostgreSQL.`;
  }
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function suggestionsFor(intent: AriaIntent, project?: string): string[] {
  switch (intent) {
    case "bio":
      return ["Experience", "Projects", "Skills", "Education"];
    case "experience":
      return ["Projects", "Skills", "Contact", "Resume"];
    case "projects":
      return P.projects.map((p) => p.title);
    case "project": {
      const others = P.projects.filter((p) => p.slug !== project).slice(0, 2).map((p) => p.title);
      return ["Tech stack", "Live link", ...others, "All projects"];
    }
    case "skills":
    case "skill_check":
      return ["Does he know Python?", "Projects", "Education", "Certifications"];
    case "education":
      return ["Certifications", "Skills", "Resume"];
    case "certifications":
      return ["Education", "Skills", "Resume"];
    case "contact":
    case "availability":
      return ["Resume", "Experience", "Projects"];
    case "resume":
      return ["Contact", "Experience", "Projects"];
    default:
      return DEFAULT_SUGGESTIONS;
  }
}

export function answer(question: string, ctx: AriaContext = {}): { reply: AriaReply; ctx: AriaContext } {
  const u = understand(question, ctx);
  const primary = blocksFor(u, u.intent);
  const blocks = [...primary.blocks];
  let text = primary.text;
  if (u.secondary) {
    const extra = blocksFor(u, u.secondary);
    blocks.push(...extra.blocks);
    text = `${text} ${extra.text}`;
  }
  const nextCtx: AriaContext = {
    lastIntent: u.intent,
    lastProject: u.intent === "project" ? u.project : ctx.lastProject,
  };
  return { reply: { intent: u.intent, blocks, text, suggestions: suggestionsFor(u.intent, u.project) }, ctx: nextCtx };
}
