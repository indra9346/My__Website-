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

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error("Audio Context initialization failed", e);
    }
  }

  playBeep(freq = 550, duration = 0.08, gainVal = 0.015) {
    if (this.isMuted) return;
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
    if (this.isMuted) return;
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
    if (this.isMuted) return;
    this.init();
    if (!this.ctx || this.osc1) return;
    try {
      // Breathing space hum (Daft Punk / Hans Zimmer style)
      this.osc1 = this.ctx.createOscillator();
      this.osc2 = this.ctx.createOscillator();
      this.lfo = this.ctx.createOscillator();
      this.lfoGain = this.ctx.createGain();
      this.humGain = this.ctx.createGain();

      this.osc1.type = 'sine';
      this.osc2.type = 'sine';
      this.lfo.type = 'sine';

      this.osc1.frequency.setValueAtTime(110, this.ctx.currentTime); // Low A
      this.osc2.frequency.setValueAtTime(165, this.ctx.currentTime); // E3 (fifth)
      this.lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime); // LFO Lull

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
  if (!model) return <>{fallback}</>; // render fallback during load phase
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
      // Translate the torus positions along Z axis
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
// 4. Glowing Neon Robotics Civilization (R3F)
// ==========================================
const RoboticCity = () => {
  const arm1Ref = useRef<THREE.Group>(null);
  const arm2Ref = useRef<THREE.Group>(null);
  const conveyorPartsRef = useRef<THREE.Group>(null);
  const sparksRef = useRef<THREE.Points>(null);
  const [sparkActive, setSparkActive] = useState(false);
  const sparksCount = 200;

  // Initialize sparks
  const sparkPositions = new Float32Array(sparksCount * 3);
  const sparkVelocities = useRef<Float32Array>(new Float32Array(sparksCount * 3));

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // 1. Jointed robotic assembly arms rotations
    if (arm1Ref.current) {
      arm1Ref.current.rotation.y = Math.sin(t * 1.2) * 0.4;
      const baseJoint = arm1Ref.current.children[1] as THREE.Group;
      if (baseJoint) {
        baseJoint.rotation.z = -Math.PI / 4.5 + Math.sin(t * 1.8) * 0.12;
      }
    }
    if (arm2Ref.current) {
      arm2Ref.current.rotation.y = Math.cos(t * 1.0) * 0.3;
      const baseJoint = arm2Ref.current.children[1] as THREE.Group;
      if (baseJoint) {
        baseJoint.rotation.z = Math.PI / 4.5 + Math.cos(t * 1.5) * 0.1;
      }
    }

    // Trigger sparks at intervals (welding parts together)
    const weldingActive = Math.sin(t * 4) > 0.4;
    setSparkActive(weldingActive);

    // 2. Conveyor belt assembly parts movement (X axis)
    if (conveyorPartsRef.current) {
      conveyorPartsRef.current.children.forEach((child) => {
        child.position.x += 0.05;
        child.rotation.y += 0.01;
        if (child.position.x > 8) {
          child.position.x = -8;
        }
      });
    }

    // 3. Sparks particle gravity physics (with complete undefined safety checks)
    if (sparksRef.current && weldingActive) {
      const geom = sparksRef.current.geometry;
      const posAttr = geom.getAttribute('position');
      if (posAttr) {
        const pos = posAttr.array as Float32Array;
        const vels = sparkVelocities.current;
        const tipX = -2.5 + Math.sin(t * 1.2) * 0.3;
        const tipY = -0.3 + Math.sin(t * 1.8) * 0.08;
        const tipZ = 0.5;

        for (let i = 0; i < pos.length; i += 3) {
          if (pos[i + 1] < -2 || Math.random() < 0.04) {
            pos[i] = tipX;
            pos[i + 1] = tipY;
            pos[i + 2] = tipZ;

            vels[i] = (Math.random() - 0.5) * 6;
            vels[i + 1] = Math.random() * 6 + 2; // Vertical projection
            vels[i + 2] = (Math.random() - 0.5) * 6;
          } else {
            pos[i] += vels[i] * 0.016;
            vels[i + 1] -= 9.8 * 0.016; // gravity
            pos[i + 1] += vels[i + 1] * 0.016;
            pos[i + 2] += vels[i + 2] * 0.016;
          }
        }
        posAttr.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {/* 3D Cyber Matrix Grid Floor */}
      <gridHelper args={[120, 80, '#03e9f4', '#112233']} position={[0, -2, 0]} />

      {/* Atmospheric Fog and Lighting */}
      <fog attach="fog" args={['#030712', 8, 35]} />
      <ambientLight intensity={0.15} />
      <directionalLight position={[10, 20, 10]} intensity={1.0} />
      <pointLight position={[0, 4, 2]} intensity={3.0} color="#03e9f4" distance={25} />
      <pointLight position={[-4, 2, -3]} intensity={2.0} color="#7B2CBF" distance={15} />

      {/* Volumetric Glowing Skylines */}
      {[
        { pos: [-15, 6, -20], size: [5, 16, 5], color: '#03e9f4' },
        { pos: [15, 8, -25], size: [6, 20, 6], color: '#7B2CBF' },
        { pos: [-25, 5, -10], size: [6, 14, 6], color: '#5B8FB9' },
        { pos: [22, 6, -12], size: [5, 16, 5], color: '#FF2E63' },
        { pos: [0, 12, -35], size: [8, 30, 8], color: '#03e9f4' },
      ].map((b, i) => (
        <group key={i} position={b.pos as any}>
          <mesh>
            <boxGeometry args={b.size as any} />
            <meshStandardMaterial
              color={b.color}
              wireframe
              emissive={b.color}
              emissiveIntensity={1.2}
            />
          </mesh>
          <mesh scale={0.97}>
            <boxGeometry args={b.size as any} />
            <meshStandardMaterial
              color="#020617"
              roughness={0.1}
              metalness={0.9}
            />
          </mesh>
        </group>
      ))}

      {/* Robotic Arm 1 (Glowing Neon Cyan) loaded locally or procedurally fallback */}
      <GLTFModel
        url="/models/robot_arm.glb"
        scale={1.2}
        position={[-2.5, -2, 0.5]}
        fallback={
          <group ref={arm1Ref} position={[-2.5, -2, 0.5]}>
            <mesh position={[0, 0.4, 0]}>
              <cylinderGeometry args={[0.65, 0.75, 0.8, 12]} />
              <meshStandardMaterial color="#111827" emissive="#03e9f4" emissiveIntensity={0.25} wireframe />
            </mesh>
            <group position={[0, 0.8, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.4, 0.4, 0.8, 8]} />
                <meshStandardMaterial color="#03e9f4" emissive="#03e9f4" emissiveIntensity={1.0} wireframe />
              </mesh>
              <mesh position={[0, 1.25, 0]}>
                <boxGeometry args={[0.3, 2.5, 0.3]} />
                <meshStandardMaterial color="#03e9f4" emissive="#03e9f4" emissiveIntensity={0.8} wireframe />
              </mesh>
              <group position={[0, 2.4, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.3, 0.3, 0.7, 8]} />
                  <meshStandardMaterial color="#FF2E63" emissive="#FF2E63" emissiveIntensity={1.0} wireframe />
                </mesh>
                <mesh position={[0, 0.9, 0]}>
                  <boxGeometry args={[0.22, 1.8, 0.22]} />
                  <meshStandardMaterial color="#03e9f4" emissive="#03e9f4" emissiveIntensity={0.8} wireframe />
                </mesh>
                <mesh position={[0, 1.8, 0]}>
                  <coneGeometry args={[0.15, 0.5, 6]} />
                  <meshBasicMaterial color="#ff5500" />
                </mesh>
              </group>
            </group>
          </group>
        }
      />

      {/* Robotic Arm 2 (Glowing Neon Purple) loaded locally or procedurally fallback */}
      <GLTFModel
        url="/models/robot_arm_2.glb"
        scale={1.2}
        position={[2.5, -2, -1]}
        fallback={
          <group ref={arm2Ref} position={[2.5, -2, -1]}>
            <mesh position={[0, 0.4, 0]}>
              <cylinderGeometry args={[0.65, 0.75, 0.8, 12]} />
              <meshStandardMaterial color="#111827" emissive="#7B2CBF" emissiveIntensity={0.25} wireframe />
            </mesh>
            <group position={[0, 0.8, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.4, 0.4, 0.8, 8]} />
                <meshStandardMaterial color="#7B2CBF" emissive="#7B2CBF" emissiveIntensity={1.0} wireframe />
              </mesh>
              <mesh position={[0, 1.25, 0]}>
                <boxGeometry args={[0.3, 2.5, 0.3]} />
                <meshStandardMaterial color="#7B2CBF" emissive="#7B2CBF" emissiveIntensity={0.8} wireframe />
              </mesh>
              <group position={[0, 2.4, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.3, 0.3, 0.7, 8]} />
                  <meshStandardMaterial color="#03e9f4" emissive="#03e9f4" emissiveIntensity={1.0} wireframe />
                </mesh>
                <mesh position={[0, 0.9, 0]}>
                  <boxGeometry args={[0.22, 1.8, 0.22]} />
                  <meshStandardMaterial color="#7B2CBF" emissive="#7B2CBF" emissiveIntensity={0.8} wireframe />
                </mesh>
                <mesh position={[0, 1.8, 0]}>
                  <sphereGeometry args={[0.2, 8, 8]} />
                  <meshBasicMaterial color="#03e9f4" />
                </mesh>
              </group>
            </group>
          </group>
        }
      />

      {/* Gravity sparks emitter */}
      {sparkActive && (
        <points ref={sparksRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[sparkPositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#ffa500"
            size={0.22}
            transparent
            opacity={1.0}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}

      {/* Assembly Conveyor Belt carrying robot heads and parts */}
      <group position={[0, -2, 0.5]}>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[14, 0.3, 1.4]} />
          <meshStandardMaterial color="#111827" emissive="#03e9f4" emissiveIntensity={0.15} wireframe />
        </mesh>
        <group ref={conveyorPartsRef}>
          {/* Robot Head chassis */}
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
          {/* Robot Torso/Ribs */}
          <mesh position={[0, 0.7, 0]}>
            <cylinderGeometry args={[0.5, 0.3, 0.8, 8, 4, true]} />
            <meshStandardMaterial color="#7B2CBF" wireframe emissive="#7B2CBF" emissiveIntensity={0.6} />
          </mesh>
          {/* Energy capsule */}
          <mesh position={[5, 0.6, 0]}>
            <dodecahedronGeometry args={[0.35]} />
            <meshStandardMaterial color="#ffaa00" wireframe emissive="#ffaa00" emissiveIntensity={0.8} />
          </mesh>
        </group>
      </group>

      {/* Patrolling Drones with glowing spotlight sensors scanning the floor */}
      {[-4.5, 0, 4.5].map((xOffset, i) => (
        <group key={i}>
          <GLTFModel
            url="/models/drone.glb"
            scale={0.8}
            fallback={<Drone i={i} xOffset={xOffset} />}
          />
        </group>
      ))}
    </group>
  );
};

// Drone fallback model
const Drone = ({ i, xOffset }: { i: number; xOffset: number }) => {
  const droneRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (droneRef.current) {
      droneRef.current.position.y = 3.5 + Math.sin(t * 1.2 + i) * 0.7;
      droneRef.current.position.x = xOffset + Math.cos(t * 0.6 + i) * 2.5;
      droneRef.current.position.z = -4 + Math.sin(t * 0.6 + i) * 2;
    }
  });

  return (
    <group ref={droneRef}>
      <mesh>
        <cylinderGeometry args={[0.7, 0.8, 0.25, 8]} />
        <meshStandardMaterial color="#1e293b" emissive="#03e9f4" emissiveIntensity={0.2} wireframe />
      </mesh>
      <mesh position={[0, 0, 0.65]}>
        <boxGeometry args={[0.3, 0.08, 0.1]} />
        <meshBasicMaterial color="#FF2E63" />
      </mesh>
      <mesh position={[0, -1.8, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.02, 1.2, 3.6, 16, 1, true]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      {[
        [-0.7, 0.7],
        [0.7, 0.7],
        [-0.7, -0.7],
        [0.7, -0.7],
      ].map((pos, rIdx) => (
        <group key={rIdx} position={[pos[0], 0.15, pos[1]]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.15, 4]} />
            <meshStandardMaterial color="#475569" />
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
    if (rotorRef.current) rotorRef.current.rotation.y += 0.8;
  });
  return (
    <mesh ref={rotorRef} position={[0, 0.08, 0]}>
      <boxGeometry args={[0.6, 0.015, 0.06]} />
      <meshBasicMaterial color="#03e9f4" />
    </mesh>
  );
};

// ==========================================
// 5. Dynamic Camera Controls (GSAP Driven)
// ==========================================
const SceneController = ({ state }: { state: string }) => {
  const { camera } = useThree();

  useEffect(() => {
    if (state === 'portal') {
      camera.position.set(0, 0, 0);
      gsap.to(camera.position, {
        z: -90,
        duration: 5.5,
        ease: 'power1.inOut',
        overwrite: 'auto'
      });
    } else if (state === 'world') {
      camera.position.set(0, 15, 25);
      camera.lookAt(0, 0, 0);
      gsap.to(camera.position, {
        x: 0,
        y: 2,
        z: 10,
        duration: 4.5,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  }, [state, camera]);

  return null;
};

// ==========================================
// 6. Holographic Quantum Vault (R3F)
// ==========================================
const QuantumVault = ({ isOpened, onClick }: { isOpened: boolean; onClick: () => void }) => {
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
      {/* 3D Quantum Vault Capsule (GLTF loaded or fallback) */}
      <GLTFModel
        url="/models/quantum_vault.glb"
        scale={1.0}
        fallback={
          <group>
            {/* Base */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[1.2, 1.3, 1.0, 16]} />
              <meshStandardMaterial color="#020617" emissive="#03e9f4" emissiveIntensity={0.1} wireframe />
            </mesh>
            {/* Locking ring */}
            <mesh ref={ringRef} position={[0, 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.9, 0.08, 8, 24]} />
              <meshStandardMaterial color="#03e9f4" emissive="#03e9f4" emissiveIntensity={0.8} />
            </mesh>
            {/* Locking bars */}
            {[-Math.PI / 3, Math.PI / 3, Math.PI].map((rot, idx) => (
              <group key={idx} rotation={[0, rot, 0]} position={[0, 0.4, 0]}>
                <mesh position={[0.9, 0, 0]}>
                  <boxGeometry args={[0.3, 0.15, 0.15]} />
                  <meshStandardMaterial color="#475569" />
                </mesh>
              </group>
            ))}
            {/* Lid */}
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

      {/* Plasma Core Glow */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.3} />
      </mesh>

      {/* Particle Beam when opened */}
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
// 7. MAIN PORTAL CONTROLLER (React Component)
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

  // Sync mute state with synth engine
  useEffect(() => {
    sfx.isMuted = isMuted;
    if (isMuted) {
      sfx.stopHum();
    } else if (aiModeState === 'world') {
      sfx.startHum();
    }
  }, [isMuted, aiModeState]);

  // Sound triggers based on states
  useEffect(() => {
    if (aiModeState === 'activating') {
      sfx.playWarp(false);
      setTerminalLogs([]);

      const intervals = [1000, 2000, 3000, 4200, 5200];
      const logTexts = [
        "> Initializing AI Core Security Shield...",
        "> Establishing Quantum Session tunnel...",
        "> Analyzing local network nodes... Access Approved.",
        "> Defragmenting DOM matrix structures...",
        "> Fictional scan protocol loaded... Fading reality...",
      ];

      intervals.forEach((time, index) => {
        setTimeout(() => {
          setTerminalLogs((prev) => [...prev, logTexts[index]]);
          sfx.playBeep(550 + index * 40, 0.06, 0.01);
        }, time);
      });

      const timer = setTimeout(() => {
        document.body.classList.remove('ai-portal-glitch');
        setAiModeState('portal');
      }, 6200);

      return () => clearTimeout(timer);
    } else if (aiModeState === 'portal') {
      sfx.playBeep(660, 0.2, 0.02);
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

  useEffect(() => {
    return () => {
      sfx.stopHum();
    };
  }, []);

  const handleVaultClick = () => {
    if (vaultOpened) return;
    setVaultOpened(true);

    setTimeout(() => {
      setIsBotVisible(true);
      sfx.playBeep(900, 0.25, 0.02);

      const lines = [
        "Initializing AI Core...",
        "Establishing Secure Session...",
        "Loading Professional Profile...",
        "Knowledge Database Ready.",
        "Welcome to AI Core. I have securely loaded the professional profile of Indra Kumar.\n\nI can assist you with:\n• Projects\n• Skills\n• Education\n• Experience\n• Resume\n• GitHub\n• Contact\n\nSelect a category below, train my prediction model, or ask me naturally."
      ];

      lines.forEach((line, index) => {
        setTimeout(() => {
          setChatMessages((prev) => [...prev, { sender: 'ai', text: line }]);
          sfx.playBeep(440 + index * 40, 0.05, 0.01);
        }, index * 600);
      });
    }, 2000);
  };

  // ML Cosine Similarity Classifier algorithm to predict interest alignment
  const predictInterest = (topic: string): string => {
    const t = topic.toLowerCase().trim();
    let score = 30; // base score
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
      "Initializing ML training loop...",
      "Dataset loaded: Indra's complete academic & project history",
      "Features extracted: [Languages, Frameworks, DBs, AIML, DSA]",
      "Epoch 15/50 - Loss: 0.39 - Validation Accuracy: 74%",
      "Epoch 35/50 - Loss: 0.12 - Validation Accuracy: 91%",
      "Epoch 50/50 - Loss: 0.03 - Validation Accuracy: 98.6%",
      "Model Converged. Type: Cosine Similarity Classifier.\n\nPrediction database ready! Enter a keyword, or ask me: 'Predict interest for React' or 'Predict interest for Python' to test the model."
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setChatMessages((prev) => [...prev, { sender: 'ai', text: log, formatted: log.includes('Loss:') || log.includes('Converged') }]);
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

    // Trigger interest predictor model
    if (q.includes('predict') || q.includes('interest') || q.includes('similarity') || modelTrained) {
      // If query is one of the standard categories, bypass prediction and show category database
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

    return `ACCESSING KNOWLEDGE DATABASE...
--------------------------------
Notice: Search returned 0 matching nodes.
I only have access to Indra Kumar's professional data (Skills, Education, Projects, Experience, and Contact information). 

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

    setTimeout(() => {
      const response = queryDatabase(userText);
      setChatMessages((prev) => [...prev, { sender: 'ai', text: response, formatted: response.includes('ACCESSING') }]);
      setIsTyping(false);
      sfx.playBeep(660, 0.08, 0.01);
    }, 1200);
  };

  const handleTriggerReturn = () => {
    sfx.playBeep(330, 0.25, 0.02);
    setChatMessages((prev) => [...prev, { sender: 'ai', text: "Mission Completed. Returning you to reality..." }]);
    
    setTimeout(() => {
      exitAIMode();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-[9990] bg-[#020617] text-white overflow-hidden font-sans select-none">
      
      {/* 1. THREE.JS PORTAL / WORLD CANVAS VIEW (Stretched to screen, full GPU acceleration) */}
      {(aiModeState === 'portal' || aiModeState === 'world' || aiModeState === 'deactivating') && (
        <div className="absolute top-0 left-0 w-screen h-screen z-10">
          <Canvas camera={{ position: [0, 0, 0], fov: 60 }} shadows>
            <Suspense fallback={null}>
              <SceneController state={aiModeState} />

              {/* 3D cylindrical code space tunnel */}
              {(aiModeState === 'portal' || aiModeState === 'deactivating') && (
                <SpaceTunnel speed={aiModeState === 'deactivating' ? -25 : 30} />
              )}

              {/* Denser Glowing Robotics World Scene */}
              {aiModeState === 'world' && (
                <>
                  <RoboticCity />
                  <QuantumVault isOpened={vaultOpened} onClick={handleVaultClick} />
                </>
              )}
            </Suspense>
          </Canvas>

          <div className="absolute inset-0 pointer-events-none z-20 bg-scanlines opacity-10" />
        </div>
      )}

      {/* 2. ACTIVATION OVERLAY SCREEN */}
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
              <div>&gt; Portal core initializing...</div>
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="animate-fade-in">{log}</div>
              ))}
              <div className="animate-pulse inline-block w-1.5 h-3.5 bg-green-400 align-middle" />
            </div>
          </div>
        </div>
      )}

      {/* 3. ROBOTICS WORLD INTERACTIVE HUDS */}
      {aiModeState === 'world' && (
        <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-4 sm:p-6 w-screen h-screen">
          
          {/* Top Panel Actions */}
          <div className="flex justify-between items-start w-full gap-2 z-50">
            <div className="border border-neon-cyan/20 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-md font-mono text-[9px] sm:text-[10px] text-neon-cyan flex items-center gap-2">
              <Radio size={10} className="animate-pulse" />
              <span>WHITE AI SIGHT v4.0</span>
            </div>
            
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="border border-gray-700 text-gray-400 hover:text-neon-cyan bg-black/60 p-2 rounded-md transition-colors"
                aria-label={isMuted ? 'Unmute Portal Sounds' : 'Mute Portal Sounds'}
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

          {/* Prompt to click the vault */}
          {!vaultOpened && (
            <div className="w-full flex justify-center mb-6 sm:mb-10 z-50">
              <div className="border border-neon-cyan/30 bg-black/80 backdrop-blur-md p-3.5 rounded-lg text-center max-w-xs animate-bounce pointer-events-auto cursor-pointer" onClick={handleVaultClick}>
                <p className="font-mono text-[10px] sm:text-xs text-neon-cyan mb-1.5 uppercase font-bold tracking-wider">🔒 Quantum Vault Detected</p>
                <p className="text-[10px] sm:text-[11px] text-gray-400">Click the central rotating vault to release the White AI holographic core.</p>
              </div>
            </div>
          )}

          {/* Height-constrained Responsive Holographic Chatboard (Z-index 50) */}
          {isBotVisible && (
            <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center p-3 sm:p-6 bg-black/40">
              <div className="w-[94%] sm:w-full max-w-md max-h-[80vh] sm:max-h-[75vh] border border-neon-cyan/30 bg-[#020617]/95 backdrop-blur-2xl rounded-xl p-4 sm:p-5 shadow-[0_0_35px_rgba(3,233,244,0.15)] flex flex-col gap-3 pointer-events-auto relative overflow-hidden">
                
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
                    <h3 className="font-mono text-xs sm:text-sm font-bold text-white leading-tight">WHITE AI TERMINAL</h3>
                    <p className="text-[8px] sm:text-[9px] font-mono text-neon-cyan tracking-wider uppercase flex items-center gap-1 mt-0.5">
                      <span className="inline-block w-1-1 rounded-full bg-green-500 animate-ping" />
                      <span>SECURE NEURAL ACCESS</span>
                    </p>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin flex flex-col gap-2.5 font-mono text-[10px] sm:text-[11px] p-2 bg-black/60 border border-gray-900 rounded-md">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`max-w-[90%] rounded px-2.5 py-1.5 leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan self-end'
                          : 'bg-slate-800/40 text-slate-200 self-start w-full border border-slate-900/60'
                      } ${msg.formatted ? 'whitespace-pre-wrap text-green-400' : ''}`}
                    >
                      {msg.text}
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

      {/* 4. DEACTIVATING MOVIE EXIT SCREEN */}
      {aiModeState === 'deactivating' && (
        <div className="absolute inset-0 bg-[#020617] z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in pointer-events-none">
          <div className="border border-neon-pink/20 bg-black/85 p-5 rounded-lg max-w-xs w-full text-center shadow-[0_0_20px_rgba(255,46,99,0.1)]">
            <Shield className="mx-auto text-neon-pink animate-pulse mb-3" size={20} />
            <p className="font-mono text-xs text-neon-pink uppercase font-bold tracking-wider mb-1">🔌 Connection Terminated</p>
            <p className="text-[9px] sm:text-[10px] text-gray-500 font-mono">Restoring original coordinates in 3D spacetime...</p>
          </div>
        </div>
      )}
    </div>
  );
}
