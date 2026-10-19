import { useMemo, useRef, type RefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, RoundedBox } from '@react-three/drei';
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
  const eyeStrip = useRef<THREE.Group>(null);
  const eyeGlow = useRef<THREE.Sprite>(null);
  const coreGlow = useRef<THREE.Sprite>(null);

  const m = useMemo(
    () => ({
      // Armour: metallic candy-red plates over a gunmetal under-suit, gold and silver accents.
      shell: new THREE.MeshPhysicalMaterial({ color: '#b3141e', metalness: 0.6, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.04, emissive: '#3a0006', emissiveIntensity: 0.35, envMapIntensity: 0.7 }),
      // Gold keeps its warmth under the city's cyan light: less mirror, a little warm glow.
      trim: new THREE.MeshPhysicalMaterial({ color: '#f0b53c', metalness: 0.75, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.12, emissive: '#6b3d00', emissiveIntensity: 0.45, envMapIntensity: 0.45 }),
      silver: new THREE.MeshPhysicalMaterial({ color: '#d7dde5', metalness: 1, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.1 }),
      repulsor: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffd27a', emissiveIntensity: 1.6, toneMapped: false }),
      joint: new THREE.MeshStandardMaterial({ color: '#1c222c', metalness: 0.88, roughness: 0.34 }),
      metal: new THREE.MeshStandardMaterial({ color: '#9aa5b4', metalness: 1, roughness: 0.16 }),
      dark: new THREE.MeshStandardMaterial({ color: '#0b1018', metalness: 0.7, roughness: 0.45 }),
      seam: new THREE.MeshStandardMaterial({ color: '#05070b', metalness: 0.5, roughness: 0.6 }),
      face: new THREE.MeshPhysicalMaterial({ color: '#f3bd4f', metalness: 0.75, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, emissive: '#6b3d00', emissiveIntensity: 0.5, envMapIntensity: 0.45 }),
      glow: new THREE.MeshStandardMaterial({ color: '#f2fbff', emissive: '#9be7ff', emissiveIntensity: 0.4, toneMapped: false }),
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

  // Five-finger hand: palm, back plate, four two-segment fingers and a thumb.
  const hand = (side: 1 | -1) => (
    <group position={[0, -0.335, 0]}>
      <mesh material={m.joint}>
        <sphereGeometry args={[0.03, 16, 12]} />
      </mesh>
      <RoundedBox args={[0.074, 0.085, 0.028]} radius={0.012} smoothness={3} material={m.joint} position={[0, -0.06, 0]} />
      {/* palm repulsor */}
      <mesh material={m.repulsor} position={[0, -0.06, 0.0145]}>
        <circleGeometry args={[0.019, 20]} />
      </mesh>
      <Glow position={[0, -0.06, 0.04]} size={0.16} opacity={0.55} color="#ffcf73" />
      <RoundedBox args={[0.068, 0.07, 0.012]} radius={0.006} smoothness={2} material={m.shell} position={[0, -0.058, -0.017 * side * 0 - 0.016]} />
      {[-0.026, -0.009, 0.009, 0.026].map((x, i) => (
        <group key={x} position={[x, -0.104, 0.002]} rotation={[0.18 + i * 0.03, 0, 0]}>
          <mesh material={m.joint} position={[0, -0.018, 0]}>
            <capsuleGeometry args={[0.0075, 0.026 - Math.abs(i - 1.5) * 0.004, 4, 8]} />
          </mesh>
          <group position={[0, -0.04, 0]} rotation={[0.32, 0, 0]}>
            <mesh material={m.trim} position={[0, -0.014, 0]}>
              <capsuleGeometry args={[0.0072, 0.02, 4, 8]} />
            </mesh>
          </group>
        </group>
      ))}
      <group position={[-0.044 * side, -0.05, 0.012]} rotation={[0.3, 0, 0.6 * side]}>
        <mesh material={m.joint} position={[0, -0.02, 0]}>
          <capsuleGeometry args={[0.0085, 0.026, 4, 8]} />
        </mesh>
        <mesh material={m.trim} position={[0, -0.05, 0.004]}>
          <capsuleGeometry args={[0.008, 0.018, 4, 8]} />
        </mesh>
      </group>
    </group>
  );

  // Arm: shoulder cap, a dark mechanical core with pearl shell plates over it.
  const arm = (side: 1 | -1, shoulderRef: RefObject<THREE.Group>, elbowRef: RefObject<THREE.Group>) => (
    <group ref={shoulderRef} position={[0.335 * side, 0.58, 0]}>
      <mesh material={m.joint}>
        <sphereGeometry args={[0.072, 24, 16]} />
      </mesh>
      <mesh material={m.shell} position={[0.03 * side, 0.025, 0]} scale={[1.1, 0.95, 1.15]}>
        <sphereGeometry args={[0.13, 32, 16, 0, Math.PI * 2, 0, Math.PI / 1.85]} />
      </mesh>
      <mesh material={m.joint} position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.032, 0.036, 0.3, 14]} />
      </mesh>
      <mesh material={m.shell} position={[0, -0.18, 0.006]} scale={[0.95, 1, 1.02]}>
        <capsuleGeometry args={[0.066, 0.16, 8, 22]} />
      </mesh>
      <mesh material={m.seam} position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.052, 0.0035, 6, 28]} />
      </mesh>
      <group ref={elbowRef} position={[0, -0.36, 0]}>
        <mesh material={m.joint}>
          <sphereGeometry args={[0.048, 20, 14]} />
        </mesh>
        <mesh material={m.joint} position={[0, -0.16, 0]}>
          <cylinderGeometry args={[0.028, 0.03, 0.28, 12]} />
        </mesh>
        <mesh material={m.shell} position={[0, -0.16, 0.005]} scale={[0.95, 1, 1]}>
          <cylinderGeometry args={[0.055, 0.068, 0.24, 24]} />
        </mesh>
        <mesh material={m.trim} position={[0, -0.27, 0.005]} scale={[0.95, 1, 1]}>
          <cylinderGeometry args={[0.07, 0.07, 0.025, 24]} />
        </mesh>
        {/* forearm pistons */}
        {[-1, 1].map((k) => (
          <mesh key={k} material={m.metal} position={[0.03 * k, -0.17, -0.03]}>
            <cylinderGeometry args={[0.006, 0.006, 0.2, 6]} />
          </mesh>
        ))}
        {hand(side)}
      </group>
    </group>
  );

  // Leg: thigh and shin plates over dark cores, knee cap, sleek foot.
  const leg = (side: 1 | -1, hipRef: RefObject<THREE.Group>, kneeRef: RefObject<THREE.Group>, ankleRef: RefObject<THREE.Group>) => (
    <group ref={hipRef} position={[0.14 * side, -0.03, 0]} rotation={[0, 0, 0.07 * side]}>
      <mesh material={m.joint}>
        <sphereGeometry args={[0.07, 22, 16]} />
      </mesh>
      <mesh material={m.joint} position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.04, 0.044, 0.4, 14]} />
      </mesh>
      <mesh material={m.shell} position={[0, -0.2, 0.008]} scale={[0.98, 1, 1.1]}>
        <capsuleGeometry args={[0.097, 0.2, 8, 24]} />
      </mesh>
      <mesh material={m.seam} position={[0, -0.32, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.07, 0.004, 6, 28]} />
      </mesh>
      <RoundedBox args={[0.035, 0.22, 0.12]} radius={0.014} smoothness={2} material={m.silver} position={[0.09 * side, -0.2, 0.012]} />
      <RoundedBox args={[0.05, 0.18, 0.04]} radius={0.014} smoothness={2} material={m.trim} position={[0.04 * side, -0.2, 0.098]} rotation={[0, 0, 0.12 * side]} />
      <group ref={kneeRef} position={[0, -THIGH, 0]}>
        <mesh material={m.joint}>
          <sphereGeometry args={[0.055, 20, 14]} />
        </mesh>
        <RoundedBox args={[0.085, 0.085, 0.04]} radius={0.018} smoothness={3} material={m.trim} position={[0, 0.005, 0.055]} />
        <mesh material={m.joint} position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.034, 0.03, 0.4, 14]} />
        </mesh>
        <mesh material={m.shell} position={[0, -0.2, 0.01]} scale={[0.95, 1, 1.12]}>
          <cylinderGeometry args={[0.072, 0.098, 0.4, 28]} />
        </mesh>
        <mesh material={m.shell} position={[0, -0.36, 0.012]} scale={[1, 1, 1.15]}>
          <cylinderGeometry args={[0.102, 0.108, 0.08, 28]} />
        </mesh>
        <RoundedBox args={[0.026, 0.16, 0.08]} radius={0.01} smoothness={2} material={m.trim} position={[0.06 * side, -0.16, 0.02]} />
        {/* calf pistons */}
        {[-1, 1].map((k) => (
          <mesh key={k} material={m.metal} position={[0.028 * k, -0.2, -0.05]}>
            <cylinderGeometry args={[0.007, 0.007, 0.26, 6]} />
          </mesh>
        ))}
        <group ref={ankleRef} position={[0, -SHIN, 0]} rotation={[0, 0, -0.07 * side]}>
          <mesh material={m.joint}>
            <sphereGeometry args={[0.038, 16, 12]} />
          </mesh>
          <RoundedBox args={[0.14, 0.05, 0.3]} radius={0.02} smoothness={3} material={m.dark} position={[0, -0.06, 0.05]} />
          <RoundedBox args={[0.13, 0.06, 0.2]} radius={0.026} smoothness={3} material={m.shell} position={[0, -0.03, 0.08]} />
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

      {/* soft contact shadow on the deck */}
      <ContactShadows position={[0, 0.006, 0]} scale={1.5} blur={2.2} far={1.4} opacity={0.6} resolution={256} color="#020617" />

      <group ref={pelvis} position={[0, PELVIS_Y, 0]}>
        <RoundedBox args={[0.32, 0.13, 0.2]} radius={0.05} smoothness={4} material={m.shell} position={[0, -0.01, 0]} />
        <RoundedBox args={[0.24, 0.08, 0.16]} radius={0.03} smoothness={3} material={m.joint} position={[0, -0.07, 0]} />

        <group ref={torso} position={[0, 0.17, 0]}>
          {/* exposed spine: stacked vertebrae between hips and chest, with side pistons */}
          {[-0.12, -0.065, -0.01, 0.045, 0.1].map((y, i) => (
            <mesh key={y} material={i % 2 ? m.metal : m.joint} position={[0, y, -0.005]}>
              <cylinderGeometry args={[0.1 + i * 0.006, 0.105 + i * 0.006, 0.04, 24]} />
            </mesh>
          ))}
          {[-1, 1].map((k) => (
            <mesh key={k} material={m.metal} position={[0.085 * k, -0.01, 0.04]} rotation={[0, 0, 0.12 * k]}>
              <cylinderGeometry args={[0.009, 0.009, 0.26, 8]} />
            </mesh>
          ))}
          {/* armoured chest: broad and squared, tapering into a gold abdomen plate */}
          <RoundedBox args={[0.6, 0.32, 0.31]} radius={0.12} smoothness={5} material={m.shell} position={[0, 0.43, 0]} />
          {[-1, 1].map((k) => (
            <RoundedBox key={k} args={[0.23, 0.16, 0.06]} radius={0.045} smoothness={3} material={m.shell} position={[0.125 * k, 0.45, 0.14]} rotation={[0.08, 0.18 * k, 0]} />
          ))}
          <mesh material={m.trim} position={[0, 0.235, 0.005]}>
            <cylinderGeometry args={[0.19, 0.12, 0.16, 32]} />
          </mesh>
          {[0.2, 0.25].map((y) => (
            <mesh key={y} material={m.seam} position={[0, y, 0.005]}>
              <cylinderGeometry args={[0.18 - (0.25 - y) * 0.4, 0.18 - (0.25 - y) * 0.4, 0.006, 32]} />
            </mesh>
          ))}
          <mesh material={m.seam} position={[0, 0.43, 0.152]}>
            <boxGeometry args={[0.004, 0.24, 0.004]} />
          </mesh>
          {/* heart light behind a dark ring */}
          <mesh material={m.metal} position={[0, 0.4, 0.165]}>
            <torusGeometry args={[0.05, 0.011, 12, 36]} />
          </mesh>
          <mesh material={m.glow} position={[0, 0.4, 0.163]}>
            <circleGeometry args={[0.04, 32]} />
          </mesh>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <mesh key={i} material={m.joint} position={[Math.cos((i * Math.PI) / 4) * 0.03, 0.4 + Math.sin((i * Math.PI) / 4) * 0.03, 0.168]} rotation={[0, 0, (i * Math.PI) / 4]}>
              <boxGeometry args={[0.018, 0.004, 0.003]} />
            </mesh>
          ))}
          <Glow ref={coreGlow} position={[0, 0.4, 0.22]} size={0.45} opacity={0.2} color="#cdeeff" />
          {/* collarbone */}
          <mesh material={m.joint} position={[0, 0.58, -0.01]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.036, 0.5, 6, 14]} />
          </mesh>

          {/* Neck: core with three pistons, then the head */}
          <group position={[0, 0.66, 0]}>
            <mesh material={m.joint} position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.038, 0.05, 0.14, 16]} />
            </mesh>
            {[0, 1, 2].map((i) => (
              <mesh key={i} material={m.metal} position={[Math.sin((i * Math.PI * 2) / 3) * 0.045, 0.06, Math.cos((i * Math.PI * 2) / 3) * 0.045]}>
                <cylinderGeometry args={[0.008, 0.008, 0.14, 6]} />
              </mesh>
            ))}
            <group ref={head} position={[0, 0.14, 0]}>
              {/* egg-shaped skull */}
              <mesh material={m.shell} position={[0, 0.13, -0.008]} scale={[0.94, 1.08, 1.0]}>
                <sphereGeometry args={[0.165, 48, 32]} />
              </mesh>
              {/* dark face plate, eyes, then a glass face over them */}
              <mesh material={m.face} position={[0, 0.12, 0]} scale={[0.93, 1.05, 1.02]}>
                <sphereGeometry args={[0.168, 48, 24, Math.PI / 2 - 0.95, 1.9, 0.62, 1.55]} />
              </mesh>
              {/* angled eye slits, like an Avengers helmet */}
              <group ref={eyeStrip} position={[0, 0.148, 0.163]}>
                {[-1, 1].map((k) => (
                  <mesh key={k} material={m.glow} position={[0.047 * k, 0, 0]} rotation={[0, 0.32 * k, -0.2 * k]}>
                    <boxGeometry args={[0.052, 0.013, 0.012]} />
                  </mesh>
                ))}
              </group>
              {/* faceplate seam and mouth grille */}
              <mesh material={m.seam} position={[0, 0.07, 0.158]}>
                <boxGeometry args={[0.05, 0.003, 0.006]} />
              </mesh>
              <mesh material={m.seam} position={[0, 0.215, 0.14]} rotation={[0.5, 0, 0]}>
                <boxGeometry args={[0.004, 0.06, 0.004]} />
              </mesh>
              <Glow ref={eyeGlow} position={[0, 0.145, 0.24]} size={0.34} opacity={0.1} color="#e6f7ff" />
              {/* side seams where a human would have ears */}
              {[-1, 1].map((k) => (
                <mesh key={k} material={m.seam} position={[0.142 * k, 0.12, -0.01]} rotation={[0, Math.PI / 2, 0]}>
                  <torusGeometry args={[0.036, 0.004, 6, 24]} />
                </mesh>
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
