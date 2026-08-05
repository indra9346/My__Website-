import React, { useEffect, useRef, useState } from 'react';
import { useAI } from '../context/AIContext';

export default function VideoBridge() {
  const { aiModeState, setAiModeState } = useAI();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (aiModeState === 'video_forward') {
      setIsVisible(true);
      setIsZooming(false);
      setIsFlashing(false);
      video.currentTime = 0;
      video.playbackRate = 1.45; // Smooth cinematic playback for laptops & phones

      // Phase 1: Lock onto pupil & initiate hyper-speed 7.5x scale zoom
      const zoomTimer = setTimeout(() => {
        setIsZooming(true);
      }, 1800);

      // Phase 2: Bright energy whiteout flash as camera passes through the pupil core
      const flashTimer = setTimeout(() => {
        setIsFlashing(true);
      }, 3400);

      // Phase 3: Transition smoothly into 3D space warp tunnel
      const safetyTimer = setTimeout(() => {
        setIsVisible(false);
        setAiModeState('portal');
      }, 4200);

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay interrupted, bypassing to portal:", err);
          clearTimeout(zoomTimer);
          clearTimeout(flashTimer);
          clearTimeout(safetyTimer);
          setIsVisible(false);
          setAiModeState('portal');
        });
      }

      const handleEnded = () => {
        clearTimeout(zoomTimer);
        clearTimeout(flashTimer);
        clearTimeout(safetyTimer);
        setIsVisible(false);
        setAiModeState('portal');
      };

      video.addEventListener('ended', handleEnded);

      return () => {
        clearTimeout(zoomTimer);
        clearTimeout(flashTimer);
        clearTimeout(safetyTimer);
        video.removeEventListener('ended', handleEnded);
      };
    }

    if (aiModeState === 'video_reverse') {
      setIsVisible(false);
      setIsZooming(false);
      setIsFlashing(false);
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
      {/* Eye Video with 7.5x Widescreen Pupil Plunge Zoom */}
      <video
        ref={videoRef}
        src="/videos/android-eye.mp4"
        playsInline
        muted
        preload="auto"
        className={`w-full h-full object-cover object-center transition-all ease-in-out ${
          isZooming ? 'scale-[4.5] sm:scale-[7.5] brightness-150 contrast-135 blur-[0.5px]' : 'scale-100 brightness-100'
        }`}
        style={{ transformOrigin: '50% 48%', transitionDuration: '1600ms' }}
      />

      {/* Pulsing Cybernetic Pupil Lock Reticle Target */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`w-32 h-32 rounded-full border-2 border-[#03e9f4] transition-all duration-1000 ${
            isZooming ? 'scale-[15] opacity-0 border-white' : 'scale-100 opacity-60 animate-ping'
          }`}
        />
      </div>

      {/* Iris Tunnel Contracting Radial Vignette for Widescreen Laptop Depth */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${
          isZooming 
            ? 'bg-[radial-gradient(circle_at_center,_transparent_5%,_#020617_60%)] opacity-95' 
            : 'opacity-0'
        }`}
      />

      {/* Bright Cyan / White Energy Whiteout Flash as camera passes into the pupil */}
      <div
        className={`absolute inset-0 bg-gradient-to-r from-[#03e9f4] via-white to-[#03e9f4] pointer-events-none transition-opacity duration-500 ${
          isFlashing ? 'opacity-85' : 'opacity-0'
        }`}
      />
    </div>
  );
}
