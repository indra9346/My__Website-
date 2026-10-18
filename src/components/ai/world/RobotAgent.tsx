import { useMemo, useRef, type RefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import Glow from './Glow';
import { Spring, clamp, lerp, phaseTime, safeDelta, smoothstep, vehicle, wobble, worldClock } from './physics';

const THIGH = 0.46;
const SHIN = 0.46;
const PELVIS_Y = 1.05; // hip height + 0.03 when standing (feet on the deck at y = 0)
const CROUCH_ANGLE = 0.9;

// Arrival choreography (seconds into the world phase)
const POWER_ON = 2.75;
const STAND_UP = 3.05;
const WAVE_START = 3.8;
const WAVE_END = 5.5;

/**
 * The white AI robot standing on the UAV deck. Articulated (hips, knees,
 * ankles, waist, shoulders, elbows, neck), animated with springs so every
 * movement has weight: it rides in braced, powers on, stands, looks at the
 * visitor and waves. Idle: breathing, weight shift, head follows the pointer,
 * antennas sway with the vehicle.
 */
export default function RobotAgent({ onSelect }: { onSelect: () => void }) {
  const pelvis = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const antennaL = useRef<THREE.Group>(null);
  const antennaR = useRef<THREE.Group>(null);
  const shoulderL = useRef<THREE.Group>(null);
  const shoulderR = useRef<THREE.Group>(null);
  const elbowL = useRef<THREE.Group>(null);
  const elbowR = useRef<THREE.Group>(null);
  const hipL = useRef<THREE.Group>(null);
  const hipR = useRef<THREE.Group>(null);
  const kneeL = useRef<THREE.Group>(null);
  const kneeR = useRef<THREE.Group>(null);
  const ankleL = useRef<THREE.Group>(null);
  const ankleR = useRef<THREE.Group>(null);
  const eyeStrip = useRef<THREE.Mesh>(null);
  const eyeGlow = useRef<THREE.Sprite>(null);
  const coreGlow = useRef<THREE.Sprite>(null);

  const m = useMemo(
    () => ({
      shell: new THREE.MeshPhysicalMaterial({ color: '#eef2f7', metalness: 0.22, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.1 }),
      trim: new THREE.MeshPhysicalMaterial({ color: '#cfd8e3', metalness: 0.35, roughness: 0.34, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
      joint: new THREE.MeshStandardMaterial({ color: '#1a2130', metalness: 0.85, roughness: 0.38 }),
      dark: new THREE.MeshStandardMaterial({ color: '#0b1018', metalness: 0.7, roughness: 0.45 }),
      visor: new THREE.MeshPhysicalMaterial({ color: '#04070d', metalness: 0.55, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03 }),
      glow: new THREE.MeshStandardMaterial({ color: '#03e9f4', emissive: '#03e9f4', emissiveIntensity: 0.4, toneMapped: false }),
      hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    }),
    [],
  );

  const s = useMemo(
    () => ({
      crouch: new Spring(1, 11, 0.82),
      power: new Spring(0.12, 9, 0.9),
      headPitch: new Spring(0.42, 14, 0.75),
      headYaw: new Spring(0, 12, 0.8),
      nod: new Spring(0, 60, 0.35),
      wave: new Spring(0, 10, 0.85),
      lean: new Spring(0, 14, 0.7),
      sway: new Spring(0, 14, 0.7),
      antenna: new Spring(0, 40, 0.18),
      antennaX: new Spring(0, 40, 0.2),
      boost: new Spring(0, 12, 0.9),
    }),
    [],
  );
  const springList = useMemo(() => Object.values(s), [s]);
  const lastPhase = useRef(worldClock.phase);

  useFrame((state, rawDelta) => {
    const dt = safeDelta(rawDelta);
    const t = phaseTime();
    const phase = worldClock.phase;
    const reduced = worldClock.reducedMotion;

    if (phase !== lastPhase.current) {
      lastPhase.current = phase;
      if (phase === 'world') {
        const ready = reduced;
        s.crouch.snap(ready ? 0 : 1);
        s.power.snap(ready ? 1 : 0.12);
        s.headPitch.snap(ready ? 0 : 0.42);
        s.headYaw.snap(0);
        s.wave.snap(0);
      }
    }
    if (phase !== 'world') return;

    // --- targets -------------------------------------------------------------
    const awake = reduced || t >= POWER_ON;
    const standing = reduced || t >= STAND_UP;
    s.crouch.target = standing ? 0 : 1;
    s.power.target = awake ? 1 : 0.12;
    s.wave.target = !reduced && t >= WAVE_START && t < WAVE_END ? 1 : 0;

    const pointer = state.pointer;
    if (standing) {
      s.headYaw.target = clamp(pointer.x * 0.6, -0.7, 0.7) + wobble(t * 0.35, 4) * 0.1;
      s.headPitch.target = clamp(-pointer.y * 0.28, -0.25, 0.32) + 0.04;
    } else {
      s.headYaw.target = 0;
      s.headPitch.target = 0.42;
    }
    // Inertia: the body leans against the vehicle's acceleration.
    s.lean.target = clamp(-vehicle.accel.z * 0.012, -0.14, 0.14);
    s.sway.target = clamp(vehicle.accel.x * 0.012, -0.12, 0.12) + wobble(t * 0.6, 2) * 0.015;
    // Secondary motion: antennas lag behind head turns and vehicle roll.
    s.antenna.target = -s.headYaw.velocity * 0.06 + vehicle.roll * 0.6 + wobble(t * 1.3, 9) * 0.03;
    s.antennaX.target = -s.headPitch.velocity * 0.05 - vehicle.pitch * 0.5;

    for (const spring of springList) spring.step(dt);

    // Power-on flicker (visor and reactor stutter before they hold).
    let power = s.power.value;
    if (!reduced && t > POWER_ON && t < POWER_ON + 0.4) power *= Math.sin(t * 95) > 0.1 ? 1 : 0.25;
    power += s.boost.value;

    // --- pose -----------------------------------------------------------------
    const c = s.crouch.value;
    const a = CROUCH_ANGLE * c;
    if (pelvis.current) {
      pelvis.current.position.y = PELVIS_Y - (THIGH + SHIN) * (1 - Math.cos(a));
      pelvis.current.rotation.z = s.sway.value * 0.4;
    }
    for (const hip of [hipL.current, hipR.current]) if (hip) hip.rotation.x = -a;
    for (const knee of [kneeL.current, kneeR.current]) if (knee) knee.rotation.x = 2 * a;
    for (const ankle of [ankleL.current, ankleR.current]) if (ankle) ankle.rotation.x = -a;

    if (torso.current) {
      torso.current.rotation.x = 0.28 * c + s.lean.value;
      torso.current.rotation.z = s.sway.value;
      torso.current.scale.y = 1 + Math.sin(t * 1.7) * 0.008; // breathing
    }
    if (head.current) {
      head.current.rotation.x = s.headPitch.value + s.nod.value;
      head.current.rotation.y = s.headYaw.value;
    }
    for (const antenna of [antennaL.current, antennaR.current]) {
      if (!antenna) continue;
      antenna.rotation.z = s.antenna.value;
      antenna.rotation.x = s.antennaX.value;
    }

    // Arms: braced forward while crouched, relaxed when standing, right arm waves.
    const w = s.wave.value;
    if (shoulderL.current) {
      shoulderL.current.rotation.x = -0.45 * c + Math.sin(t * 1.7) * 0.02;
      shoulderL.current.rotation.z = 0.1 + s.sway.value * 0.3;
    }
    if (elbowL.current) elbowL.current.rotation.x = -0.7 * c - 0.18;
    if (shoulderR.current) {
      shoulderR.current.rotation.x = lerp(-0.45 * c + Math.sin(t * 1.7 + 1) * 0.02, -0.15, w);
      shoulderR.current.rotation.z = lerp(-0.1 + s.sway.value * 0.3, -2.3, w);
    }
    if (elbowR.current) {
      elbowR.current.rotation.x = lerp(-0.7 * c - 0.18, 0, w);
      elbowR.current.rotation.z = lerp(0, -0.84 + Math.sin(t * 9) * 0.38, w);
    }

    // Lights
    m.glow.emissiveIntensity = 0.35 + 2.4 * power;
    const pulse = 0.85 + Math.sin(t * 4) * 0.15;
    if (coreGlow.current) (coreGlow.current.material as THREE.SpriteMaterial).opacity = clamp(0.1 + 0.75 * power * pulse, 0, 1);
    if (eyeGlow.current) (eyeGlow.current.material as THREE.SpriteMaterial).opacity = clamp(0.08 + 0.7 * power, 0, 1);
    if (eyeStrip.current) {
      const blink = standing && t % 4.7 < 0.09; // quick visor blink every few seconds
      eyeStrip.current.scale.y = blink ? 0.15 : 1;
    }
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    s.nod.velocity += 4.5; // quick acknowledging nod
    s.boost.value = 0.8; // chest and visor flare
    s.boost.target = 0;
    onSelect();
  };

  const arm = (side: 1 | -1, shoulderRef: RefObject<THREE.Group>, elbowRef: RefObject<THREE.Group>) => (
    <group ref={shoulderRef} position={[0.43 * side, 0.6, 0]}>
      <mesh material={m.joint}>
        <sphereGeometry args={[0.1, 24, 16]} />
      </mesh>
      <mesh material={m.shell} position={[0.02 * side, 0.04, 0]} scale={[1.1, 0.85, 1.1]}>
        <sphereGeometry args={[0.15, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={m.joint} position={[0, -0.07, 0]}>
        <cylinderGeometry args={[0.072, 0.072, 0.05, 20]} />
      </mesh>
      <mesh material={m.shell} position={[0, -0.19, 0]}>
        <capsuleGeometry args={[0.066, 0.22, 8, 20]} />
      </mesh>
      <group ref={elbowRef} position={[0, -0.36, 0]}>
        <mesh material={m.joint}>
          <sphereGeometry args={[0.07, 20, 14]} />
        </mesh>
        <mesh material={m.trim} position={[0, -0.17, 0]}>
          <capsuleGeometry args={[0.062, 0.2, 8, 20]} />
        </mesh>
        <mesh material={m.glow} position={[0, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.062, 0.008, 8, 28]} />
        </mesh>
        <group position={[0, -0.38, 0]}>
          <RoundedBox args={[0.1, 0.12, 0.06]} radius={0.02} smoothness={3} material={m.joint} position={[0, -0.03, 0]} />
          {[-0.032, 0, 0.032].map((x) => (
            <RoundedBox key={x} args={[0.024, 0.07, 0.034]} radius={0.01} smoothness={2} material={m.joint} position={[x, -0.12, 0.004]} />
          ))}
          <RoundedBox args={[0.024, 0.06, 0.03]} radius={0.01} smoothness={2} material={m.joint} position={[-0.062 * side, -0.05, 0.02]} rotation={[0, 0, 0.5 * side]} />
        </group>
      </group>
    </group>
  );

  const leg = (side: 1 | -1, hipRef: RefObject<THREE.Group>, kneeRef: RefObject<THREE.Group>, ankleRef: RefObject<THREE.Group>) => (
    <group ref={hipRef} position={[0.17 * side, -0.03, 0]}>
      <mesh material={m.joint}>
        <sphereGeometry args={[0.09, 22, 16]} />
      </mesh>
      <mesh material={m.shell} position={[0, -0.23, 0]}>
        <capsuleGeometry args={[0.088, 0.28, 8, 22]} />
      </mesh>
      <RoundedBox args={[0.14, 0.22, 0.05]} radius={0.02} smoothness={3} material={m.trim} position={[0, -0.21, 0.085]} />
      <group ref={kneeRef} position={[0, -THIGH, 0]}>
        <mesh material={m.joint}>
          <sphereGeometry args={[0.075, 20, 14]} />
        </mesh>
        <RoundedBox args={[0.12, 0.1, 0.05]} radius={0.02} smoothness={3} material={m.trim} position={[0, 0.01, 0.07]} />
        <mesh material={m.shell} position={[0, -0.23, 0]}>
          <capsuleGeometry args={[0.074, 0.3, 8, 22]} />
        </mesh>
        <mesh material={m.glow} position={[0, -0.22, -0.074]}>
          <boxGeometry args={[0.018, 0.16, 0.012]} />
        </mesh>
        <group ref={ankleRef} position={[0, -SHIN, 0]}>
          <mesh material={m.joint}>
            <sphereGeometry args={[0.05, 16, 12]} />
          </mesh>
          <RoundedBox args={[0.16, 0.1, 0.3]} radius={0.03} smoothness={3} material={m.dark} position={[0, -0.05, 0.05]} />
          <RoundedBox args={[0.15, 0.06, 0.1]} radius={0.025} smoothness={3} material={m.shell} position={[0, -0.04, 0.17]} />
        </group>
      </group>
    </group>
  );

  return (
    <group>
      {/* Generous invisible hit area so the robot is easy to tap */}
      <mesh
        material={m.hit}
        position={[0, 1.2, 0]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        <boxGeometry args={[1.2, 2.5, 0.9]} />
      </mesh>

      <group ref={pelvis} position={[0, PELVIS_Y, 0]}>
        <RoundedBox args={[0.46, 0.2, 0.3]} radius={0.06} smoothness={4} material={m.trim} />
        <mesh material={m.joint} position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.15, 0.17, 0.16, 28]} />
        </mesh>

        <group ref={torso} position={[0, 0.17, 0]}>
          <RoundedBox args={[0.38, 0.2, 0.26]} radius={0.05} smoothness={4} material={m.trim} position={[0, 0.08, 0.01]} />
          <RoundedBox args={[0.64, 0.46, 0.36]} radius={0.1} smoothness={5} material={m.shell} position={[0, 0.38, 0]} />
          <RoundedBox args={[0.44, 0.26, 0.06]} radius={0.03} smoothness={4} material={m.trim} position={[0, 0.42, 0.175]} />
          {/* Arc reactor */}
          <mesh material={m.joint} position={[0, 0.4, 0.212]}>
            <torusGeometry args={[0.066, 0.013, 12, 36]} />
          </mesh>
          <mesh material={m.glow} position={[0, 0.4, 0.208]}>
            <circleGeometry args={[0.052, 32]} />
          </mesh>
          <Glow ref={coreGlow} position={[0, 0.4, 0.26]} size={0.55} opacity={0.2} />
          {[-1, 1].map((side) => (
            <mesh key={side} material={m.glow} position={[0.27 * side, 0.38, 0.165]}>
              <boxGeometry args={[0.018, 0.18, 0.018]} />
            </mesh>
          ))}
          <mesh material={m.joint} position={[0, 0.64, 0]}>
            <cylinderGeometry args={[0.12, 0.13, 0.06, 28]} />
          </mesh>
          {/* Backpack with vents */}
          <RoundedBox args={[0.42, 0.4, 0.14]} radius={0.05} smoothness={4} material={m.trim} position={[0, 0.38, -0.23]} />
          {[-1, 1].map((side) => (
            <mesh key={side} material={m.glow} position={[0.1 * side, 0.24, -0.305]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.045, 0.045, 0.02, 20]} />
            </mesh>
          ))}

          {/* Neck and head */}
          <group position={[0, 0.7, 0]}>
            <mesh material={m.joint} position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.065, 0.08, 0.12, 20]} />
            </mesh>
            <group ref={head} position={[0, 0.1, 0]}>
              <mesh material={m.shell} position={[0, 0.14, 0]} scale={[1, 1.08, 1.06]}>
                <sphereGeometry args={[0.21, 40, 28]} />
              </mesh>
              <mesh material={m.visor} position={[0, 0.14, 0]} scale={[1.04, 1.1, 1.1]}>
                <sphereGeometry args={[0.205, 40, 16, Math.PI / 2 - 1.1, 2.2, 1.12, 0.6]} />
              </mesh>
              <mesh ref={eyeStrip} material={m.glow} position={[0, 0.15, 0.228]}>
                <boxGeometry args={[0.22, 0.032, 0.01]} />
              </mesh>
              <Glow ref={eyeGlow} position={[0, 0.15, 0.27]} size={0.5} opacity={0.1} />
              <RoundedBox args={[0.2, 0.08, 0.14]} radius={0.03} smoothness={3} material={m.trim} position={[0, -0.02, 0.06]} />
              {[-1, 1].map((side) => (
                <group key={side} position={[0.215 * side, 0.13, 0]}>
                  <mesh material={m.joint} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.06, 0.06, 0.06, 24]} />
                  </mesh>
                  <mesh material={m.glow} position={[0.034 * side, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[0.044, 0.007, 8, 24]} />
                  </mesh>
                </group>
              ))}
              {/* Antennas (spring-driven secondary motion) */}
              {[-1, 1].map((side) => (
                <group key={side} ref={side === -1 ? antennaL : antennaR} position={[0.12 * side, 0.32, -0.05]}>
                  <mesh material={m.joint} position={[0, 0.1, 0]}>
                    <cylinderGeometry args={[0.007, 0.01, 0.2, 8]} />
                  </mesh>
                  <mesh material={m.glow} position={[0, 0.205, 0]}>
                    <sphereGeometry args={[0.016, 12, 8]} />
                  </mesh>
                </group>
              ))}
            </group>
          </group>

          {arm(1, shoulderL, elbowL)}
          {arm(-1, shoulderR, elbowR)}
        </group>

        {leg(1, hipL, kneeL, ankleL)}
        {leg(-1, hipR, kneeR, ankleR)}
      </group>
    </group>
  );
}
