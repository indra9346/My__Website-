import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  type: 'circle' | 'triangle' | 'square' | 'line';
  rotation: number;
  rotationSpeed: number;
  pulsePhase: number;
}

const ParticlesBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Initialize particles
    const count = Math.min(60, Math.floor(window.innerWidth / 25));
    const types: Particle['type'][] = ['circle', 'triangle', 'square', 'line'];
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.3 + 0.05,
      type: types[Math.floor(Math.random() * types.length)],
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    let time = 0;
    const animate = () => {
      time += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      for (const p of particles) {
        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = (150 - dist) / 150 * 0.5;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Wrap around
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        const pulse = Math.sin(time * 2 + p.pulsePhase) * 0.15 + 1;
        const alpha = p.opacity * pulse;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha;

        // Cyan/purple tint
        const color = p.type === 'circle' || p.type === 'line' 
          ? `rgba(3, 233, 244, ${alpha})` 
          : `rgba(123, 44, 191, ${alpha})`;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 0.5;

        const s = p.size * pulse;

        switch (p.type) {
          case 'circle':
            ctx.beginPath();
            ctx.arc(0, 0, s, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'triangle':
            ctx.beginPath();
            ctx.moveTo(0, -s * 1.5);
            ctx.lineTo(s * 1.3, s);
            ctx.lineTo(-s * 1.3, s);
            ctx.closePath();
            ctx.stroke();
            break;
          case 'square':
            ctx.strokeRect(-s, -s, s * 2, s * 2);
            break;
          case 'line':
            ctx.beginPath();
            ctx.moveTo(-s * 2, 0);
            ctx.lineTo(s * 2, 0);
            ctx.stroke();
            break;
        }
        ctx.restore();
      }

      // Draw connections between nearby particles
      ctx.lineWidth = 0.3;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.15;
            ctx.strokeStyle = `rgba(3, 233, 244, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
};

export default ParticlesBackground;
