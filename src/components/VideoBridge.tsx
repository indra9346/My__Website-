import React, { useEffect, useRef, useState } from 'react';
import { useAI } from '../context/AIContext';

export default function VideoBridge() {
  const { aiModeState, setAiModeState } = useAI();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (aiModeState === 'video_forward') {
      setIsVisible(true);
      video.currentTime = 0;
      video.playbackRate = 1.35; // Snappier, high-tech transition

      const handlePlay = async () => {
        try {
          await video.play();
        } catch (err) {
          console.warn("Autoplay block or video load issue, bypassing video bridge:", err);
          setAiModeState('portal');
        }
      };

      handlePlay();

      const handleEnded = () => {
        setIsVisible(false);
        setTimeout(() => {
          setAiModeState('portal');
        }, 300); // Matches CSS opacity transition duration
      };

      video.addEventListener('ended', handleEnded);
      return () => {
        video.removeEventListener('ended', handleEnded);
      };
    }

    if (aiModeState === 'video_reverse') {
      setIsVisible(true);
      video.pause();

      const duration = video.duration || 15.0; // Dynamic fallback to estimated duration
      video.currentTime = duration;

      let lastTime = performance.now();
      let lastSeekTime = performance.now();

      const playReverseTick = (now: number) => {
        const elapsedSinceLastSeek = now - lastSeekTime;

        // Seek at 25 FPS (every 40ms) to give laptop GPU decoders breathing room
        if (elapsedSinceLastSeek >= 40) {
          const delta = (now - lastTime) / 1000;
          lastTime = now;
          lastSeekTime = now;

          const playbackSpeed = 1.6; // Slightly faster rewind
          const newTime = video.currentTime - (delta * playbackSpeed);

          if (newTime <= 0) {
            video.currentTime = 0;
            setIsVisible(false);
            setTimeout(() => {
              setAiModeState('inactive');
            }, 300);
            return;
          } else {
            video.currentTime = newTime;
          }
        }
        animFrameIdRef.current = requestAnimationFrame(playReverseTick);
      };

      const timer = setTimeout(() => {
        lastTime = performance.now();
        lastSeekTime = performance.now();
        animFrameIdRef.current = requestAnimationFrame(playReverseTick);
      }, 100);

      return () => {
        clearTimeout(timer);
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
        }
      };
    }
  }, [aiModeState, setAiModeState]);

  if (aiModeState !== 'video_forward' && aiModeState !== 'video_reverse') {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 w-screen h-screen z-[9999] bg-[#020617] flex items-center justify-center transition-opacity duration-300 pointer-events-auto ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <video
        ref={videoRef}
        src="/videos/android-eye.mp4"
        playsInline
        muted
        preload="auto"
        className="w-full h-full object-cover"
        style={{ filter: 'hue-rotate(-10deg) brightness(1.05)' }}
      />
    </div>
  );
}
