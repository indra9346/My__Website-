import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { phaseTime, safeDelta, smoothstep, worldClock } from './physics';

const RING_COUNT = 22;
const SPAN = 105; // depth of the tunnel ahead of the camera

/**
 * Hyperspace tunnel shown after the eye video's own energy tunnel. Glowing
 * rings and light streaks rush past, speeding up toward the exit into the
 * world. Positions wrap relative to the moving camera, so it never runs out.
 */
export default function WarpTunnel({ compact }: { compact: boolean }) {
  const rings = useRef<THREE.Group>(null);
  const streaks = useRef<THREE.InstancedMesh>(null);
  const streakCount = compact ? 90 : 170;

  const streakData = useMemo(() => {
    const data: { angle: number; radius: number; z: number; speed: number }[] = [];
    for (let i = 0; i < streakCount; i++) {
      // deterministic pseudo-random spread
      const r1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      const r2 = Math.abs(Math.sin(i * 78.233) * 12345.678) % 1;
      const r3 = Math.abs(Math.sin(i * 39.425) * 24634.634) % 1;
      data.push({ angle: r1 * Math.PI * 2, radius: 1.3 + r2 * 4.6, z: -r3 * SPAN, speed: 0.7 + r2 * 0.6 });
    }
    return data;
  }, [streakCount]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Place the streaks once so the first frame (and shader warm-up) already looks right.
  useLayoutEffect(() => {
    const mesh = streaks.current;
    if (!mesh) return;
    streakData.forEach((s, i) => {
      dummy.position.set(Math.cos(s.angle) * s.radius, Math.sin(s.angle) * s.radius, s.z);
      dummy.scale.set(1, 1, 2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [streakData, dummy]);

  useFrame((state, rawDelta) => {
    if (worldClock.phase !== 'portal') return;
    const dt = safeDelta(rawDelta);
    const t = phaseTime();
    const camZ = state.camera.position.z;
    // Speeds up toward the end of the warp, like dropping out of light speed.
    const speed = 150 * (1 + 0.9 * smoothstep(0.55, 1.15, t));

    const group = rings.current;
    if (group) {
      group.children.forEach((ring, i) => {
        ring.position.z += speed * dt;
        if (ring.position.z > camZ + 4) ring.position.z -= SPAN;
        ring.rotation.z += dt * (i % 2 === 0 ? 0.6 : -0.45);
        const wobbleScale = 1 + Math.sin(t * 3 + i) * 0.04;
        ring.scale.set(wobbleScale, wobbleScale, 1);
      });
    }

    const mesh = streaks.current;
    if (mesh) {
      const stretch = 2 + speed * 0.025;
      streakData.forEach((s, i) => {
        s.z += speed * s.speed * dt;
        if (s.z > camZ + 4) s.z -= SPAN;
        dummy.position.set(Math.cos(s.angle) * s.radius, Math.sin(s.angle) * s.radius, s.z);
        dummy.scale.set(1, 1, stretch);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <Stars radius={100} depth={50} count={compact ? 1800 : 3000} factor={6} saturation={0.5} fade speed={2} />
      <group ref={rings}>
        {Array.from({ length: RING_COUNT }).map((_, i) => (
          <mesh key={i} position={[0, 0, -(i * SPAN) / RING_COUNT]}>
            <torusGeometry args={[3.5, 0.045, 8, 64]} />
            <meshBasicMaterial
              color={i % 2 === 0 ? '#03e9f4' : '#7B2CBF'}
              transparent
              opacity={0.75}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      <instancedMesh ref={streaks} args={[undefined, undefined, streakCount]} frustumCulled={false}>
        <boxGeometry args={[0.018, 0.018, 1]} />
        <meshBasicMaterial color="#d8fbff" transparent opacity={0.65} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
