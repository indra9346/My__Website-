import { useEffect, useRef, useState } from 'react';

const CustomCursor = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const echo1Ref = useRef<HTMLDivElement>(null);
  const echo2Ref = useRef<HTMLDivElement>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [isInside, setIsInside] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const mouse = useRef({ x: -100, y: -100 });
  const dot = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });
  const echo1 = useRef({ x: -100, y: -100 });
  const echo2 = useRef({ x: -100, y: -100 });
  const angle = useRef(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    setIsVisible(true);

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      setIsInside(true);
    };

    const onLeave = () => {
      setIsInside(false);
    };

    const onEnter = () => {
      setIsInside(true);
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('a, button, [role="button"], input, textarea, select, .cursor-hover')) {
        setIsHovering(true);
      }
    };
    const onOut = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('a, button, [role="button"], input, textarea, select, .cursor-hover')) {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);

    const animate = () => {
      // Linear interpolation (lerp) values for lagging effects
      dot.current.x += (mouse.current.x - dot.current.x) * 0.35;
      dot.current.y += (mouse.current.y - dot.current.y) * 0.35;

      ring.current.x += (mouse.current.x - ring.current.x) * 0.12;
      ring.current.y += (mouse.current.y - ring.current.y) * 0.12;

      echo1.current.x += (mouse.current.x - echo1.current.x) * 0.22;
      echo1.current.y += (mouse.current.y - echo1.current.y) * 0.22;

      echo2.current.x += (mouse.current.x - echo2.current.x) * 0.15;
      echo2.current.y += (mouse.current.y - echo2.current.y) * 0.15;

      // Spin HUD ring (faster on hover)
      angle.current += isHovering ? 4.0 : 0.8;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dot.current.x - 4}px, ${dot.current.y - 4}px)`;
      }

      if (ringRef.current) {
        // Adjust center depending on hovering size (hover is 50px, normal is 40px)
        const offset = isHovering ? 25 : 20;
        ringRef.current.style.transform = `translate(${ring.current.x - offset}px, ${ring.current.y - offset}px) rotate(${angle.current}deg)`;
      }

      if (echo1Ref.current) {
        echo1Ref.current.style.transform = `translate(${echo1.current.x - 3}px, ${echo1.current.y - 3}px)`;
      }

      if (echo2Ref.current) {
        echo2Ref.current.style.transform = `translate(${echo2.current.x - 2}px, ${echo2.current.y - 2}px)`;
      }

      raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
    };
  }, [isHovering]);

  if (!isVisible || !isInside) return null;

  return (
    <>
      {/* Primary Dot (Center Core) */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] will-change-transform mix-blend-screen"
      >
        <div
          className={`rounded-full transition-all duration-200 ${
            isHovering ? 'bg-neon-purple shadow-[0_0_10px_#7B2CBF]' : 'bg-neon-cyan shadow-[0_0_8px_#03e9f4]'
          }`}
          style={{
            width: isHovering ? 8 : 8,
            height: isHovering ? 8 : 8,
          }}
        />
      </div>

      {/* Rotating Cybernetic HUD Ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[9998] will-change-transform transition-[width,height,color,filter] duration-300"
        style={{
          width: isHovering ? 50 : 40,
          height: isHovering ? 50 : 40,
          color: isHovering ? '#7B2CBF' : '#03e9f4',
          filter: isHovering 
            ? 'drop-shadow(0 0 8px rgba(123, 44, 191, 0.8))' 
            : 'drop-shadow(0 0 4px rgba(3, 233, 244, 0.4))',
        }}
      >
        {isHovering ? (
          // Hover State: Active Target Locking Sight
          <svg viewBox="0 0 50 50" className="w-full h-full">
            {/* 4 Corner Targeting brackets */}
            <path d="M 8,18 V 8 H 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M 32,8 H 42 V 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M 42,32 V 42 H 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M 18,42 H 8 V 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* Center target details */}
            <circle cx="25" cy="25" r="14" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3, 3" />
            <path d="M 25,18 V 22 M 25,28 V 32 M 18,25 H 22 M 28,25 H 32" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        ) : (
          // Normal State: Sci-Fi Diagnostic Sight
          <svg viewBox="0 0 40 40" className="w-full h-full">
            {/* Outer brackets */}
            <path d="M 6,13 V 6 H 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M 27,6 H 34 V 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M 34,27 V 34 H 27" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M 13,34 H 6 V 27" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            {/* Inner Ring (dashed) */}
            <circle cx="20" cy="20" r="10" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4, 4" opacity="0.6" />
          </svg>
        )}
      </div>

      {/* Cybernetic Particle Tail - Echo 1 */}
      <div
        ref={echo1Ref}
        className="fixed top-0 left-0 pointer-events-none z-[9997] will-change-transform mix-blend-screen"
      >
        <div
          className="rounded-full bg-neon-cyan/50 shadow-[0_0_6px_rgba(3,233,244,0.3)]"
          style={{ width: 5, height: 5 }}
        />
      </div>

      {/* Cybernetic Particle Tail - Echo 2 */}
      <div
        ref={echo2Ref}
        className="fixed top-0 left-0 pointer-events-none z-[9996] will-change-transform mix-blend-screen"
      >
        <div
          className="rounded-full bg-neon-cyan/25 shadow-[0_0_4px_rgba(3,233,244,0.15)]"
          style={{ width: 3, height: 3 }}
        />
      </div>
    </>
  );
};

export default CustomCursor;

