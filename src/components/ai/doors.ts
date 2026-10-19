// Doors in the AI world's hub.
//
// To open a locked door later, change its `status` to 'active' and add
// `items` (YouTube links, videos, images or plain links). The hub, the
// gallery panel and the "coming soon" message all follow this list, so no
// other code needs to change.
//
// Example:
//   { id: 'vlogs', ..., status: 'active', items: [
//       { title: 'Building ToLetHub', youtube: 'https://youtu.be/VIDEO_ID' },
//       { title: 'Portfolio walkthrough', video: '/media/walkthrough.mp4' },
//   ] }

export interface DoorMedia {
  title: string;
  description?: string;
  /** YouTube URL or 11-character video id. */
  youtube?: string;
  /** Video file URL (e.g. /media/clip.mp4). */
  video?: string;
  /** Image URL. */
  image?: string;
  /** Link to open in a new tab. */
  url?: string;
}

export interface DoorItem {
  id: string;
  title: string;
  subtitle: string;
  /** Shown when the card is tapped open. */
  description: string;
  highlights: string[];
  /** Label of the main button on the card. */
  cta: string;
  type: 'ai' | 'projects' | 'vlogs' | 'creations';
  status: 'active' | 'locked';
  /** Section of the home page to return to (projects door). */
  target?: string;
  /** Content shown when a gallery door (vlogs / creations) is active. */
  items?: DoorMedia[];
}

export const DOORS: DoorItem[] = [
  {
    id: 'ai-agent',
    title: 'AI Agent (ARIA)',
    subtitle: "Ask about Indra's work",
    description: "ARIA is the assistant of this world. She answers from the facts on this portfolio and Indra's resume: projects, experience, skills, education and how to reach him.",
    highlights: ['Instant answers about projects and roles', 'Follow-up questions keep context', 'Links to live demos and source code'],
    cta: 'Talk to ARIA',
    type: 'ai',
    status: 'active',
  },
  {
    id: 'projects',
    title: 'Projects Hub',
    subtitle: 'ToLetHub, I-Mall & Projects',
    description: 'Client and personal builds: rental platforms, e-commerce, ERPs and business websites, with live demos and code where they are public.',
    highlights: ['ToLetHub and I-Mall', 'Client websites and ERPs', 'Opens the Projects section of the portfolio'],
    cta: 'Open the projects',
    type: 'projects',
    status: 'active',
    target: 'projects',
  },
  {
    id: 'vlogs',
    title: 'Vlogs & Media',
    subtitle: 'Tech Talks & Video Streams',
    description: 'Build logs, walkthroughs and tech talks from the projects in this portfolio. The first episodes are being edited now.',
    highlights: ['Project walkthroughs', 'Behind-the-build vlogs', 'Tech talks and tutorials'],
    cta: 'Ask ARIA about the vlogs',
    type: 'vlogs',
    status: 'locked',
    items: [],
  },
  {
    id: 'ai-creations',
    title: 'AI Creations',
    subtitle: 'Generative AI & ML Experiments',
    description: 'Experiments with generative AI and machine learning: assistants, image and video generation, and automation built into real products.',
    highlights: ['AI assistants like ARIA', 'Generative media experiments', 'ML-powered automation'],
    cta: 'Ask ARIA about AI experiments',
    type: 'creations',
    status: 'locked',
    items: [],
  },
];

/** Accepts a YouTube URL (watch, youtu.be, shorts, embed) or a bare id. */
export function youtubeId(input: string | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.endsWith('youtu.be')) return url.pathname.slice(1, 12) || null;
    const v = url.searchParams.get('v');
    if (v) return v.slice(0, 11);
    const match = url.pathname.match(/\/(shorts|embed|live)\/([\w-]{11})/);
    return match ? match[2] : null;
  } catch {
    return null;
  }
}

export function safeHref(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/')) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}
