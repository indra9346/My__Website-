import { supabase } from '@/integrations/supabase/client';
import swanDigitalLogo from '@/assets/swan-digital-logo.png';
import hostingBabaLogo from '@/assets/hosting-baba-logo.png';
import sanchariMark from '@/assets/sanchari-mark.png';

// Work done at the companies below; shown first, one block per company.
export const COMPANY_CATEGORY = 'Company Projects';

// Projects built while learning (a front-end build, a Java + Hibernate back end).
export const ACADEMIC_CATEGORY = 'Academic Projects';

export const PROJECT_CATEGORIES = [COMPANY_CATEGORY, 'Client Projects', 'Personal Projects', 'Open Source', ACADEMIC_CATEGORY, 'Freelance'];

// The current workplaces listed in the About section.
export const COMPANIES = [
  { name: 'Swan Digital Solutions', role: 'Full Stack Developer', logo: swanDigitalLogo },
  { name: 'Hosting Baba', role: 'Full Stack Developer', logo: hostingBabaLogo },
];

export type ProjectStatus = 'completed' | 'ongoing';

// Matches the column default in the database.
export const DEFAULT_CATEGORY = 'Personal Projects';

export const PROJECTS_QUERY_KEY = ['projects'];

export type Project = {
  id: string;
  title: string | null;
  Description: string | null;
  Image: string | null;
  Tags: string[] | null;
  github: string | null;
  Demo: string | null;
  Display_Order: number | null;
  category: string;
  company: string | null;
  status: ProjectStatus;
  created_at: string;
};

// Used by both the public Projects section and the admin page, so the order you
// see in the admin is exactly the order visitors see. Equal order numbers fall
// back to the oldest project first instead of whatever order the database picks.
// The TileRoom app keeps its users' projects in this same table with a user_id;
// portfolio projects have none, so only those are shown and edited here.
export const fetchProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .is('user_id', null)
    .order('Display_Order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Project[];
};

// Company projects come first; the other categories appear in the order of their first project.
export const groupProjectsByCategory = (projects: Project[]) =>
  [...projects]
    .sort((a, b) => Number(b.category === COMPANY_CATEGORY) - Number(a.category === COMPANY_CATEGORY))
    .reduce((acc, project) => {
      const cat = project.category || DEFAULT_CATEGORY;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(project);
      return acc;
    }, {} as Record<string, Project[]>);

// One block per company (in COMPANIES order, then any other name), each split into ongoing and completed.
export const groupProjectsByCompany = (projects: Project[]) => {
  const names = [...new Set([...COMPANIES.map(c => c.name), ...projects.map(p => p.company || 'Other')])];
  return names
    .map(name => {
      const own = projects.filter(p => (p.company || 'Other') === name);
      return {
        name,
        company: COMPANIES.find(c => c.name === name),
        ongoing: own.filter(p => p.status === 'ongoing'),
        completed: own.filter(p => p.status !== 'ongoing'),
      };
    })
    .filter(group => group.ongoing.length + group.completed.length > 0);
};

// ---------------------------------------------------------------------------
// Project groups on the public site.
//
// The cards under the photo on the home page and the blocks of the Projects
// section are both built from buildProjectGroups(), so every card leads to a
// block that really exists and both always show the same counts.
// ---------------------------------------------------------------------------

export type ProjectGroupId = 'hosting-baba' | 'swan-digital' | 'venture' | 'client' | 'personal' | 'academic';

type ProjectGroupDefinition = {
  id: ProjectGroupId;
  /** id of the block inside the Projects section; the home-page card scrolls to it. */
  anchor: string;
  title: string;
  summary: string;
  /** Set for the two company groups: the value of the project's `company` field. */
  companyName?: string;
};

// The order here is the order of the cards and of the blocks.
export const PROJECT_GROUPS: ProjectGroupDefinition[] = [
  {
    id: 'hosting-baba',
    anchor: 'projects-hosting-baba',
    title: 'Hosting Baba Projects',
    summary: 'Marketplaces, job portals and storefronts delivered at Hosting Baba.',
    companyName: 'Hosting Baba',
  },
  {
    id: 'swan-digital',
    anchor: 'projects-swan-digital',
    title: 'Swan Digital Projects',
    summary: 'ERPs, school systems, an AI trial room and websites delivered at Swan Digital Solutions.',
    companyName: 'Swan Digital Solutions',
  },
  {
    id: 'venture',
    anchor: 'projects-venture',
    title: 'Co-Founded Venture',
    summary: 'The travel venture I co-founded. I designed and built the whole platform myself.',
  },
  {
    id: 'client',
    anchor: 'projects-client',
    title: 'Client Projects',
    summary: 'Websites and platforms delivered directly to clients.',
  },
  {
    id: 'personal',
    anchor: 'projects-personal',
    title: 'Personal & Open Source',
    summary: 'Products started on my own, with the source code public.',
  },
  {
    id: 'academic',
    anchor: 'projects-academic',
    title: 'Academic Projects',
    summary: 'Foundation projects built while learning front-end and Java back-end development.',
  },
];

// Sanchari Trips is not a row in the projects table: it is the one venture of my own,
// so it is described here and shown as a spotlight instead of a regular card.
export const VENTURE = {
  name: 'Sanchari Trips',
  role: 'Co-Founder & Technical Head',
  url: 'https://www.sancharitrips.com',
  host: 'sancharitrips.com',
  image: '/projects/sanchari-trips.jpg',
  logo: sanchariMark,
  summary:
    'Small-group road trips from Bengaluru in a six-seat car. I designed and built the whole platform, from the booking flow and payments to the admin panel the team works in.',
  highlights: [
    'Live seat map: travellers pick their own seat in the car',
    'Direct UPI payments with QR code and UTR confirmation',
    'Offers, coupons and a creator programme',
    'Kannada and English language switch',
    'Chat guide that answers from live trip data',
    'Smart search across 430 places in Karnataka',
    'Admin panel for bookings, payments, trips, media and staff access',
    'Money and seat rules covered by automated tests',
  ],
  tags: ['Next.js', 'React', 'TypeScript', 'Supabase', 'PostgreSQL', 'Tailwind CSS', 'Three.js', 'Vitest', 'Vercel'],
};

// Saved before the "Academic Projects" category existed. They are shown as academic
// while they still carry the default category; once their category is changed in
// Admin > Manage Projects this list is no longer needed.
const ACADEMIC_BEFORE_CATEGORY = new Set([
  'f18d3eda-50ec-403f-9f45-717c5e06c3bf', // I_Mall - Frontend Project
  '736d49be-28ed-4bd6-9fda-0fc4bb06237a', // Student Data Management - Backend Project
]);

const groupIdOf = (project: Project): ProjectGroupId => {
  const category = project.category || DEFAULT_CATEGORY;
  if (category === COMPANY_CATEGORY) {
    return PROJECT_GROUPS.find(group => group.companyName && group.companyName === project.company)?.id ?? 'client';
  }
  if (category === ACADEMIC_CATEGORY) return 'academic';
  if (category === DEFAULT_CATEGORY && ACADEMIC_BEFORE_CATEGORY.has(project.id)) return 'academic';
  if (category === 'Client Projects' || category === 'Freelance') return 'client';
  return 'personal';
};

export type ProjectGroup = ProjectGroupDefinition & {
  company?: (typeof COMPANIES)[number];
  projects: Project[];
  ongoing: Project[];
  completed: Project[];
  /** Entries shown in the block; the venture spotlight counts as one. */
  count: number;
};

// Groups in display order; a group with nothing in it is left out.
export const buildProjectGroups = (projects: Project[]): ProjectGroup[] =>
  PROJECT_GROUPS.map(definition => {
    const own = projects.filter(project => groupIdOf(project) === definition.id);
    return {
      ...definition,
      company: COMPANIES.find(company => company.name === definition.companyName),
      projects: own,
      ongoing: own.filter(project => project.status === 'ongoing'),
      completed: own.filter(project => project.status !== 'ongoing'),
      count: own.length + (definition.id === 'venture' ? 1 : 0),
    };
  }).filter(group => group.count > 0);

// "4 projects · 1 ongoing"; the venture shows its name instead of a count.
export const projectGroupMeta = (group: ProjectGroup) => {
  if (group.id === 'venture') return `${VENTURE.name} · live`;
  const total = `${group.count} ${group.count === 1 ? 'project' : 'projects'}`;
  return group.ongoing.length > 0 ? `${total} · ${group.ongoing.length} ongoing` : total;
};

const QUOTES = '"“”';
const WRAPPED_IN_QUOTES = new RegExp(`^[${QUOTES}]([^${QUOTES}]*)[${QUOTES}],?$`);

// Text pasted from JSON arrives as "\"I_Mall\"," - keep only what is inside the quotes.
export const cleanText = (value: string) => {
  const text = value.trim();
  const match = text.match(WRAPPED_IN_QUOTES);
  return match ? match[1].trim() : text;
};

const TAG_EDGES = /^[\s[\]"“”'‘’]+|[\s[\]"“”'‘’]+$/g;

// Accepts "React, Vite", one tag per line, or a pasted JSON list like ["React", "Vite"].
export const parseTags = (input: string): string[] => {
  const text = input.trim();
  if (!text) return [];

  let parts: string[];
  try {
    const parsed = JSON.parse(text);
    parts = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    parts = [text];
  }

  const seen = new Set<string>();
  const tags: string[] = [];
  for (const piece of parts.flatMap((part) => part.split(/[,\n]/))) {
    const tag = piece.replace(TAG_EDGES, '');
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
};

// '' -> null, 'github.com/me/repo' -> 'https://github.com/me/repo'.
// Image paths inside the site (e.g. /mypic.jpg) are kept as they are.
export const normalizeLink = (value: string, label: string, allowSitePath = false): string | null => {
  const text = cleanText(value);
  if (!text) return null;
  if (allowSitePath && /^\.?\//.test(text) && !text.startsWith('//')) return text;

  const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(text) || /^(javascript|data|vbscript|mailto|tel):/i.test(text);
  const withScheme = hasScheme ? text : `https://${text.replace(/^\/\//, '')}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`${label} is not a valid link.`);
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || !url.hostname.includes('.')) {
    throw new Error(`${label} must be a web address like https://example.com.`);
  }
  return withScheme;
};

// Compares titles the way a person would: case, spacing and quotes do not count.
export const titleKey = (title: string | null) =>
  cleanText(title || '').replace(/\s+/g, ' ').toLowerCase();
