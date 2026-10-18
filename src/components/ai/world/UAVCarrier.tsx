import { forwardRef, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import Glow from './Glow';
import { clamp, phaseTime, safeDelta, vehicle, worldClock } from './physics';

/**
 * The stealth UAV carrier the robot rides on. Ducted lift fans spin with
 * thrust, rear thrusters glow harder under acceleration, the landing ring and
 * navigation lights behave like real aircraft lighting. The deck top is y = 0,
 * so children (the robot) stand on it.
 */
const UAVCarrier = forwardRef<THREE.Group, { children?: ReactNode }>(function UAVCarrier({ children }, ref) {
  const fans = useRef<(THREE.Group | null)[]>([]);
  const liftGlows = useRef<(THREE.Sprite | null)[]>([]);
  const thrusterGlows = useRef<(THREE.Sprite | null)[]>([]);
  const strobe = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshStandardMaterial>(null);

  const m = useMemo(
    () => ({
      hull: new THREE.MeshPhysicalMaterial({ color: '#1a2332', metalness: 0.75, roughness: 0.3, clearcoat: 0.45, clearcoatRoughness: 0.25 }),
      deck: new THREE.MeshStandardMaterial({ color: '#2a3547', metalness: 0.6, roughness: 0.42 }),
      dark: new THREE.MeshStandardMaterial({ color: '#0a0f17', metalness: 0.7, roughness: 0.5 }),
      blade: new THREE.MeshStandardMaterial({ color: '#9fb3c8', metalness: 0.85, roughness: 0.25 }),
      glow: new THREE.MeshStandardMaterial({ color: '#03e9f4', emissive: '#03e9f4', emissiveIntensity: 2.2, toneMapped: false }),
      red: new THREE.MeshStandardMaterial({ color: '#ff2e4d', emissive: '#ff2e4d', emissiveIntensity: 3, toneMapped: false }),
      green: new THREE.MeshStandardMaterial({ color: '#22ff88', emissive: '#22ff88', emissiveIntensity: 3, toneMapped: false }),
      white: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 4, toneMapped: false }),
    }),
    [],
  );

  useFrame((_, rawDelta) => {
    if (worldClock.phase !== 'world') return;
    const dt = safeDelta(rawDelta);
    const t = phaseTime();
    const thrust = vehicle.thrust;
    for (const fan of fans.current) if (fan) fan.rotation.y += (14 + thrust * 30) * dt;
    for (const glow of liftGlows.current) {
      if (glow) (glow.material as THREE.SpriteMaterial).opacity = clamp(0.25 + thrust * 0.35, 0, 0.9);
    }
    for (const glow of thrusterGlows.current) {
      if (!glow) continue;
      const flicker = 0.92 + Math.sin(t * 37 + glow.id) * 0.08;
      (glow.material as THREE.SpriteMaterial).opacity = clamp((0.2 + thrust * 0.55) * flicker, 0, 1);
      const size = 0.7 + thrust * 0.6;
      glow.scale.set(size, size, 1);
    }
    if (strobe.current) strobe.current.visible = (t * 1.1) % 1 < 0.06; // anti-collision strobe
    if (ringMat.current) ringMat.current.emissiveIntensity = vehicle.landed ? 2.4 + Math.sin(t * 2.4) * 0.5 : 1.2;
  });

  return (
    <group ref={ref}>
      {/* Hull */}
      <RoundedBox args={[3.4, 0.36, 2.3]} radius={0.14} smoothness={4} material={m.hull} position={[0, -0.24, 0]} />
      <RoundedBox args={[2.2, 0.22, 1.6]} radius={0.1} smoothness={4} material={m.dark} position={[0, -0.48, 0]} />
      {/* Deck with landing ring */}
      <RoundedBox args={[2.3, 0.06, 1.7]} radius={0.03} smoothness={3} material={m.deck} position={[0, -0.03, 0]} />
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.82, 0.022, 10, 64]} />
        <meshStandardMaterial ref={ringMat} color="#03e9f4" emissive="#03e9f4" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 48]} />
        <meshBasicMaterial color="#03e9f4" transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} material={m.glow} position={[1.12 * side, 0.004, 0]}>
          <boxGeometry args={[0.02, 0.01, 1.4]} />
        </mesh>
      ))}

      {/* Nose sensor and rear stabilisers */}
      <RoundedBox args={[0.9, 0.16, 0.3]} radius={0.06} smoothness={3} material={m.hull} position={[0, -0.28, 1.2]} />
      <mesh material={m.glow} position={[0, -0.28, 1.36]}>
        <sphereGeometry args={[0.035, 16, 12]} />
      </mesh>
      <RoundedBox args={[1.1, 0.3, 0.38]} radius={0.08} smoothness={3} material={m.hull} position={[0, 0.06, -1.0]} />
      {[-1, 1].map((side) => (
        <RoundedBox key={side} args={[0.06, 0.38, 0.42]} radius={0.025} smoothness={3} material={m.hull} position={[0.5 * side, 0.26, -1.06]} rotation={[0.2, 0, 0.12 * side]} />
      ))}

      {/* Wing struts and ducted lift fans */}
      {[-1, 1].map((side, i) => (
        <group key={side}>
          <RoundedBox args={[0.9, 0.1, 0.5]} radius={0.04} smoothness={3} material={m.hull} position={[1.95 * side, -0.22, 0]} />
          <group position={[2.45 * side, -0.2, 0]}>
            <mesh material={m.hull} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.5, 0.09, 16, 48]} />
            </mesh>
            <mesh material={m.dark}>
              <cylinderGeometry args={[0.09, 0.09, 0.12, 20]} />
            </mesh>
            <group ref={(el) => (fans.current[i] = el)}>
              {Array.from({ length: 6 }).map((_, b) => (
                <mesh key={b} material={m.blade} rotation={new THREE.Euler(0.25, (b * Math.PI) / 3, 0, 'YXZ')} position={[Math.cos((b * Math.PI) / 3) * 0.22, 0, -Math.sin((b * Math.PI) / 3) * 0.22]}>
                  <boxGeometry args={[0.36, 0.012, 0.085]} />
                </mesh>
              ))}
            </group>
            <Glow ref={(el) => (liftGlows.current[i] = el)} position={[0, -0.3, 0]} size={1.3} opacity={0.35} />
            <mesh material={side === -1 ? m.red : m.green} position={[0.6 * side, 0, 0]}>
              <sphereGeometry args={[0.035, 12, 8]} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Rear thrusters */}
      {[-1, 1].map((side, i) => (
        <group key={side} position={[0.65 * side, -0.28, -1.22]}>
          <mesh material={m.dark} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.15, 0.3, 24, 1, true]} />
          </mesh>
          <mesh material={m.glow} position={[0, 0, -0.1]} rotation={[Math.PI, 0, 0]}>
            <circleGeometry args={[0.11, 24]} />
          </mesh>
          <Glow ref={(el) => (thrusterGlows.current[i] = el)} position={[0, 0, -0.32]} size={0.9} opacity={0.5} />
        </group>
      ))}

      {/* Anti-collision strobe */}
      <mesh ref={strobe} material={m.white} position={[0, 0.25, -1.2]} visible={false}>
        <sphereGeometry args={[0.03, 10, 8]} />
      </mesh>

      {/* Deck payload (the robot) */}
      <group position={[0, 0, 0.05]}>{children}</group>
    </group>
  );
});

export default UAVCarrier;
