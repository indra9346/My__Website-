import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAI } from '../context/AIContext';
import { Canvas } from '@react-three/fiber';
import { Send, X, Radio, Bot, FolderGit2, Video, Sparkles, Lock, Play, ExternalLink } from 'lucide-react';
import WorldScene from './ai/world/WorldScene';
import type { WorldPhase } from './ai/world/physics';
import { sfx } from './ai/sfx';
import { DOORS, safeHref, youtubeId, type DoorItem } from './ai/doors';
import { answer, DEFAULT_SUGGESTIONS, type AriaContext } from './ai/aria/engine';
import AriaMessage, { type AriaChatMessage } from './ai/aria/AriaMessage';
import { ARIA_LLM_ENABLED, streamAriaAnswer, type RemoteTurn } from './ai/aria/remote';

export { DOORS, type DoorItem };

const CANVAS_GL = { powerPreference: 'high-performance' as const, antialias: true };

// Compressed copies of public/ai-world-background.mp4 (41 MB).
const WORLD_VIDEO = {
  hd: '/media/ai-world-1080.mp4', // 6.7 MB
  sd: '/media/ai-world-720.mp4', // 2.8 MB
  poster: '/media/ai-world-poster.jpg',
};

function connectionInfo() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return {
    saveData: Boolean(connection?.saveData),
    slow: /(^|-)(2g|3g)$/.test(connection?.effectiveType ?? ''),
  };
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** If the 3D scene throws (old GPU, driver issue), the world continues without it. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('3D scene unavailable, continuing without it:', error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** CSS-only warp used when the device has no WebGL. */
const FlatWarp = () => (
  <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
    {[0, 1, 2, 3].map((i) => (
      <span
        key={i}
        className="absolute rounded-full border border-neon-cyan/40 animate-ping"
        style={{ width: `${8 + i * 10}rem`, height: `${8 + i * 10}rem`, animationDelay: `${i * 220}ms`, animationDuration: '1.4s' }}
      />
    ))}
  </div>
);

// ==========================================
// 6. Gallery panel for doors activated later (vlogs, AI creations)
// ==========================================
const GalleryPanel = ({ door, onClose }: { door: DoorItem; onClose: () => void }) => {
  const [playing, setPlaying] = useState<string | null>(null);
  const items = door.items ?? [];

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center p-2 sm:p-6 pb-20 sm:pb-24">
      <div
        role="dialog"
        aria-label={door.title}
        className="w-[94%] sm:w-full max-w-lg max-h-[68vh] sm:max-h-[76vh] border border-neon-cyan/40 bg-[#020617]/95 rounded-2xl p-3 sm:p-5 shadow-[0_0_40px_rgba(3,233,244,0.25)] flex flex-col gap-2 pointer-events-auto relative overflow-hidden"
      >
        <button onClick={onClose} aria-label="Close" className="absolute top-3.5 right-3.5 text-gray-400 hover:text-neon-cyan transition-colors">
          <X size={16} />
        </button>
        <div className="flex items-center gap-2.5 border-b border-gray-800/80 pb-2 pr-6">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan">
            {door.type === 'vlogs' ? <Video size={16} /> : <Sparkles size={16} />}
          </div>
          <div>
            <h3 className="font-mono text-xs sm:text-sm font-bold text-white leading-tight">{door.title.toUpperCase()}</h3>
            <p className="text-[8px] sm:text-[10px] font-mono text-neon-cyan tracking-wider uppercase mt-0.5">{door.subtitle}</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 font-mono text-xs p-1">
          {items.length === 0 && <p className="text-slate-400 text-center py-8">Nothing here yet. Check back soon.</p>}
          {items.map((item, index) => {
            const key = `${index}-${item.title}`;
            const yt = youtubeId(item.youtube);
            const link = safeHref(item.url);
            const video = safeHref(item.video);
            const image = safeHref(item.image);
            return (
              <div key={key} className="border border-slate-800 rounded-lg bg-black/60 overflow-hidden">
                {yt &&
                  (playing === key ? (
                    <iframe
                      className="w-full aspect-video"
                      src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0`}
                      title={item.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <button onClick={() => setPlaying(key)} className="relative block w-full aspect-video group" aria-label={`Play ${item.title}`}>
                      <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" loading="lazy" className="w-full h-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                        <span className="w-12 h-12 rounded-full bg-neon-cyan/90 text-black flex items-center justify-center">
                          <Play size={20} />
                        </span>
                      </span>
                    </button>
                  ))}
                {!yt && video && <video src={video} controls preload="none" playsInline className="w-full aspect-video bg-black" />}
                {!yt && !video && image && <img src={image} alt={item.title} loading="lazy" className="w-full object-cover" />}
                <div className="p-2.5">
                  <div className="text-white font-bold">{item.title}</div>
                  {item.description && <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">{item.description}</p>}
                  {link && (
                    <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-neon-cyan hover:underline text-[11px] font-bold">
                      <ExternalLink size={11} /> Open
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const GREETING = `ONLINE & READY

I'm ARIA, the assistant in Indra's AI world. I answer from the facts on this portfolio and his resume.

Ask me about his projects (ToLetHub, I-Mall, client websites), his work at Swan Digital Solutions and Hosting Baba, his skills, education, or how to contact him.`;

let messageId = 1;
const nextId = () => ++messageId;

// ==========================================
// 7. Main Interactive Portal Component
// ==========================================
export default function AICorePortal() {
  const { aiModeState, exitAIMode, exitToSection, reducedMotion } = useAI();
  // Bot card starts closed so the 3D scene with the robot on the UAV is seen first.
  const [isBotVisible, setIsBotVisible] = useState(false);
  const [activeDoorId, setActiveDoorId] = useState<string>('ai-agent');
  const [galleryDoor, setGalleryDoor] = useState<DoorItem | null>(null);
  const [sceneFailed, setSceneFailed] = useState(() => !supportsWebGL());
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<AriaChatMessage[]>([
    { id: 1, sender: 'ai', text: GREETING, blocks: [{ kind: 'text', text: GREETING }] },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [isTyping, setIsTyping] = useState(false);
  const [worldVideo] = useState(() => {
    const { saveData, slow } = connectionInfo();
    const small = window.matchMedia?.('(max-width: 767px)').matches === true;
    return { src: saveData ? null : small || slow ? WORLD_VIDEO.sd : WORLD_VIDEO.hd };
  });

  const ariaContextRef = useRef<AriaContext>({});
  const feedRef = useRef<HTMLDivElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const timersRef = useRef<number[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const remoteFailuresRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;
    return () => {
      mountedRef.current = false;
      timers.forEach((t) => window.clearTimeout(t));
      abortRef.current?.abort();
      document.body.style.cursor = '';
    };
  }, []);

  // The 3D world is built while the boot screen and intro run ("standby"), so the
  // warp and the arrival start instantly with every shader already compiled.
  const phase: WorldPhase = aiModeState === 'world' ? 'world' : aiModeState === 'portal' ? 'portal' : 'standby';
  const [hudVisible, setHudVisible] = useState(false);
  const [arrivalFlash, setArrivalFlash] = useState(false);
  const [compact] = useState(() => window.matchMedia?.('(max-width: 639px)').matches === true);

  useEffect(() => {
    if (aiModeState === 'portal') {
      sfx.playBeep(660, 0.2, 0.02);
    } else if (aiModeState === 'world') {
      sfx.stopEntryBgm(); // Quiet when in world
      setIsBotVisible(false);
      // Light flash out of the warp, then the HUD fades in once the robot has arrived.
      setArrivalFlash(true);
      const flashTimer = window.setTimeout(() => setArrivalFlash(false), 40);
      const hudTimer = window.setTimeout(() => setHudVisible(true), reducedMotion ? 0 : 1900);
      return () => {
        window.clearTimeout(flashTimer);
        window.clearTimeout(hudTimer);
      };
    }
    return undefined;
  }, [aiModeState, reducedMotion]);

  // Keep the newest message in view.
  useEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
  }, [chatMessages, isTyping, isBotVisible]);

  // The background loop buffers during the warp and starts playing on arrival.
  useEffect(() => {
    const video = bgVideoRef.current;
    if (!video || aiModeState !== 'world') return;
    void video.play().catch(() => undefined);
  }, [aiModeState]);

  // Pause the background loop while the tab is hidden.
  useEffect(() => {
    const onVisibility = () => {
      const video = bgVideoRef.current;
      if (!video) return;
      if (document.hidden) video.pause();
      else void video.play().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Esc closes an open panel first (the AI context exits AI mode otherwise).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (galleryDoor) {
        event.preventDefault();
        setGalleryDoor(null);
      } else if (isBotVisible) {
        event.preventDefault();
        setIsBotVisible(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [galleryDoor, isBotVisible]);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      if (mountedRef.current) fn();
    }, ms);
    timersRef.current.push(id);
  };

  const handleDoorSelect = (door: DoorItem) => {
    sfx.playClick();
    if (door.status === 'locked') {
      setChatMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          sender: 'ai',
          text: `${door.title} is coming soon.`,
          blocks: [
            {
              kind: 'text',
              text: `${door.title} is coming soon.\n\nMeanwhile, ask me about Indra's projects, skills, experience or how to contact him.`,
            },
          ],
        },
      ]);
      setGalleryDoor(null);
      setIsBotVisible(true);
      return;
    }

    setActiveDoorId(door.id);
    if (door.type === 'ai') {
      setGalleryDoor(null);
      setIsBotVisible(true);
    } else if (door.type === 'projects') {
      // Leave AI mode and scroll to the Projects section of the website
      exitToSection(door.target ?? 'projects');
    } else {
      setIsBotVisible(false);
      setGalleryDoor(door);
    }
  };

  const appendLocalAnswer = useCallback((question: string, replaceId?: number) => {
    const { reply, ctx } = answer(question, ariaContextRef.current);
    ariaContextRef.current = ctx;
    const message: AriaChatMessage = { id: replaceId ?? nextId(), sender: 'ai', text: reply.text, blocks: reply.blocks, source: 'local' };
    setChatMessages((prev) => (replaceId ? prev.map((m) => (m.id === replaceId ? message : m)) : [...prev, message]));
    setSuggestions(reply.suggestions);
  }, []);

  const askRemote = async (question: string, history: AriaChatMessage[]) => {
    const controller = new AbortController();
    abortRef.current = controller;
    const id = nextId();
    setChatMessages((prev) => [...prev, { id, sender: 'ai', text: '', streaming: true, source: 'llm' }]);
    const turns: RemoteTurn[] = [...history, { id: 0, sender: 'user' as const, text: question }]
      .filter((m) => m.text.trim())
      .map((m): RemoteTurn => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

    let received = '';
    let frame = 0;
    const flush = () => {
      frame = 0;
      if (!mountedRef.current) return;
      const text = received;
      setChatMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text } : m)));
    };

    try {
      for await (const chunk of streamAriaAnswer(turns, controller.signal)) {
        received += chunk;
        if (!frame) frame = window.requestAnimationFrame(flush);
      }
      if (!received.trim()) throw new Error('empty answer');
      remoteFailuresRef.current = 0;
      if (frame) window.cancelAnimationFrame(frame);
      if (mountedRef.current) setChatMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: received, streaming: false } : m)));
      // Keep follow-ups ("what tech did it use?") working with the local engine too.
      ariaContextRef.current = answer(question, ariaContextRef.current).ctx;
    } catch {
      if (frame) window.cancelAnimationFrame(frame);
      if (!mountedRef.current) return;
      remoteFailuresRef.current += 1;
      if (received.trim()) {
        setChatMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: `${received}\n\n(connection dropped)`, streaming: false } : m)));
      } else {
        appendLocalAnswer(question, id);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const handleSendMessage = (textOverride?: string) => {
    const userText = (textOverride !== undefined ? textOverride : chatInput).trim().slice(0, 500);
    if (!userText || isTyping) return;

    const history = chatMessages.slice(1); // skip the greeting
    setChatMessages((prev) => [...prev, { id: nextId(), sender: 'user', text: userText }]);
    setChatInput('');
    setIsTyping(true);
    sfx.playClick();

    // Typed questions go to Claude when it's switched on; topic chips always use the instant local answers.
    const useRemote = ARIA_LLM_ENABLED && textOverride === undefined && remoteFailuresRef.current < 2;
    if (useRemote) {
      void askRemote(userText, history).finally(() => {
        if (!mountedRef.current) return;
        setIsTyping(false);
        sfx.playBeep(660, 0.08, 0.01);
      });
      return;
    }

    later(() => {
      appendLocalAnswer(userText);
      setIsTyping(false);
      sfx.playBeep(660, 0.08, 0.01);
    }, 220);
  };

  // EXIT WORLD: instant return to the portfolio
  const handleTriggerReturn = () => {
    sfx.playBeep(330, 0.2, 0.02);
    exitAIMode();
  };

  const showCanvas = !sceneFailed;
  const handleRobotSelect = useCallback(() => {
    setGalleryDoor(null);
    setIsBotVisible(true);
  }, []);
  const canvasDpr = useMemo<[number, number]>(() => [1, compact ? 1.5 : 1.75], [compact]);
  const canvasCamera = useMemo(() => ({ position: [0, 0, 0] as [number, number, number], fov: compact ? 68 : 55, near: 0.1, far: 250 }), [compact]);
  const handleCanvasCreated = useCallback(({ gl }: { gl: { domElement: HTMLCanvasElement } }) => {
    gl.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      setSceneFailed(true);
    });
  }, []);

  return (
    <div
      className="fixed inset-0 w-screen h-screen z-[9990] bg-[#020617] text-white overflow-hidden font-sans select-none"
      style={{ visibility: phase === 'standby' ? 'hidden' : 'visible' }}
      role="dialog"
      aria-modal={phase !== 'standby'}
      aria-hidden={phase === 'standby'}
      aria-label="AI mode"
    >
      {/* Background video (looping, muted) */}
      {(aiModeState === 'portal' || aiModeState === 'world') && (
        <div
          className="absolute inset-0 z-0 pointer-events-none overflow-hidden transition-opacity ease-out"
          style={{ opacity: aiModeState === 'world' ? 1 : 0, transitionDuration: '1200ms' }}
        >
          {worldVideo.src ? (
            <video
              ref={bgVideoRef}
              muted
              loop
              playsInline
              preload="auto"
              poster={WORLD_VIDEO.poster}
              src={worldVideo.src}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <img src={WORLD_VIDEO.poster} alt="" className="w-full h-full object-cover object-center" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-slate-950/60" />
        </div>
      )}

      {/* 3D world: warp tunnel, UAV carrier with the robot, escort drones */}
      {showCanvas && (
        <div className="absolute inset-0 z-10" style={{ touchAction: 'none' }}>
          <SceneBoundary onError={() => setSceneFailed(true)}>
            <Canvas
              dpr={canvasDpr}
              frameloop={phase === 'standby' ? 'demand' : 'always'}
              gl={CANVAS_GL}
              camera={canvasCamera}
              onCreated={handleCanvasCreated}
            >
              <Suspense fallback={null}>
                <WorldScene phase={phase} compact={compact} reducedMotion={reducedMotion} onRobotSelect={handleRobotSelect} />
              </Suspense>
            </Canvas>
          </SceneBoundary>
        </div>
      )}

      {/* Light flash out of the warp into the world */}
      {aiModeState === 'world' && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-white via-cyan-100 to-white"
          style={{ opacity: arrivalFlash ? 0.9 : 0, transition: arrivalFlash ? 'none' : 'opacity 750ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      )}

      {/* Without WebGL the warp is drawn with CSS */}
      {sceneFailed && aiModeState === 'portal' && <FlatWarp />}

      {/* HUD controls & Door Hub */}
      {aiModeState === 'world' && (
        <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-3 sm:p-6">
          {/* Top Bar Navigation */}
          <div
            className={`flex justify-between items-center w-full gap-2 z-50 transition-all duration-700 ease-out ${
              hudVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-3 pointer-events-none'
            }`}
          >
            <div className="border border-neon-cyan/30 bg-slate-950/90 px-3 py-1.5 rounded-md font-mono text-[10px] sm:text-xs text-neon-cyan flex items-center gap-2 shadow-[0_0_15px_rgba(3,233,244,0.15)]">
              <Radio size={12} className="animate-pulse" />
              <span className="font-bold tracking-wide">WHITE AI ROBOTICS WORLD</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTriggerReturn}
                className="border border-pink-500/60 text-pink-400 bg-slate-950/80 hover:bg-pink-500 hover:text-black font-mono text-[10px] sm:text-xs px-3 py-1.5 rounded-md transition-all duration-300 flex items-center gap-1 font-bold shadow-[0_0_12px_rgba(255,46,99,0.3)]"
              >
                <X size={12} />
                <span>EXIT WORLD</span>
              </button>
            </div>
          </div>

          {/* Interactive Doors Hub Bar */}
          <div
            className={`w-full flex flex-col items-center justify-end mb-1 sm:mb-3 z-40 gap-1 transition-all duration-700 ease-out delay-150 ${
              hudVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="bg-slate-950/90 border border-neon-cyan/30 rounded-xl p-2 max-w-2xl w-[98%] sm:w-auto shadow-[0_0_25px_rgba(3,233,244,0.2)]">
              <div className="text-[9px] sm:text-[10px] font-mono text-gray-400 text-center uppercase tracking-wider mb-1 font-bold flex items-center justify-center gap-1.5">
                <Bot size={11} className="text-neon-cyan" />
                <span>AI Robotics Doors Hub</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {DOORS.map((door) => {
                  const isActive = activeDoorId === door.id && (isBotVisible || galleryDoor?.id === door.id);
                  return (
                    <button
                      key={door.id}
                      onClick={() => handleDoorSelect(door)}
                      aria-label={door.status === 'locked' ? `${door.title} (coming soon)` : door.title}
                      className={`flex flex-col items-start p-2 sm:p-2.5 rounded-lg border font-mono text-left transition-all duration-300 relative overflow-hidden ${
                        door.status === 'locked'
                          ? 'border-gray-800 bg-slate-900/40 text-gray-500 cursor-not-allowed'
                          : isActive
                          ? 'border-neon-cyan bg-neon-cyan/15 text-white shadow-[0_0_15px_rgba(3,233,244,0.3)]'
                          : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-neon-cyan/50 hover:bg-slate-900/90'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-0.5">
                        <span className="text-[10px] sm:text-xs font-bold flex items-center gap-1">
                          {door.type === 'ai' && <Bot size={12} className="text-neon-cyan" />}
                          {door.type === 'projects' && <FolderGit2 size={12} className="text-green-400" />}
                          {door.type === 'vlogs' && <Video size={12} className={door.status === 'locked' ? 'text-gray-500' : 'text-neon-cyan'} />}
                          {door.type === 'creations' && <Sparkles size={12} className={door.status === 'locked' ? 'text-gray-500' : 'text-neon-cyan'} />}
                          <span>{door.title}</span>
                        </span>
                        {door.status === 'locked' ? (
                          <Lock size={10} className="text-gray-500" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        )}
                      </div>

                      <div className="text-[8px] sm:text-[9px] text-gray-400 leading-tight line-clamp-1">{door.subtitle}</div>

                      {door.status === 'locked' && (
                        <div className="absolute top-1 right-1 text-[7px] border border-gray-700 bg-black/60 px-1 rounded text-gray-400 uppercase">Soon</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {galleryDoor && <GalleryPanel door={galleryDoor} onClose={() => setGalleryDoor(null)} />}

          {/* ARIA assistant card */}
          {isBotVisible && (
            <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center p-2 sm:p-6 pb-20 sm:pb-24">
              <div
                role="dialog"
                aria-label="ARIA assistant"
                className="w-[94%] sm:w-full max-w-lg max-h-[68vh] sm:max-h-[76vh] border border-neon-cyan/40 bg-[#020617]/95 rounded-2xl p-3 sm:p-5 shadow-[0_0_40px_rgba(3,233,244,0.25)] flex flex-col gap-2 pointer-events-auto relative overflow-hidden select-text"
              >
                <button
                  onClick={() => setIsBotVisible(false)}
                  aria-label="Close ARIA"
                  className="absolute top-3.5 right-3.5 text-gray-400 hover:text-neon-cyan transition-colors"
                >
                  <X size={16} />
                </button>

                {/* Header */}
                <div className="flex items-center gap-2.5 border-b border-gray-800/80 pb-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan shadow-[0_0_10px_rgba(3,233,244,0.2)]">
                    <Bot size={16} />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs sm:text-sm font-bold text-white leading-tight">ARIA · WHITE AI INTELLIGENCE</h3>
                    <p className="text-[8px] sm:text-[10px] font-mono text-neon-cyan tracking-wider uppercase flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                      <span>{ARIA_LLM_ENABLED ? 'Online · Claude-assisted' : 'Online · Portfolio knowledge'}</span>
                    </p>
                  </div>
                </div>

                {/* Chat Feed */}
                <div
                  ref={feedRef}
                  aria-live="polite"
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin flex flex-col gap-2 font-mono text-xs p-2.5 bg-black/70 border border-gray-900 rounded-xl"
                >
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="w-full flex flex-col">
                      <AriaMessage message={msg} />
                    </div>
                  ))}
                  {isTyping && !chatMessages[chatMessages.length - 1]?.streaming && (
                    <div className="bg-slate-900/60 text-neon-cyan self-start border border-neon-cyan/20 rounded-md px-3 py-1.5 flex items-center gap-1.5 font-mono text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-[10px] text-gray-400">Thinking...</span>
                    </div>
                  )}
                </div>

                {/* Topic chips (follow the conversation) */}
                <div className="flex flex-wrap gap-1 justify-center py-0.5">
                  {suggestions.slice(0, 8).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleSendMessage(cat)}
                      disabled={isTyping}
                      className="border border-neon-cyan/30 hover:border-neon-cyan text-neon-cyan/90 hover:text-neon-cyan bg-slate-950/60 font-mono text-[9px] sm:text-[10px] px-2 py-0.5 rounded-md transition-all duration-200 font-semibold disabled:opacity-50"
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Input Controls */}
                <form
                  className="flex gap-2 pt-1 border-t border-gray-900"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSendMessage();
                  }}
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    maxLength={500}
                    enterKeyHint="send"
                    aria-label="Ask ARIA a question"
                    placeholder="Ask ARIA about projects, skills, experience..."
                    className="flex-1 min-w-0 bg-black/80 border border-gray-800 rounded-lg px-3 py-1.5 font-mono text-base sm:text-xs text-white focus:outline-none focus:border-neon-cyan placeholder:text-gray-600"
                  />
                  <button
                    type="submit"
                    disabled={isTyping || !chatInput.trim()}
                    aria-label="Send"
                    className="border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black px-3 py-1.5 rounded-lg transition-colors font-bold flex items-center justify-center disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-neon-cyan"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
