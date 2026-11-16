import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowDownCircle, ArrowDownRight, FileText, GraduationCap, Mail, MapPin } from 'lucide-react';
import { useAI } from '../context/AIContext';
import PeekingRobotButton from './ai/PeekingRobotButton';
import ProjectGroupMark from './projects/ProjectGroupMark';
import swanDigitalLogo from '../assets/swan-digital-logo.png';
import hostingBabaLogo from '../assets/hosting-baba-logo.png';
import photo480 from '../assets/profile/indra-kumar-fullstack-480.webp';
import photo720 from '../assets/profile/indra-kumar-fullstack-720.webp';
import photo1086 from '../assets/profile/indra-kumar-fullstack-1086.webp';
import { PROJECTS_QUERY_KEY, PROJECT_GROUPS, buildProjectGroups, fetchProjects, projectGroupMeta } from '@/lib/projects';
import { goToProjectGroup } from '@/lib/smoothScroll';

const ROLES = ['Full Stack Developer', 'Software Developer', 'Java Developer', 'AI/ML Enthusiast', 'Web Developer'];

const CURRENT_ROLES = [
  { company: 'Hosting Baba', title: 'Full Stack Developer', logo: hostingBabaLogo, wide: true },
  { company: 'Swan Digital Solutions', title: 'Full Stack Developer', logo: swanDigitalLogo, wide: false },
];

const CORE_STACK = ['React', 'TypeScript', 'Next.js', 'Java', 'PostgreSQL', 'Supabase'];

const rise = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };

// The role line types itself. Kept in its own component so only this text is
// redrawn on every keystroke, not the whole hero.
const TypedRole = () => {
  const reducedMotion = useReducedMotion();
  const [roleIndex, setRoleIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const role = ROLES[roleIndex];
    let timer: ReturnType<typeof setTimeout>;
    if (!deleting) {
      timer = text.length < role.length ? setTimeout(() => setText(role.slice(0, text.length + 1)), 80) : setTimeout(() => setDeleting(true), 2000);
    } else if (text.length > 0) {
      timer = setTimeout(() => setText(text.slice(0, -1)), 40);
    } else {
      setDeleting(false);
      setRoleIndex((index) => (index + 1) % ROLES.length);
      return undefined;
    }
    return () => clearTimeout(timer);
  }, [text, deleting, roleIndex, reducedMotion]);

  if (reducedMotion) return <>{ROLES[0]}</>;
  return (
    <>
      {text}
      <span className="hero-caret" />
    </>
  );
};

// The photo leans a few degrees towards the pointer, like a card held in the hand.
const HeroPhoto = () => {
  const reducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const x = useSpring(pointerX, { stiffness: 140, damping: 18 });
  const y = useSpring(pointerY, { stiffness: 140, damping: 18 });
  const rotateY = useTransform(x, [0, 1], [-6, 6]);
  const rotateX = useTransform(y, [0, 1], [5, -5]);
  const glareX = useTransform(x, [0, 1], [15, 85]);
  const glareY = useTransform(y, [0, 1], [10, 90]);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.5), transparent 45%)`;

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType !== 'mouse' || !cardRef.current) return;
    const box = cardRef.current.getBoundingClientRect();
    pointerX.set((event.clientX - box.left) / box.width);
    pointerY.set((event.clientY - box.top) / box.height);
  };
  const onLeave = () => {
    pointerX.set(0.5);
    pointerY.set(0.5);
  };

  return (
    <motion.figure
      className="hero-photo"
      initial={{ opacity: 0, y: 26, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="hero-photo-float">
        <span className="hero-photo-glow" aria-hidden="true" />
        <span className="hero-photo-outline foil-frame" aria-hidden="true" />
        <motion.div ref={cardRef} className="hero-photo-card foil-frame" style={{ rotateX, rotateY }} onPointerMove={onMove} onPointerLeave={onLeave}>
          <img
            src={photo720}
            srcSet={`${photo480} 480w, ${photo720} 720w, ${photo1086} 1086w`}
            sizes="(min-width: 1280px) 440px, (min-width: 1024px) 400px, (min-width: 480px) 420px, 92vw"
            width={1086}
            height={1448}
            alt="K S Indra Kumar, Full-Stack Developer, at his desk with a laptop"
            decoding="async"
            {...{ fetchpriority: 'high' }}
          />
          <motion.span className="hero-photo-glare" style={{ background: glare }} aria-hidden="true" />
        </motion.div>
      </div>
    </motion.figure>
  );
};

// One card per group of projects. A tap travels to that group in the Projects
// section. The counts come from the same data the section itself shows.
const WorkCards = () => {
  const { data: projects, isError } = useQuery({ queryKey: PROJECTS_QUERY_KEY, queryFn: fetchProjects });
  const groups = projects ? buildProjectGroups(projects) : null;
  const cards = groups ?? PROJECT_GROUPS;
  const total = groups?.reduce((sum, group) => sum + group.count, 0);

  const open = (event: MouseEvent<HTMLAnchorElement>, anchor: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    goToProjectGroup(anchor);
  };

  return (
    <motion.nav className="hero-work" aria-label="Project groups" variants={stagger} initial="hidden" animate="visible">
      <motion.div className="hero-work-head" variants={rise}>
        <h2 className="hero-work-title">Explore my work</h2>
        <span className="hero-work-rule" aria-hidden="true" />
        {total !== undefined && (
          <span className="hero-work-count">
            {total} projects in {cards.length} groups
          </span>
        )}
      </motion.div>
      <div className="work-grid">
        {cards.map((card, index) => {
          const group = groups?.find((item) => item.id === card.id);
          return (
            <motion.a key={card.id} href={`#${card.anchor}`} className="work-card foil-frame" variants={rise} onClick={(event) => open(event, card.anchor)}>
              <span className="work-card-top">
                <ProjectGroupMark id={card.id} />
                <ArrowDownRight className="work-card-arrow" size={18} aria-hidden="true" />
              </span>
              <span className="work-card-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="work-card-title">{card.title}</span>
              <span className="work-card-meta">
                {group ? projectGroupMeta(group) : isError ? 'Open this group' : <span className="work-card-meta-wait" aria-label="Loading" />}
              </span>
            </motion.a>
          );
        })}
      </div>
    </motion.nav>
  );
};

const HeroSection = () => {
  const { enterAIMode } = useAI();

  return (
    <section id="home" className="hero">
      <div className="hero-inner container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="hero-grid">
          <motion.header className="hero-intro" variants={stagger} initial="hidden" animate="visible">
            <motion.p className="hero-eyebrow" variants={rise}>
              <MapPin size={13} aria-hidden="true" />
              Bengaluru, India
            </motion.p>
            <motion.p className="hero-hello" variants={rise}>
              Hi, I'm
            </motion.p>
            <motion.h1 className="hero-name" variants={rise}>
              K S Indra{' '}
              <span className="hero-name-accent">
                Kumar
                <svg viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    {/* the underline runs from gold foil into silver foil */}
                    <linearGradient id="hero-foil-line" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#b8891f" />
                      <stop offset="0.3" stopColor="#fff4c2" />
                      <stop offset="0.55" stopColor="#e3c05c" />
                      <stop offset="0.8" stopColor="#f4f6f9" />
                      <stop offset="1" stopColor="#8b93a0" />
                    </linearGradient>
                  </defs>
                  <path d="M3 10 C 48 2, 122 2, 197 8" fill="none" stroke="url(#hero-foil-line)" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </motion.h1>
            <motion.p className="hero-role" variants={rise} aria-label={ROLES[0]}>
              <span aria-hidden="true">
                <span className="hero-role-prompt">&gt;</span>
                <TypedRole />
              </span>
            </motion.p>
          </motion.header>

          <HeroPhoto />

          <WorkCards />

          <motion.div className="hero-body" variants={stagger} initial="hidden" animate="visible">
            <motion.p className="hero-summary" variants={rise}>
              I design, build and ship complete web products: marketplaces, job portals, ERPs and AI-assisted tools, from the database to the
              deployed interface.
            </motion.p>

            <motion.div variants={rise}>
              <p className="hero-label">
                <span className="hero-live-dot" aria-hidden="true" />
                Currently working as
              </p>
              <ul className="hero-roles">
                {CURRENT_ROLES.map((role) => (
                  <li key={role.company} className="hero-role-card foil-frame">
                    <span className={`group-mark ${role.wide ? 'group-mark-wide' : 'group-mark-round'}`}>
                      <img src={role.logo} alt="" />
                    </span>
                    <span className="min-w-0">
                      <strong>{role.title}</strong>
                      <small>{role.company}</small>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="hero-fact">
                <GraduationCap size={17} aria-hidden="true" />
                <span>B.E. in Artificial Intelligence &amp; Machine Learning, SJC Institute of Technology (2026)</span>
              </p>
            </motion.div>

            <motion.ul className="hero-stack" variants={rise} aria-label="Core stack">
              {CORE_STACK.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </motion.ul>

            <motion.div className="hero-actions" variants={rise}>
              <a href="#projects" className="hero-cta hero-cta-primary">
                View my work
                <ArrowDown size={17} aria-hidden="true" />
              </a>
              <a href="/resume.pdf" target="_blank" rel="noopener noreferrer" className="hero-cta hero-cta-ghost">
                <FileText size={17} aria-hidden="true" />
                View Resume
              </a>
              <a href="#contact" className="hero-cta hero-cta-ghost">
                <Mail size={17} aria-hidden="true" />
                Get in touch
              </a>
            </motion.div>

            {/* A small robot lives in this button: it peeks out and beckons visitors in. */}
            <motion.div className="hero-ai" variants={rise}>
              <PeekingRobotButton onClick={enterAIMode} />
            </motion.div>
          </motion.div>
        </div>

        <div className="hero-scroll">
          <motion.a href="#about" aria-label="Scroll to About" animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
            <ArrowDownCircle className="text-gray-300 hover:text-neon-cyan transition-colors" size={28} />
          </motion.a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
