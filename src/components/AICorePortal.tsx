import { useEffect, useState, useRef, Suspense } from 'react';
import { useAI } from '../context/AIContext';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import gsap from 'gsap';
import { Shield, Activity, Volume2, VolumeX, Database, Send, X, Radio } from 'lucide-react';

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
// 6. Volumetric Metropolis Skyline & Traffic
// ==========================================
const FuturisticCityscape = () => {
  const towers = useRef(
    Array.from({ length: 35 }).map((_, i) => {
      const angle = (i / 35) * Math.PI * 2;
      const radius = 22 + Math.random() * 18;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 12 + Math.random() * 22;
      const width = 2.0 + Math.random() * 3.5;
      const color = i % 3 === 0 ? '#03e9f4' : i % 3 === 1 ? '#7B2CBF' : '#FF2E63';
      return { x, z, height, width, color };
    })
  );

  return (
    <group>
      {towers.current.map((t, idx) => (
        <group key={idx} position={[t.x, t.height / 2 - 2, t.z]}>
          <mesh>
            <boxGeometry args={[t.width, t.height, t.width]} />
            <meshStandardMaterial color={t.color} wireframe emissive={t.color} emissiveIntensity={0.8} />
          </mesh>
          <mesh scale={0.96}>
            <boxGeometry args={[t.width, t.height, t.width]} />
            <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const CyberTraffic = () => {
  const trafficRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (trafficRef.current) {
      trafficRef.current.children.forEach((child, idx) => {
        const speed = 0.4 + (idx % 3) * 0.2;
        const pathRadius = 18 + (idx % 4) * 3;
        const height = 1.5 + (idx % 3) * 2;
        const angle = t * speed + (idx * Math.PI / 4);
        
        child.position.x = Math.cos(angle) * pathRadius;
        child.position.z = Math.sin(angle) * pathRadius;
        child.position.y = height;
      });
    }
  });

  return (
    <group>
      {/* Sky highways */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.95, 0]}>
        <ringGeometry args={[17.5, 18, 32]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.5, 0]}>
        <ringGeometry args={[22.5, 23, 32]} />
        <meshBasicMaterial color="#7B2CBF" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      {/* Swarming traffic nodes */}
      <group ref={trafficRef}>
        {Array.from({ length: 15 }).map((_, idx) => {
          const color = idx % 2 === 0 ? '#03e9f4' : '#FF2E63';
          return (
            <mesh key={idx}>
              <boxGeometry args={[0.3, 0.15, 0.5]} />
              <meshBasicMaterial color={color} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

// ==========================================
// 7. Mechanical Elevators & Gantry Cranes
// ==========================================
const CyberElevator = ({ x, z, maxHeight }: { x: number; z: number; maxHeight: number }) => {
  const liftRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (liftRef.current) {
      liftRef.current.position.y = (Math.sin(t * 0.8) + 1.0) * (maxHeight / 2) - 2;
    }
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, maxHeight / 2 - 2, 0]}>
        <boxGeometry args={[0.15, maxHeight, 0.15]} />
        <meshStandardMaterial color="#1e293b" wireframe />
      </mesh>
      <mesh ref={liftRef}>
        <boxGeometry args={[0.6, 0.8, 0.6]} />
        <meshStandardMaterial color="#03e9f4" wireframe emissive="#03e9f4" />
      </mesh>
    </group>
  );
};

const GantryCrane = ({ position }: { position: [number, number, number] }) => {
  const craneRef = useRef<THREE.Group>(null);
  const trolleyRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (craneRef.current) {
      craneRef.current.rotation.y = Math.sin(t * 0.4) * 0.4;
    }
    if (trolleyRef.current) {
      trolleyRef.current.position.x = 2.0 + Math.sin(t * 0.8) * 1.5;
    }
  });
  return (
    <group position={position} ref={craneRef}>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 6, 8]} />
        <meshStandardMaterial color="#1e293b" wireframe />
      </mesh>
      <group position={[0, 6, 0]}>
        <mesh position={[2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 5, 6]} />
          <meshStandardMaterial color="#03e9f4" wireframe />
        </mesh>
        <group ref={trolleyRef}>
          <mesh>
            <boxGeometry args={[0.5, 0.3, 0.5]} />
            <meshStandardMaterial color="#FF2E63" />
          </mesh>
          <mesh position={[0, -1.0, 0]}>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial color="#7B2CBF" wireframe />
          </mesh>
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.0, 4]} />
            <meshBasicMaterial color="#03e9f4" />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// ==========================================
// 8. Staged Humanoid Hologram (White AI)
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

  // Calculate distinct phase opacities based on progress (0 to 1)
  const particlesOpacity = Math.min(1.0, progress * 2.0); // complete at 0.5
  const skeletonOpacity = Math.max(0.0, Math.min(1.0, (progress - 0.25) * 2.5)); // starts at 0.25, complete at 0.65
  const coreOpacity = Math.max(0.0, Math.min(1.0, (progress - 0.5) * 3.0)); // starts at 0.5, complete at 0.83
  const visorOpacity = Math.max(0.0, Math.min(1.0, (progress - 0.75) * 4.0)); // starts at 0.75, complete at 1.0

  return (
    <group ref={groupRef}>
      {/* Light Shaft Beam */}
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[0.3, 0.7, 1.6, 16, 1, true]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.12 * particlesOpacity} side={THREE.DoubleSide} />
      </mesh>

      {/* Floating Emitter Plate */}
      <mesh position={[0, -0.75, 0]}>
        <torusGeometry args={[0.5, 0.04, 6, 16]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.6 * particlesOpacity} />
      </mesh>

      {/* Segmented Spine (Skeleton Phase) */}
      {skeletonOpacity > 0 && (
        <group>
          {[0, 1, 2].map((i) => (
            <group key={i} position={[0, -0.45 + i * 0.25, 0]}>
              <mesh>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial color="#03e9f4" wireframe emissive="#03e9f4" transparent opacity={skeletonOpacity} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.22 - i * 0.03, 0.015, 4, 12]} />
                <meshBasicMaterial color="#7B2CBF" transparent opacity={0.5 * skeletonOpacity} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Floating Core and Chest Armor (Core Phase) */}
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
            <meshStandardMaterial color="#020617" wireframe emissive="#03e9f4" emissiveIntensity={0.6} transparent opacity={coreOpacity} />
          </mesh>
        </group>
      )}

      {/* Head and Visor assembly (Visor Phase) */}
      {visorOpacity > 0 && (
        <group>
          <group ref={headRef} position={[0, 0.75, 0]}>
            <mesh position={[0, -0.1, 0]}>
              <cylinderGeometry args={[0.06, 0.08, 0.15, 8]} />
              <meshStandardMaterial color="#03e9f4" wireframe transparent opacity={visorOpacity} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.25, 12, 12]} />
              <meshStandardMaterial color="#020617" wireframe emissive="#03e9f4" emissiveIntensity={0.5} transparent opacity={visorOpacity} />
            </mesh>
            <mesh position={[0, 0.02, 0.2]}>
              <boxGeometry args={[0.28, 0.1, 0.08]} />
              <meshStandardMaterial color="#03e9f4" emissive="#03e9f4" emissiveIntensity={1.5} transparent opacity={visorOpacity} />
            </mesh>
          </group>

          {/* Left arm */}
          <group ref={leftArmRef} position={[-0.38, 0.4, 0]}>
            <mesh>
              <sphereGeometry args={[0.08, 6, 6]} />
              <meshBasicMaterial color="#03e9f4" transparent opacity={visorOpacity} />
            </mesh>
            <mesh position={[-0.15, -0.2, 0]} rotation={[0, 0, Math.PI / 6]}>
              <cylinderGeometry args={[0.04, 0.03, 0.4, 6]} />
              <meshStandardMaterial color="#03e9f4" wireframe transparent opacity={visorOpacity} />
            </mesh>
          </group>

          {/* Right arm */}
          <group ref={rightArmRef} position={[0.38, 0.4, 0]}>
            <mesh>
              <sphereGeometry args={[0.08, 6, 6]} />
              <meshBasicMaterial color="#03e9f4" transparent opacity={visorOpacity} />
            </mesh>
            <mesh position={[0.15, -0.2, 0]} rotation={[0, 0, -Math.PI / 6]}>
              <cylinderGeometry args={[0.04, 0.03, 0.4, 6]} />
              <meshStandardMaterial color="#03e9f4" wireframe transparent opacity={visorOpacity} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
};

// ==========================================
// 9. Metropolis Scene Grid & Entities
// ==========================================
const RoboticCity = () => {
  const conveyorPartsRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (conveyorPartsRef.current) {
      conveyorPartsRef.current.children.forEach((child) => {
        child.position.x += 0.05;
        child.rotation.y += 0.015;
        if (child.position.x > 8) {
          child.position.x = -8;
        }
      });
    }
  });

  return (
    <group>
      {/* Base Grid */}
      <gridHelper args={[120, 80, '#03e9f4', '#112233']} position={[0, -2, 0]} />

      <fog attach="fog" args={['#030712', 8, 35]} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[10, 20, 10]} intensity={1.0} />
      <pointLight position={[0, 4, 2]} intensity={3.0} color="#03e9f4" distance={25} />
      <pointLight position={[-4, 2, -3]} intensity={2.0} color="#7B2CBF" distance={15} />

      {/* Volumetric Skyscrapers skyline */}
      <FuturisticCityscape />
      <CyberTraffic />

      {/* Gantry cranes & Elevators */}
      <GantryCrane position={[-6, -2, -8]} />
      <GantryCrane position={[8, -2, -12]} />
      <CyberElevator x={-15} z={-20} maxHeight={16} />
      <CyberElevator x={15} z={-25} maxHeight={20} />

      {/* Heavy assembler weld units */}
      <HeavyWelderRobot position={[-2.5, -2, 0.5]} color="#03e9f4" tipColor="#ff5500" isFlipped={false} />
      <HeavyWelderRobot position={[2.5, -2, -1]} color="#7B2CBF" tipColor="#03e9f4" isFlipped={true} />

      {/* Conveyor Tracks */}
      <group position={[0, -2, 0.5]}>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[14, 0.3, 1.4]} />
          <meshStandardMaterial color="#111827" emissive="#03e9f4" emissiveIntensity={0.15} wireframe />
        </mesh>
        <group ref={conveyorPartsRef}>
          {/* Robot Head */}
          <group position={[-5, 0.7, 0]}>
            <mesh>
              <sphereGeometry args={[0.4, 12, 12]} />
              <meshStandardMaterial color="#03e9f4" wireframe emissive="#03e9f4" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0.15, 0.1, 0.3]} scale={0.06}>
              <sphereGeometry args={[1, 6, 6]} />
              <meshBasicMaterial color="#FF2E63" />
            </mesh>
            <mesh position={[-0.15, 0.1, 0.3]} scale={0.06}>
              <sphereGeometry args={[1, 6, 6]} />
              <meshBasicMaterial color="#FF2E63" />
            </mesh>
          </group>
          {/* Torso */}
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.5, 0.3, 0.8, 8, 4, true]} />
            <meshStandardMaterial color="#7B2CBF" wireframe emissive="#7B2CBF" emissiveIntensity={0.6} />
          </mesh>
          {/* Capsule */}
          <mesh position={[5, 0.6, 0]}>
            <dodecahedronGeometry args={[0.35]} />
            <meshStandardMaterial color="#ffaa00" wireframe emissive="#ffaa00" emissiveIntensity={0.8} />
          </mesh>
        </group>
      </group>

      {/* Quadcopters */}
      {[-4.5, 0, 4.5].map((xOffset, i) => (
        <HeavyInspectionDrone key={i} i={i} xOffset={xOffset} />
      ))}
    </group>
  );
};

// ==========================================
// 10. Automated Movie Drone Camera Controller
// ==========================================
const SceneController = ({ state }: { state: string }) => {
  const { camera } = useThree();

  useFrame((stateData) => {
    const t = stateData.clock.getElapsedTime();
    
    if (state === 'portal') {
      // High-speed portal traversal Z glide
      camera.position.set(0, 0, -t * 15);
      camera.lookAt(0, 0, -t * 15 - 10);
    } else if (state === 'world') {
      // Loop sequence or clamp path
      const s = t % 60;
      
      if (s < 4.5) {
        // Phase 1: High skyline swoop looking down on the metropolis
        const progress = s / 4.5;
        const startPos = new THREE.Vector3(22, 16, 28);
        const endPos = new THREE.Vector3(-12, 10, 22);
        camera.position.lerpVectors(startPos, endPos, progress);
        camera.lookAt(0, 2, -4);
      } else if (s < 9.5) {
        // Phase 2: Low-altitude factory glide under structural gantry pillars
        const progress = (s - 4.5) / 5.0;
        const startPos = new THREE.Vector3(-12, 10, 22);
        const endPos = new THREE.Vector3(0, 3.2, 13);
        camera.position.lerpVectors(startPos, endPos, progress);
        camera.lookAt(0, 1.2, 3);
      } else {
        // Phase 3: Orbital lock-on slowly sweeping and breathing around vault
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
// 11. Holographic Quantum Vault (R3F)
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
      ringRef.current.rotation.z = isOpened ? t * 4 : t * 0.5;
    }
  });

  useEffect(() => {
    if (!lidRef.current) return;
    if (isOpened) {
      sfx.playClick();
      gsap.to(lidRef.current.rotation, {
        x: -Math.PI / 1.5,
        duration: 1.8,
        ease: 'back.out(1.5)',
      });
    } else {
      gsap.to(lidRef.current.rotation, {
        x: 0,
        duration: 1.0,
        ease: 'power2.out',
      });
    }
  }, [isOpened]);

  return (
    <group ref={vaultRef} position={[0, -1.2, 4]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <GLTFModel
        url="/models/quantum_vault.glb"
        scale={1.0}
        fallback={
          <group>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[1.2, 1.3, 1.0, 16]} />
              <meshStandardMaterial color="#020617" emissive="#03e9f4" emissiveIntensity={0.1} wireframe />
            </mesh>
            <mesh ref={ringRef} position={[0, 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.9, 0.08, 8, 24]} />
              <meshStandardMaterial color="#03e9f4" emissive="#03e9f4" emissiveIntensity={0.8} />
            </mesh>
            {[-Math.PI / 3, Math.PI / 3, Math.PI].map((rot, idx) => (
              <group key={idx} rotation={[0, rot, 0]} position={[0, 0.4, 0]}>
                <mesh position={[0.9, 0, 0]}>
                  <boxGeometry args={[0.3, 0.15, 0.15]} />
                  <meshStandardMaterial color="#475569" />
                </mesh>
              </group>
            ))}
            <group ref={lidRef} position={[0, 0.5, -0.6]}>
              <mesh position={[0, 0, 0.6]}>
                <sphereGeometry args={[1.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#020617" emissive="#03e9f4" emissiveIntensity={0.1} wireframe />
              </mesh>
              <mesh position={[0, 1.25, 0.6]} rotation={[0, 0, 0]}>
                <torusGeometry args={[0.3, 0.06, 6, 12]} />
                <meshStandardMaterial color="#03e9f4" />
              </mesh>
            </group>
          </group>
        }
      />

      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.3} />
      </mesh>

      {/* Hologram project core & White AI materialized humanoid */}
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
// 12. Main Interactive Portal
// ==========================================
export default function AICorePortal() {
  const { aiModeState, setAiModeState, exitAIMode } = useAI();
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [vaultOpened, setVaultOpened] = useState(false);
  const [isBotVisible, setIsBotVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; formatted?: boolean }>>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [modelTrained, setModelTrained] = useState(false);

  // Materialization progress: slides 0 to 1 over 6 seconds
  const [holoProgress, setHoloProgress] = useState(0);

  useEffect(() => {
    sfx.isMuted = isMuted;
    if (isMuted) {
      sfx.stopHum();
    } else if (aiModeState === 'world') {
      sfx.startHum();
    }
  }, [isMuted, aiModeState]);

  // Transition controller
  useEffect(() => {
    if (aiModeState === 'activating') {
      sfx.playWarp(false);
      setTerminalLogs([]);

      const intervals = [1000, 2000, 3000];
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
        // Slide directly to the video forward player transition
        setAiModeState('video_forward');
      }, 3500);

      return () => clearTimeout(timer);
    } else if (aiModeState === 'portal') {
      sfx.playBeep(660, 0.2, 0.02);
      const timer = setTimeout(() => {
        setAiModeState('world');
      }, 5500);
      return () => clearTimeout(timer);
    } else if (aiModeState === 'world') {
      sfx.startHum();
    }
  }, [aiModeState, setAiModeState]);

  // Materialization progression tick
  useEffect(() => {
    if (!vaultOpened) return;
    let start: number | null = null;
    const duration = 5500; // 5.5 seconds for complete sequence

    const tick = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(1.0, elapsed / duration);
      setHoloProgress(progress);

      if (progress < 1.0) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }, [vaultOpened]);

  const handleVaultClick = () => {
    if (vaultOpened) return;
    setVaultOpened(true);

    setTimeout(() => {
      setIsBotVisible(true);
      sfx.playBeep(900, 0.25, 0.02);

      const lines = [
        "[ SECURE CONNECT ESTABLISHED ]",
        "WHITE AI HOLOGRAPHIC FRAME: ASSEMBLED",
        "WELCOME TO MISSION CONTROL TERMINAL.\n\nI have verified the credentials of Engineer Indra Kumar.\n\n[ MODULE DATA LOGS ]:\n- Projects Database\n- Skills Inventory\n- Academic Records\n- Contact Channels\n\nAsk me to predict interests or select a database below."
      ];

      lines.forEach((line, index) => {
        setTimeout(() => {
          setChatMessages((prev) => [...prev, { sender: 'ai', text: line }]);
          sfx.playBeep(440 + index * 40, 0.05, 0.01);
        }, index * 600);
      });
    }, 5500); // Trigger panel open exactly when materialization finishes
  };

  const predictInterest = (topic: string): string => {
    const t = topic.toLowerCase().trim();
    let score = 30;
    let explanation = '';

    const highInterest = ['react', 'javascript', 'html', 'css', 'web', 'frontend', 'front-end', 'fullstack', 'full-stack', 'java', 'hibernate', 'postgresql', 'supabase', 'database', 'sql', 'backend', 'back-end', 'code', 'ui', 'ux', 'design', 'development', 'developer'];
    const aiInterest = ['ai', 'ml', 'artificial intelligence', 'machine learning', 'python', 'deep learning', 'neural network', 'data science', 'prompt', 'nlp', 'model', 'dataset', 'classifier', 'regression', 'prediction'];
    const mediumInterest = ['python', 'c', 'dsa', 'git', 'github', 'programming', 'algorithms', 'structures', 'logic'];

    if (highInterest.some(word => t.includes(word))) {
      score = 88 + Math.floor(Math.random() * 10);
      explanation = "High Alignment. Indra has extensive practical experience building responsive user interfaces, backend REST APIs, and database configurations using this stack.";
    } else if (aiInterest.some(word => t.includes(word))) {
      score = 92 + Math.floor(Math.random() * 6);
      explanation = "Maximum Academic Focus. Indra holds a Bachelor of Engineering in AI & Machine Learning, completing core coursework in neural networks and ML models.";
    } else if (mediumInterest.some(word => t.includes(word))) {
      score = 72 + Math.floor(Math.random() * 12);
      explanation = "Solid Familiarity. Frequently used for algorithmic problem-solving (Data Structures) and repository version control.";
    } else {
      score = 22 + Math.floor(Math.random() * 20);
      explanation = "Exploratory / Low Current Alignment. Indra prioritizes web application development frameworks and ML core systems.";
    }

    const barLength = 12;
    const filledLength = Math.round((score / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    return `ACCESSING PREDICTION ENGINE...
--------------------------------
Topic Matrix: "${topic}"

Interest Prediction Score:
[${bar}] ${score}% Alignment

Analysis:
${explanation}

Status: CONFIDENCE OPTIMIZED`;
  };

  const handleTrainModel = () => {
    if (isTyping) return;
    setIsTyping(true);
    sfx.playClick();

    setChatMessages((prev) => [...prev, { sender: 'user', text: "Train Interest Prediction Model" }]);

    const logs = [
      "[PYTHON INTERPRETER CORE] initializing...",
      "import torch\nimport torch.nn as nn\nimport torch.optim as optim\n\nclass InterestClassifier(nn.Module):\n    def __init__(self):\n        super().__init__()\n        self.network = nn.Sequential(\n            nn.Linear(24, 128),\n            nn.ReLU(),\n            nn.Linear(128, 64),\n            nn.ReLU(),\n            nn.Linear(64, 5)\n        )",
      "Extracting skills feature matrix vectors from Indra Kumar's profile...",
      "Epoch 15/50 - Training Loss: 0.3941 - Val Acc: 74.2%",
      "Epoch 35/50 - Training Loss: 0.1288 - Val Acc: 91.5%",
      "Epoch 50/50 - Training Loss: 0.0312 - Val Acc: 98.6%",
      "PyTorch training completed! Model exported as 'interest_classifier.onnx'.\n\nReady to predict! Ask me: 'Predict interest for React' or 'Predict interest for Python' to see the model output."
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setChatMessages((prev) => [...prev, { sender: 'ai', text: log, formatted: log.includes('Loss:') || log.includes('torch') }]);
        sfx.playBeep(440 + index * 30, 0.05, 0.01);
        if (index === logs.length - 1) {
          setIsTyping(false);
          setModelTrained(true);
        }
      }, index * 700);
    });
  };

  const queryDatabase = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('predict') || q.includes('interest') || q.includes('similarity') || modelTrained) {
      const isStandardCat = ['skills', 'projects', 'education', 'contact', 'resume', 'experience'].some(cat => q.includes(cat));
      if (!isStandardCat) {
        const topic = query
          .replace(/predict/i, '')
          .replace(/interest/i, '')
          .replace(/for/i, '')
          .replace(/about/i, '')
          .trim();
        return predictInterest(topic || "Web Development");
      }
    }

    if (q.includes('project') || q.includes('work') || q.includes('built') || q.includes('develop')) {
      return `Selected Repositories`;
    }

    if (q.includes('skill') || q.includes('language') || q.includes('technology') || q.includes('database') || q.includes('stack') || q.includes('tool')) {
      return `Technical Stack Verification`;
    }

    if (q.includes('education') || q.includes('graduate') || q.includes('college') || q.includes('school') || q.includes('degree') || q.includes('study')) {
      return `Academic Matrix Verification`;
    }

    if (q.includes('contact') || q.includes('email') || q.includes('connect') || q.includes('reach') || q.includes('linkedin') || q.includes('github')) {
      return `Connection Channels`;
    }

    return `ACCESSING KNOWLEDGE DATABASE...\nNotice: Search returned 0 matching nodes. Please select one of the database categories.`;
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || isTyping) return;

    const userText = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setIsTyping(true);
    sfx.playClick();

    setTimeout(() => {
      const response = queryDatabase(userText);
      setChatMessages((prev) => [...prev, { sender: 'ai', text: response, formatted: true }]);
      setIsTyping(false);
      sfx.playBeep(660, 0.08, 0.01);
    }, 1200);
  };

  const handleTriggerReturn = () => {
    sfx.playBeep(330, 0.25, 0.02);
    setChatMessages((prev) => [...prev, { sender: 'ai', text: "Your session has ended. Returning you to your world..." }]);
    
    setTimeout(() => {
      // Trigger reverse video bridge playback
      setAiModeState('video_reverse');
    }, 1500);
  };

  // Structured High-Tech Card renderer for HUD Terminal
  const renderMessageContent = (msg: { sender: 'ai' | 'user'; text: string; formatted?: boolean }) => {
    if (msg.sender === 'user') {
      return <div className="text-right text-neon-cyan">{msg.text}</div>;
    }

    if (msg.text.includes('Technical Stack Verification')) {
      return (
        <div className="border border-neon-cyan/20 bg-slate-950/85 p-3 rounded-lg flex flex-col gap-2 font-mono text-[9px] sm:text-xs">
          <div className="text-neon-cyan border-b border-neon-cyan/20 pb-1 font-bold tracking-wider flex items-center gap-1.5">
            <Shield size={10} />
            <span>[ SYSTEM: INVENTORY LOADED ]</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-slate-300">
            <div>Java:</div><div className="text-green-400">██████████ 96%</div>
            <div>React:</div><div className="text-green-400">████████░░ 80%</div>
            <div>PostgreSQL:</div><div className="text-green-400">████████░░ 80%</div>
            <div>Supabase:</div><div className="text-green-400">████████░░ 80%</div>
            <div>Python (AIML):</div><div className="text-green-400">█████████░ 90%</div>
            <div>DSA Concepts:</div><div className="text-green-400">████████░░ 80%</div>
          </div>
        </div>
      );
    }

    if (msg.text.includes('Academic Matrix Verification')) {
      return (
        <div className="border border-neon-purple/20 bg-slate-950/85 p-3 rounded-lg flex flex-col gap-2 font-mono text-[9px] sm:text-xs">
          <div className="text-neon-purple border-b border-neon-purple/20 pb-1 font-bold tracking-wider flex items-center gap-1.5">
            <Activity size={10} />
            <span>[ SYSTEM: ACADEMIC CREDENTIALS ]</span>
          </div>
          <div className="flex flex-col gap-2 mt-1 text-slate-300">
            <div className="border-l-2 border-neon-purple pl-2">
              <div className="font-bold text-white text-[10px] sm:text-xs">B.E. in AI & Machine Learning (2026)</div>
              <div className="text-gray-400">SJC Institute of Technology | CGPA: 8.59/10</div>
            </div>
            <div className="border-l-2 border-neon-purple pl-2">
              <div className="font-bold text-white text-[10px] sm:text-xs">PUC - PCMC (2022)</div>
              <div className="text-gray-400">LRG Naidu JR. College | Score: 85.3%</div>
            </div>
          </div>
        </div>
      );
    }

    if (msg.text.includes('Selected Repositories')) {
      return (
        <div className="border border-neon-cyan/20 bg-slate-950/85 p-3 rounded-lg flex flex-col gap-2 font-mono text-[9px] sm:text-xs w-full">
          <div className="text-neon-cyan border-b border-neon-cyan/20 pb-1 font-bold tracking-wider">
            <span>[ SYSTEM: REPOSITORY LOGS ]</span>
          </div>
          <div className="flex flex-col gap-2 mt-1.5 w-full">
            <div className="border border-slate-800 p-2 rounded bg-black/40">
              <div className="text-white font-bold flex justify-between items-center text-[10px] sm:text-xs">
                <span>🛒 SUPREME CART</span>
                <span className="text-[8px] border border-green-500/30 text-green-400 px-1 rounded">PROD</span>
              </div>
              <div className="text-slate-400 text-[8px] sm:text-[10px] mt-1 leading-relaxed">
                Full-stack shopping application built with Java, Hibernate, and PostgreSQL. Handles catalogs and secure checkout sessions.
              </div>
            </div>
            <div className="border border-slate-800 p-2 rounded bg-black/40">
              <div className="text-white font-bold flex justify-between items-center text-[10px] sm:text-xs">
                <span>📊 PORTFOLIO CONFIG v4.0</span>
                <span className="text-[8px] border border-neon-cyan/30 text-neon-cyan px-1 rounded">ACTIVE</span>
              </div>
              <div className="text-slate-400 text-[8px] sm:text-[10px] mt-1 leading-relaxed">
                Interactive control panel configuring client settings, real-time Supabase triggers, and promotions.
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (msg.text.includes('Connection Channels')) {
      return (
        <div className="border border-neon-pink/20 bg-slate-950/85 p-3 rounded-lg flex flex-col gap-2 font-mono text-[9px] sm:text-xs">
          <div className="text-neon-pink border-b border-neon-pink/20 pb-1 font-bold tracking-wider">
            <span>[ SYSTEM: COMMS NODE ]</span>
          </div>
          <div className="flex flex-col gap-1 mt-1 text-slate-300">
            <div>Email: <span className="text-white">ik9893344@gmail.com</span></div>
            <div>GitHub: <a href="https://github.com/indra9346" target="_blank" className="text-neon-cyan hover:underline">github.com/indra9346</a></div>
            <div>LinkedIn: <a href="https://linkedin.com/in/k-s-indra-kumar-7049b1289" target="_blank" className="text-neon-cyan hover:underline">indra-kumar</a></div>
          </div>
        </div>
      );
    }

    return <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">{msg.text}</div>;
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-[9990] bg-[#020617] text-white overflow-hidden font-sans select-none">
      
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

      {/* metropolis HUD controls */}
      {aiModeState === 'world' && (
        <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-4 sm:p-6 w-screen h-screen">
          <div className="flex justify-between items-start w-full gap-2 z-50">
            <div className="border border-neon-cyan/20 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-md font-mono text-[9px] sm:text-[10px] text-neon-cyan flex items-center gap-2">
              <Radio size={10} className="animate-pulse" />
              <span>WHITE AI CONTROLLER v4.0</span>
            </div>
            
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="border border-gray-700 text-gray-400 hover:text-neon-cyan bg-black/60 p-2 rounded-md transition-colors"
                aria-label={isMuted ? 'Mute Portal Sounds' : 'Unmute Portal Sounds'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>

              <button
                onClick={handleTriggerReturn}
                className="border border-neon-pink text-neon-pink bg-black/70 hover:bg-neon-pink hover:text-black font-mono text-[10px] sm:text-[11px] px-3 py-2 rounded-md transition-all duration-300 flex items-center gap-1"
              >
                <X size={10} />
                <span>DISCONNECT</span>
              </button>
            </div>
          </div>

          {!vaultOpened && (
            <div className="w-full flex justify-center mb-6 sm:mb-10 z-50">
              <div className="border border-neon-cyan/30 bg-black/80 backdrop-blur-md p-3.5 rounded-lg text-center max-w-xs animate-bounce pointer-events-auto cursor-pointer" onClick={handleVaultClick}>
                <p className="font-mono text-[10px] sm:text-xs text-neon-cyan mb-1.5 uppercase font-bold tracking-wider">🔒 Quantum Vault Detected</p>
                <p className="text-[10px] sm:text-[11px] text-gray-400 font-mono">Click the central rotating vault to release the White AI holographic core.</p>
              </div>
            </div>
          )}

          {/* Sci-Fi Mission Control Terminal Card Dashboard */}
          {isBotVisible && (
            <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center p-3 sm:p-6 bg-black/50">
              <div className="w-[94%] sm:w-full max-w-md max-h-[82vh] sm:max-h-[75vh] border border-neon-cyan/30 bg-[#020617]/95 backdrop-blur-2xl rounded-xl p-4 sm:p-5 shadow-[0_0_35px_rgba(3,233,244,0.15)] flex flex-col gap-3 pointer-events-auto relative overflow-hidden">
                <button
                  onClick={() => { sfx.playClick(); setVaultOpened(false); setIsBotVisible(false); }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-neon-cyan transition-colors"
                >
                  <X size={15} />
                </button>

                <div className="flex items-center gap-2 border-b border-gray-800 pb-2.5">
                  <div className="w-7 h-7 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-neon-cyan">
                    <Database size={14} />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs sm:text-sm font-bold text-white leading-tight">WHITE AI CORE</h3>
                    <p className="text-[8px] sm:text-[9px] font-mono text-neon-cyan tracking-wider uppercase flex items-center gap-1 mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                      <span>MISSION CONTROL ENGAGED</span>
                    </p>
                  </div>
                </div>

                {/* Structured command feed */}
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin flex flex-col gap-3 font-mono text-[10px] sm:text-[11px] p-2 bg-black/60 border border-gray-900 rounded-md">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className="w-full flex flex-col">
                      {renderMessageContent(msg)}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="bg-slate-800/40 text-slate-400 self-start border border-slate-900/60 rounded px-2.5 py-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 justify-center py-0.5">
                  {['Skills', 'Projects', 'Education', 'Contact'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setChatInput(cat); }}
                      className="border border-neon-cyan/20 hover:border-neon-cyan text-neon-cyan/80 hover:text-neon-cyan bg-black/40 font-mono text-[8px] sm:text-[9px] px-2.5 py-0.5 rounded transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                  <button
                    onClick={handleTrainModel}
                    className="border border-neon-purple/40 hover:border-neon-purple text-neon-purple/90 hover:text-neon-purple bg-black/40 font-mono text-[8px] sm:text-[9px] px-2.5 py-0.5 rounded transition-colors flex items-center gap-1 font-bold animate-pulse"
                  >
                    🧠 Train Model
                  </button>
                </div>

                <div className="flex gap-2 pt-1 border-t border-gray-900">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask White AI..."
                    className="flex-1 bg-black/60 border border-gray-800 rounded px-3 py-1.5 font-mono text-[11px] text-white focus:outline-none focus:border-neon-cyan"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black p-2 rounded transition-colors"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* exit screen */}
      {aiModeState === 'deactivating' && (
        <div className="absolute inset-0 bg-[#020617] z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in pointer-events-none">
          <div className="border border-neon-pink/20 bg-black/85 p-5 rounded-lg max-w-xs w-full text-center shadow-[0_0_20px_rgba(255,46,99,0.1)]">
            <Shield className="mx-auto text-neon-pink animate-pulse mb-3" size={20} />
            <p className="font-mono text-xs text-neon-pink uppercase font-bold tracking-wider mb-1">🔌 Reconstructing Reality</p>
            <p className="text-[9px] sm:text-[10px] text-gray-500 font-mono">Restoring original coordinates in 3D spacetime...</p>
          </div>
        </div>
      )}
    </div>
  );
}
