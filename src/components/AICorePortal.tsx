import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAI } from '../context/AIContext';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Volume2, VolumeX, Send, X, Radio, Bot, FolderGit2, Video, Sparkles, Lock, Play, ExternalLink } from 'lucide-react';
import { sfx } from './ai/sfx';
import { DOORS, safeHref, youtubeId, type DoorItem } from './ai/doors';
import { answer, DEFAULT_SUGGESTIONS, type AriaContext } from './ai/aria/engine';
import AriaMessage, { type AriaChatMessage } from './ai/aria/AriaMessage';
import { ARIA_LLM_ENABLED, streamAriaAnswer, type RemoteTurn } from './ai/aria/remote';

export { DOORS, type DoorItem };

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

// ==========================================
// 1. 3D Space Warp Tunnel (R3F Component)
// ==========================================
const SpaceTunnel = ({ speed }: { speed: number }) => {
  const tunnelRef = useRef<THREE.Group>(null);
  const ringCount = 20;

  useFrame((_, rawDelta) => {
    if (!tunnelRef.current) return;
    const delta = Math.min(rawDelta, 0.05); // no jumps after a background tab
    tunnelRef.current.children.forEach((child) => {
      child.position.z += speed * delta * 5;
      if (speed > 0 && child.position.z > 5) {
        child.position.z = -100;
      } else if (speed < 0 && child.position.z < -100) {
        child.position.z = 5;
      }
      child.rotation.z += 0.005;
    });
  });

  return (
    <>
      {/* Star field stays put; only the rings fly past */}
      <Stars radius={100} depth={50} count={3000} factor={6} saturation={0.5} fade speed={2} />
      <group ref={tunnelRef}>
        {Array.from({ length: ringCount }).map((_, i) => {
          const z = -(i * (100 / ringCount));
          const color = i % 2 === 0 ? '#03e9f4' : '#7B2CBF';
          return (
            <mesh key={i} position={[0, 0, z]}>
              <torusGeometry args={[3.5, 0.05, 8, 32]} />
              <meshBasicMaterial color={color} transparent opacity={0.6} />
            </mesh>
          );
        })}
      </group>
    </>
  );
};

// ==========================================
// 2. 3D Tactical Escort Quadcopter Drone (Pure 3D Metallic Mesh & Spinning Rotors)
// ==========================================
const EscortDrone3D = ({ offset }: { offset: [number, number, number] }) => {
  const droneRef = useRef<THREE.Group>(null);
  const rotorGroupRef = useRef<THREE.Group>(null);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = state.clock.getElapsedTime();
    if (droneRef.current) {
      droneRef.current.position.x = offset[0] + Math.sin(t * 1.2 + offset[0]) * 0.35;
      droneRef.current.position.y = offset[1] + Math.cos(t * 1.5 + offset[1]) * 0.25;
      droneRef.current.position.z = offset[2] + Math.sin(t * 0.9 + offset[2]) * 0.25;
      droneRef.current.rotation.z = Math.sin(t * 1.2) * 0.06;
    }
    if (rotorGroupRef.current) {
      rotorGroupRef.current.children.forEach((rotor) => {
        rotor.rotation.y += delta * 25;
      });
    }
  });

  return (
    <group ref={droneRef} position={offset}>
      {/* Carbon Fiber Stealth Fuselage Hull */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.9, 0.22, 0.7]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Sensor Pod & Cyan Camera Lens */}
      <mesh position={[0, -0.15, 0.25]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#03e9f4" emissive="#03e9f4" emissiveIntensity={1.5} />
      </mesh>

      {/* 4 Rotor Arms */}
      {[
        [-0.55, 0, 0.45],
        [0.55, 0, 0.45],
        [-0.55, 0, -0.45],
        [0.55, 0, -0.45],
      ].map((armPos, idx) => (
        <mesh key={idx} position={armPos as [number, number, number]}>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
      ))}

      {/* 4 Spinning Rotor Discs */}
      <group ref={rotorGroupRef}>
        {[
          [-0.7, 0.1, 0.6],
          [0.7, 0.1, 0.6],
          [-0.7, 0.1, -0.6],
          [0.7, 0.1, -0.6],
        ].map((pos, idx) => (
          <mesh key={idx} position={pos as [number, number, number]}>
            <cylinderGeometry args={[0.38, 0.38, 0.02, 16]} />
            <meshBasicMaterial color="#03e9f4" transparent opacity={0.5} />
          </mesh>
        ))}
      </group>

      {/* Volumetric Downward Scanning Beam Cone */}
      <mesh position={[0, -1.0, 0]}>
        <cylinderGeometry args={[0.02, 0.8, 1.8, 16, 1, true]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ==========================================
// 3. Central UAV Platform & Standing 3D White AI Metallic Robot Agent
// ==========================================
const CentralUAVAndRobot3D = ({ onClick }: { onClick: () => void }) => {
  const mainGroupRef = useRef<THREE.Group>(null);
  const chestReactorRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (mainGroupRef.current) {
      mainGroupRef.current.position.y = -0.3 + Math.sin(t * 1.2) * 0.12;
      mainGroupRef.current.position.x = Math.sin(t * 0.6) * 0.1;
      mainGroupRef.current.rotation.y = Math.sin(t * 0.5) * 0.05;
    }
    if (chestReactorRef.current) {
      chestReactorRef.current.opacity = 0.7 + Math.sin(t * 4) * 0.3;
    }
  });

  return (
    <group
      ref={mainGroupRef}
      position={[0, -0.2, 0]}
      onClick={onClick}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      {/* 1. Tactical Stealth UAV Carrier Vessel Base */}
      <group position={[0, -1.1, 0]}>
        {/* Main Body Hull */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[4.2, 0.45, 2.6]} />
          <meshStandardMaterial color="#020617" metalness={0.95} roughness={0.15} />
        </mesh>

        {/* Cockpit Canopy Glass */}
        <mesh position={[0, 0.3, 0.4]}>
          <boxGeometry args={[2.2, 0.35, 1.2]} />
          <meshStandardMaterial color="#03e9f4" transparent opacity={0.35} metalness={0.9} />
        </mesh>

        {/* Outer Heavy Wing Engines */}
        <mesh position={[-2.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.45, 0.45, 0.8, 16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} />
        </mesh>
        <mesh position={[2.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.45, 0.45, 0.8, 16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} />
        </mesh>

        {/* Illuminated Blue/Cyan Landing Deck Ring */}
        <mesh position={[0, 0.23, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.85, 1.2, 32]} />
          <meshBasicMaterial color="#03e9f4" side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      </group>

      {/* 2. Articulated Standing Metallic White AI Cyborg Robot */}
      <group position={[0, 0.4, 0]}>
        {/* Head / Helmet */}
        <mesh position={[0, 1.3, 0]}>
          <sphereGeometry args={[0.32, 32, 32]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* Neon Cyan Visor Eye Band */}
        <mesh position={[0, 1.34, 0.22]}>
          <boxGeometry args={[0.42, 0.1, 0.2]} />
          <meshBasicMaterial color="#03e9f4" />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.2, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>

        {/* Torso / Upper Body Chest Armor */}
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.75, 0.8, 0.45]} />
          <meshStandardMaterial color="#f1f5f9" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* Pulsing Arc Reactor Chest Core */}
        <mesh position={[0, 0.52, 0.24]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial ref={chestReactorRef} color="#03e9f4" transparent opacity={0.9} />
        </mesh>

        {/* Shoulder Armor Pads */}
        <mesh position={[-0.48, 0.72, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#020617" metalness={0.9} />
        </mesh>
        <mesh position={[0.48, 0.72, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#020617" metalness={0.9} />
        </mesh>

        {/* Arms */}
        <mesh position={[-0.48, 0.3, 0]}>
          <cylinderGeometry args={[0.08, 0.07, 0.6, 16]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.85} />
        </mesh>
        <mesh position={[0.48, 0.3, 0]}>
          <cylinderGeometry args={[0.08, 0.07, 0.6, 16]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.85} />
        </mesh>

        {/* Hips & Pelvis */}
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[0.6, 0.2, 0.38]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} />
        </mesh>

        {/* Legs */}
        <mesh position={[-0.22, -0.55, 0]}>
          <cylinderGeometry args={[0.1, 0.08, 0.8, 16]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.9} />
        </mesh>
        <mesh position={[0.22, -0.55, 0]}>
          <cylinderGeometry args={[0.1, 0.08, 0.8, 16]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.9} />
        </mesh>

        {/* Boots */}
        <mesh position={[-0.22, -0.98, 0.06]}>
          <boxGeometry args={[0.16, 0.12, 0.3]} />
          <meshStandardMaterial color="#020617" metalness={0.95} />
        </mesh>
        <mesh position={[0.22, -0.98, 0.06]}>
          <boxGeometry args={[0.16, 0.12, 0.3]} />
          <meshStandardMaterial color="#020617" metalness={0.95} />
        </mesh>
      </group>
    </group>
  );
};

// ==========================================
// 4. Clean Scene Container with UAV, Robo & Escort Drones
// ==========================================
const RoboticCity = ({ onBotClick }: { onBotClick: () => void }) => {
  const { viewport } = useThree();
  const isMobile = viewport.width < 5.5;

  return (
    <group>
      <fog attach="fog" args={['#020617', 12, 50]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 20, 10]} intensity={1.8} />
      <pointLight position={[0, 4, 2]} intensity={3.5} color="#03e9f4" distance={30} />

      {/* Central Tactical Stealth UAV Platform & Standing Metallic White AI Robot */}
      <CentralUAVAndRobot3D onClick={onBotClick} />

      {/* 4 Escort Tactical Quadcopter Drones - Responsive Offsets for 100% Mobile Phone visibility */}
      <EscortDrone3D offset={isMobile ? [-1.6, 1.9, 0.2] : [-3.6, 1.8, -0.5]} />
      <EscortDrone3D offset={isMobile ? [1.6, 1.9, 0.2] : [3.6, 1.8, -0.5]} />
      <EscortDrone3D offset={isMobile ? [-1.3, 0.3, 1.2] : [-2.2, 0.5, 1.6]} />
      <EscortDrone3D offset={isMobile ? [1.3, 0.3, 1.2] : [2.2, 0.5, 1.6]} />
    </group>
  );
};

// ==========================================
// 5. Centered Hero Camera Controller
// ==========================================
const SceneController = ({ state }: { state: string }) => {
  const { camera, viewport } = useThree();
  const isMobile = viewport.width < 5.5;

  useFrame((stateData) => {
    const t = stateData.clock.getElapsedTime();

    if (state === 'portal') {
      camera.position.set(0, 0, -t * 15);
      camera.lookAt(0, 0, -t * 15 - 10);
    } else if (state === 'world') {
      // Perfectly centered camera with mobile depth adjustment
      camera.position.x = Math.sin(t * 0.15) * 0.3;
      camera.position.y = 1.0 + Math.sin(t * 0.3) * 0.1;
      camera.position.z = isMobile ? 8.4 : 7.2;
      camera.lookAt(0, 0.2, 0);
    }
  });

  return null;
};

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
        className="w-[94%] sm:w-full max-w-lg max-h-[68vh] sm:max-h-[76vh] border border-neon-cyan/40 bg-[#020617]/95 backdrop-blur-2xl rounded-2xl p-3 sm:p-5 shadow-[0_0_40px_rgba(3,233,244,0.25)] flex flex-col gap-2 pointer-events-auto relative overflow-hidden"
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
  const { aiModeState, exitAIMode, exitToSection } = useAI();
  // Bot card starts closed so the 3D scene with the robot on the UAV is seen first.
  const [isBotVisible, setIsBotVisible] = useState(false);
  const [activeDoorId, setActiveDoorId] = useState<string>('ai-agent');
  const [galleryDoor, setGalleryDoor] = useState<DoorItem | null>(null);
  const [isMuted, setIsMuted] = useState(sfx.isMuted);
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

  useEffect(() => {
    sfx.isMuted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (aiModeState === 'portal') {
      sfx.playBeep(660, 0.2, 0.02);
    } else if (aiModeState === 'world') {
      sfx.stopEntryBgm(); // Quiet when in world
      setIsBotVisible(false);
    }
  }, [aiModeState]);

  // Keep the newest message in view.
  useEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
  }, [chatMessages, isTyping, isBotVisible]);

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

  const showCanvas = !sceneFailed && (aiModeState === 'portal' || aiModeState === 'world');

  return (
    <div className="fixed inset-0 w-screen h-screen z-[9990] bg-[#020617] text-white overflow-hidden font-sans select-none" role="dialog" aria-modal="true" aria-label="AI mode">
      {/* Background video (looping, muted) */}
      {aiModeState === 'world' && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {worldVideo.src ? (
            <video
              ref={bgVideoRef}
              autoPlay
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
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-slate-950/60 backdrop-blur-[0.5px]" />
        </div>
      )}

      {/* 3D Canvas Viewport */}
      {showCanvas && (
        <div className="absolute top-0 left-0 w-screen h-screen z-10">
          <SceneBoundary onError={() => setSceneFailed(true)}>
            <Canvas
              dpr={[1, 1.75]}
              gl={{ powerPreference: 'high-performance', antialias: true }}
              camera={{ position: [0, 1.0, 7.5], fov: typeof window !== 'undefined' && window.innerWidth < 640 ? 68 : 55 }}
              onCreated={({ gl }) => {
                gl.domElement.addEventListener('webglcontextlost', (event) => {
                  event.preventDefault();
                  setSceneFailed(true);
                });
              }}
            >
              <Suspense fallback={null}>
                <SceneController state={aiModeState} />

                {aiModeState === 'portal' && <SpaceTunnel speed={30} />}

                {aiModeState === 'world' && <RoboticCity onBotClick={() => { setGalleryDoor(null); setIsBotVisible(true); }} />}
              </Suspense>
            </Canvas>
          </SceneBoundary>
          <div className="absolute inset-0 pointer-events-none z-20 bg-scanlines opacity-10" />
        </div>
      )}

      {/* Without WebGL the warp is drawn with CSS */}
      {sceneFailed && aiModeState === 'portal' && <FlatWarp />}

      {/* HUD controls & Door Hub */}
      {aiModeState === 'world' && (
        <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-3 sm:p-6">
          {/* Top Bar Navigation */}
          <div className="flex justify-between items-center w-full gap-2 z-50 pointer-events-auto">
            <div className="border border-neon-cyan/30 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-md font-mono text-[10px] sm:text-xs text-neon-cyan flex items-center gap-2 shadow-[0_0_15px_rgba(3,233,244,0.15)]">
              <Radio size={12} className="animate-pulse" />
              <span className="font-bold tracking-wide">WHITE AI ROBOTICS WORLD</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="border border-gray-700 text-gray-400 hover:text-neon-cyan bg-slate-950/80 p-2 rounded-md transition-colors"
                aria-label={isMuted ? 'Unmute Portal Sounds' : 'Mute Portal Sounds'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>

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
          <div className="w-full flex flex-col items-center justify-end mb-1 sm:mb-3 z-40 pointer-events-auto gap-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="bg-slate-950/90 backdrop-blur-md border border-neon-cyan/30 rounded-xl p-2 max-w-2xl w-[98%] sm:w-auto shadow-[0_0_25px_rgba(3,233,244,0.2)]">
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
                className="w-[94%] sm:w-full max-w-lg max-h-[68vh] sm:max-h-[76vh] border border-neon-cyan/40 bg-[#020617]/95 backdrop-blur-2xl rounded-2xl p-3 sm:p-5 shadow-[0_0_40px_rgba(3,233,244,0.25)] flex flex-col gap-2 pointer-events-auto relative overflow-hidden select-text"
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
