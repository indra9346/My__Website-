import { useEffect, useRef, useState } from 'react';
import { useAI } from '../context/AIContext';
import { INTRO_VIDEO, preloadIntro, registerIntroVideo, releaseIntro } from './ai/introVideo';
import { EYE_TIMELINE, PUPIL_TRACK, coverBox, toScreen } from './ai/eyeTrack';
import './ai/ai-mode.css';

type Phase = 'hidden' | 'playing' | 'exiting';

const RETICLE_BOX = 100; // px, the reticle SVG is drawn in a 100x100 box (circle radius 42)
const EXIT_FADE_MS = 650;

/** Fraction of the clip for a clip time (all intro animations are timed in the original clip's time). */
const at = (clipTime: number) => Math.min(1, Math.max(0, clipTime / EYE_TIMELINE.end));
const SPEED = INTRO_VIDEO.clipSpeed; // clip seconds per video second

/**
 * The eye intro. Plays the clip's own camera move (eye opens, push into the
 * pupil, light burst, energy tunnel, white flash) and layers effects that are
 * locked to the video frames: a reticle that tracks the measured pupil, a
 * bloom on the burst, a gentle push and the white hand-over into the warp.
 */
export default function VideoBridge() {
  const { aiModeState, setAiModeState } = useAI();
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pushRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const bloomRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const whiteRef = useRef<HTMLDivElement>(null);
  const fadeInRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef<(skipped?: boolean) => void>(() => undefined);
  const [phase, setPhase] = useState<Phase>('hidden');

  useEffect(() => {
    registerIntroVideo(videoRef.current);
    return () => registerIntroVideo(null);
  }, []);

  // Drop the download whenever AI mode closes.
  useEffect(() => {
    if (aiModeState === 'inactive') {
      setPhase('hidden');
      releaseIntro();
    }
  }, [aiModeState]);

  // After handing over to the warp, fade the white frame out, then hide the layer.
  useEffect(() => {
    if (phase === 'hidden') {
      if (whiteRef.current) whiteRef.current.style.opacity = '0';
      return;
    }
    if (phase !== 'exiting') return;
    const timer = window.setTimeout(() => setPhase('hidden'), EXIT_FADE_MS + 50);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (aiModeState !== 'video_forward') return;
    const video = videoRef.current;
    const root = rootRef.current;
    const push = pushRef.current;
    const reticle = reticleRef.current;
    const label = labelRef.current;
    const bloom = bloomRef.current;
    const vignette = vignetteRef.current;
    const white = whiteRef.current;
    const fadeIn = fadeInRef.current;
    if (!video || !root || !push || !reticle || !label || !bloom || !vignette || !white || !fadeIn) return;

    preloadIntro();
    setPhase('playing');

    const rect = root.getBoundingClientRect();
    const box = coverBox(rect.width || window.innerWidth, rect.height || window.innerHeight);
    const duration = EYE_TIMELINE.end * 1000; // animations run in clip milliseconds
    const animations: Animation[] = [];
    const add = (el: HTMLElement, frames: Keyframe[]) => {
      const animation = el.animate(frames, { duration, fill: 'both' });
      animation.pause();
      animation.playbackRate = SPEED;
      animations.push(animation);
    };

    // Gentle push centred on the pupil, adding to the clip's own camera move.
    const pupil = toScreen(box, 0.485, 0.472);
    push.style.transformOrigin = `${pupil.x}px ${pupil.y}px`;
    add(push, [
      { transform: 'scale(1)', offset: 0, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
      { transform: 'scale(1.035)', offset: at(EYE_TIMELINE.lockOn), easing: 'cubic-bezier(0.55, 0, 0.8, 0.4)' },
      { transform: 'scale(1.15)', offset: at(EYE_TIMELINE.burst), easing: 'cubic-bezier(0.5, 0, 0.9, 0.5)' },
      { transform: 'scale(1.26)', offset: 1 },
    ]);

    // Reticle: scans while the eye opens, locks onto the measured pupil, tracks it, then breaks apart in the burst.
    const radiusToScale = (r: number) => (r * 1080 * box.scale * 1.12) / 42;
    const place = (fx: number, fy: number, scale: number) => {
      const p = toScreen(box, fx, fy);
      return `translate(${p.x - RETICLE_BOX / 2}px, ${p.y - RETICLE_BOX / 2}px) scale(${scale})`;
    };
    const first = PUPIL_TRACK[0];
    const last = PUPIL_TRACK[PUPIL_TRACK.length - 1];
    const lockScale = radiusToScale(first[3]);
    const reticleFrames: Keyframe[] = [
      { offset: 0, opacity: 0, transform: place(0.43, 0.44, lockScale * 1.6) },
      { offset: at(0.8), opacity: 0, transform: place(0.43, 0.44, lockScale * 1.6) },
      { offset: at(1.4), opacity: 0.4, transform: place(0.46, 0.45, lockScale * 1.55) },
      { offset: at(2.3), opacity: 0.4, transform: place(0.52, 0.5, lockScale * 1.5) },
      { offset: at(2.85), opacity: 0.55, transform: place(first[1], first[2], lockScale * 1.45), easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' },
      ...PUPIL_TRACK.map(([t, fx, fy, r], i) => ({
        offset: at(t + (i === 0 ? 0.25 : 0)),
        opacity: 1,
        transform: place(fx, fy, radiusToScale(r)),
      })),
      { offset: at(EYE_TIMELINE.burst + 0.15), opacity: 0, transform: place(last[1], last[2], radiusToScale(last[3]) * 1.5) },
      { offset: 1, opacity: 0, transform: place(last[1], last[2], radiusToScale(last[3]) * 1.5) },
    ];
    // Keyframe offsets must never go backwards.
    let previous = 0;
    for (const frame of reticleFrames) {
      frame.offset = Math.max(previous, frame.offset as number);
      previous = frame.offset as number;
    }
    add(reticle, reticleFrames);

    const labelAt = (t: number, fx: number, fy: number, r: number) => {
      const p = toScreen(box, fx, fy);
      const radius = r * 1080 * box.scale * 1.12;
      return `translate(${p.x + radius * 0.72}px, ${p.y - radius * 0.86}px)`;
    };
    add(label, [
      { offset: 0, opacity: 0, transform: labelAt(0, first[1], first[2], first[3]) },
      { offset: at(EYE_TIMELINE.lockOn + 0.2), opacity: 0, transform: labelAt(0, first[1], first[2], first[3]) },
      { offset: at(EYE_TIMELINE.lockOn + 0.35), opacity: 1, transform: labelAt(0, PUPIL_TRACK[3][1], PUPIL_TRACK[3][2], PUPIL_TRACK[3][3]) },
      { offset: at(5.2), opacity: 1, transform: labelAt(0, PUPIL_TRACK[22][1], PUPIL_TRACK[22][2], PUPIL_TRACK[22][3]) },
      { offset: at(5.6), opacity: 0, transform: labelAt(0, PUPIL_TRACK[26][1], PUPIL_TRACK[26][2], PUPIL_TRACK[26][3]) },
      { offset: 1, opacity: 0, transform: labelAt(0, last[1], last[2], last[3]) },
    ]);

    // Light bloom synced to the burst inside the pupil.
    const burstPoint = toScreen(box, last[1], last[2]);
    bloom.style.transformOrigin = `${burstPoint.x}px ${burstPoint.y}px`;
    bloom.style.background = `radial-gradient(circle at ${burstPoint.x}px ${burstPoint.y}px, rgba(255,255,255,0.95) 0%, rgba(120,240,255,0.55) 14%, rgba(3,233,244,0.18) 34%, transparent 60%)`;
    add(bloom, [
      { offset: 0, opacity: 0, transform: 'scale(0.6)' },
      { offset: at(5.85), opacity: 0, transform: 'scale(0.6)', easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)' },
      { offset: at(EYE_TIMELINE.burst), opacity: 0.7, transform: 'scale(1.15)', easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)' },
      { offset: at(6.55), opacity: 0.18, transform: 'scale(1.5)' },
      { offset: at(6.9), opacity: 0, transform: 'scale(1.7)' },
      { offset: 1, opacity: 0, transform: 'scale(1.7)' },
    ]);

    // Iris vignette draws the eye in during the approach, then lifts for the tunnel.
    add(vignette, [
      { offset: 0, opacity: 0 },
      { offset: at(EYE_TIMELINE.lockOn), opacity: 0.15 },
      { offset: at(6.0), opacity: 0.6 },
      { offset: at(6.3), opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);

    // White hand-over into the 3D warp.
    add(white, [
      { offset: 0, opacity: 0 },
      { offset: at(EYE_TIMELINE.whiteStart), opacity: 0, easing: 'cubic-bezier(0.6, 0, 0.9, 0.5)' },
      { offset: 1, opacity: 1 },
    ]);

    // Fade in from black over the first moments.
    add(fadeIn, [
      { offset: 0, opacity: 1 },
      { offset: at(0.55), opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);

    let finished = false;
    let started = false;
    let playStartedAt = 0;
    let stallCount = 0;
    let stallBegan = 0;
    let stalledMs = 0;
    let frameRequest = 0;
    let stallTimer = 0;
    let fallbackTimer = 0;
    const timers: number[] = [];

    const sync = (mediaTime: number) => {
      const target = mediaTime * SPEED * 1000;
      for (const animation of animations) {
        const current = Number(animation.currentTime ?? 0);
        if (Math.abs(current - target) > 70) animation.currentTime = target;
        if (animation.playState !== 'running') animation.play();
      }
    };

    const finish = (skipped = false) => {
      if (finished) return;
      finished = true;
      window.cancelAnimationFrame(frameRequest);
      window.clearTimeout(stallTimer);
      window.clearTimeout(fallbackTimer);
      timers.forEach((t) => window.clearTimeout(t));
      const handOver = () => {
        animations.forEach((a) => a.pause());
        white.style.opacity = '1';
        video.pause();
        setPhase('exiting');
        setAiModeState('portal');
      };
      if (skipped) {
        // Flash to white quickly before handing over, so a skip never cuts hard.
        white.animate([{ opacity: Number(getComputedStyle(white).opacity) || 0 }, { opacity: 1 }], { duration: 160, fill: 'forwards' });
        timers.push(window.setTimeout(handOver, 170));
      } else {
        handOver();
      }
    };
    finishRef.current = finish;

    // Track the video frame by frame (requestVideoFrameCallback where available).
    type FrameVideo = HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
      cancelVideoFrameCallback?: (id: number) => void;
    };
    const frameVideo = video as FrameVideo;
    const onFrame = (mediaTime: number) => {
      if (finished) return;
      if (!started) {
        started = true;
        playStartedAt = performance.now();
        // Safety net: never wait more than the clip length plus a little.
        fallbackTimer = window.setTimeout(() => finish(), (EYE_TIMELINE.end / SPEED + 2.5) * 1000);
      }
      if (mediaTime * SPEED >= EYE_TIMELINE.end) {
        finish();
        return;
      }
      sync(mediaTime);
    };
    const loop = () => {
      if (finished) return;
      if (frameVideo.requestVideoFrameCallback) {
        frameRequest = frameVideo.requestVideoFrameCallback((_now, meta) => {
          onFrame(meta.mediaTime);
          loop();
        });
      } else {
        frameRequest = window.requestAnimationFrame(() => {
          if (!video.paused) onFrame(video.currentTime);
          loop();
        });
      }
    };

    const onWaiting = () => {
      animations.forEach((a) => a.pause());
      window.clearTimeout(stallTimer);
      // The first moments of decoding are allowed a hiccup; after that, repeated
      // stalls mean this device is struggling: flash straight into the warp
      // rather than show a stuttering video.
      if (started && performance.now() - playStartedAt > 400) {
        stallCount += 1;
        stallBegan = performance.now();
        if (stallCount >= 3 || stalledMs > 900) {
          finish(true);
          return;
        }
      }
      stallTimer = window.setTimeout(() => finish(true), 1200);
    };
    const onPlaying = () => {
      window.clearTimeout(stallTimer);
      if (stallBegan) {
        stalledMs += performance.now() - stallBegan;
        stallBegan = 0;
      }
      sync(video.currentTime);
    };
    const onEnded = () => finish();
    const onError = () => finish(true);

    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    try {
      video.currentTime = 0;
    } catch {
      // not seekable yet; it starts at 0 anyway
    }
    video.defaultPlaybackRate = INTRO_VIDEO.playbackRate;
    video.playbackRate = INTRO_VIDEO.playbackRate; // 1: the speed-up is baked into the file
    loop();
    const playPromise = video.play();
    playPromise?.catch((err) => {
      console.warn('Intro video could not play, continuing to the portal:', err);
      finish(true);
    });
    // If no frame ever arrives (blocked autoplay, broken file), don't wait.
    timers.push(window.setTimeout(() => { if (!started) finish(true); }, 2500));

    return () => {
      finished = true;
      if (frameVideo.cancelVideoFrameCallback) frameVideo.cancelVideoFrameCallback(frameRequest);
      window.cancelAnimationFrame(frameRequest);
      window.clearTimeout(stallTimer);
      window.clearTimeout(fallbackTimer);
      timers.forEach((t) => window.clearTimeout(t));
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      animations.forEach((a) => a.cancel());
      video.pause();
      finishRef.current = () => undefined;
    };
  }, [aiModeState, setAiModeState]);

  const visible = phase !== 'hidden';

  return (
    <div
      ref={rootRef}
      aria-hidden={phase !== 'playing'}
      className={`fixed inset-0 z-[9999] bg-[#020617] overflow-hidden ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{
        opacity: phase === 'playing' ? 1 : 0,
        visibility: visible ? 'visible' : 'hidden',
        transition: phase === 'exiting' ? `opacity ${EXIT_FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'opacity 280ms ease-out',
      }}
    >
      <div ref={pushRef} className="absolute inset-0 will-change-transform">
        <video
          ref={videoRef}
          playsInline
          muted
          preload="none"
          poster={INTRO_VIDEO.poster}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Lock-on reticle (moves with the push, so it stays on the pupil) */}
        <div ref={reticleRef} className="absolute left-0 top-0 pointer-events-none will-change-transform" style={{ width: RETICLE_BOX, height: RETICLE_BOX, opacity: 0 }}>
          {/* Rotating rings are plain layers rotated by the compositor (no per-frame SVG repaints). */}
          <div className="absolute inset-0 ai-spin-layer">
            <svg viewBox="0 0 100 100" width={RETICLE_BOX} height={RETICLE_BOX} className="overflow-visible">
              <circle cx="50" cy="50" r="47" fill="none" stroke="#03e9f4" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="6 10" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div className="absolute inset-0 ai-spin-layer-reverse">
            <svg viewBox="0 0 100 100" width={RETICLE_BOX} height={RETICLE_BOX} className="overflow-visible">
              <path d="M50 3 A47 47 0 0 1 83 17" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
              <path d="M50 97 A47 47 0 0 1 17 83" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <svg viewBox="0 0 100 100" width={RETICLE_BOX} height={RETICLE_BOX} className="relative overflow-visible">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#03e9f4" strokeOpacity="0.9" strokeWidth="0.9" vectorEffect="non-scaling-stroke" />
            {[0, 90, 180, 270].map((angle) => (
              <line
                key={angle}
                x1="50"
                y1="0"
                x2="50"
                y2="9"
                stroke="#03e9f4"
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
                transform={`rotate(${angle} 50 50)`}
              />
            ))}
            <circle cx="50" cy="50" r="1.4" fill="#ffffff" />
          </svg>
        </div>

        <div
          ref={labelRef}
          className="absolute left-0 top-0 pointer-events-none whitespace-nowrap font-mono text-[10px] sm:text-xs tracking-[0.2em] text-[#03e9f4] will-change-transform"
          style={{ opacity: 0, textShadow: '0 0 8px rgba(3,233,244,0.6)' }}
        >
          <span className="border-l border-[#03e9f4]/70 pl-2">PUPIL LOCK · TRACKING</span>
        </div>
      </div>

      {/* Iris vignette, burst bloom, white hand-over and fade-in (opacity-only layers) */}
      <div
        ref={vignetteRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0, background: 'radial-gradient(circle at 50% 48%, transparent 28%, rgba(2,6,23,0.85) 78%)' }}
      />
      <div ref={bloomRef} className="absolute inset-0 pointer-events-none will-change-transform" style={{ opacity: 0 }} />
      <div ref={whiteRef} className="absolute inset-0 pointer-events-none bg-white" style={{ opacity: 0 }} />
      <div ref={fadeInRef} className="absolute inset-0 pointer-events-none bg-[#020617]" style={{ opacity: phase === 'playing' ? 1 : 0 }} />

      {phase === 'playing' && aiModeState === 'video_forward' && (
        <button
          type="button"
          onClick={() => finishRef.current(true)}
          className="absolute bottom-5 right-5 z-10 font-mono text-[10px] sm:text-xs tracking-wider uppercase text-white/70 hover:text-neon-cyan border border-white/15 hover:border-neon-cyan/60 bg-black/40 px-3 py-1.5 rounded-md transition-colors"
        >
          Skip intro
        </button>
      )}
    </div>
  );
}
