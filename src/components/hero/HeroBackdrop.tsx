import { useEffect, useRef, useState } from 'react';
import { useAI } from '../../context/AIContext';

// The film behind the hero. A still picture of its first frame is on screen from
// the start; the film itself is fetched only after the page has finished loading,
// fades in once it is playing, and pauses whenever it cannot be seen (scrolled
// away, tab in the background, AI mode open). Visitors who ask for reduced motion
// or data saving keep the still picture.
const FILM = { wide: '/media/hero-bg-720.mp4', tall: '/media/hero-bg-portrait.mp4' };
const STILL = { wide: '/media/hero-bg-poster.jpg', tall: '/media/hero-bg-portrait-poster.jpg' };
const TALL_SCREEN = '(max-width: 640px)';

const HeroBackdrop = () => {
  const { aiModeState } = useAI();
  const holderRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const state = useRef({ loaded: false, inView: true, pageVisible: true, aiIdle: true });
  const syncRef = useRef<() => void>(() => {});

  useEffect(() => {
    const video = videoRef.current;
    const holder = holderRef.current;
    if (!video || !holder) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (reducedMotion || saveData) return undefined;

    const s = state.current;
    const sync = () => {
      if (!s.loaded) return;
      if (s.inView && s.pageVisible && s.aiIdle) video.play().catch(() => {});
      else video.pause();
    };
    syncRef.current = sync;

    let idleId = 0;
    let timerId = 0;
    const start = () => {
      video.src = window.matchMedia(TALL_SCREEN).matches ? FILM.tall : FILM.wide;
      video.load();
      s.loaded = true;
      sync();
    };
    const whenIdle = () => {
      if (typeof window.requestIdleCallback === 'function') idleId = window.requestIdleCallback(start, { timeout: 1500 });
      else timerId = window.setTimeout(start, 400);
    };
    if (document.readyState === 'complete') whenIdle();
    else window.addEventListener('load', whenIdle, { once: true });

    const observer = new IntersectionObserver(
      ([entry]) => {
        s.inView = entry.isIntersecting;
        sync();
      },
      { threshold: 0.02 },
    );
    observer.observe(holder);

    const onVisibility = () => {
      s.pageVisible = !document.hidden;
      sync();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('load', whenIdle);
      if (idleId && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      window.clearTimeout(timerId);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      video.pause();
    };
  }, []);

  useEffect(() => {
    state.current.aiIdle = aiModeState === 'inactive';
    syncRef.current();
  }, [aiModeState]);

  return (
    <div ref={holderRef} className="hero-backdrop" aria-hidden="true">
      <picture>
        <source media={TALL_SCREEN} srcSet={STILL.tall} />
        <img src={STILL.wide} alt="" decoding="async" onError={(event) => (event.currentTarget.style.display = 'none')} />
      </picture>
      <video
        ref={videoRef}
        className="hero-film"
        data-playing={playing}
        muted
        loop
        playsInline
        preload="none"
        tabIndex={-1}
        onPlaying={() => setPlaying(true)}
        onError={() => setPlaying(false)}
      />
      <div className="hero-scrim" />
    </div>
  );
};

export default HeroBackdrop;
