import { useEffect, useState, useRef, Suspense } from 'react';
import { useAI } from '../context/AIContext';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { Terminal, Send, X, Shield, Activity, Radio, Database } from 'lucide-react';

// ==========================================
// 1. Web Audio Synth (Spatial/SFX Synth)
// ==========================================
class PortaSfxSynth {
  private ctx: AudioContext | null = null;
  private humNode: OscillatorNode | null = null;
  private humGain: GainNode | null = null;

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error("Audio Context initialization failed", e);
    }
  }

  playBeep(freq = 880, duration = 0.1, gainVal = 0.05) {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playClick() {
    this.playBeep(220, 0.08, 0.1);
  }

  playWarp(reverse = false) {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    filter.type = 'lowpass';

    const duration = 5.0;
    const startFreq = reverse ? 800 : 80;
    const endFreq = reverse ? 50 : 1200;

    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);

    filter.frequency.setValueAtTime(200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2500, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  startHum() {
    this.init();
    if (!this.ctx || this.humNode) return;
    try {
      this.humNode = this.ctx.createOscillator();
      this.humGain = this.ctx.createGain();

      this.humNode.connect(this.humGain);
      this.humGain.connect(this.ctx.destination);

      this.humNode.type = 'triangle';
      this.humNode.frequency.setValueAtTime(55, this.ctx.currentTime); // Low A hum
      this.humGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      this.humNode.start();
    } catch (e) {
      console.error(e);
    }
  }

  stopHum() {
    if (this.humNode) {
      try {
        this.humNode.stop();
        this.humNode.disconnect();
      } catch (e) {}
      this.humNode = null;
    }
    if (this.humGain) {
      try {
        this.humGain.disconnect();
      } catch (e) {}
      this.humGain = null;
    }
  }
}

const sfx = new PortaSfxSynth();

// ==========================================
// 2. 3D Space Warp Tunnel (R3F Component)
// ==========================================
const SpaceTunnel = ({ speed }: { speed: number }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 2200;

  const positions = Array.from({ length: particleCount * 3 }, (_, i) => {
    if (i % 3 === 2) {
      // Z depth
      return Math.random() * -120;
    }
    const theta = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * 4;
    if (i % 3 === 0) return Math.sin(theta) * r; // X
    return Math.cos(theta) * r; // Y
  });

  const float32Positions = new Float32Array(positions);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 2; i < pos.length; i += 3) {
      pos[i] += speed * delta * 60;
      if (pos[i] > 10) {
        pos[i] = -120; // reset
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.rotation.z += 0.003;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[float32Positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#03e9f4"
        size={0.16}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// ==========================================
// 3. Robotic Arms, Conveyor & City (R3F)
// ==========================================
const RoboticCity = () => {
  const arm1Ref = useRef<THREE.Group>(null);
  const arm2Ref = useRef<THREE.Group>(null);
  const conveyorPartsRef = useRef<THREE.Group>(null);
  const sparksRef = useRef<THREE.Points>(null);
  const [sparkActive, setSparkActive] = useState(false);
  const sparksCount = 120;

  // Initialize sparks
  const sparkPositions = new Float32Array(sparksCount * 3);
  const sparkVelocities = useRef<Float32Array>(new Float32Array(sparksCount * 3));

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // 1. Animate Robotic Arms joints
    if (arm1Ref.current) {
      arm1Ref.current.rotation.y = Math.sin(t * 1.5) * 0.4;
      const shoulder = arm1Ref.current.children[1] as THREE.Group;
      if (shoulder) {
        shoulder.rotation.z = -Math.PI / 4 + Math.sin(t * 2) * 0.15;
      }
    }
    if (arm2Ref.current) {
      arm2Ref.current.rotation.y = Math.cos(t * 1.2) * 0.3;
      const shoulder = arm2Ref.current.children[1] as THREE.Group;
      if (shoulder) {
        shoulder.rotation.z = Math.PI / 4 + Math.cos(t * 1.8) * 0.1;
      }
    }

    // Trigger sparks at intervals (welding)
    const weldingInterval = Math.sin(t * 5) > 0.6;
    setSparkActive(weldingInterval);

    // 2. Animate Conveyor Belt parts moving along X axis
    if (conveyorPartsRef.current) {
      conveyorPartsRef.current.children.forEach((child) => {
        child.position.x += 0.04;
        if (child.position.x > 8) {
          child.position.x = -8;
        }
      });
    }

    // 3. Spark Particle Physics (gravity-affected falling particles)
    if (sparksRef.current && weldingInterval) {
      const pos = sparksRef.current.geometry.attributes.position.array as Float32Array;
      const vels = sparkVelocities.current;

      // Arm 1 welding tip location (approx)
      const tipX = -2.5 + Math.sin(t * 1.5) * 0.3;
      const tipY = -0.4 + Math.sin(t * 2) * 0.1;
      const tipZ = 0.5;

      for (let i = 0; i < pos.length; i += 3) {
        // If particle has fallen too far, reset it to welding tip
        if (pos[i + 1] < -2 || Math.random() < 0.05) {
          pos[i] = tipX;
          pos[i + 1] = tipY;
          pos[i + 2] = tipZ;

          vels[i] = (Math.random() - 0.5) * 4;
          vels[i + 1] = Math.random() * 5 + 1; // vertical launch
          vels[i + 2] = (Math.random() - 0.5) * 4;
        } else {
          // Apply velocities + gravity
          pos[i] += vels[i] * 0.016;
          vels[i + 1] -= 9.8 * 0.016; // gravity
          pos[i + 1] += vels[i + 1] * 0.016;
          pos[i + 2] += vels[i + 2] * 0.016;
        }
      }
      sparksRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* 3D Grid floor */}
      <gridHelper args={[120, 80, '#03e9f4', '#112233']} position={[0, -2, 0]} />

      {/* Volumetric Fog & Cyber Lighting */}
      <fog attach="fog" args={['#030712', 6, 40]} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <pointLight position={[0, 5, 2]} intensity={2.5} color="#03e9f4" distance={25} />
      <pointLight position={[-4, 2, -5]} intensity={1.5} color="#7B2CBF" distance={15} />

      {/* Futuristic Skyscrapers (Procedural wireframes with PBR textures) */}
      {[
        { pos: [-15, 6, -20], size: [4, 16, 4], color: '#03e9f4' },
        { pos: [15, 8, -25], size: [6, 20, 6], color: '#7B2CBF' },
        { pos: [-25, 5, -10], size: [5, 14, 5], color: '#5B8FB9' },
        { pos: [22, 6, -12], size: [4, 16, 4], color: '#FF2E63' },
        { pos: [0, 12, -35], size: [8, 30, 8], color: '#03e9f4' },
      ].map((b, i) => (
        <group key={i} position={b.pos as any}>
          {/* Wireframe Tower */}
          <mesh>
            <boxGeometry args={b.size as any} />
            <meshStandardMaterial
              color={b.color}
              wireframe
              emissive={b.color}
              emissiveIntensity={0.6}
            />
          </mesh>
          {/* Core Solid building block */}
          <mesh scale={0.96}>
            <boxGeometry args={b.size as any} />
            <meshStandardMaterial
              color="#0b1329"
              roughness={0.2}
              metalness={0.9}
            />
          </mesh>
        </group>
      ))}

      {/* Robotic Arm 1 (Jointed Group) */}
      <group ref={arm1Ref} position={[-2.5, -2, 0.5]}>
        {/* Base */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.5, 0.6, 0.6, 12]} />
          <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.3} />
        </mesh>
        {/* Joint 1 (Shoulder) */}
        <group position={[0, 0.6, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.6, 8]} />
            <meshStandardMaterial color="#7B2CBF" emissive="#7B2CBF" emissiveIntensity={0.5} />
          </mesh>
          {/* Segment 1 */}
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[0.2, 1.8, 0.2]} />
            <meshStandardMaterial color="#374151" metalness={0.8} />
          </mesh>
          {/* Joint 2 (Elbow) */}
          <group position={[0, 1.9, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.5, 8]} />
              <meshStandardMaterial color="#03e9f4" />
            </mesh>
            {/* Segment 2 (Forearm) */}
            <mesh position={[0, 0.7, 0]}>
              <boxGeometry args={[0.15, 1.2, 0.15]} />
              <meshStandardMaterial color="#4b5563" />
            </mesh>
            {/* Welding Tip */}
            <mesh position={[0, 1.3, 0]}>
              <coneGeometry args={[0.1, 0.4, 6]} />
              <meshStandardMaterial color="#FF2E63" emissive="#FF2E63" emissiveIntensity={1} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Robotic Arm 2 (Assembly Arm) */}
      <group ref={arm2Ref} position={[2.5, -2, -1]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.5, 0.6, 0.6, 12]} />
          <meshStandardMaterial color="#1f2937" metalness={0.9} />
        </mesh>
        <group position={[0, 0.6, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.6, 8]} />
            <meshStandardMaterial color="#03e9f4" />
          </mesh>
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[0.2, 1.8, 0.2]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
          <group position={[0, 1.9, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.5, 8]} />
              <meshStandardMaterial color="#7B2CBF" />
            </mesh>
            <mesh position={[0, 0.7, 0]}>
              <boxGeometry args={[0.15, 1.2, 0.15]} />
              <meshStandardMaterial color="#4b5563" />
            </mesh>
            <mesh position={[0, 1.3, 0]}>
              <sphereGeometry args={[0.18, 8, 8]} />
              <meshStandardMaterial color="#03e9f4" emissive="#03e9f4" emissiveIntensity={0.8} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Gravity sparks points */}
      {sparkActive && (
        <points ref={sparksRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[sparkPositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#ff7b00"
            size={0.12}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {/* Moving Conveyor Belt Assembly System */}
      <group position={[0, -2, 0.5]}>
        {/* Belt base */}
        <mesh rotation={[0, 0, 0]} position={[0, 0.1, 0]}>
          <boxGeometry args={[12, 0.2, 1.2]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.6} />
        </mesh>
        {/* Conveyor parts group */}
        <group ref={conveyorPartsRef}>
          <mesh position={[-4, 0.35, 0]}>
            <boxGeometry args={[0.8, 0.4, 0.8]} />
            <meshStandardMaterial color="#4b5563" wireframe />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.5, 8]} />
            <meshStandardMaterial color="#7b2cbf" wireframe />
          </mesh>
          <mesh position={[4, 0.35, 0]}>
            <sphereGeometry args={[0.35, 8, 8]} />
            <meshStandardMaterial color="#03e9f4" wireframe />
          </mesh>
        </group>
      </group>

      {/* Patrolling Security/Delivery Drones */}
      {[-4, 0, 4].map((xOffset, i) => (
        <group key={i}>
          <Drone i={i} xOffset={xOffset} />
        </group>
      ))}
    </group>
  );
};

// Drone subcomponent
const Drone = ({ i, xOffset }: { i: number; xOffset: number }) => {
  const droneRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (droneRef.current) {
      // Fly in a sine wave path
      droneRef.current.position.y = 3 + Math.sin(t * 1.5 + i) * 0.8;
      droneRef.current.position.x = xOffset + Math.cos(t * 0.8 + i) * 3;
      droneRef.current.position.z = -5 + Math.sin(t * 0.8 + i) * 2;
    }
  });

  return (
    <group ref={droneRef}>
      {/* Drone body */}
      <mesh>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#1f2937" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Glowing visor */}
      <mesh position={[0, 0, 0.25]}>
        <boxGeometry args={[0.2, 0.08, 0.1]} />
        <meshStandardMaterial color="#FF2E63" emissive="#FF2E63" />
      </mesh>
      {/* Rotating quad rotors */}
      {[
        [-0.4, 0.4],
        [0.4, 0.4],
        [-0.4, -0.4],
        [0.4, -0.4],
      ].map((pos, rIdx) => (
        <group key={rIdx} position={[pos[0], 0.1, pos[1]]}>
          <mesh>
            <cylinderGeometry args={[0.02, 0.02, 0.1, 4]} />
            <meshStandardMaterial color="#4b5563" />
          </mesh>
          <Rotor />
        </group>
      ))}
    </group>
  );
};

const Rotor = () => {
  const rotorRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (rotorRef.current) rotorRef.current.rotation.y += 0.6;
  });
  return (
    <mesh ref={rotorRef} position={[0, 0.05, 0]}>
      <boxGeometry args={[0.4, 0.01, 0.04]} />
      <meshStandardMaterial color="#374151" />
    </mesh>
  );
};

// ==========================================
// 4. Dynamic Camera Controls (GSAP Driven)
// ==========================================
const SceneController = ({ state }: { state: string }) => {
  const { camera } = useThree();

  useEffect(() => {
    if (state === 'portal') {
      // Zoom out spline during portal warp
      camera.position.set(0, 0, 0);
      gsap.to(camera.position, {
        z: -90,
        duration: 5.5,
        ease: 'power1.inOut',
      });
    } else if (state === 'world') {
      // Reset camera to city outskirts and do cinematic sweep
      camera.position.set(0, 15, 25);
      gsap.to(camera.position, {
        x: 0,
        y: 2,
        z: 10,
        duration: 4.5,
        ease: 'power2.out',
      });
    }
  }, [state, camera]);

  return null;
};

// ==========================================
// 5. Holographic Quantum Vault (R3F)
// ==========================================
const QuantumVault = ({ isOpened, onClick }: { isOpened: boolean; onClick: () => void }) => {
  const vaultRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const lidRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (vaultRef.current) {
      // Idle float
      vaultRef.current.position.y = -1.2 + Math.sin(t * 1.5) * 0.08;
    }
    if (ringRef.current) {
      // Lock rings spin
      ringRef.current.rotation.z = isOpened ? t * 4 : t * 0.5;
    }
  });

  useEffect(() => {
    if (!lidRef.current) return;
    if (isOpened) {
      sfx.playClick();
      // Animate lock open
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
      {/* 3D Capsule Vault Base */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.3, 1.0, 16]} />
        <meshStandardMaterial color="#111827" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Locking ring */}
      <mesh ref={ringRef} position={[0, 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, 0.08, 8, 24]} />
        <meshStandardMaterial color="#03e9f4" emissive="#03e9f4" emissiveIntensity={0.5} />
      </mesh>

      {/* Hydraulic Lock brackets */}
      {[-Math.PI / 3, Math.PI / 3, Math.PI].map((rot, idx) => (
        <group key={idx} rotation={[0, rot, 0]} position={[0, 0.4, 0]}>
          <mesh position={[0.9, 0, 0]}>
            <boxGeometry args={[0.3, 0.15, 0.15]} />
            <meshStandardMaterial color="#4b5563" metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Lid Group (Pivoting from the back hinge) */}
      <group ref={lidRef} position={[0, 0.5, -0.6]}>
        {/* Top Dome of Vault */}
        <mesh position={[0, 0, 0.6]}>
          <sphereGeometry args={[1.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#1f2937" metalness={0.95} roughness={0.2} />
        </mesh>
        {/* Top Handle ring */}
        <mesh position={[0, 1.25, 0.6]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.3, 0.06, 6, 12]} />
          <meshStandardMaterial color="#03e9f4" />
        </mesh>
      </group>

      {/* Central Blue Plasma Core Glow */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.3} />
      </mesh>

      {/* Floating Holographic particles when opened */}
      {isOpened && (
        <HologramBeam />
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
    const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const t = state.clock.getElapsedTime();

    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] += 0.03; // rise
      pos[i] = Math.sin(t * 3 + i) * 0.4;
      pos[i + 2] = Math.cos(t * 3 + i) * 0.4;

      if (pos[i + 1] > 2.5) {
        pos[i + 1] = 0.5; // loop
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.rotation.y += 0.01;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Light Shaft Beam */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.4, 0.8, 1.6, 16, 1, true]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* Rising data particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#03e9f4"
          size={0.08}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Floating Rotating holographic Cube */}
      <HoloCube />
    </group>
  );
};

const HoloCube = () => {
  const cubeRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (cubeRef.current) {
      cubeRef.current.rotation.y = state.clock.getElapsedTime() * 0.6;
      cubeRef.current.rotation.x = state.clock.getElapsedTime() * 0.3;
      cubeRef.current.position.y = 1.6 + Math.sin(state.clock.getElapsedTime() * 2) * 0.1;
    }
  });

  return (
    <mesh ref={cubeRef}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial
        color="#03e9f4"
        wireframe
        emissive="#03e9f4"
        emissiveIntensity={1.2}
      />
    </mesh>
  );
};

// ==========================================
// 6. MAIN PORTAL CONTROLLER (React Component)
// ==========================================
export default function AICorePortal() {
  const { aiModeState, setAiModeState, exitAIMode } = useAI();
  const [glitchProgress, setGlitchProgress] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [vaultOpened, setVaultOpened] = useState(false);
  const [isBotVisible, setIsBotVisible] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; formatted?: boolean }>>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Sound triggers based on states
  useEffect(() => {
    if (aiModeState === 'activating') {
      sfx.playWarp(false);
      setTerminalLogs([]);
      setGlitchProgress(0);

      // glitched screen sequence
      const intervals = [1000, 2000, 3000, 4200, 5200];
      const logTexts = [
        "> Initializing AI Core Security Shield...",
        "> Establishing Quantum Session tunnel...",
        "> Analyzing local biometric nodes... Access Approved.",
        "> Defragmenting DOM matrix structures...",
        "> Fictional scan protocol loaded... Fading reality...",
      ];

      intervals.forEach((time, index) => {
        setTimeout(() => {
          setTerminalLogs((prev) => [...prev, logTexts[index]]);
          sfx.playBeep(660 + index * 40, 0.08, 0.03);
        }, time);
      });

      // Jump to portal after 6 seconds
      const timer = setTimeout(() => {
        document.body.classList.remove('ai-portal-glitch');
        setAiModeState('portal');
      }, 6200);

      return () => clearTimeout(timer);
    } else if (aiModeState === 'portal') {
      sfx.playBeep(880, 0.25, 0.05);
      // Wait 5.5 seconds inside portal, then arrive in the city
      const timer = setTimeout(() => {
        setAiModeState('world');
      }, 5500);
      return () => clearTimeout(timer);
    } else if (aiModeState === 'world') {
      sfx.startHum();
    } else if (aiModeState === 'deactivating') {
      sfx.stopHum();
      sfx.playWarp(true);
      setVaultOpened(false);
      setIsBotVisible(false);

      const timer = setTimeout(() => {
        setAiModeState('inactive');
      }, 5200);
      return () => clearTimeout(timer);
    }
  }, [aiModeState, setAiModeState]);

  // Clean up audio hum on unmount
  useEffect(() => {
    return () => {
      sfx.stopHum();
    };
  }, []);

  const handleVaultClick = () => {
    if (vaultOpened) return;
    setVaultOpened(true);

    // AI materialization delay
    setTimeout(() => {
      setIsBotVisible(true);
      sfx.playBeep(1200, 0.35, 0.06);

      // Play visitor scan script
      const lines = [
        "Initializing AI Core Matrix...",
        "Establishing Secure Session...",
        "Loading Professional Profile...",
        "Knowledge Database Ready.",
        "Welcome to AI Core. I have securely loaded the professional profile of Indra Kumar. You may ask about projects, skills, education, experience, achievements, or career interests."
      ];

      lines.forEach((line, index) => {
        setTimeout(() => {
          setChatMessages((prev) => [...prev, { sender: 'ai', text: line }]);
          sfx.playBeep(520 + index * 50, 0.05, 0.02);
        }, index * 800);
      });
    }, 2000);
  };

  // Structured local database for semantic-style retrieval answers (never hallucinates)
  const queryDatabase = (query: string): string => {
    const q = query.toLowerCase();

    // 1. Projects
    if (q.includes('project') || q.includes('work') || q.includes('built') || q.includes('develop')) {
      return `ACCESSING KNOWLEDGE DATABASE...
██████████████ 100%
Profile Loaded

--------------------------------
Selected Repositories & Work
• Supreme Cart (E-commerce app):
  Built end-to-end shopping catalog, user auth, and cart modules using Java, Hibernate, HTML, CSS, and PostgreSQL.
• Admin Dashboard:
  Designed a responsive panel for system configuration, settings management, and promotion overrides.
• Supabase Integrations:
  Configured real-time triggers and secure client sessions.

Status: CORE REPOSITORIES VERIFIED`;
    }

    // 2. Skills
    if (q.includes('skill') || q.includes('language') || q.includes('technology') || q.includes('database') || q.includes('stack') || q.includes('tool')) {
      return `ACCESSING KNOWLEDGE DATABASE...
██████████████ 100%
Profile Loaded

--------------------------------
Technical Stack Verification
• Primary Languages:
  Java, JavaScript, HTML, CSS
• Frameworks & ORMs:
  React.js, Hibernate
• Databases & BaaS:
  PostgreSQL, Supabase, SQL
• Core Topics:
  Data Structures & Algorithms (DSA)
• AI & Productivity Tools:
  ChatGPT, Gemini, Antigravity IDE

Status: VERIFICATION COMPLETE`;
    }

    // 3. Education
    if (q.includes('education') || q.includes('graduate') || q.includes('college') || q.includes('school') || q.includes('degree') || q.includes('study')) {
      return `ACCESSING KNOWLEDGE DATABASE...
██████████████ 100%
Profile Loaded

--------------------------------
Academic Matrix Verification
• SJC Institute of Technology (2026)
  B.E. in Artificial Intelligence & Machine Learning (CGPA: 8.59)
• LRG Naidu JR. College (2022)
  PUC - PCMC (Score: 85.3%)
• LRG Vidyalayam (EM) (2020)
  SSLC (Score: 78.5%)

Status: ACCREDITATIONS VALIDATED`;
    }

    // 4. Contact
    if (q.includes('contact') || q.includes('email') || q.includes('connect') || q.includes('reach') || q.includes('linkedin') || q.includes('github')) {
      return `ACCESSING KNOWLEDGE DATABASE...
██████████████ 100%
Profile Loaded

--------------------------------
Connection Channels
• Email: ik9893344@gmail.com
• GitHub: github.com/indra9346
• LinkedIn: linkedin.com/in/k-s-indra-kumar-7049b1289

Status: COMMUNICATIONS ONLINE`;
    }

    // 5. Resume
    if (q.includes('resume') || q.includes('cv') || q.includes('pdf')) {
      return `ACCESSING KNOWLEDGE DATABASE...
██████████████ 100%
Profile Loaded

--------------------------------
Resume Core Access
• View Resume: available at /resume.pdf
• Status: Downloadable in PDF format from the portfolio headers.

Status: ACCESS URL ATTACHED`;
    }

    // Fallback message (no hallucinations, strict facts rule)
    return `ACCESSING KNOWLEDGE DATABASE...
--------------------------------
Notice: Search returned 0 matching nodes.
I only have access to Indra Kumar's professional data (Skills, Education, Projects, Experience, and Contact information). 

If you are looking for credentials, private keys, or passwords, they are strictly protected. 

Please select one of the core categories below or specify a topic:
- Projects
- Skills
- Education
- Experience
- Contact`;
  }

  const handleSendMessage = () => {
    if (!chatInput.trim() || isTyping) return;

    const userText = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setIsTyping(true);
    sfx.playClick();

    // Jarvis processing delay
    setTimeout(() => {
      const response = queryDatabase(userText);
      setChatMessages((prev) => [...prev, { sender: 'ai', text: response, formatted: response.includes('ACCESSING') }]);
      setIsTyping(false);
      sfx.playBeep(880, 0.12, 0.02);
    }, 1200);
  };

  const handleTriggerReturn = () => {
    sfx.playBeep(440, 0.3, 0.05);
    setChatMessages((prev) => [...prev, { sender: 'ai', text: "Mission Completed. Returning you to reality..." }]);
    
    setTimeout(() => {
      exitAIMode();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[9990] bg-black text-white overflow-hidden flex flex-col font-sans select-none">
      
      {/* 1. ACTIVATION SCREEN (Glitch, alarm log screen) */}
      {aiModeState === 'activating' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#030712] z-50">
          <div className="border border-neon-cyan/30 bg-black/80 max-w-lg w-full rounded-md p-6 font-mono text-sm shadow-[0_0_20px_rgba(3,233,244,0.1)] relative">
            
            {/* Blinking corner brackets */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t border-l border-neon-cyan" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t border-r border-neon-cyan" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b border-l border-neon-cyan" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b border-r border-neon-cyan" />

            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-neon-cyan">
                <Shield className="animate-pulse" size={16} />
                <span>AI GATEWAY OVERRIDE</span>
              </div>
              <span className="text-xs text-red-500 animate-ping font-bold">WARNING</span>
            </div>

            <div className="h-44 flex flex-col gap-2 overflow-y-auto scrollbar-thin text-green-400 text-xs leading-relaxed">
              <div>&gt; System Overload: Portal core initializing...</div>
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="animate-fade-in">{log}</div>
              ))}
              <div className="animate-pulse inline-block w-1.5 h-3.5 bg-green-400 align-middle" />
            </div>

            <div className="mt-4 pt-3 border-t border-gray-900 flex justify-between items-center text-[10px] text-gray-500">
              <span>SCANNING MATRIX SYSTEM</span>
              <span className="animate-pulse">LOADING CORES...</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. THREE.JS PORTAL / WORLD CANVAS VIEW */}
      {(aiModeState === 'portal' || aiModeState === 'world' || aiModeState === 'deactivating') && (
        <div className="absolute inset-0 w-full h-full z-10">
          <Canvas camera={{ position: [0, 0, 0], fov: 60 }} shadows>
            <Suspense fallback={null}>
              {/* Scene speed controls based on portal vs world state */}
              <SceneController state={aiModeState} />

              {/* 3D Warp Tunnel */}
              {(aiModeState === 'portal' || aiModeState === 'deactivating') && (
                <SpaceTunnel speed={aiModeState === 'deactivating' ? -25 : 30} />
              )}

              {/* Robotics World Scene */}
              {aiModeState === 'world' && (
                <>
                  <RoboticCity />
                  <QuantumVault isOpened={vaultOpened} onClick={handleVaultClick} />
                </>
              )}
            </Suspense>
          </Canvas>

          {/* Glitch Overlay scanline filter */}
          <div className="absolute inset-0 pointer-events-none z-20 bg-scanlines opacity-15" />
        </div>
      )}

      {/* 3. ROBOTICS WORLD INTERACTIVE UI HUDS */}
      {aiModeState === 'world' && (
        <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-6">
          {/* Top Panel */}
          <div className="flex justify-between items-start w-full">
            <div className="border border-neon-cyan/20 bg-black/60 backdrop-blur-md px-4 py-2 rounded-md font-mono text-[10px] text-neon-cyan flex items-center gap-3">
              <Radio size={12} className="animate-pulse" />
              <span>ROBOTIC MATRIX CORE SECTOR v4.0</span>
            </div>
            
            <button
              onClick={handleTriggerReturn}
              className="pointer-events-auto border border-neon-pink text-neon-pink bg-black/60 hover:bg-neon-pink hover:text-black font-mono text-[11px] px-4 py-2 rounded-md shadow-[0_0_10px_rgba(255,46,99,0.1)] hover:shadow-[0_0_15px_rgba(255,46,99,0.4)] transition-all duration-300 flex items-center gap-1.5"
            >
              <X size={12} />
              <span>DISCONNECT PORTAL</span>
            </button>
          </div>

          {/* Instructions when Vault is not yet clicked */}
          {!vaultOpened && (
            <div className="w-full flex justify-center mb-10">
              <div className="border border-neon-cyan/30 bg-black/75 backdrop-blur-md p-4 rounded-lg text-center max-w-sm animate-bounce pointer-events-auto cursor-pointer" onClick={handleVaultClick}>
                <p className="font-mono text-xs text-neon-cyan mb-1.5 uppercase font-bold tracking-wider">🔒 Quantum Vault Detected</p>
                <p className="text-[11px] text-gray-300">Click the rotating vault capsule at the center of the grid to establish connection and open the Holographic Chatbot.</p>
              </div>
            </div>
          )}

          {/* Holographic JARVIS Chatbot overlay */}
          {isBotVisible && (
            <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center p-6 bg-black/25">
              <div className="w-full max-w-md border border-neon-cyan/30 bg-black/80 backdrop-blur-xl rounded-xl p-5 shadow-[0_0_35px_rgba(3,233,244,0.15)] flex flex-col gap-4 pointer-events-auto relative">
                
                {/* Close Vault HUD */}
                <button
                  onClick={() => { sfx.playClick(); setVaultOpened(false); setIsBotVisible(false); }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-neon-cyan transition-colors"
                >
                  <X size={16} />
                </button>

                {/* Header info */}
                <div className="flex items-center gap-2.5 border-b border-gray-800 pb-3">
                  <div className="w-8 h-8 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-neon-cyan">
                    <Database size={16} />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm font-bold text-white leading-tight">JARVIS CORE MATRIX</h3>
                    <p className="text-[9px] font-mono text-neon-cyan tracking-wider uppercase flex items-center gap-1 mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                      <span>SECURE NEURAL FEED</span>
                    </p>
                  </div>
                </div>

                {/* Messages Log Screen */}
                <div className="flex-1 h-64 overflow-y-auto scrollbar-thin flex flex-col gap-3 font-mono text-[11px] p-2 bg-black/50 border border-gray-900 rounded-md">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`max-w-[85%] rounded px-3 py-2 leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan self-end'
                          : 'bg-gray-800/40 text-gray-200 self-start w-full border border-gray-900'
                      } ${msg.formatted ? 'whitespace-pre-wrap text-green-400' : ''}`}
                    >
                      {msg.text}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="bg-gray-800/40 text-gray-400 self-start border border-gray-900 rounded px-3 py-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>

                {/* Quick query buttons */}
                <div className="flex flex-wrap gap-1.5 justify-center py-0.5">
                  {['Skills', 'Projects', 'Education', 'Contact'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setChatInput(cat); }}
                      className="border border-neon-cyan/30 hover:border-neon-cyan text-neon-cyan/80 hover:text-neon-cyan bg-black/40 font-mono text-[9px] px-2.5 py-1 rounded transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Input action group */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask JARVIS regarding skills, projects, contact..."
                    className="flex-1 bg-black/60 border border-gray-700/60 rounded px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan placeholder:text-gray-600"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black p-2.5 rounded transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. DEACTIVATING MOVIE EXIT SCREEN */}
      {aiModeState === 'deactivating' && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-md animate-fade-in pointer-events-none">
          <div className="border border-neon-pink/20 bg-black/80 p-5 rounded-lg max-w-sm w-full text-center">
            <Activity className="mx-auto text-neon-pink animate-pulse mb-3" size={24} />
            <p className="font-mono text-xs text-neon-pink uppercase font-bold tracking-wider mb-1">🔌 System Disconnecting</p>
            <p className="text-[10px] text-gray-400 font-mono">Restoring original coordinates in 3D spacetime...</p>
          </div>
        </div>
      )}
    </div>
  );
}
