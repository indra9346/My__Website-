import React, { useEffect, useRef, useState } from 'react';
import { useAI } from '../context/AIContext';

export default function VideoBridge() {
  const { aiModeState, setAiModeState } = useAI();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isZooming, setIsZooming] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (aiModeState === 'video_forward') {
      setIsVisible(true);
      setIsZooming(false);
      video.currentTime = 0;
      video.playbackRate = 1.75; // Play eye sequence at 1.75x speed

      // 5.2s safety timer allowing full eye opening & 3x zoom into pupil
      const safetyTimer = setTimeout(() => {
        setIsVisible(false);
        setAiModeState('portal');
      }, 5200);

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay interrupted, bypassing to portal:", err);
          clearTimeout(safetyTimer);
          setIsVisible(false);
          setAiModeState('portal');
        });
      }

      // Track playback time to trigger 3x Pupil Scale Zoom effect as camera enters the pupil
      const handleTimeUpdate = () => {
        if (video.duration && video.currentTime > video.duration * 0.65) {
          setIsZooming(true);
        }
      };

      const handleEnded = () => {
        clearTimeout(safetyTimer);
        setIsVisible(false);
        setAiModeState('portal');
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('ended', handleEnded);

      return () => {
        clearTimeout(safetyTimer);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleEnded);
      };
    }

    if (aiModeState === 'video_reverse') {
      setIsVisible(false);
      setIsZooming(false);
      const timer = setTimeout(() => {
        setAiModeState('inactive');
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [aiModeState, setAiModeState]);

  const isTransitionActive = aiModeState === 'video_forward' || aiModeState === 'video_reverse';

  return (
    <div
      className={`fixed inset-0 w-screen h-screen z-[9999] bg-[#020617] flex items-center justify-center overflow-hidden transition-opacity duration-300 ${
        isTransitionActive && isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <video
        ref={videoRef}
        src="/videos/android-eye.mp4"
        playsInline
        muted
        preload="auto"
        className={`w-full h-full object-cover object-center transition-transform ease-in-out ${
          isZooming ? 'scale-[3.8] brightness-125 contrast-125' : 'scale-100 brightness-100'
        }`}
        style={{ transitionDuration: '1200ms' }}
      />

      {/* Futuristic Flash Overlay as camera passes through the pupil core */}
      <div
        className={`absolute inset-0 bg-[#03e9f4] pointer-events-none transition-opacity duration-700 ${
          isZooming ? 'opacity-30' : 'opacity-0'
        }`}
      />
    </div>
  );
}
