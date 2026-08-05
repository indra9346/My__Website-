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
      video.playbackRate = 1.6; // Optimized speed for desktop & mobile GPUs

      // Trigger pupil plunge zoom earlier at 2.4s so laptop users feel the dive into the eye pupil
      const zoomTimer = setTimeout(() => {
        setIsZooming(true);
      }, 2400);

      // Safety transition timer to 3D portal
      const safetyTimer = setTimeout(() => {
        setIsVisible(false);
        setAiModeState('portal');
      }, 4800);

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay interrupted, bypassing to portal:", err);
          clearTimeout(zoomTimer);
          clearTimeout(safetyTimer);
          setIsVisible(false);
          setAiModeState('portal');
        });
      }

      const handleEnded = () => {
        clearTimeout(zoomTimer);
        clearTimeout(safetyTimer);
        setIsVisible(false);
        setAiModeState('portal');
      };

      video.addEventListener('ended', handleEnded);

      return () => {
        clearTimeout(zoomTimer);
        clearTimeout(safetyTimer);
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
      {/* Eye Video with 5.5x Desktop Pupil Dive Zoom */}
      <video
        ref={videoRef}
        src="/videos/android-eye.mp4"
        playsInline
        muted
        preload="auto"
        className={`w-full h-full object-cover object-center transition-all ease-in-out ${
          isZooming ? 'scale-[4.2] sm:scale-[5.8] brightness-135 contrast-125' : 'scale-100 brightness-100'
        }`}
        style={{ transformOrigin: '50% 50%', transitionDuration: '1400ms' }}
      />

      {/* Iris Tunnel Contracting Radial Vignette for Desktop Immersive Plunge */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${
          isZooming 
            ? 'bg-[radial-gradient(circle_at_center,_transparent_10%,_#020617_75%)] opacity-90' 
            : 'opacity-0'
        }`}
      />

      {/* Futuristic Energy Flash as user passes through the pupil */}
      <div
        className={`absolute inset-0 bg-[#03e9f4] pointer-events-none transition-opacity duration-700 ${
          isZooming ? 'opacity-40' : 'opacity-0'
        }`}
      />
    </div>
  );
}
