import { supabase } from '@/integrations/supabase/client';

export const PROJECT_CATEGORIES = ['Client Projects', 'Personal Projects', 'Open Source', 'Freelance'];

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
  created_at: string;
};

// Used by both the public Projects section and the admin page, so the order you
// see in the admin is exactly the order visitors see. Equal order numbers fall
// back to the oldest project first instead of whatever order the database picks.
export const fetchProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('Display_Order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Project[];
};

// Categories appear in the order of their first project.
export const groupProjectsByCategory = (projects: Project[]) =>
  projects.reduce((acc, project) => {
    const cat = project.category || DEFAULT_CATEGORY;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

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
