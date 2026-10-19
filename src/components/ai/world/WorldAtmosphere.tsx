import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { phaseTime, safeDelta, worldClock } from './physics';

// Depth layers between the camera and the city panorama. As the view turns they
// move at different speeds from the backdrop, which is what makes the place read
// as a large 3D space rather than a picture behind the robot.

function softDot(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Deterministic pseudo-random numbers so the layout is the same every visit. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// --- light motes drifting in the air -------------------------------------------
function Motes({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);
  const { geometry, material, speeds } = useMemo(() => {
    const rand = seeded(11);
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 70;
      positions[i * 3 + 1] = -4 + rand() * 22;
      positions[i * 3 + 2] = -48 + rand() * 54;
      speeds[i] = 0.15 + rand() * 0.45;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      size: 0.16,
      map: softDot(),
      color: '#a5f3fc',
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    return { geometry, material, speeds };
  }, [count]);

  useFrame((_, raw) => {
    if (worldClock.phase !== 'world' || worldClock.reducedMotion) return;
    const dt = safeDelta(raw);
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = phaseTime();
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * dt;
      arr[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.08;
      if (arr[i * 3 + 1] > 18) arr[i * 3 + 1] = -4;
    }
    attr.needsUpdate = true;
  });

  useEffect(() => () => {
    geometry.dispose();
    material.map?.dispose();
    material.dispose();
  }, [geometry, material]);

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

// --- air traffic: flying cars in lanes at different depths ------------------------
type Lane = { y: number; z: number; speed: number; dir: 1 | -1; offset: number; scale: number };

function AirTraffic({ count }: { count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const lanes = useMemo<Lane[]>(() => {
    const rand = seeded(29);
    return Array.from({ length: count }, (_, i) => ({
      y: 3 + rand() * 15,
      z: -16 - rand() * 34,
      speed: 5 + rand() * 9,
      dir: i % 2 === 0 ? 1 : -1,
      offset: rand() * 110,
      scale: 0.7 + rand() * 0.8,
    }));
  }, [count]);
  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.CapsuleGeometry(0.09, 1.5, 4, 8);
    geometry.rotateZ(Math.PI / 2); // lie along the direction of travel
    const material = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
    return { geometry, material };
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const palette = ['#e0faff', '#67e8f9', '#f0abfc', '#fde68a', '#ffffff'].map((c) => new THREE.Color(c).multiplyScalar(1.6));
    lanes.forEach((_, i) => m.setColorAt(i, palette[i % palette.length]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [lanes]);

  useFrame(() => {
    const m = mesh.current;
    if (!m || worldClock.phase !== 'world') return;
    const t = worldClock.reducedMotion ? 0 : phaseTime();
    lanes.forEach((lane, i) => {
      const span = 110;
      const x = ((((lane.offset + t * lane.speed) % span) + span) % span) - span / 2;
      dummy.position.set(lane.dir * x, lane.y + Math.sin(t * 0.5 + i) * 0.15, lane.z);
      dummy.scale.set(lane.scale * 1.6, lane.scale, lane.scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />;
}

// --- holographic landing grid under the carrier -------------------------------------
const gridVertex = /* glsl */ `
  varying vec2 vPos;
  void main() {
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const gridFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vPos;
  float line(vec2 p, float size) {
    vec2 q = p / size;
    vec2 d = abs(fract(q - 0.5) - 0.5) / fwidth(q);
    return 1.0 - min(min(d.x, d.y), 1.0);
  }
  void main() {
    vec2 p = vPos + vec2(0.0, uTime * 0.6);
    float g = max(line(p, 1.5) * 0.55, line(p, 7.5));
    float r = length(vPos);
    float fade = 1.0 - smoothstep(6.0, 46.0, r);
    float pulse = 0.5 + 0.5 * sin(r * 0.6 - uTime * 1.6);
    float alpha = g * fade * (0.22 + pulse * 0.16);
    gl_FragColor = vec4(uColor * (1.0 + pulse * 0.4), alpha);
  }
`;

function LandingGrid({ y }: { y: number }) {
  const rings = useRef<THREE.Group>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: gridVertex,
        fragmentShader: gridFragment,
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#22d3ee') } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const ringMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#67e8f9', transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }),
    [],
  );

  useFrame(() => {
    if (worldClock.phase !== 'world') return;
    const t = worldClock.reducedMotion ? 0 : phaseTime();
    material.uniforms.uTime.value = t;
    if (rings.current) {
      rings.current.rotation.z = t * 0.12;
      ringMaterial.opacity = 0.3 + Math.sin(t * 1.4) * 0.08;
    }
  });

  useEffect(() => () => {
    material.dispose();
    ringMaterial.dispose();
  }, [material, ringMaterial]);

  return (
    <group position={[0, y, 0]} rotation-x={-Math.PI / 2}>
      <mesh material={material} renderOrder={-5}>
        <planeGeometry args={[100, 100, 1, 1]} />
      </mesh>
      <group ref={rings}>
        {[2.4, 3.3, 4.6].map((r, i) => (
          <mesh key={r} material={ringMaterial} position-z={0.02 * i}>
            <ringGeometry args={[r, r + (i === 0 ? 0.06 : 0.03), 96, 1, 0, i === 1 ? Math.PI * 1.6 : Math.PI * 2]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// --- light beacons rising from the far city -------------------------------------------
const beamVertex = /* glsl */ `
  varying float vY;
  void main() {
    vY = uv.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPulse;
  varying float vY;
  void main() {
    float a = (1.0 - vY) * (1.0 - vY) * 0.55 * uPulse;
    gl_FragColor = vec4(uColor, a);
  }
`;

function Beacons() {
  const items = useMemo(
    () => [
      { x: -34, z: -50, color: '#22d3ee', phase: 0 },
      { x: 28, z: -54, color: '#a78bfa', phase: 1.7 },
      { x: -12, z: -58, color: '#67e8f9', phase: 3.1 },
      { x: 46, z: -44, color: '#22d3ee', phase: 4.4 },
      { x: -50, z: -40, color: '#f0abfc', phase: 2.2 },
    ],
    [],
  );
  const materials = useMemo(
    () =>
      items.map(
        (item) =>
          new THREE.ShaderMaterial({
            vertexShader: beamVertex,
            fragmentShader: beamFragment,
            uniforms: { uColor: { value: new THREE.Color(item.color) }, uPulse: { value: 1 } },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
          }),
      ),
    [items],
  );

  useFrame(() => {
    if (worldClock.phase !== 'world') return;
    const t = worldClock.reducedMotion ? 0 : phaseTime();
    materials.forEach((m, i) => (m.uniforms.uPulse.value = 0.65 + 0.35 * Math.sin(t * 0.8 + items[i].phase)));
  });

  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  return (
    <>
      {items.map((item, i) => (
        <mesh key={i} material={materials[i]} position={[item.x, 14, item.z]}>
          <cylinderGeometry args={[0.35, 0.9, 44, 12, 1, true]} />
        </mesh>
      ))}
    </>
  );
}

export default function WorldAtmosphere({ compact, groundY }: { compact: boolean; groundY: number }) {
  return (
    <>
      <Beacons />
      <AirTraffic count={compact ? 16 : 26} />
      <Motes count={compact ? 360 : 700} />
      <LandingGrid y={groundY} />
    </>
  );
}
