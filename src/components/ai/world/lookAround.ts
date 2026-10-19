// Looking around the AI world: drag (mouse or finger) or tilt the phone to turn
// the view across the city panorama. The scene eases the camera toward these
// targets with springs and brings it back to the robot after a few idle seconds.

export const look = {
  /** Wanted view turn, radians (positive = look left). */
  yaw: 0,
  /** Wanted view tilt, radians (positive = look up). */
  pitch: 0,
  /** Small offset from the phone's tilt, added on top. */
  tiltYaw: 0,
  tiltPitch: 0,
  /** performance.now() of the last drag. */
  lastInput: 0,
  /** True while a drag that moved is in progress or just ended (suppresses the click that follows). */
  dragged: false,
  maxYaw: 0.6,
  maxPitch: 0.12,
};

/** Wide screens see most of the panorama already, so they turn less. */
export function setLookLimits(compact: boolean) {
  look.maxYaw = compact ? 0.62 : 0.2;
  look.maxPitch = compact ? 0.1 : 0.06;
}

export function resetLook() {
  look.yaw = 0;
  look.pitch = 0;
  look.tiltYaw = 0;
  look.tiltPitch = 0;
  look.dragged = false;
}

const clamp = (v: number, a: number) => Math.max(-a, Math.min(a, v));

/**
 * Attaches drag-to-look to an element (the 3D canvas wrapper) and phone tilt.
 * Returns a cleanup function.
 */
export function attachLookAround(el: HTMLElement, fovRadians: () => number): () => void {
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startYaw = 0;
  let startPitch = 0;
  let moved = false;

  const onDown = (e: PointerEvent) => {
    if (pointerId !== null) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    startYaw = look.yaw;
    startPitch = look.pitch;
    moved = false;
    look.dragged = false;
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && Math.hypot(dx, dy) < 8) return;
    moved = true;
    look.dragged = true;
    // One screen width of drag turns the view by about the horizontal field of view.
    const perPixel = fovRadians() / Math.max(320, el.clientHeight);
    look.yaw = clamp(startYaw + dx * perPixel, look.maxYaw);
    look.pitch = clamp(startPitch + dy * perPixel * 0.6, look.maxPitch);
    look.lastInput = performance.now();
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    if (moved) {
      look.lastInput = performance.now();
      // Let the click that follows this pointerup see `dragged`, then clear it.
      window.setTimeout(() => (look.dragged = false), 60);
    }
  };

  let baseBeta: number | null = null;
  let baseGamma: number | null = null;
  const onTilt = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    if (baseBeta === null || baseGamma === null) {
      baseBeta = e.beta;
      baseGamma = e.gamma;
    }
    // Slowly follow how the phone is held, so only changes in tilt move the view.
    baseBeta += (e.beta - baseBeta) * 0.01;
    baseGamma += (e.gamma - baseGamma) * 0.01;
    look.tiltYaw = clamp(((baseGamma - e.gamma) * Math.PI) / 180 * 0.35, 0.12);
    look.tiltPitch = clamp(((e.beta - baseBeta) * Math.PI) / 180 * 0.2, 0.05);
  };

  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('deviceorientation', onTilt);
  return () => {
    el.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    window.removeEventListener('deviceorientation', onTilt);
    resetLook();
  };
}
