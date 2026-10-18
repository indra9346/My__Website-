import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import RobotAgent from './RobotAgent';
import UAVCarrier from './UAVCarrier';
import EscortDrone, { type DroneConfig } from './EscortDrone';
import WarpTunnel from './WarpTunnel';
import {
  Spring,
  Spring3,
  clamp,
  easeInOutCubic,
  easeOutCubic,
  lerp,
  phaseTime,
  safeDelta,
  smoothstep,
  vehicle,
  wobble,
  worldClock,
  type WorldPhase,
} from './physics';

const DECK_Y = -1.25; // resting height of the carrier deck
const ARRIVAL = 2.7; // seconds for the carrier to fly in

// Flight path relative to the resting point: out of the haze, curving in, flaring to a hover.
const PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-7, 7.5, -44),
  new THREE.Vector3(-3.4, 4.2, -22),
  new THREE.Vector3(1.2, 1.1, -7),
  new THREE.Vector3(0, 0, 0),
]);

const DESKTOP_STATIONS: [number, number, number][] = [
  [-3.6, 1.8, -0.5],
  [3.6, 1.8, -0.5],
  [-2.2, 0.5, 1.6],
  [2.2, 0.5, 1.6],
];
const MOBILE_STATIONS: [number, number, number][] = [
  [-1.6, 1.9, 0.2],
  [1.6, 1.9, 0.2],
  [-1.3, 0.3, 1.2],
  [1.3, 0.3, 1.2],
];
const FORMATION: [number, number, number][] = [
  [-2.4, 1.6, -1.6],
  [2.4, 1.6, -1.6],
  [-1.6, -0.1, 1.5],
  [1.6, -0.1, 1.5],
];

export interface WorldSceneProps {
  phase: WorldPhase;
  compact: boolean;
  reducedMotion: boolean;
  onRobotSelect: () => void;
}

function WorldScene({ phase, compact, reducedMotion, onRobotSelect }: WorldSceneProps) {
  const { scene, invalidate, gl, camera } = useThree();
  const carrier = useRef<THREE.Group>(null);
  const worldGroup = useRef<THREE.Group>(null);
  const tunnelGroup = useRef<THREE.Group>(null);
  const fog = useMemo(() => new THREE.Fog('#020617', 500, 1000), []);

  // Keep fog attached at all times (only its range changes) so materials never recompile mid-show.
  useLayoutEffect(() => {
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);

  // Every part times its motion from the start of the current phase.
  useLayoutEffect(() => {
    worldClock.phase = phase;
    worldClock.startedAt = performance.now();
    worldClock.reducedMotion = reducedMotion;
    if (tunnelGroup.current) tunnelGroup.current.visible = phase !== 'world';
    if (worldGroup.current) worldGroup.current.visible = phase === 'world';
    if (phase === 'world') {
      fog.near = 14;
      fog.far = 62;
    } else {
      fog.near = 500;
      fog.far = 1000;
    }
    invalidate();
  }, [phase, reducedMotion, fog, invalidate]);

  // Warm-up while hidden under the boot screen: compile (in parallel where the GPU
  // driver allows) and draw the world view and the tunnel view once each, so the
  // warp and the arrival never stall on shader compilation or first uploads.
  const warmed = useRef(false);
  useEffect(() => {
    if (warmed.current) return;
    let cancelled = false;
    const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const cam = camera as THREE.PerspectiveCamera;
    const restZ = compact ? 8.4 : 7.2;
    const views = [
      { world: true, place: () => { cam.position.set(0, 1, restZ); cam.lookAt(0, 0.2, 0); fog.near = 14; fog.far = 62; } },
      { world: false, place: () => { cam.position.set(0, 0, 0); cam.lookAt(0, 0, -10); fog.near = 500; fog.far = 1000; } },
    ];
    (async () => {
      invalidate(); // the environment map needs one rendered frame first
      await nextFrame();
      await nextFrame();
      for (const view of views) {
        if (cancelled || worldClock.phase !== 'standby') break;
        if (worldGroup.current) worldGroup.current.visible = view.world;
        if (tunnelGroup.current) tunnelGroup.current.visible = !view.world;
        view.place();
        cam.updateMatrixWorld();
        try {
          await gl.compileAsync(scene, cam);
        } catch {
          // falls back to compiling on the render below
        }
        if (cancelled || worldClock.phase !== 'standby') break;
        gl.render(scene, cam);
        await nextFrame();
      }
      warmed.current = true;
      if (cancelled) return;
      // Restore whatever the current phase needs.
      const current = worldClock.phase;
      if (tunnelGroup.current) tunnelGroup.current.visible = current !== 'world';
      if (worldGroup.current) worldGroup.current.visible = current === 'world';
      fog.near = current === 'world' ? 14 : 500;
      fog.far = current === 'world' ? 62 : 1000;
      invalidate();
    })();
    return () => {
      cancelled = true;
    };
  }, [camera, compact, fog, gl, invalidate, scene]);

  const carrierStart = useMemo(() => PATH.getPoint(0).clone().add(new THREE.Vector3(0, DECK_Y, 0)), []);
  const drones: DroneConfig[] = useMemo(
    () =>
      FORMATION.map((formation, i) => ({
        formation,
        station: (compact ? MOBILE_STATIONS : DESKTOP_STATIONS)[i],
        delay: 0.12 * i,
        seed: i * 7 + 3,
      })),
    [compact],
  );

  // --- flight physics for the carrier -------------------------------------------
  const flight = useMemo(() => new Spring3(9, 0.72), []);
  const attitude = useMemo(() => ({ roll: new Spring(0, 16, 0.9), pitch: new Spring(0, 16, 0.9), yaw: new Spring(0, 10, 0.9) }), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const lastPhase = useRef<WorldPhase>('standby');

  // --- camera -------------------------------------------------------------------
  const look = useMemo(() => new Spring3(10, 1), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, rawDelta) => {
    const dt = safeDelta(rawDelta);
    const t = phaseTime();
    const current = worldClock.phase;
    const cam = state.camera;
    const firstWorldFrame = current === 'world' && lastPhase.current !== 'world';
    lastPhase.current = current;

    if (current === 'standby') {
      cam.position.set(0, 0, 0);
      cam.lookAt(0, 0, -10);
      return;
    }
    if (current === 'portal') {
      cam.position.set(0, 0, -t * 15);
      cam.lookAt(0, 0, -t * 15 - 10);
      return;
    }

    // World: fly the carrier in.
    if (firstWorldFrame) {
      flight.snap(reducedMotion ? new THREE.Vector3() : PATH.getPoint(0));
      attitude.roll.snap(0);
      attitude.pitch.snap(0);
      attitude.yaw.snap(0);
      vehicle.thrust = 1;
    }
    if (reducedMotion || t >= ARRIVAL) {
      target.set(wobble(t * 0.9, 1) * 0.07, wobble(t * 1.2, 2) * 0.09, wobble(t * 0.8, 3) * 0.05);
    } else {
      PATH.getPoint(easeOutCubic(t / ARRIVAL), target);
    }
    flight.target.copy(target);
    flight.step(dt);

    const v = flight.velocity;
    const a = flight.accel;
    const speed = v.length();
    attitude.roll.target = clamp(-a.x * 0.035 - v.x * 0.03, -0.42, 0.42) + wobble(t * 0.7, 5) * 0.012;
    attitude.pitch.target = clamp(a.z * 0.018 + v.z * 0.006 - a.y * 0.008, -0.3, 0.3) + wobble(t * 0.6, 6) * 0.01;
    attitude.yaw.target = clamp(Math.atan2(v.x, Math.max(0.5, v.z)) * smoothstep(1, 5, speed) * 0.6, -0.5, 0.5);
    attitude.roll.step(dt);
    attitude.pitch.step(dt);
    attitude.yaw.step(dt);

    const c = carrier.current;
    if (c) {
      c.position.set(flight.value.x, flight.value.y + DECK_Y, flight.value.z);
      c.rotation.set(attitude.pitch.value, attitude.yaw.value, attitude.roll.value, 'YXZ');
    }
    vehicle.position.copy(c ? c.position : flight.value);
    vehicle.velocity.copy(v);
    vehicle.accel.copy(a);
    vehicle.roll = attitude.roll.value;
    vehicle.pitch = attitude.pitch.value;
    const thrustTarget = clamp(0.55 + a.length() * 0.04 + speed * 0.025, 0.45, 1.6);
    vehicle.thrust = lerp(vehicle.thrust, thrustTarget, 1 - Math.exp(-dt * 6));
    vehicle.landed = reducedMotion || t > ARRIVAL + 0.6;

    // Camera: dolly in while tracking the carrier, then settle on the original framing with a slow drift.
    const restZ = compact ? 8.4 : 7.2;
    const k = reducedMotion ? 1 : easeInOutCubic(t / 3.3);
    cam.position.set(
      lerp(0, Math.sin(t * 0.15) * 0.3, k),
      lerp(2.2, 1.0 + Math.sin(t * 0.3) * 0.1, k),
      lerp(restZ + 5.5, restZ, k),
    );
    lookTarget.set(lerp(vehicle.position.x, 0, k), lerp(vehicle.position.y + 1.3, 0.2, k), lerp(vehicle.position.z, 0, k));
    if (firstWorldFrame) look.snap(lookTarget);
    look.target.copy(lookTarget);
    look.step(dt);
    cam.lookAt(look.value);
  });

  return (
    <>
      {/* Studio-style reflections generated on the device (no downloads) */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 5, 4]} scale={[8, 2, 1]} rotation-x={Math.PI / 2.3} />
        <Lightformer form="rect" intensity={2.2} color="#22d3ee" position={[-6, 1, -2]} scale={[3, 6, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.5} color="#8b5cf6" position={[6, 1, -2]} scale={[3, 6, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="ring" intensity={1.2} color="#03e9f4" position={[0, -3, 3]} scale={3} />
      </Environment>

      <group ref={tunnelGroup}>
        <WarpTunnel compact={compact} />
      </group>

      <group ref={worldGroup} visible={false}>
        <hemisphereLight args={['#9fdcff', '#0b1220', 0.55]} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[5, 8, 6]} intensity={2.2} />
        <directionalLight position={[-6, 3, -6]} intensity={1.6} color="#22d3ee" />
        <directionalLight position={[6, 2, -5]} intensity={1.0} color="#8b5cf6" />
        <pointLight position={[0, DECK_Y + 0.6, 1.2]} intensity={4} color="#03e9f4" distance={7} />

        <UAVCarrier ref={carrier}>
          <RobotAgent onSelect={onRobotSelect} />
        </UAVCarrier>

        {drones.map((config, i) => (
          <EscortDrone key={i} config={config} carrierStart={carrierStart} />
        ))}
      </group>

    </>
  );
}

// Memoised: HUD and chat state changes must never re-render the 3D tree.
export default memo(WorldScene);
