import { useEffect, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

/** The looping city video, set by the portal; the backdrop streams it as a texture. */
export const worldVideo: { element: HTMLVideoElement | null } = { element: null };

const RADIUS = 60;
const ARC = 2.4; // radians of panorama (about 137°): wide enough to look around on a phone
const HEIGHT = RADIUS * ARC * (9 / 16); // keeps the 16:9 video undistorted along the curve

/**
 * The city video wrapped on a huge curved screen around the camera, so the
 * world reaches past the edges of the phone and can be looked around. It
 * starts on the poster image (compiled while the boot screen runs) and swaps
 * to the live video once it plays.
 */
export default function WorldBackdrop({ center }: { center: [number, number, number] }) {
  const poster = useLoader(THREE.TextureLoader, '/media/ai-world-poster.jpg');
  const geometry = useMemo(() => {
    // Open cylinder seen from inside, centred on the camera's resting point.
    const g = new THREE.CylinderGeometry(RADIUS, RADIUS, HEIGHT, 96, 1, true, Math.PI - ARC / 2, ARC);
    g.scale(-1, 1, 1); // face inwards and keep the picture the right way round
    return g;
  }, []);
  const material = useMemo(() => {
    poster.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: poster, fog: false, depthWrite: false, color: new THREE.Color(0.86, 0.9, 0.96) });
  }, [poster]);

  // Swap to the video as soon as it has frames.
  const video = useMemo(() => ({ texture: null as THREE.VideoTexture | null }), []);
  useFrame(() => {
    const el = worldVideo.element;
    if (video.texture && video.texture.image !== el) {
      // AI mode was left and entered again with a new video element.
      material.map = poster;
      video.texture.dispose();
      video.texture = null;
    }
    if (!el) return;
    if (!video.texture && el.readyState >= 2) {
      const texture = new THREE.VideoTexture(el);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      video.texture = texture;
      material.map = texture;
      material.needsUpdate = false; // same shader: only the texture changes
    }
  });

  useEffect(
    () => () => {
      video.texture?.dispose();
      geometry.dispose();
      material.dispose();
    },
    [geometry, material, video],
  );

  return <mesh geometry={geometry} material={material} position={center} renderOrder={-10} frustumCulled={false} />;
}
