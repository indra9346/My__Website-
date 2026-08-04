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
      video.playbackRate = 1.35; // Snappier, cinematic transition speed

      const startPlayback = () => {
        video.play().catch((err) => {
          console.warn("Autoplay block or video load issue, bypassing video bridge:", err);
          setAiModeState('portal');
        });
      };

      // Only start showing/playing once the video has pre-buffered enough data
      if (video.readyState >= 3) {
        startPlayback();
      } else {
        const handleCanPlay = () => {
          startPlayback();
          video.removeEventListener('canplaythrough', handleCanPlay);
        };
        video.addEventListener('canplaythrough', handleCanPlay);
      }

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

      const duration = video.duration || 15.0; // Fallback to estimated duration
      video.currentTime = duration;

      const startReverseTicks = () => {
        let lastTime = performance.now();
        let lastSeekTime = performance.now();

        const playReverseTick = (now: number) => {
          const elapsedSinceLastSeek = now - lastSeekTime;

          // Seek at 25 FPS (every 40ms) to give laptop GPU decoders breathing room
          if (elapsedSinceLastSeek >= 40) {
            const delta = (now - lastTime) / 1000;
            lastTime = now;
            lastSeekTime = now;

            const playbackSpeed = 1.5; // Smooth rewind rate
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

        animFrameIdRef.current = requestAnimationFrame(playReverseTick);
      };

      // Wait for seek operation to complete before initiating requestAnimationFrame seeks
      const handleSeeked = () => {
        startReverseTicks();
        video.removeEventListener('seeked', handleSeeked);
      };

      if (video.seeking) {
        video.addEventListener('seeked', handleSeeked);
      } else {
        startReverseTicks();
      }

      return () => {
        video.removeEventListener('seeked', handleSeeked);
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
        }
      };
    }
  }, [aiModeState, setAiModeState]);

  // Keep the component mounted in DOM to retain preloaded buffer, use opacity/pointer-events to toggle
  const isTransitionActive = aiModeState === 'video_forward' || aiModeState === 'video_reverse';

  return (
    <div
      className={`fixed inset-0 w-screen h-screen z-[9999] bg-[#020617] flex items-center justify-center transition-opacity duration-300 ${
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
        style={{ filter: 'hue-rotate(-10deg) brightness(1.05)' }}
      />
    </div>
  );
}
