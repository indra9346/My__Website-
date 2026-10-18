import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import Glow from './Glow';
import { Spring, Spring3, clamp, phaseTime, safeDelta, smoothstep, vehicle, wobble, worldClock } from './physics';

export interface DroneConfig {
  /** Formation slot relative to the carrier while flying in. */
  formation: [number, number, number];
  /** Where it holds station around the platform once the carrier has landed. */
  station: [number, number, number];
  /** Seconds after the carrier before it starts flying in (staggered arrivals). */
  delay: number;
  seed: number;
}

const ROTORS: [number, number][] = [
  [-0.5, 0.42],
  [0.5, 0.42],
  [-0.5, -0.42],
  [0.5, -0.42],
];

/**
 * Escort quadcopter driven by a spring toward its slot, like a real drone
 * chasing a setpoint: it lags, overshoots a little and settles. It pitches and
 * rolls into its own acceleration (that is how quadcopters move), its rotors
 * spin with thrust and its navigation lights blink.
 */
export default function EscortDrone({ config, carrierStart }: { config: DroneConfig; carrierStart: THREE.Vector3 }) {
  const group = useRef<THREE.Group>(null);
  const rotors = useRef<(THREE.Group | null)[]>([]);
  const beam = useRef<THREE.MeshBasicMaterial>(null);
  const strobe = useRef<THREE.Mesh>(null);

  const body = useMemo(() => new Spring3(7.5, 0.6), []);
  const tilt = useMemo(() => ({ pitch: new Spring(0, 22, 0.9), roll: new Spring(0, 22, 0.9), yaw: new Spring(0, 9, 0.9) }), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const formation = useMemo(() => new THREE.Vector3(), []);
  const station = useMemo(() => new THREE.Vector3(), []);
  const lastPhase = useRef(worldClock.phase);

  const m = useMemo(
    () => ({
      carbon: new THREE.MeshPhysicalMaterial({ color: '#141b26', metalness: 0.55, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 }),
      shell: new THREE.MeshPhysicalMaterial({ color: '#e9eef5', metalness: 0.25, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 }),
      motor: new THREE.MeshStandardMaterial({ color: '#2b3443', metalness: 0.9, roughness: 0.3 }),
      blade: new THREE.MeshStandardMaterial({ color: '#c7d3e0', metalness: 0.6, roughness: 0.35 }),
      lens: new THREE.MeshStandardMaterial({ color: '#03e9f4', emissive: '#03e9f4', emissiveIntensity: 2.4, toneMapped: false }),
      red: new THREE.MeshStandardMaterial({ color: '#ff2e4d', emissive: '#ff2e4d', emissiveIntensity: 3, toneMapped: false }),
      green: new THREE.MeshStandardMaterial({ color: '#22ff88', emissive: '#22ff88', emissiveIntensity: 3, toneMapped: false }),
      white: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 4, toneMapped: false }),
    }),
    [],
  );

  useFrame((_, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const phase = worldClock.phase;
    const t = phaseTime();
    const reduced = worldClock.reducedMotion;
    const dt = safeDelta(rawDelta);

    station.set(...config.station);
    if (phase !== lastPhase.current) {
      lastPhase.current = phase;
      if (phase === 'world') {
        // Start behind and above the carrier's entry point, out in the haze.
        target.copy(carrierStart).add(formation.set(...config.formation)).add(new THREE.Vector3(0, 1.2, -6 - config.delay * 10));
        body.snap(reduced ? station : target);
        tilt.pitch.snap(0);
        tilt.roll.snap(0);
        tilt.yaw.snap(0);
      }
    }
    if (phase !== 'world') return;

    // Setpoint: formation slot on the carrier while it flies in, then station keeping with a gentle patrol drift.
    formation.set(...config.formation).add(vehicle.position);
    const patrol = Math.min(1, t / 6);
    station.x += wobble(t * 0.8, config.seed) * 0.32 * patrol;
    station.y += wobble(t * 1.1, config.seed + 3) * 0.22 * patrol;
    station.z += wobble(t * 0.7, config.seed + 5) * 0.22 * patrol;
    const settle = reduced ? 1 : smoothstep(2.4, 3.8, t);
    if (!reduced && t < config.delay) {
      // still waiting to launch: hold the spawn point
    } else {
      target.lerpVectors(formation, station, settle);
    }
    body.target.copy(target);
    body.step(dt);
    g.position.copy(body.value);

    // Quadcopter attitude: tilt toward the direction of acceleration.
    const a = body.accel;
    const v = body.velocity;
    tilt.pitch.target = clamp(a.z * 0.045 + v.z * 0.035, -0.55, 0.55);
    tilt.roll.target = clamp(-a.x * 0.045 - v.x * 0.035, -0.55, 0.55);
    tilt.yaw.target = clamp(v.x * 0.08, -0.5, 0.5) + wobble(t * 0.4, config.seed + 7) * 0.08;
    tilt.pitch.step(dt);
    tilt.roll.step(dt);
    tilt.yaw.step(dt);
    g.rotation.set(tilt.pitch.value, tilt.yaw.value, tilt.roll.value, 'YXZ');

    const spin = (42 + a.length() * 3.5) * dt;
    rotors.current.forEach((rotor, i) => {
      if (rotor) rotor.rotation.y += i % 2 === 0 ? spin : -spin; // counter-rotating pairs
    });
    if (beam.current) beam.current.opacity = 0.13 * smoothstep(3.4, 4.4, t);
    if (strobe.current) strobe.current.visible = (t * 1.25 + config.seed * 0.31) % 1 < 0.07;
  });

  return (
    <group ref={group} position={[0, -50, 0]}>
      <RoundedBox args={[0.62, 0.16, 0.5]} radius={0.06} smoothness={4} material={m.carbon} />
      <mesh material={m.shell} position={[0, 0.08, 0.02]} scale={[1.25, 0.5, 1]}>
        <sphereGeometry args={[0.17, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {ROTORS.map(([x, z], i) => (
        <group key={i}>
          <mesh material={m.carbon} position={[x / 2, 0, z / 2]} rotation={[0, Math.atan2(-z, x), 0]}>
            <boxGeometry args={[Math.hypot(x, z), 0.045, 0.07]} />
          </mesh>
          <mesh material={m.motor} position={[x, 0.05, z]}>
            <cylinderGeometry args={[0.06, 0.065, 0.09, 18]} />
          </mesh>
          <group ref={(el) => (rotors.current[i] = el)} position={[x, 0.11, z]}>
            <mesh material={m.blade} rotation={[0.12, 0, 0]}>
              <boxGeometry args={[0.56, 0.008, 0.045]} />
            </mesh>
            <mesh material={m.blade} rotation={[-0.12, Math.PI / 2, 0]}>
              <boxGeometry args={[0.56, 0.008, 0.045]} />
            </mesh>
          </group>
          {/* motion-blur disc */}
          <mesh position={[x, 0.11, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.3, 32]} />
            <meshBasicMaterial color="#bfefff" transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* Gimbal camera */}
      <mesh material={m.motor} position={[0, -0.12, 0.18]}>
        <sphereGeometry args={[0.085, 20, 14]} />
      </mesh>
      <mesh material={m.lens} position={[0, -0.12, 0.255]}>
        <sphereGeometry args={[0.035, 14, 10]} />
      </mesh>
      <Glow position={[0, -0.12, 0.3]} size={0.35} opacity={0.6} />
      {/* Navigation lights */}
      <mesh material={m.red} position={[-0.5, 0.0, 0.42]}>
        <sphereGeometry args={[0.025, 10, 8]} />
      </mesh>
      <mesh material={m.green} position={[0.5, 0.0, 0.42]}>
        <sphereGeometry args={[0.025, 10, 8]} />
      </mesh>
      <mesh ref={strobe} material={m.white} position={[0, 0.06, -0.26]} visible={false}>
        <sphereGeometry args={[0.025, 10, 8]} />
      </mesh>
      {/* Downward scanning beam */}
      <mesh position={[0, -1.0, 0]}>
        <cylinderGeometry args={[0.02, 0.8, 1.8, 24, 1, true]} />
        <meshBasicMaterial ref={beam} color="#03e9f4" transparent opacity={0} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}
