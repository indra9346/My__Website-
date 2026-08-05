import { useEffect, useState, useRef, Suspense } from 'react';
import { useAI } from '../context/AIContext';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import gsap from 'gsap';
import { Shield, Activity, Volume2, VolumeX, Database, Send, X, Radio, Bot, FolderGit2, Video, Sparkles, Lock, ExternalLink, Cpu } from 'lucide-react';

// ==========================================
// 1. Soft Web Audio Synthesizer (Ambient)
// ==========================================
class PortaSfxSynth {
  private ctx: AudioContext | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private humGain: GainNode | null = null;
  public isMuted = false;

  isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error("Audio Context initialization failed", e);
    }
  }

  playBeep(freq = 550, duration = 0.08, gainVal = 0.015) {
    if (this.isMuted || this.isMobile()) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine'; // Soft sine wave
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playClick() {
    this.playBeep(330, 0.06, 0.02);
  }

  playWarp(reverse = false) {
    if (this.isMuted || this.isMobile()) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine';
      filter.type = 'lowpass';

      const duration = 5.0;
      const startFreq = reverse ? 600 : 100;
      const endFreq = reverse ? 80 : 660;

      osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(endFreq, this.ctx.currentTime + duration);

      filter.frequency.setValueAtTime(200, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(1500, this.ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  startHum() {
    if (this.isMuted || this.isMobile()) return;
    this.init();
    if (!this.ctx || this.osc1) return;
    try {
      this.osc1 = this.ctx.createOscillator();
      this.osc2 = this.ctx.createOscillator();
      this.lfo = this.ctx.createOscillator();
      this.lfoGain = this.ctx.createGain();
      this.humGain = this.ctx.createGain();

      this.osc1.type = 'sine';
      this.osc2.type = 'sine';
      this.lfo.type = 'sine';

      this.osc1.frequency.setValueAtTime(110, this.ctx.currentTime); // Low A
      this.osc2.frequency.setValueAtTime(165, this.ctx.currentTime); // E3
      this.lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime);

      this.lfoGain.gain.setValueAtTime(0.015, this.ctx.currentTime);
      
      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.humGain.gain);

      this.osc1.connect(this.humGain);
      this.osc2.connect(this.humGain);
      this.humGain.connect(this.ctx.destination);

      this.humGain.gain.setValueAtTime(0.02, this.ctx.currentTime);

      this.osc1.start();
      this.osc2.start();
      this.lfo.start();
    } catch (e) {}
  }

  stopHum() {
    try {
      if (this.osc1) { this.osc1.stop(); this.osc1.disconnect(); this.osc1 = null; }
      if (this.osc2) { this.osc2.stop(); this.osc2.disconnect(); this.osc2 = null; }
      if (this.lfo) { this.lfo.stop(); this.lfo.disconnect(); this.lfo = null; }
      if (this.lfoGain) { this.lfoGain.disconnect(); this.lfoGain = null; }
      if (this.humGain) { this.humGain.disconnect(); this.humGain = null; }
    } catch (e) {}
  }
}

const sfx = new PortaSfxSynth();

// ==========================================
// 2. Hybrid Asset Loader Component
// ==========================================
const GLTFModel = ({ url, fallback, scale = 1, position = [0, 0, 0], rotation = [0, 0, 0] }: { url: string; fallback: React.ReactNode; scale?: number; position?: [number, number, number]; rotation?: [number, number, number] }) => {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        setModel(gltf.scene);
      },
      undefined,
      (err) => {
        console.warn(`Local GLTF model at ${url} not found, displaying high-fidelity procedural fallback.`);
        setFailed(true);
      }
    );
  }, [url]);

  if (failed) return <>{fallback}</>;
  if (!model) return <>{fallback}</>;
  return <primitive object={model} scale={scale} position={position} rotation={rotation} />;
};

// ==========================================
// 3. 3D Space Warp Tunnel (R3F Component)
// ==========================================
const SpaceTunnel = ({ speed }: { speed: number }) => {
  const tunnelRef = useRef<THREE.Group>(null);
  const ringCount = 20;

  useFrame((state, delta) => {
    if (!tunnelRef.current) return;
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
    <group ref={tunnelRef}>
      <Stars radius={100} depth={50} count={3000} factor={6} saturation={0.5} fade speed={2} />
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
  );
};

// ==========================================
// 4. Heavy-Duty Industrial Swivel Assembly Welder (3D)
// ==========================================
const HeavyWelderRobot = ({ position, color, tipColor, isFlipped }: { position: [number, number, number]; color: string; tipColor: string; isFlipped: boolean }) => {
  const armRef = useRef<THREE.Group>(null);
  const sparkParticlesRef = useRef<THREE.Points>(null);
  const [sparkActive, setSparkActive] = useState(false);
  const sparksCount = 120;
  const sparkVels = useRef(new Float32Array(sparksCount * 3));

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (armRef.current) {
      armRef.current.rotation.y = (isFlipped ? -1 : 1) * Math.sin(t * 1.0) * 0.35;
      const shoulder = armRef.current.children[1] as THREE.Group;
      if (shoulder) {
        shoulder.rotation.z = (isFlipped ? 1 : -1) * (Math.PI / 4.5 + Math.sin(t * 1.6) * 0.1);
      }
    }

    const weldingActive = Math.sin(t * 3.5) > 0.45;
    setSparkActive(weldingActive);

    if (sparkParticlesRef.current && weldingActive) {
      const geom = sparkParticlesRef.current.geometry;
      const posAttr = geom.getAttribute('position');
      if (posAttr) {
        const pos = posAttr.array as Float32Array;
        const vels = sparkVels.current;

        const tipX = position[0] + (isFlipped ? -1.8 : 1.8) + Math.sin(t * 1.0) * 0.25;
        const tipY = position[1] + 1.2 + Math.sin(t * 1.6) * 0.1;
        const tipZ = position[2] + 0.3;

        for (let i = 0; i < pos.length; i += 3) {
          if (pos[i + 1] < -2 || Math.random() < 0.05) {
            pos[i] = tipX;
            pos[i + 1] = tipY;
            pos[i + 2] = tipZ;

            vels[i] = (Math.random() - 0.5) * 5;
            vels[i + 1] = Math.random() * 5 + 1.5;
            vels[i + 2] = (Math.random() - 0.5) * 5;
          } else {
            pos[i] += vels[i] * 0.016;
            vels[i + 1] -= 9.8 * 0.016;
            pos[i + 1] += vels[i + 1] * 0.016;
            pos[i + 2] += vels[i + 2] * 0.016;
          }
        }
        posAttr.needsUpdate = true;
      }
    }
  });

  return (
    <group position={position}>
      {/* Heavy Base Platform with Warning lights */}
      <mesh>
        <boxGeometry args={[1.6, 0.4, 1.3]} />
        <meshStandardMaterial color="#0f172a" emissive={color} emissiveIntensity={0.15} wireframe />
      </mesh>
      {/* Treads */}
      <mesh position={[0, -0.1, 0.7]}>
        <boxGeometry args={[1.7, 0.3, 0.15]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, -0.1, -0.7]}>
        <boxGeometry args={[1.7, 0.3, 0.15]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Swivel Turret */}
      <group ref={armRef} position={[0, 0.2, 0]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.55, 0.65, 0.6, 12]} />
          <meshStandardMaterial color="#020617" emissive={color} emissiveIntensity={0.3} wireframe />
        </mesh>

        {/* Hinge Joint */}
        <group position={[0, 0.6, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.7, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>

          {/* Upper Arm lifter */}
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.18, 0.22, 1.8, 8]} />
            <meshStandardMaterial color="#020617" emissive={color} emissiveIntensity={0.5} wireframe />
          </mesh>
          {/* Hydraulic Cylinder */}
          <mesh position={[0.12, 1.1, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1.4, 6]} />
            <meshBasicMaterial color="#03e9f4" />
          </mesh>

          {/* Forearm Joint */}
          <group position={[0, 2.0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.6, 8]} />
              <meshBasicMaterial color={tipColor} />
            </mesh>

            {/* Forearm Girder */}
            <mesh position={[0, 0.8, 0]}>
              <boxGeometry args={[0.18, 1.5, 0.18]} />
              <meshStandardMaterial color="#020617" emissive={color} emissiveIntensity={0.6} wireframe />
            </mesh>

            {/* Tool Hinge & Heat Shield nozzle */}
            <group position={[0, 1.6, 0]}>
              <mesh>
                <cylinderGeometry args={[0.35, 0.35, 0.06, 8]} />
                <meshStandardMaterial color="#1e293b" />
              </mesh>
              <mesh position={[0, 0.3, 0]}>
                <coneGeometry args={[0.1, 0.4, 6]} />
                <meshBasicMaterial color="#ff7b00" />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* Welding sparks */}
      {sparkActive && (
        <points ref={sparkParticlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(sparksCount * 3), 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#ffbb00"
            size={0.24}
            transparent
            opacity={1.0}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}
    </group>
  );
};

// ==========================================
// 5. Heavy Quadcopter Inspection Drone (3D)
// ==========================================
const HeavyInspectionDrone = ({ i, xOffset }: { i: number; xOffset: number }) => {
  const droneRef = useRef<THREE.Group>(null);
  const rotorRefs = useRef<Array<THREE.Group | null>>([null, null, null, null]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (droneRef.current) {
      droneRef.current.position.y = 3.6 + Math.sin(t * 1.2 + i) * 0.7;
      droneRef.current.position.x = xOffset + Math.cos(t * 0.6 + i) * 2.5;
      droneRef.current.position.z = -4 + Math.sin(t * 0.6 + i) * 2.0;
      droneRef.current.rotation.z = -Math.sin(t * 0.6 + i) * 0.15; // tilt roll
    }

    rotorRefs.current.forEach((rotor) => {
      if (rotor) rotor.rotation.y += 0.85;
    });
  });

  return (
    <group ref={droneRef}>
      {/* Fuselage (Hexagonal Core shape) */}
      <mesh>
        <cylinderGeometry args={[0.5, 0.55, 0.35, 6]} />
        <meshStandardMaterial color="#020617" emissive="#03e9f4" emissiveIntensity={0.2} wireframe />
      </mesh>
      {/* Glowing Scanner Visor */}
      <mesh position={[0, -0.05, 0.45]}>
        <boxGeometry args={[0.25, 0.08, 0.08]} />
        <meshBasicMaterial color="#FF2E63" />
      </mesh>

      {/* Carbon Booms */}
      {[
        [-Math.PI / 4, -0.4, 0.4],
        [Math.PI / 4, 0.4, 0.4],
        [-Math.PI * 0.75, -0.4, -0.4],
        [Math.PI * 0.75, 0.4, -0.4],
      ].map((cfg, idx) => (
        <group key={idx} rotation={[0, cfg[0], 0]} position={[0, 0.1, 0]}>
          <mesh position={[0.45, 0, 0]} rotation={[0, 0, -Math.PI / 10]}>
            <cylinderGeometry args={[0.035, 0.02, 0.6, 6]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <group position={[0.7, 0.08, 0]}>
            <mesh>
              <cylinderGeometry args={[0.08, 0.08, 0.15, 6]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            <group ref={(el) => { rotorRefs.current[idx] = el; }}>
              <mesh position={[0, 0.08, 0]}>
                <boxGeometry args={[0.65, 0.015, 0.05]} />
                <meshBasicMaterial color="#03e9f4" />
              </mesh>
            </group>
          </group>
        </group>
      ))}

      {/* Volumetric Spotlight Cone */}
      <mesh position={[0, -1.8, 0]}>
        <cylinderGeometry args={[0.02, 1.3, 3.6, 16, 1, true]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>

      {/* Cam Dome */}
      <mesh position={[0, -0.22, 0.1]}>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  );
};

// ==========================================
// 7. Staged Humanoid Hologram (White AI)
// ==========================================
const WhiteAIHologram = ({ progress }: { progress: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = 1.6 + Math.sin(t * 1.5) * 0.1;
      groupRef.current.rotation.y = t * 0.25;
    }
    if (headRef.current) {
      headRef.current.rotation.x = Math.sin(t * 2) * 0.04;
      headRef.current.rotation.y = Math.cos(t * 1.2) * 0.08;
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = -Math.PI / 4 + Math.sin(t * 2.5) * 0.1;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = -Math.PI / 4 + Math.cos(t * 2.2) * 0.1;
    }
  });

  const particlesOpacity = Math.min(1.0, progress * 2.0);
  const skeletonOpacity = Math.max(0.0, Math.min(1.0, (progress - 0.25) * 2.5));
  const coreOpacity = Math.max(0.0, Math.min(1.0, (progress - 0.5) * 3.0));
  const visorOpacity = Math.max(0.0, Math.min(1.0, (progress - 0.75) * 4.0));

  return (
    <group ref={groupRef}>
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[0.3, 0.7, 1.6, 16, 1, true]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.12 * particlesOpacity} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, -0.75, 0]}>
        <torusGeometry args={[0.5, 0.04, 6, 16]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.6 * particlesOpacity} />
      </mesh>

      {skeletonOpacity > 0 && (
        <group>
          {[0, 1, 2].map((i) => (
            <group key={i} position={[0, -0.45 + i * 0.25, 0]}>
              <mesh>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial color="#03e9f4" emissive="#03e9f4" transparent opacity={skeletonOpacity} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.22 - i * 0.03, 0.015, 4, 12]} />
                <meshBasicMaterial color="#7B2CBF" transparent opacity={0.5 * skeletonOpacity} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {coreOpacity > 0 && (
        <group>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshBasicMaterial color="#FF2E63" transparent opacity={coreOpacity} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <torusGeometry args={[0.26, 0.01, 4, 16]} />
            <meshBasicMaterial color="#03e9f4" transparent opacity={0.8 * coreOpacity} />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <coneGeometry args={[0.35, 0.5, 5]} />
            <meshStandardMaterial color="#020617" emissive="#03e9f4" emissiveIntensity={0.6} transparent opacity={coreOpacity} />
          </mesh>
        </group>
      )}

      {visorOpacity > 0 && (
        <group>
          <group ref={headRef} position={[0, 0.75, 0]}>
            <mesh position={[0, -0.1, 0]}>
              <cylinderGeometry args={[0.06, 0.08, 0.15, 8]} />
              <meshStandardMaterial color="#03e9f4" transparent opacity={visorOpacity} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.25, 12, 12]} />
              <meshStandardMaterial color="#020617" emissive="#03e9f4" emissiveIntensity={0.5} transparent opacity={visorOpacity} />
            </mesh>
            <mesh position={[0, 0.02, 0.2]}>
              <boxGeometry args={[0.28, 0.1, 0.08]} />
              <meshStandardMaterial color="#03e9f4" emissive="#03e9f4" emissiveIntensity={1.5} transparent opacity={visorOpacity} />
            </mesh>
          </group>

          <group ref={leftArmRef} position={[-0.38, 0.4, 0]}>
            <mesh>
              <sphereGeometry args={[0.08, 6, 6]} />
              <meshBasicMaterial color="#03e9f4" transparent opacity={visorOpacity} />
            </mesh>
            <mesh position={[-0.15, -0.2, 0]} rotation={[0, 0, Math.PI / 6]}>
              <cylinderGeometry args={[0.04, 0.03, 0.4, 6]} />
              <meshStandardMaterial color="#03e9f4" transparent opacity={visorOpacity} />
            </mesh>
          </group>

          <group ref={rightArmRef} position={[0.38, 0.4, 0]}>
            <mesh>
              <sphereGeometry args={[0.08, 6, 6]} />
              <meshBasicMaterial color="#03e9f4" transparent opacity={visorOpacity} />
            </mesh>
            <mesh position={[0.15, -0.2, 0]} rotation={[0, 0, -Math.PI / 6]}>
              <cylinderGeometry args={[0.04, 0.03, 0.4, 6]} />
              <meshStandardMaterial color="#03e9f4" transparent opacity={visorOpacity} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
};

// ==========================================
// 8. Clean Scene Engine (No Wireframe Lines Background)
// ==========================================
const RoboticCity = () => {
  return (
    <group>
      <fog attach="fog" args={['#020617', 12, 50]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} />
      <pointLight position={[0, 4, 2]} intensity={3.0} color="#03e9f4" distance={30} />
      <pointLight position={[-4, 2, -3]} intensity={2.0} color="#7B2CBF" distance={20} />

      {/* Realistic Heavy Inspection Quadcopter Drones hovering over video background */}
      {[-6, -2, 2, 6].map((xOffset, i) => (
        <HeavyInspectionDrone key={i} i={i} xOffset={xOffset} />
      ))}
    </group>
  );
};

// ==========================================
// 9. Automated Movie Drone Camera Controller
// ==========================================
const SceneController = ({ state }: { state: string }) => {
  const { camera } = useThree();

  useFrame((stateData) => {
    const t = stateData.clock.getElapsedTime();
    
    if (state === 'portal') {
      camera.position.set(0, 0, -t * 15);
      camera.lookAt(0, 0, -t * 15 - 10);
    } else if (state === 'world') {
      const s = t % 60;
      
      if (s < 4.5) {
        const progress = s / 4.5;
        const startPos = new THREE.Vector3(18, 12, 24);
        const endPos = new THREE.Vector3(-10, 8, 18);
        camera.position.lerpVectors(startPos, endPos, progress);
        camera.lookAt(0, 2, -4);
      } else if (s < 9.5) {
        const progress = (s - 4.5) / 5.0;
        const startPos = new THREE.Vector3(-10, 8, 18);
        const endPos = new THREE.Vector3(0, 3.2, 13);
        camera.position.lerpVectors(startPos, endPos, progress);
        camera.lookAt(0, 1.2, 3);
      } else {
        const progress = s - 9.5;
        const orbitAngle = progress * 0.12;
        camera.position.x = Math.sin(orbitAngle) * 9.5;
        camera.position.z = Math.cos(orbitAngle) * 9.5 + 4.0;
        camera.position.y = 2.4 + Math.sin(progress * 0.4) * 0.15;
        camera.lookAt(0, -0.6, 4);
      }
    }
  });

  return null;
};

// ==========================================
// 10. Holographic Quantum Vault (R3F)
// ==========================================
const QuantumVault = ({ isOpened, progress, onClick }: { isOpened: boolean; progress: number; onClick: () => void }) => {
  const vaultRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const lidRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (vaultRef.current) {
      vaultRef.current.position.y = -1.2 + Math.sin(t * 1.5) * 0.08;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.5;
    }
    if (lidRef.current) {
      lidRef.current.rotation.y = -t * 0.3;
    }
  });

  return (
    <group ref={vaultRef} position={[0, -1.2, 0]} onClick={onClick}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.5, 1.8, 0.4, 16]} />
        <meshStandardMaterial color="#020617" emissive="#03e9f4" emissiveIntensity={0.2} />
      </mesh>

      <mesh ref={ringRef} position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.45, 32]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      <group ref={lidRef} position={[0, 0.3, 0]}>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[1.1, 1.3, 0.3, 12]} />
          <meshStandardMaterial color="#0b1329" emissive="#7B2CBF" emissiveIntensity={0.3} />
        </mesh>
      </group>

      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.3} />
      </mesh>

      {isOpened && (
        <>
          <HologramBeam />
          <WhiteAIHologram progress={progress} />
        </>
      )}
    </group>
  );
};

const HologramBeam = () => {
  const particlesRef = useRef<THREE.Points>(null);
  const pCount = 50;
  const positions = new Float32Array(pCount * 3);

  useFrame((state) => {
    if (!particlesRef.current) return;
    const geom = particlesRef.current.geometry;
    const posAttr = geom.getAttribute('position');
    if (posAttr) {
      const pos = posAttr.array as Float32Array;
      const t = state.clock.getElapsedTime();

      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] += 0.03;
        pos[i] = Math.sin(t * 3 + i) * 0.4;
        pos[i + 2] = Math.cos(t * 3 + i) * 0.4;

        if (pos[i + 1] > 2.5) {
          pos[i + 1] = 0.5;
        }
      }
      posAttr.needsUpdate = true;
      particlesRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.4, 0.8, 1.6, 16, 1, true]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#03e9f4" size={0.08} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
};

// ==========================================
// 11. Door Hub Configuration
// ==========================================
export interface DoorItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'ai' | 'projects' | 'vlogs' | 'creations';
  status: 'active' | 'locked';
  target?: string;
}

export const DOORS: DoorItem[] = [
  {
    id: 'ai-agent',
    title: 'AI Agent (ARIA)',
    subtitle: 'Real-Time Portfolio Intelligence',
    type: 'ai',
    status: 'active',
  },
  {
    id: 'projects',
    title: 'Projects Hub',
    subtitle: 'Supreme Cart, ToLetHub, I-Mall',
    type: 'projects',
    status: 'active',
    target: '#projects',
  },
  {
    id: 'vlogs',
    title: 'Vlogs & Media',
    subtitle: 'Tech Talks & Video Streams',
    type: 'vlogs',
    status: 'locked',
  },
  {
    id: 'ai-creations',
    title: 'AI Creations',
    subtitle: 'Generative AI & ML Experiments',
    type: 'creations',
    status: 'locked',
  },
];

// ==========================================
// 12. Main Interactive Portal
// ==========================================
export default function AICorePortal() {
  const { aiModeState, setAiModeState } = useAI();
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [vaultOpened, setVaultOpened] = useState(false);
  const [isBotVisible, setIsBotVisible] = useState(true);
  const [activeDoorId, setActiveDoorId] = useState<string>('ai-agent');
  const [isMuted, setIsMuted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; formatted?: boolean }>>([
    {
      sender: 'ai',
      text: "ONLINE & ACCURATE\n\nI am ARIA (White AI Core), trained A-to-Z on K S Indra Kumar's entire portfolio data.\n\nAsk me about ToLetHub, I-Mall (Frontend Only), Supreme Cart (Full-Stack), skills, B.E. AI/ML degree, or contact info."
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [holoProgress, setHoloProgress] = useState(1.0);

  useEffect(() => {
    sfx.isMuted = isMuted;
    if (isMuted) {
      sfx.stopHum();
    } else if (aiModeState === 'world') {
      sfx.startHum();
    }
  }, [isMuted, aiModeState]);

  useEffect(() => {
    if (aiModeState === 'activating') {
      sfx.playWarp(false);
      setTerminalLogs([]);

      const intervals = [800, 1800, 2800];
      const logTexts = [
        "> INITIALIZING AI SECURE DECK...",
        "> ENGAGING DIRECT COGNITIVE PATHWAY...",
        "> REALITY DECONSTRUCTION OVERRIDE SEQUENCE LOADED.",
      ];

      intervals.forEach((time, index) => {
        setTimeout(() => {
          setTerminalLogs((prev) => [...prev, logTexts[index]]);
          sfx.playBeep(550 + index * 40, 0.06, 0.015);
        }, time);
      });

      const timer = setTimeout(() => {
        document.body.classList.remove('ai-portal-glitch');
        setAiModeState('video_forward');
      }, 3300);

      return () => clearTimeout(timer);
    } else if (aiModeState === 'portal') {
      sfx.playBeep(660, 0.2, 0.02);
      const timer = setTimeout(() => {
        setAiModeState('world');
      }, 3500);
      return () => clearTimeout(timer);
    } else if (aiModeState === 'world') {
      sfx.startHum();
      setVaultOpened(true);
      setIsBotVisible(true);
    }
  }, [aiModeState, setAiModeState]);

  const handleVaultClick = () => {
    if (!vaultOpened) {
      setVaultOpened(true);
    }
    setIsBotVisible(true);
    sfx.playBeep(880, 0.15, 0.02);
  };

  const handleDoorSelect = (door: DoorItem) => {
    sfx.playClick();
    if (door.status === 'locked') {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `🔒 DOOR LOCKED: ${door.title}\n\nThis door is currently reserved for future deployment. Append an entry to the DOORS hub list to unlock!`
        }
      ]);
      setIsBotVisible(true);
      return;
    }

    setActiveDoorId(door.id);
    if (door.id === 'ai-agent') {
      setIsBotVisible(true);
    } else if (door.id === 'projects') {
      const el = document.getElementById('projects');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        setAiModeState('inactive');
      } else {
        setChatMessages((prev) => [
          ...prev,
          { sender: 'user', text: "Projects" },
          { sender: 'ai', text: "Selected Repositories" }
        ]);
        setIsBotVisible(true);
      }
    }
  };

  const queryDatabase = (query: string): string => {
    const q = query.toLowerCase().trim();

    if (q.includes('tolethub') || q.includes('to let hub') || q.includes('tolet') || q.includes('rental') || q.includes('house') || q.includes('property') || q.includes('apartment')) {
      return `ToLetHub Project Info`;
    }

    if (q.includes('imall') || q.includes('i-mall') || q.includes('i mall')) {
      return `I-Mall Project Info`;
    }

    if (q.includes('supreme cart') || q.includes('supremecart') || q.includes('cart engine') || q.includes('fullstack cart') || q.includes('full-stack cart')) {
      return `Supreme Cart Project Info`;
    }

    if (q.includes('who is') || q.includes('about indra') || q.includes('profile') || q.includes('biography') || q.includes('who are you') || q.includes('bio') || q.includes('tell me about him') || q.includes('summary')) {
      return `Indra Kumar Bio`;
    }

    if (q.includes('project') || q.includes('work') || q.includes('built') || q.includes('develop') || q.includes('repo') || q.includes('apps') || q.includes('applications')) {
      return `Selected Repositories`;
    }

    if (q.includes('skill') || q.includes('language') || q.includes('technology') || q.includes('database') || q.includes('stack') || q.includes('tool') || q.includes('java') || q.includes('react') || q.includes('postgres') || q.includes('html') || q.includes('css') || q.includes('hibernate') || q.includes('supabase') || q.includes('python') || q.includes('dsa') || q.includes('c ')) {
      return `Technical Stack Verification`;
    }

    if (q.includes('education') || q.includes('graduate') || q.includes('college') || q.includes('school') || q.includes('degree') || q.includes('study') || q.includes('cgpa') || q.includes('sjc') || q.includes('marks') || q.includes('puc') || q.includes('vtu')) {
      return `Academic Matrix Verification`;
    }

    if (q.includes('contact') || q.includes('email') || q.includes('connect') || q.includes('reach') || q.includes('linkedin') || q.includes('github') || q.includes('phone') || q.includes('mail')) {
      return `Connection Channels`;
    }

    if (q.includes('resume') || q.includes('cv') || q.includes('pdf') || q.includes('download')) {
      return `Resume Access Link`;
    }

    return `VERIFIED RECORD INTELLIGENCE: "${query}"\n\nK S Indra Kumar — Full-Stack Developer & B.E. AI/ML Graduate (SJC Institute of Technology, CGPA: 8.59/10).\n\nPortfolio Projects:\n• ToLetHub: House & Apartment Rental Property Platform.\n• I-Mall: Pure Frontend E-Commerce Web Application (HTML, CSS, JavaScript).\n• Supreme Cart: Full-Stack E-Commerce Platform (Java, Hibernate, PostgreSQL).\n• Portfolio Intelligence (ARIA): 3D AI World Portal.\n\nCore Tech: Java, React.js, JavaScript, HTML, CSS, Hibernate, PostgreSQL, Supabase, Python, DSA.\n\nContact: ik9893344@gmail.com | GitHub: github.com/indra9346 | LinkedIn: linkedin.com/in/k-s-indra-kumar-7049b1289`;
  };

  const handleSendMessage = (textOverride?: string) => {
    const userText = (textOverride !== undefined ? textOverride : chatInput).trim();
    if (!userText || isTyping) return;

    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setIsTyping(true);
    sfx.playClick();

    setTimeout(() => {
      const response = queryDatabase(userText);
      setChatMessages((prev) => [...prev, { sender: 'ai', text: response, formatted: true }]);
      setIsTyping(false);
      sfx.playBeep(660, 0.08, 0.01);
    }, 180);
  };

  const handleTriggerReturn = () => {
    sfx.playBeep(330, 0.25, 0.02);
    setChatMessages((prev) => [...prev, { sender: 'ai', text: "Disconnecting session... Returning to portfolio view." }]);
    setTimeout(() => {
      setAiModeState('video_reverse');
    }, 600);
  };

  const renderMessageContent = (msg: { sender: 'ai' | 'user'; text: string; formatted?: boolean }) => {
    if (msg.sender === 'user') {
      return <div className="text-right text-neon-cyan font-semibold">{msg.text}</div>;
    }

    if (msg.text.includes('ToLetHub Project Info')) {
      return (
        <div className="border border-neon-cyan/30 bg-slate-950/90 p-3.5 rounded-lg flex flex-col gap-2 font-mono text-xs">
          <div className="text-neon-cyan border-b border-neon-cyan/20 pb-1 font-bold tracking-wider flex items-center gap-1.5 text-xs sm:text-sm">
            <FolderGit2 size={14} />
            <span>[ PROJECT: TOLETHUB ]</span>
          </div>
          <p className="text-slate-200 leading-relaxed">
            <b>ToLetHub</b> is Indra's Property Rental & Real Estate Platform built for discovering apartments, homes, and rental spaces.
          </p>
          <div className="text-slate-300 flex flex-col gap-1.5 text-[11px] mt-1">
            <div>• <b>Purpose</b>: Simplifies house rentals by connecting property owners directly with tenants.</div>
            <div>• <b>Features</b>: Location-based search, price filters, property detail views, contact node.</div>
            <div>• <b>Tech Stack</b>: HTML5, CSS3, JavaScript, dynamic web UI interfaces.</div>
          </div>
        </div>
      );
    }

    if (msg.text.includes('I-Mall Project Info')) {
      return (
        <div className="border border-neon-cyan/30 bg-slate-950/90 p-3.5 rounded-lg flex flex-col gap-2 font-mono text-xs">
          <div className="text-neon-cyan border-b border-neon-cyan/20 pb-1 font-bold tracking-wider flex items-center gap-1.5 text-xs sm:text-sm">
            <FolderGit2 size={14} />
            <span>[ PROJECT: I-MALL (FRONTEND ONLY) ]</span>
          </div>
          <p className="text-slate-200 leading-relaxed">
            <b>I-Mall</b> is an interactive <b>Pure Frontend E-Commerce Web Application</b>.
          </p>
          <div className="text-slate-300 flex flex-col gap-1.5 text-[11px] mt-1">
            <div>• <b>Architecture</b>: Pure Frontend Web Application (distinct from Full-Stack engines like Supreme Cart).</div>
            <div>• <b>Features</b>: Dynamic product marketplace UI, real-time shopping cart state, search filters.</div>
            <div>• <b>Tech Stack</b>: Pure HTML5, CSS3, JavaScript & DOM manipulation.</div>
          </div>
        </div>
      );
    }

    if (msg.text.includes('Supreme Cart Project Info')) {
      return (
        <div className="border border-neon-cyan/30 bg-slate-950/90 p-3.5 rounded-lg flex flex-col gap-2 font-mono text-xs">
          <div className="text-neon-cyan border-b border-neon-cyan/20 pb-1 font-bold tracking-wider flex items-center gap-1.5 text-xs sm:text-sm">
            <FolderGit2 size={14} />
            <span>[ FEATURED PROJECT: SUPREME CART (FULL-STACK) ]</span>
          </div>
          <p className="text-slate-200 leading-relaxed">
            <b>Supreme Cart</b> is Indra's flagship <b>Full-Stack E-Commerce Shopping Platform</b>.
          </p>
          <div className="text-slate-300 flex flex-col gap-1.5 text-[11px] mt-1">
            <div>• <b>Architecture</b>: End-to-End Full-Stack System (Java Backend + ORM + Relational DB + Frontend).</div>
            <div>• <b>Backend Engine</b>: Java with Hibernate ORM & REST API controllers.</div>
            <div>• <b>Database Storage</b>: PostgreSQL relational database schema.</div>
            <div>• <b>Frontend Layer</b>: Dynamic HTML5, CSS3, JavaScript interface.</div>
          </div>
        </div>
      );
    }

    if (msg.text.includes('Indra Kumar Bio')) {
      return (
        <div className="border border-neon-cyan/30 bg-slate-950/90 p-3.5 rounded-lg flex flex-col gap-2 font-mono text-xs">
          <div className="text-neon-cyan border-b border-neon-cyan/20 pb-1 font-bold tracking-wider flex items-center gap-1.5 text-xs sm:text-sm">
            <Shield size={14} />
            <span>[ INDRA KUMAR - PROFILE SUMMARY ]</span>
          </div>
          <p className="text-slate-200 leading-relaxed">
            Hi! I'm K S Indra Kumar, a B.E. graduate in Artificial Intelligence & Machine Learning with a strong focus on full-stack web application development.
          </p>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Proficient in building scalable frontend UIs and robust backend architectures using Java, React.js, JavaScript, HTML, CSS, Hibernate, PostgreSQL, and Supabase.
          </p>
        </div>
      );
    }

    if (msg.text.includes('Technical Stack Verification')) {
      return (
        <div className="border border-neon-cyan/30 bg-slate-950/90 p-3.5 rounded-lg flex flex-col gap-2 font-mono text-xs">
          <div className="text-neon-cyan border-b border-neon-cyan/20 pb-1 font-bold tracking-wider flex items-center gap-1.5">
            <Cpu size={14} />
            <span>[ SYSTEM: VERIFIED TECH STACK ]</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1 text-slate-300">
            <div>Java (Core/Backend):</div><div className="text-green-400 font-bold">██████████ 96%</div>
            <div>React.js & JS:</div><div className="text-green-400 font-bold">████████░░ 85%</div>
            <div>HTML & CSS:</div><div className="text-green-400 font-bold">█████████░ 90%</div>
            <div>PostgreSQL & SQL:</div><div className="text-green-400 font-bold">████████░░ 82%</div>
            <div>Hibernate & Supabase:</div><div className="text-green-400 font-bold">████████░░ 80%</div>
            <div>Python (AI/ML & DSA):</div><div className="text-green-400 font-bold">█████████░ 88%</div>
          </div>
        </div>
      );
    }

    if (msg.text.includes('Academic Matrix Verification')) {
      return (
        <div className="border border-purple-500/30 bg-slate-950/90 p-3.5 rounded-lg flex flex-col gap-2 font-mono text-xs">
          <div className="text-purple-400 border-b border-purple-500/20 pb-1 font-bold tracking-wider flex items-center gap-1.5">
            <Activity size={14} />
            <span>[ ACADEMIC QUALIFICATIONS ]</span>
          </div>
          <div className="flex flex-col gap-2 mt-1 text-slate-300">
            <div className="border-l-2 border-purple-400 pl-2.5">
              <div className="font-bold text-white">B.E. in Artificial Intelligence & Machine Learning (2026)</div>
              <div className="text-gray-400">SJC Institute of Technology | CGPA: 8.59/10</div>
            </div>
            <div className="border-l-2 border-purple-400 pl-2.5">
              <div className="font-bold text-white">PUC - PCMC (2022)</div>
              <div className="text-gray-400">LRG Naidu Jr. College | Score: 85.3%</div>
            </div>
          </div>
        </div>
      );
    }

    if (msg.text.includes('Selected Repositories')) {
      return (
        <div className="border border-neon-cyan/30 bg-slate-950/90 p-3.5 rounded-lg flex flex-col gap-2 font-mono text-xs w-full">
          <div className="text-neon-cyan border-b border-neon-cyan/20 pb-1 font-bold tracking-wider flex items-center justify-between">
            <span>[ REPOSITORY PORTFOLIO ]</span>
            <span className="text-[10px] text-green-400 font-normal">VERIFIED</span>
          </div>
          <div className="flex flex-col gap-2 mt-1.5 w-full">
            <div className="border border-slate-800 p-2.5 rounded bg-black/60">
              <div className="text-white font-bold flex justify-between items-center text-xs">
                <span>🛒 SUPREME CART</span>
                <span className="text-[9px] border border-green-500/40 text-green-400 px-1.5 py-0.5 rounded font-bold">FULLSTACK</span>
              </div>
              <div className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                Full-stack shopping application built with Java, Hibernate ORM, and PostgreSQL database.
              </div>
            </div>
            <div className="border border-slate-800 p-2.5 rounded bg-black/60">
              <div className="text-white font-bold flex justify-between items-center text-xs">
                <span>🏠 TOLETHUB</span>
                <span className="text-[9px] border border-neon-cyan/40 text-neon-cyan px-1.5 py-0.5 rounded font-bold">REAL ESTATE</span>
              </div>
              <div className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                Property & apartment rental platform connecting owners and tenants with location search.
              </div>
            </div>
            <div className="border border-slate-800 p-2.5 rounded bg-black/60">
              <div className="text-white font-bold flex justify-between items-center text-xs">
                <span>🛍️ I-MALL</span>
                <span className="text-[9px] border border-purple-500/40 text-purple-400 px-1.5 py-0.5 rounded font-bold">FRONTEND ONLY</span>
              </div>
              <div className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                Interactive frontend e-commerce web app built with HTML5, CSS3, and JavaScript UI.
              </div>
            </div>
            <div className="border border-slate-800 p-2.5 rounded bg-black/60">
              <div className="text-white font-bold flex justify-between items-center text-xs">
                <span>⚡ PORTFOLIO INTELLIGENCE (ARIA)</span>
                <span className="text-[9px] border border-neon-cyan/40 text-neon-cyan px-1.5 py-0.5 rounded font-bold">LIVE WORLD</span>
              </div>
              <div className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                3D AI World portal with real-time portfolio intelligence bot and modular doors engine.
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (msg.text.includes('Connection Channels')) {
      return (
        <div className="border border-pink-500/30 bg-slate-950/90 p-3.5 rounded-lg flex flex-col gap-2 font-mono text-xs">
          <div className="text-pink-400 border-b border-pink-500/20 pb-1 font-bold tracking-wider">
            <span>[ DIRECT CONTACT CHANNELS ]</span>
          </div>
          <div className="flex flex-col gap-1.5 mt-1 text-slate-300">
            <div>Email: <span className="text-white font-bold">ik9893344@gmail.com</span></div>
            <div>GitHub: <a href="https://github.com/indra9346" target="_blank" rel="noopener noreferrer" className="text-neon-cyan hover:underline font-bold">github.com/indra9346</a></div>
            <div>LinkedIn: <a href="https://linkedin.com/in/k-s-indra-kumar-7049b1289" target="_blank" rel="noopener noreferrer" className="text-neon-cyan hover:underline font-bold">indra-kumar</a></div>
          </div>
        </div>
      );
    }

    if (msg.text.includes('Resume Access Link')) {
      return (
        <div className="border border-pink-500/30 bg-slate-950/90 p-3.5 rounded-lg flex flex-col gap-2 font-mono text-xs">
          <div className="text-pink-400 border-b border-pink-500/20 pb-1 font-bold tracking-wider">
            <span>[ VERIFIED RESUME DOC ]</span>
          </div>
          <div className="text-slate-300 mt-1">
            Indra Kumar's resume is ready for inspection:
            <div className="mt-2.5">
              <a 
                href="/resume.pdf" 
                target="_blank" 
                rel="noopener noreferrer"
                className="border border-neon-cyan text-neon-cyan px-3.5 py-2 rounded hover:bg-neon-cyan hover:text-black transition-all inline-block text-xs font-bold shadow-[0_0_12px_rgba(3,233,244,0.2)]"
              >
                📥 DOWNLOAD RESUME (PDF)
              </a>
            </div>
          </div>
        </div>
      );
    }

    return <div className="whitespace-pre-wrap text-slate-200 leading-relaxed font-mono">{msg.text}</div>;
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-[9990] bg-[#020617] text-white overflow-hidden font-sans select-none">
      
      {/* Background Video (Looping continuously with CSS autoplay muted loop playsinline) */}
      {aiModeState === 'world' && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            src="/ai-world-background.mp4"
            className="w-full h-full object-cover object-center"
          />
          {/* Subtle gradient overlay for contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-slate-950/60 backdrop-blur-[0.5px]" />
        </div>
      )}

      {/* 3D Canvas Viewport */}
      {(aiModeState === 'portal' || aiModeState === 'world' || aiModeState === 'deactivating') && (
        <div className="absolute top-0 left-0 w-screen h-screen z-10">
          <Canvas camera={{ position: [0, 0, 0], fov: 60 }} shadows>
            <Suspense fallback={null}>
              <SceneController state={aiModeState} />

              {(aiModeState === 'portal' || aiModeState === 'deactivating') && (
                <SpaceTunnel speed={30} />
              )}

              {aiModeState === 'world' && (
                <>
                  <RoboticCity />
                  <QuantumVault isOpened={vaultOpened} progress={holoProgress} onClick={handleVaultClick} />
                </>
              )}
            </Suspense>
          </Canvas>
          <div className="absolute inset-0 pointer-events-none z-20 bg-scanlines opacity-10" />
        </div>
      )}

      {/* Activation logs screen */}
      {aiModeState === 'activating' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-[#030712] z-50">
          <div className="border border-neon-cyan/30 bg-black/80 max-w-sm sm:max-w-md w-[92%] rounded-lg p-5 font-mono text-sm shadow-[0_0_20px_rgba(3,233,244,0.1)] relative">
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t border-l border-neon-cyan" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t border-r border-neon-cyan" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b border-l border-neon-cyan" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b border-r border-neon-cyan" />

            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-neon-cyan text-xs sm:text-sm">
                <Shield className="animate-pulse" size={14} />
                <span>AI GATEWAY OVERRIDE</span>
              </div>
              <span className="text-[10px] sm:text-xs text-red-500 animate-ping font-bold">ACTIVE</span>
            </div>

            <div className="h-36 sm:h-44 flex flex-col gap-2 overflow-y-auto text-green-400 text-[10px] sm:text-xs leading-relaxed">
              <div>&gt; System override initialized...</div>
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="animate-fade-in">{log}</div>
              ))}
              <div className="animate-pulse inline-block w-1.5 h-3.5 bg-green-400 align-middle" />
            </div>
          </div>
        </div>
      )}

      {/* Metropolis HUD controls & Door Hub */}
      {aiModeState === 'world' && (
        <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-3 sm:p-6 w-screen h-screen">
          
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
                className="border border-pink-500/60 text-pink-400 bg-slate-950/80 hover:bg-pink-500 hover:text-black font-mono text-[10px] sm:text-xs px-3 py-1.5 rounded-md transition-all duration-300 flex items-center gap-1 font-bold"
              >
                <X size={12} />
                <span>EXIT WORLD</span>
              </button>
            </div>
          </div>

          {/* Interactive Doors Hub Bar (Desktop & Mobile responsive) */}
          <div className="w-full flex flex-col items-center justify-end mb-1 sm:mb-3 z-40 pointer-events-auto gap-2">
            
            <div className="bg-slate-950/85 backdrop-blur-md border border-neon-cyan/30 rounded-xl p-2 max-w-2xl w-[96%] sm:w-auto shadow-[0_0_25px_rgba(3,233,244,0.2)]">
              <div className="text-[9px] sm:text-[10px] font-mono text-gray-400 text-center uppercase tracking-wider mb-1.5 font-bold flex items-center justify-center gap-1.5">
                <Bot size={11} className="text-neon-cyan" />
                <span>AI Robotics Doors Hub</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DOORS.map((door) => {
                  const isActive = activeDoorId === door.id && isBotVisible;
                  return (
                    <button
                      key={door.id}
                      onClick={() => handleDoorSelect(door)}
                      className={`flex flex-col items-start p-2 sm:p-2.5 rounded-lg border font-mono text-left transition-all duration-300 relative overflow-hidden ${
                        door.status === 'locked'
                          ? 'border-gray-800 bg-slate-900/40 text-gray-500 cursor-not-allowed'
                          : isActive
                          ? 'border-neon-cyan bg-neon-cyan/15 text-white shadow-[0_0_15px_rgba(3,233,244,0.3)]'
                          : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-neon-cyan/50 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[10px] sm:text-xs font-bold flex items-center gap-1">
                          {door.type === 'ai' && <Bot size={12} className="text-neon-cyan" />}
                          {door.type === 'projects' && <FolderGit2 size={12} className="text-green-400" />}
                          {door.type === 'vlogs' && <Video size={12} className="text-gray-500" />}
                          {door.type === 'creations' && <Sparkles size={12} className="text-gray-500" />}
                          <span>{door.title}</span>
                        </span>
                        {door.status === 'locked' ? (
                          <Lock size={10} className="text-gray-500" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        )}
                      </div>

                      <div className="text-[8px] sm:text-[9px] text-gray-400 leading-tight line-clamp-1">
                        {door.subtitle}
                      </div>

                      {door.status === 'locked' && (
                        <div className="absolute top-1 right-1 text-[7px] border border-gray-700 bg-black/60 px-1 rounded text-gray-400 uppercase">
                          Locked
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sci-Fi ARIA White AI Agent Card Dashboard */}
          {isBotVisible && (
            <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center p-3 sm:p-6">
              <div className="w-[94%] sm:w-full max-w-lg max-h-[82vh] sm:max-h-[80vh] border border-neon-cyan/40 bg-[#020617]/95 backdrop-blur-2xl rounded-2xl p-4 sm:p-5 shadow-[0_0_40px_rgba(3,233,244,0.25)] flex flex-col gap-3 pointer-events-auto relative overflow-hidden">
                
                <button
                  onClick={() => setIsBotVisible(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-neon-cyan transition-colors"
                >
                  <X size={16} />
                </button>

                {/* Header */}
                <div className="flex items-center gap-2.5 border-b border-gray-800/80 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan shadow-[0_0_10px_rgba(3,233,244,0.2)]">
                    <Bot size={18} />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs sm:text-sm font-bold text-white leading-tight">ARIA · WHITE AI INTELLIGENCE</h3>
                    <p className="text-[9px] sm:text-[10px] font-mono text-neon-cyan tracking-wider uppercase flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                      <span>REAL-TIME VERIFIED SYSTEM</span>
                    </p>
                  </div>
                </div>

                {/* Chat Feed */}
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin flex flex-col gap-3 font-mono text-xs p-3 bg-black/70 border border-gray-900 rounded-xl">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className="w-full flex flex-col">
                      {renderMessageContent(msg)}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="bg-slate-900/60 text-neon-cyan self-start border border-neon-cyan/20 rounded-md px-3 py-1.5 flex items-center gap-1.5 font-mono text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-[10px] text-gray-400">Processing real-time response...</span>
                    </div>
                  )}
                </div>

                {/* Quick Topic Chips */}
                <div className="flex flex-wrap gap-1.5 justify-center py-1">
                  {['Bio', 'ToLetHub', 'I-Mall', 'Supreme Cart', 'Skills', 'Education', 'Contact', 'Resume'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleSendMessage(cat)}
                      className="border border-neon-cyan/30 hover:border-neon-cyan text-neon-cyan/90 hover:text-neon-cyan bg-slate-950/60 font-mono text-[9px] sm:text-[10px] px-2.5 py-1 rounded-md transition-all duration-200 font-semibold"
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Input Controls */}
                <div className="flex gap-2 pt-1 border-t border-gray-900">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask ARIA about ToLetHub, I-Mall, Supreme Cart, skills..."
                    className="flex-1 bg-black/80 border border-gray-800 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-neon-cyan placeholder:text-gray-600"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    className="border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black px-3.5 py-2 rounded-lg transition-colors font-bold flex items-center justify-center"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Exit screen */}
      {aiModeState === 'deactivating' && (
        <div className="absolute inset-0 bg-[#020617] z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in pointer-events-none">
          <div className="border border-pink-500/30 bg-black/90 p-5 rounded-xl max-w-xs w-full text-center shadow-[0_0_20px_rgba(255,46,99,0.15)]">
            <Shield className="mx-auto text-pink-500 animate-pulse mb-3" size={24} />
            <p className="font-mono text-xs text-pink-400 uppercase font-bold tracking-wider mb-1">🔌 Disconnecting AI World</p>
            <p className="text-[10px] text-gray-400 font-mono">Returning to main portfolio view...</p>
          </div>
        </div>
      )}
    </div>
  );
}
