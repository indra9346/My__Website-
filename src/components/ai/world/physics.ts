import * as THREE from 'three';

export type WorldPhase = 'standby' | 'portal' | 'world';

/**
 * Shared timeline for every part of the scene. The scene sets the phase and
 * its start time; parts read `phaseTime()` so their motion starts from zero
 * at each phase, no matter how long the canvas has existed.
 */
export const worldClock = {
  phase: 'standby' as WorldPhase,
  startedAt: typeof performance !== 'undefined' ? performance.now() : 0,
  reducedMotion: false,
};

export function phaseTime(): number {
  return (performance.now() - worldClock.startedAt) / 1000;
}

/** Live state of the UAV carrier, read by the robot and drones (inertia, thrust). */
export const vehicle = {
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  accel: new THREE.Vector3(),
  roll: 0,
  pitch: 0,
  thrust: 0.6,
  landed: false,
};

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOutCubic = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/** Organic, repeatable motion from layered sines (no allocations). */
export function wobble(t: number, seed: number): number {
  return Math.sin(t * 0.73 + seed) * 0.55 + Math.sin(t * 1.41 + seed * 1.9) * 0.3 + Math.sin(t * 2.87 + seed * 3.3) * 0.15;
}

const SUBSTEP = 1 / 120;

/**
 * Damped spring integrated with semi-implicit Euler and fixed sub-steps, so it
 * stays stable on slow frames. A damping ratio below 1 overshoots slightly and
 * settles, like real suspension.
 */
export class Spring {
  value: number;
  target: number;
  velocity = 0;
  accel = 0;

  constructor(value = 0, public stiffness = 12, public dampingRatio = 0.85) {
    this.value = value;
    this.target = value;
  }

  snap(value: number) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    this.accel = 0;
  }

  step(dt: number): number {
    const k = this.stiffness;
    const c = 2 * Math.sqrt(k) * this.dampingRatio;
    const steps = Math.max(1, Math.ceil(dt / SUBSTEP));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.accel = -k * (this.value - this.target) - c * this.velocity;
      this.velocity += this.accel * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }
}

export class Spring3 {
  value = new THREE.Vector3();
  target = new THREE.Vector3();
  velocity = new THREE.Vector3();
  accel = new THREE.Vector3();
  private force = new THREE.Vector3();

  constructor(public stiffness = 12, public dampingRatio = 0.85) {}

  snap(position: THREE.Vector3) {
    this.value.copy(position);
    this.target.copy(position);
    this.velocity.set(0, 0, 0);
    this.accel.set(0, 0, 0);
  }

  step(dt: number): THREE.Vector3 {
    const k = this.stiffness;
    const c = 2 * Math.sqrt(k) * this.dampingRatio;
    const steps = Math.max(1, Math.ceil(dt / SUBSTEP));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.force.copy(this.value).sub(this.target).multiplyScalar(-k);
      this.accel.copy(this.force).addScaledVector(this.velocity, -c);
      this.velocity.addScaledVector(this.accel, h);
      this.value.addScaledVector(this.velocity, h);
    }
    return this.value;
  }
}

/** Frame delta clamped so a background tab or a hitch never teleports anything. */
export const safeDelta = (delta: number) => Math.min(delta, 1 / 30);
