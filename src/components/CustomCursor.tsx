import { useEffect, useRef, useState } from 'react';

const CustomCursor = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const mouse = useRef({ x: -100, y: -100 });
  const dot = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });
  const raf = useRef<number>(0);

  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    setIsVisible(true);

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
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
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);

    // Use requestAnimationFrame for smooth, jank-free cursor
    const animate = () => {
      // Dot follows tightly
      dot.current.x += (mouse.current.x - dot.current.x) * 0.35;
      dot.current.y += (mouse.current.y - dot.current.y) * 0.35;
      // Ring trails behind
      ring.current.x += (mouse.current.x - ring.current.x) * 0.12;
      ring.current.y += (mouse.current.y - ring.current.y) * 0.12;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dot.current.x - 5}px, ${dot.current.y - 5}px)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x - 20}px, ${ring.current.y - 20}px)`;
      }

      raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      {/* Dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference will-change-transform"
        style={{ transition: 'width 0.2s, height 0.2s' }}
      >
        <div
          className="rounded-full bg-neon-cyan transition-all duration-200"
          style={{
            width: isHovering ? 40 : 10,
            height: isHovering ? 40 : 10,
            marginLeft: isHovering ? -15 : 0,
            marginTop: isHovering ? -15 : 0,
            opacity: isHovering ? 0.7 : 1,
          }}
        />
      </div>
      {/* Ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[9998] will-change-transform"
      >
        <div
          className="rounded-full border transition-all duration-300"
          style={{
            width: isHovering ? 50 : 40,
            height: isHovering ? 50 : 40,
            marginLeft: isHovering ? -5 : 0,
            marginTop: isHovering ? -5 : 0,
            borderColor: isHovering ? 'rgba(3, 233, 244, 0.6)' : 'rgba(3, 233, 244, 0.25)',
            boxShadow: isHovering ? '0 0 15px rgba(3, 233, 244, 0.3)' : 'none',
          }}
        />
      </div>
    </>
  );
};

export default CustomCursor;
