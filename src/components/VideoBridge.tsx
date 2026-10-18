import { useEffect, useRef, useState } from 'react';
import { useAI } from '../context/AIContext';

// Compressed copies of the original eye video (public/videos/android-eye.mp4, 15 MB).
const INTRO_VIDEO = {
  hd: '/media/eye-1080.mp4', // 5.3 MB
  sd: '/media/eye-720.mp4', // 2.2 MB, phones and slow connections
  poster: '/media/eye-poster.jpg',
};

function pickIntroSource(): string {
  const small = window.matchMedia?.('(max-width: 767px)').matches === true;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const slow = Boolean(connection?.saveData) || /(^|-)(2g|3g)$/.test(connection?.effectiveType ?? '');
  return small || slow ? INTRO_VIDEO.sd : INTRO_VIDEO.hd;
}

function loadSource(video: HTMLVideoElement) {
  if (video.getAttribute('src')) return;
  video.preload = 'auto';
  video.src = pickIntroSource();
  video.defaultPlaybackRate = 1.45;
  video.load();
}

export default function VideoBridge() {
  const { aiModeState, setAiModeState } = useAI();
  const videoRef = useRef<HTMLVideoElement>(null);
  const finishRef = useRef<() => void>(() => undefined);
  const [isVisible, setIsVisible] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  // Fetch the intro only once AI mode starts (it buffers during the boot
  // screen), and drop it again on exit so it never downloads for visitors who
  // don't use AI mode.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (aiModeState === 'activating') {
      loadSource(video);
    } else if (aiModeState === 'inactive') {
      setIsVisible(false);
      setIsZooming(false);
      setIsFlashing(false);
      if (video.getAttribute('src')) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    }
  }, [aiModeState]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || aiModeState !== 'video_forward') return;

    let finished = false;
    loadSource(video);
    setIsVisible(true);
    setIsZooming(false);
    setIsFlashing(false);
    try {
      video.currentTime = 0;
    } catch {
      // not seekable yet; it starts at 0 anyway
    }
    video.playbackRate = 1.45; // Smooth cinematic playback for laptops & phones

    const timers: number[] = [];
    const finish = () => {
      if (finished) return;
      finished = true;
      timers.forEach((t) => window.clearTimeout(t));
      video.pause();
      setIsVisible(false);
      setAiModeState('portal');
    };
    finishRef.current = finish;

    // Phase 1: lock onto the pupil and start the plunge zoom
    timers.push(window.setTimeout(() => setIsZooming(true), 1800));
    // Phase 2: bright flash as the camera passes through the pupil core
    timers.push(window.setTimeout(() => setIsFlashing(true), 3400));
    // Phase 3: hand over to the 3D warp tunnel
    timers.push(window.setTimeout(finish, 4200));

    video.addEventListener('ended', finish);
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Intro video could not play, continuing to the portal:', err);
        finish();
      });
    }

    return () => {
      finished = true;
      timers.forEach((t) => window.clearTimeout(t));
      video.removeEventListener('ended', finish);
      video.pause();
      finishRef.current = () => undefined;
    };
  }, [aiModeState, setAiModeState]);

  const isTransitionActive = aiModeState === 'video_forward';

  return (
    <div
      aria-hidden={!isTransitionActive}
      className={`fixed inset-0 w-screen h-screen z-[9999] bg-[#020617] flex items-center justify-center overflow-hidden transition-opacity duration-300 ${
        isTransitionActive && isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Eye video with the 7.5x widescreen pupil plunge zoom */}
      <video
        ref={videoRef}
        playsInline
        muted
        preload="none"
        poster={INTRO_VIDEO.poster}
        className={`w-full h-full object-cover object-center transition-all ease-in-out ${
          isZooming ? 'scale-[4.5] sm:scale-[7.5] brightness-150 contrast-135 blur-[0.5px]' : 'scale-100 brightness-100'
        }`}
        style={{ transformOrigin: '50% 48%', transitionDuration: '1600ms' }}
      />

      {/* Pulsing pupil lock reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`w-32 h-32 rounded-full border-2 border-[#03e9f4] transition-all duration-1000 ${
            isZooming ? 'scale-[15] opacity-0 border-white' : 'scale-100 opacity-60 animate-ping'
          }`}
        />
      </div>

      {/* Iris tunnel: contracting radial vignette for widescreen depth */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${
          isZooming
            ? 'bg-[radial-gradient(circle_at_center,_transparent_5%,_#020617_60%)] opacity-95'
            : 'opacity-0'
        }`}
      />

      {/* Cyan / white flash as the camera passes into the pupil */}
      <div
        className={`absolute inset-0 bg-gradient-to-r from-[#03e9f4] via-white to-[#03e9f4] pointer-events-none transition-opacity duration-500 ${
          isFlashing ? 'opacity-85' : 'opacity-0'
        }`}
      />

      {isTransitionActive && (
        <button
          type="button"
          onClick={() => finishRef.current()}
          className="absolute bottom-5 right-5 z-10 font-mono text-[10px] sm:text-xs tracking-wider uppercase text-white/70 hover:text-neon-cyan border border-white/15 hover:border-neon-cyan/60 bg-black/40 px-3 py-1.5 rounded-md transition-colors"
        >
          Skip intro
        </button>
      )}
    </div>
  );
}
