import React, { useEffect, useRef, useState } from 'react';
import { useAI } from '../context/AIContext';

export default function VideoBridge() {
  const { aiModeState, setAiModeState } = useAI();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (aiModeState === 'video_forward') {
      setIsVisible(true);
      video.currentTime = 0;
      video.playbackRate = 1.5; // Fast, snappy transition

      // Safety fallback timer so laptop/browser NEVER gets stuck on video bridge!
      const safetyTimer = setTimeout(() => {
        setIsVisible(false);
        setAiModeState('portal');
      }, 1800);

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay interrupted, bypassing to portal:", err);
          clearTimeout(safetyTimer);
          setIsVisible(false);
          setAiModeState('portal');
        });
      }

      const handleEnded = () => {
        clearTimeout(safetyTimer);
        setIsVisible(false);
        setAiModeState('portal');
      };

      video.addEventListener('ended', handleEnded);
      return () => {
        clearTimeout(safetyTimer);
        video.removeEventListener('ended', handleEnded);
      };
    }

    if (aiModeState === 'video_reverse') {
      // Instant exit without slow reverse frame seeking
      setIsVisible(false);
      const timer = setTimeout(() => {
        setAiModeState('inactive');
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [aiModeState, setAiModeState]);

  const isTransitionActive = aiModeState === 'video_forward' || aiModeState === 'video_reverse';

  return (
    <div
      className={`fixed inset-0 w-screen h-screen z-[9999] bg-[#020617] flex items-center justify-center transition-opacity duration-200 ${
        isTransitionActive && isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <video
        ref={videoRef}
        src="/videos/android-eye.mp4"
        playsInline
        muted
        preload="auto"
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
}
