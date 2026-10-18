import { forwardRef } from 'react';
import * as THREE from 'three';

let glowTexture: THREE.Texture | null = null;

/** Soft radial sprite used to fake bloom around lights (no post-processing needed). */
export function getGlowTexture(): THREE.Texture {
  if (glowTexture) return glowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.18, 'rgba(255,255,255,0.65)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.16)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

interface GlowProps {
  color?: string;
  size?: number;
  opacity?: number;
  position?: [number, number, number];
}

/** Additive glow sprite. Pass a ref to animate `material.opacity` / `scale`. */
const Glow = forwardRef<THREE.Sprite, GlowProps>(function Glow({ color = '#03e9f4', size = 0.5, opacity = 0.8, position }, ref) {
  return (
    <sprite ref={ref} position={position} scale={[size, size, 1]} renderOrder={10}>
      <spriteMaterial
        map={getGlowTexture()}
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
});

export default Glow;
