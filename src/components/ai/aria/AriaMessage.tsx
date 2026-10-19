import { Fragment, type ReactNode } from 'react';
import { Activity, Award, Briefcase, Cpu, ExternalLink, FolderGit2, Github, Shield } from 'lucide-react';
import { ARIA_PROFILE } from '../../../../supabase/functions/_shared/aria-knowledge';
import { skillCheckSentence, type AriaBlock } from './engine';
import { ZoomableCard } from '../HoloFocus';

const P = ARIA_PROFILE;

export interface AriaChatMessage {
  id: number;
  sender: 'ai' | 'user';
  text: string;
  blocks?: AriaBlock[];
  streaming?: boolean;
  source?: 'local' | 'llm';
}

const cardBase = 'border bg-slate-950/90 p-3 rounded-lg flex flex-col gap-1.5 font-mono text-xs w-full';
const cyanCard = `${cardBase} border-neon-cyan/30`;
const headerCyan = 'text-neon-cyan border-b border-neon-cyan/20 pb-1 font-bold tracking-wider flex items-center gap-1.5 text-xs sm:text-sm';
const linkClass = 'text-neon-cyan hover:underline font-bold break-all';

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  const external = /^https?:/.test(href);
  return (
    <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className={linkClass}>
      {children}
    </a>
  );
}

/** Turns URLs and email addresses in plain text into links (no HTML injection). */
export function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          const clean = part.replace(/[.,;:]+$/, '');
          return (
            <Fragment key={i}>
              <ExtLink href={clean}>{clean.replace(/^https?:\/\//, '')}</ExtLink>
              {part.slice(clean.length)}
            </Fragment>
          );
        }
        if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(part)) {
          return (
            <ExtLink key={i} href={`mailto:${part}`}>
              {part}
            </ExtLink>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

function ProjectLinks({ demo, github }: { demo: string | null; github: string | null }) {
  if (!demo && !github) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {demo && (
        <a
          href={demo}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-neon-cyan/60 text-neon-cyan hover:bg-neon-cyan hover:text-black px-2.5 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
        >
          <ExternalLink size={11} /> LIVE SITE
        </a>
      )}
      {github && (
        <a
          href={github}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-purple-500/50 text-purple-300 hover:bg-purple-500 hover:text-black px-2.5 py-1 rounded text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
        >
          <Github size={11} /> SOURCE CODE
        </a>
      )}
    </div>
  );
}

function BlockView({ block }: { block: AriaBlock }) {
  switch (block.kind) {
    case 'text':
      return (
        <div className="whitespace-pre-wrap text-slate-200 leading-relaxed font-mono">
          <Linkified text={block.text} />
        </div>
      );

    case 'bio':
      return (
        <div className={cyanCard}>
          <div className={headerCyan}>
            <Shield size={14} />
            <span>[ INDRA KUMAR - PROFILE SUMMARY ]</span>
          </div>
          <p className="text-slate-200 leading-relaxed">{P.summary}</p>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Currently: {P.roles.map((r) => `${r.title} at ${r.company}`).join(' and ')}. Based in {P.location}.
          </p>
        </div>
      );

    case 'experience':
      return (
        <div className={cyanCard}>
          <div className={headerCyan}>
            <Briefcase size={14} />
            <span>[ CURRENT ROLES ]</span>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            {P.roles.map((role) => (
              <div key={role.company} className="border-l-2 border-neon-cyan/60 pl-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white">{role.company}</span>
                  <span className="text-[9px] border border-emerald-500/40 text-emerald-400 px-1.5 py-0.5 rounded font-bold shrink-0">{role.status.toUpperCase()}</span>
                </div>
                <div className="text-neon-cyan text-[11px]">{role.title}</div>
                <div className="text-slate-400 text-[11px] leading-relaxed">{role.summary}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'projects':
      return (
        <div className={cyanCard}>
          <div className="text-neon-cyan border-b border-neon-cyan/20 pb-1 font-bold tracking-wider flex items-center justify-between">
            <span>[ PROJECTS ]</span>
            <span className="text-[10px] text-slate-400 font-normal">{P.projects.length} ITEMS</span>
          </div>
          <div className="flex flex-col gap-2 mt-1 w-full">
            {P.projects.map((project) => (
              <div key={project.slug} className="border border-slate-800 p-2.5 rounded bg-black/60">
                <div className="text-white font-bold flex justify-between items-center gap-2 text-xs">
                  <span>{project.title.toUpperCase()}</span>
                  <span
                    className={`text-[9px] border px-1.5 py-0.5 rounded font-bold shrink-0 ${
                      project.category === 'Client project' ? 'border-neon-cyan/40 text-neon-cyan' : 'border-purple-500/40 text-purple-400'
                    }`}
                  >
                    {project.category.toUpperCase()}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] mt-1 leading-relaxed">{project.summary}</div>
                <ProjectLinks demo={project.demo} github={project.github} />
              </div>
            ))}
          </div>
        </div>
      );

    case 'project': {
      const project = P.projects.find((p) => p.slug === block.slug) ?? P.projects[0];
      return (
        <div className={cyanCard}>
          <div className={headerCyan}>
            <FolderGit2 size={14} />
            <span>[ PROJECT: {project.title.toUpperCase()} ]</span>
          </div>
          <div className="text-[9px] text-slate-400 tracking-wider">{project.category.toUpperCase()}</div>
          {block.focus !== 'links' && <p className="text-slate-200 leading-relaxed">{project.summary}</p>}
          {block.focus === 'overview' && (
            <div className="text-slate-300 flex flex-col gap-1 text-[11px] mt-0.5">
              {project.highlights.map((h) => (
                <div key={h}>• {h}</div>
              ))}
            </div>
          )}
          {block.focus !== 'links' && (
            <div className="text-[11px] mt-1">
              <span className="text-slate-400">Tech stack: </span>
              <span className="text-green-400">{project.stack.join(' · ')}</span>
            </div>
          )}
          {block.focus === 'links' && !project.demo && !project.github && (
            <p className="text-slate-300 text-[11px]">No public links are listed for this project.</p>
          )}
          <ProjectLinks demo={project.demo} github={project.github} />
        </div>
      );
    }

    case 'skills':
      return (
        <div className={cyanCard}>
          <div className={headerCyan}>
            <Cpu size={14} />
            <span>[ TECH STACK ]</span>
          </div>
          {block.check && <p className="text-slate-200 leading-relaxed">{skillCheckSentence(block.check)}</p>}
          <div className="flex flex-col gap-1.5 mt-1">
            {P.skills.map((group) => (
              <div key={group.label} className="grid grid-cols-[88px_1fr] sm:grid-cols-[110px_1fr] gap-2 text-[11px]">
                <span className="text-slate-400">{group.label}:</span>
                <span className="text-green-400 leading-relaxed">{group.items.join(' · ')}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'education':
      return (
        <div className="border border-purple-500/30 bg-slate-950/90 p-3 rounded-lg flex flex-col gap-1.5 font-mono text-xs w-full">
          <div className="text-purple-400 border-b border-purple-500/20 pb-1 font-bold tracking-wider flex items-center gap-1.5">
            <Activity size={14} />
            <span>[ ACADEMIC QUALIFICATIONS ]</span>
          </div>
          <div className="flex flex-col gap-2 mt-1 text-slate-300">
            {P.education.map((e) => (
              <div key={e.school} className="border-l-2 border-purple-400 pl-2.5">
                <div className="font-bold text-white">
                  {e.qualification} ({e.year})
                </div>
                <div className="text-gray-400">
                  {e.school} | {e.score}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'certifications':
      return (
        <div className="border border-purple-500/30 bg-slate-950/90 p-3 rounded-lg flex flex-col gap-1.5 font-mono text-xs w-full">
          <div className="text-purple-400 border-b border-purple-500/20 pb-1 font-bold tracking-wider flex items-center gap-1.5">
            <Award size={14} />
            <span>[ CERTIFICATIONS & ACHIEVEMENTS ]</span>
          </div>
          <div className="flex flex-col gap-1 mt-1 text-slate-300 text-[11px]">
            {P.certifications.map((c) => (
              <div key={c}>• {c}</div>
            ))}
          </div>
          <div className="text-[11px] mt-1">
            <ExtLink href={P.googleSkills}>View Google Cloud Skills Boost profile</ExtLink>
          </div>
        </div>
      );

    case 'contact': {
      const rows: { key: string; label: string; node: ReactNode }[] = [
        { key: 'email', label: 'Email', node: <ExtLink href={`mailto:${P.email}`}>{P.email}</ExtLink> },
        { key: 'phone', label: 'Phone', node: <ExtLink href={P.phoneHref}>{P.phone}</ExtLink> },
        { key: 'linkedin', label: 'LinkedIn', node: <ExtLink href={P.linkedin}>linkedin.com/in/k-s-indra-kumar-7049b1289</ExtLink> },
        { key: 'github', label: 'GitHub', node: <ExtLink href={P.github}>github.com/indra9346</ExtLink> },
        { key: 'location', label: 'Location', node: <span className="text-white font-bold">{P.location}</span> },
      ];
      const ordered = block.focus === 'all' ? rows : [...rows.filter((r) => r.key === block.focus), ...rows.filter((r) => r.key !== block.focus)];
      return (
        <div className="border border-pink-500/30 bg-slate-950/90 p-3 rounded-lg flex flex-col gap-1.5 font-mono text-xs w-full">
          <div className="text-pink-400 border-b border-pink-500/20 pb-1 font-bold tracking-wider">
            <span>[ DIRECT CONTACT CHANNELS ]</span>
          </div>
          <div className="flex flex-col gap-1.5 mt-1 text-slate-300">
            {ordered.map((row) => (
              <div key={row.key}>
                {row.label}: {row.node}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'resume':
      return (
        <div className="border border-pink-500/30 bg-slate-950/90 p-3 rounded-lg flex flex-col gap-1.5 font-mono text-xs w-full">
          <div className="text-pink-400 border-b border-pink-500/20 pb-1 font-bold tracking-wider">
            <span>[ RESUME ]</span>
          </div>
          <div className="text-slate-300 mt-1">
            Indra's resume (PDF, one page):
            <div className="mt-2.5">
              <a
                href={P.resume}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-neon-cyan text-neon-cyan px-3.5 py-2 rounded hover:bg-neon-cyan hover:text-black transition-all inline-block text-xs font-bold shadow-[0_0_12px_rgba(3,233,244,0.2)]"
              >
                OPEN RESUME (PDF)
              </a>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

const BLOCK_LABEL: Record<string, string> = {
  bio: 'Profile summary',
  experience: 'Current roles',
  projects: 'Projects',
  project: 'Project',
  skills: 'Tech stack',
  education: 'Education',
  contact: 'Contact',
  certifications: 'Certifications',
  resume: 'Resume',
};

export default function AriaMessage({ message }: { message: AriaChatMessage }) {
  if (message.sender === 'user') {
    return <div className="text-right text-neon-cyan font-semibold break-words">{message.text}</div>;
  }
  if (message.blocks?.length) {
    return (
      <div className="flex flex-col gap-2">
        {message.blocks.map((block, i) => (
          block.kind === 'text' ? (
            <BlockView key={i} block={block} />
          ) : (
            // Data cards pop out into the large holographic view when tapped.
            <ZoomableCard key={i} id={`msg-${message.id}-${i}`} label={BLOCK_LABEL[block.kind] ?? 'Card'}>
              <BlockView block={block} />
            </ZoomableCard>
          )
        ))}
      </div>
    );
  }
  return (
    <div className="whitespace-pre-wrap text-slate-200 leading-relaxed font-mono">
      <Linkified text={message.text} />
      {message.streaming && <span className="inline-block w-1.5 h-3 bg-neon-cyan/80 ml-0.5 align-middle animate-pulse" />}
    </div>
  );
}
