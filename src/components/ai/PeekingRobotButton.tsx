import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// The "Go Into AI Mode" button with a small robot living inside it. Every few
// seconds the button is pried open at the middle (top edge bends up, bottom
// edge bows down), the robot climbs into view, grips the edge, looks left and
// right for visitors, spots you and beckons you in with its hand, then slips
// back inside. If your pointer comes near, it skips the search and looks at you.
// Everything is drawn in one SVG and driven by a single requestAnimationFrame
// loop that only runs while a performance is on.

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const easeOutBack = (t: number) => {
  const x = clamp01(t);
  const c1 = 1.5;
  return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
/** 0→1 over [a, b] then 1→0 over [c, d]. */
const span = (t: number, a: number, b: number, c: number, d: number, curve = ease) => (t < c ? curve((t - a) / (b - a)) : 1 - ease((t - c) / (d - c)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const CYCLE = 6.9; // seconds of one performance
const REPEAT_MS = 8500; // pause between performances while the button is in view
const HEAD_ABOVE = 72; // drawing room above the button for the robot
const BOT = 1.3; // robot drawing scale

type Pose = {
  split: number; // label words move apart
  pry: number; // the button opens at the middle
  rise: number; // 0 inside, 1 head + hands over the edge, 1.25 shoulders out
  look: number; // -1 left, 0 at the visitor, 1 right
  notice: number; // eyes widen, spark
  arm: number; // right arm raised
  curl: number; // beckoning finger curl
  bubble: number;
  blink: number;
};

function poseAt(t: number, visitor: boolean): Pose {
  // A visitor already found: skip the searching part of the timeline.
  const tl = visitor && t > 1.25 ? t + 1.95 : t;
  const scanning = !visitor && tl > 1.3 && tl < 3.4;
  let look = 0;
  if (scanning) {
    if (tl < 2.3) look = -ease((tl - 1.3) / 0.55);
    else if (tl < 3.1) look = lerp(-1, 1, ease((tl - 2.3) / 0.6));
    else look = 1 - ease((tl - 3.1) / 0.3);
  }
  const beckoning = tl > 4.0 && tl < 5.35;
  const blinkAt = [1.15, 2.85, 4.9];
  const blink = blinkAt.some((b) => tl > b && tl < b + 0.13) ? 1 : 0;
  return {
    split: span(tl, 0, 0.45, 6.25, 6.75),
    pry: span(tl, 0.2, 0.75, 5.95, 6.55),
    rise:
      tl < 3.25
        ? easeOutBack((tl - 0.55) / 0.75)
        : tl < 5.55
        ? 1 + 0.25 * ease((tl - 3.25) / 0.4)
        : 1.25 * (1 - ease((tl - 5.55) / 0.6)),
    look,
    notice: tl > 3.2 ? clamp01((tl - 3.2) / 0.2) * (1 - 0.7 * clamp01((tl - 3.45) / 0.6)) * (tl < 5.6 ? 1 : 0) : 0,
    arm: span(tl, 3.6, 4.0, 5.3, 5.7),
    curl: beckoning ? Math.max(0, Math.sin((tl - 4.0) * Math.PI * 2 * 1.5)) : 0,
    bubble: span(tl, 3.95, 4.25, 5.3, 5.6),
    blink,
  };
}

const REST: Pose = { split: 0, pry: 0, rise: 0, look: 0, notice: 0, arm: 0, curl: 0, bubble: 0, blink: 0 };

export default function PeekingRobotButton({ onClick, label = 'Go Into AI Mode' }: { onClick: () => void; label?: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 220, h: 46 });
  const [hover, setHover] = useState(false);
  const reduced = useRef(false);
  const run = useRef({ start: 0, active: false, visitor: false, raf: 0, nextTimer: 0, inView: false, eyeX: 0, eyeY: 0 });

  const parts = useRef<Record<string, SVGElement | null>>({});
  const leftWord = useRef<HTMLSpanElement>(null);
  const rightWord = useRef<HTMLSpanElement>(null);
  const [first, second] = splitLabel(label);

  useLayoutEffect(() => {
    reduced.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    const el = buttonRef.current;
    if (!el) return undefined;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const draw = useCallback(
    (p: Pose) => {
      const { w, h } = size;
      const cx = w / 2;
      const P = parts.current;
      const set = (key: string, attr: string, value: string | number) => P[key]?.setAttribute(attr, String(value));
      const r = h / 2;
      const bump = 9 * p.pry; // top edge lifted at the middle
      const dip = 6 * p.pry; // bottom edge pulled down at the middle
      const bw = 78; // width of the bent part of each edge
      const top = `M ${r} 0 L ${cx - bw / 2} 0 C ${cx - bw / 4} 0 ${cx - bw / 4} ${-bump} ${cx} ${-bump} C ${cx + bw / 4} ${-bump} ${cx + bw / 4} 0 ${cx + bw / 2} 0 L ${w - r} 0`;
      const bottom = `L ${cx + bw / 2} ${h} C ${cx + bw / 4} ${h} ${cx + bw / 4} ${h + dip} ${cx} ${h + dip} C ${cx - bw / 4} ${h + dip} ${cx - bw / 4} ${h} ${cx - bw / 2} ${h} L ${r} ${h}`;
      const outline = `${top} A ${r} ${r} 0 0 1 ${w - r} ${h} ${bottom} A ${r} ${r} 0 0 1 ${r} 0 Z`;
      set('face', 'd', outline);
      set('edge', 'd', outline);

      // the slit the robot climbs out of
      set('slit', 'rx', 25 * p.pry);
      set('slit', 'ry', (h * 0.3 + bump * 0.4) * p.pry);
      set('slit', 'opacity', p.pry > 0.02 ? 1 : 0);
      set('slitGlow', 'opacity', p.pry);

      // label words make room
      const shift = 30 * p.split;
      if (leftWord.current) leftWord.current.style.transform = `translateX(${-shift}px)`;
      if (rightWord.current) rightWord.current.style.transform = `translateX(${shift}px)`;

      // robot
      const visible = p.rise > 0.01;
      set('robot', 'opacity', visible ? 1 : 0);
      const headY = lerp(h * 0.7, -19 - bump, Math.min(p.rise, 1)) - Math.max(0, p.rise - 1) * 34;
      const tilt = p.look * 9;
      set('head', 'transform', `translate(${cx} ${headY}) rotate(${tilt}) scale(${BOT})`);
      set('body', 'transform', `translate(${cx} ${headY}) scale(${BOT})`);
      const eyeShift = p.look * 3 + run.current.eyeX * (1 - Math.abs(p.look));
      const eyeLift = run.current.eyeY * (1 - Math.abs(p.look));
      const eyeScale = p.blink ? 0.12 : 1 + p.notice * 0.35;
      set('eyes', 'transform', `translate(${eyeShift} ${eyeLift}) scale(1 ${eyeScale})`);
      set('spark', 'opacity', p.notice);
      set('spark', 'transform', `translate(${cx + 19} ${headY - 25}) scale(${0.6 + p.notice * 0.6})`);

      // hands grip the top edge either side of the head
      const grip = clamp01((p.rise - 0.35) / 0.4);
      const edgeAt = (x: number) => {
        const d = Math.abs(x - cx) / (bw / 2);
        return d >= 1 ? 0 : -bump * (1 - d * d);
      };
      const lx = cx - 26;
      set('handL', 'transform', `translate(${lx} ${lerp(h * 0.5, edgeAt(lx) - 3, grip)}) scale(${BOT})`);
      set('handL', 'opacity', grip);

      // right hand: grips, then rises beside the head and beckons
      const gx = cx + 26;
      const gy = lerp(h * 0.5, edgeAt(gx) - 3, grip);
      const rx = lerp(gx, cx + 34, p.arm);
      const ry = lerp(gy, headY + 4, p.arm);
      set('handR', 'transform', `translate(${rx} ${ry}) rotate(${lerp(0, -18, p.arm) - p.curl * 38}) scale(${BOT})`);
      set('handR', 'opacity', grip);
      set('fingers', 'transform', `scale(1 ${1 - p.curl * 0.55})`);
      set('arm', 'd', `M ${cx + 13} ${headY + 20} Q ${cx + 30} ${headY + 25} ${rx} ${ry + 4}`);
      set('arm', 'opacity', p.arm > 0.02 && p.rise > 1.02 ? p.arm : 0);

      set('bubble', 'opacity', p.bubble);
      set('bubble', 'transform', `translate(${cx + 47} ${headY - 8}) scale(${0.7 + 0.3 * p.bubble})`);
    },
    [size],
  );

  // Draw the resting button whenever the size changes.
  useLayoutEffect(() => draw(REST), [draw]);

  const stop = useCallback(() => {
    const r = run.current;
    cancelAnimationFrame(r.raf);
    r.active = false;
    draw(REST);
  }, [draw]);

  const perform = useCallback(
    (visitor: boolean) => {
      const r = run.current;
      if (reduced.current || r.active || document.hidden) return;
      r.active = true;
      r.visitor = visitor;
      r.start = performance.now();
      const frame = (now: number) => {
        const t = (now - r.start) / 1000;
        if (t >= CYCLE - (r.visitor ? 1.95 : 0)) {
          r.active = false;
          draw(REST);
          if (r.inView) r.nextTimer = window.setTimeout(() => performRef.current(false), REPEAT_MS);
          return;
        }
        draw(poseAt(t, r.visitor));
        r.raf = requestAnimationFrame(frame);
      };
      r.raf = requestAnimationFrame(frame);
    },
    [draw],
  );
  // keep the timer callback pointing at the latest perform
  const performRef = useRef(perform);
  performRef.current = perform;
  useEffect(() => {
    const r = run.current;
    const el = buttonRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        r.inView = entry.isIntersecting && entry.intersectionRatio > 0.6;
        window.clearTimeout(r.nextTimer);
        if (r.inView) r.nextTimer = window.setTimeout(() => performRef.current(false), 1600);
      },
      { threshold: [0, 0.6, 1] },
    );
    io.observe(el);
    const onVisibility = () => {
      if (document.hidden) {
        window.clearTimeout(r.nextTimer);
        stop();
      } else if (r.inView) {
        r.nextTimer = window.setTimeout(() => performRef.current(false), 1200);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(r.nextTimer);
      cancelAnimationFrame(r.raf);
    };
  }, [stop]);

  // Its eyes follow the visitor's pointer, and a pointer coming close calls it out.
  useEffect(() => {
    const r = run.current;
    const onMove = (e: PointerEvent) => {
      const el = buttonRef.current;
      if (!el) return;
      const b = el.getBoundingClientRect();
      const dx = e.clientX - (b.left + b.width / 2);
      const dy = e.clientY - (b.top - 10);
      r.eyeX = Math.max(-3, Math.min(3, dx / 60));
      r.eyeY = Math.max(-1.5, Math.min(1.5, dy / 80));
      const near = Math.hypot(dx, dy) < 170;
      if (near && !r.active && e.pointerType === 'mouse') performRef.current(true);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const { w, h } = size;
  const ref = (key: string) => (el: SVGElement | null) => {
    parts.current[key] = el;
  };

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`relative isolate text-center px-8 py-3 rounded-full font-bold tracking-wider text-sm sm:text-base uppercase transition-[color,transform] duration-300 hover:scale-105 active:scale-[0.97] ${
        hover ? 'text-black' : 'text-neon-cyan'
      }`}
    >
      <svg
        ref={svgRef}
        aria-hidden="true"
        width={w}
        height={h + HEAD_ABOVE + 10}
        viewBox={`0 ${-HEAD_ABOVE} ${w} ${h + HEAD_ABOVE + 10}`}
        className="absolute left-0 pointer-events-none overflow-visible -z-10"
        style={{ top: -HEAD_ABOVE }}
      >
        <defs>
          <filter id="ai-btn-glow" x="-30%" y="-80%" width="160%" height="260%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="ai-bot-shell" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#c7d2e0" />
          </linearGradient>
          <linearGradient id="ai-bot-face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f8fafc" />
            <stop offset="0.55" stopColor="#cbd5e1" />
            <stop offset="1" stopColor="#8794a8" />
          </linearGradient>
          <radialGradient id="ai-slit" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#0e7490" stopOpacity="0.9" />
            <stop offset="0.6" stopColor="#020617" />
            <stop offset="1" stopColor="#020617" />
          </radialGradient>
        </defs>

        {/* button face (the outline bends when the robot pushes through) */}
        <path ref={ref('face')} fill={hover ? '#03e9f4' : 'rgba(0,0,0,0.6)'} style={{ transition: 'fill 300ms' }} />
        <path
          ref={ref('edge')}
          fill="none"
          stroke="#03e9f4"
          strokeWidth="1.2"
          filter="url(#ai-btn-glow)"
          opacity={hover ? 1 : 0.85}
        />
        <ellipse ref={ref('slitGlow')} cx={w / 2} cy={h / 2} rx={30} ry={h * 0.42} fill="#22d3ee" opacity={0} filter="url(#ai-btn-glow)" style={{ mixBlendMode: 'screen' }} />
        <ellipse ref={ref('slit')} cx={w / 2} cy={h / 2} rx={0} ry={0} fill="url(#ai-slit)" stroke="#67e8f9" strokeWidth="0.8" opacity={0} />

        {/* the robot: hidden inside the button below its middle */}
        <clipPath id="ai-bot-clip">
          <rect x={-40} y={-HEAD_ABOVE - 10} width={w + 80} height={HEAD_ABOVE + 10 + h * 0.5} />
        </clipPath>
        <g ref={ref('robot')} clipPath="url(#ai-bot-clip)" opacity={0}>
          <path ref={ref('arm')} fill="none" stroke="url(#ai-bot-shell)" strokeWidth="5.4" strokeLinecap="round" opacity={0} />
          {/* torso (shows when it rises further) */}
          <g ref={ref('body')}>
            <rect x={-3.5} y={10} width={7} height={4} rx={1.5} fill="#1c222c" />
            <path d="M -12 14 C -12 12 12 12 12 14 L 10 30 L -10 30 Z" fill="url(#ai-bot-shell)" stroke="#94a3b8" strokeWidth="0.5" />
            <path d="M -15 14.5 C -15 11 -9 11 -9 14.5 L -10 18 L -14.5 18 Z" fill="#d4a94e" />
            <path d="M 15 14.5 C 15 11 9 11 9 14.5 L 10 18 L 14.5 18 Z" fill="#d4a94e" />
            <circle cx={0} cy={20} r={3.6} fill="#1c222c" stroke="#9aa5b4" strokeWidth="0.8" />
            <circle cx={0} cy={20} r={2.4} fill="#c8f7ff" filter="url(#ai-btn-glow)" />
          </g>
          <g ref={ref('head')}>
            {/* armoured helmet with a chrome faceplate */}
            <path d="M -12 -1 C -12.5 -14 12.5 -14 12 -1 L 11 7 C 9 12.5 -9 12.5 -11 7 Z" fill="url(#ai-bot-shell)" stroke="#94a3b8" strokeWidth="0.5" />
            <path d="M 0 -12 L 0 -7" stroke="#d4a94e" strokeWidth="0.9" strokeLinecap="round" />
            <path d="M -9.2 -3 C -9.2 -8.5 9.2 -8.5 9.2 -3 L 8.2 6 C 6.3 10.2 -6.3 10.2 -8.2 6 Z" fill="url(#ai-bot-face)" stroke="#d4a94e" strokeWidth="0.6" />
            <path d="M -3 6.4 L 3 6.4" stroke="#64748b" strokeWidth="0.55" strokeLinecap="round" />
            <path d="M -6 -6.2 C -3 -7.4 3 -7.4 6 -6.2" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="0.7" fill="none" strokeLinecap="round" />
            <g ref={ref('eyes')}>
              <path d="M -7.6 -1.6 L -2 -0.6 L -2.5 1.1 L -7.1 0.3 Z" fill="#c8f7ff" filter="url(#ai-btn-glow)" />
              <path d="M 7.6 -1.6 L 2 -0.6 L 2.5 1.1 L 7.1 0.3 Z" fill="#c8f7ff" filter="url(#ai-btn-glow)" />
            </g>
          </g>
        </g>
        {/* hands are drawn over the edge they grip */}
        <g ref={ref('handL')} opacity={0}>
          <rect x={-4.5} y={-3} width={9} height={7} rx={2.2} fill="url(#ai-bot-shell)" stroke="#94a3b8" strokeWidth="0.5" />
          {[-3, -1, 1, 3].map((x) => (
            <rect key={x} x={x - 0.8} y={2.5} width={1.6} height={3} rx={0.8} fill="#d4a94e" />
          ))}
        </g>
        <g ref={ref('handR')} opacity={0}>
          <rect x={-4.5} y={-3} width={9} height={7} rx={2.2} fill="url(#ai-bot-shell)" stroke="#94a3b8" strokeWidth="0.5" />
          <circle cx={0} cy={0.5} r={1.6} fill="#c8f7ff" filter="url(#ai-btn-glow)" />
          <g ref={ref('fingers')} style={{ transformOrigin: '0px -3px' }}>
            {[-3.3, -1.1, 1.1, 3.3].map((x, i) => (
              <g key={x}>
                <rect x={x - 0.9} y={-8.6 + (i === 1 || i === 2 ? -0.8 : 0)} width={1.8} height={5.8} rx={0.9} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.3" />
                <rect x={x - 0.9} y={-8.6 + (i === 1 || i === 2 ? -0.8 : 0)} width={1.8} height={1.8} rx={0.9} fill="#d4a94e" />
              </g>
            ))}
          </g>
          <rect x={-6.6} y={-2} width={2.2} height={4.5} rx={1.1} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.3" transform="rotate(-25 -5.5 0)" />
        </g>
        {/* "!" spark when it spots the visitor */}
        <g ref={ref('spark')} opacity={0}>
          <circle r={5} fill="#facc15" opacity={0.25} />
          <text y={3.5} textAnchor="middle" fontSize="10" fontWeight="800" fill="#fde047" fontFamily="ui-monospace, monospace">
            !
          </text>
        </g>
        {/* speech bubble */}
        <g ref={ref('bubble')} opacity={0}>
          <rect x={0} y={-11} width={78} height={20} rx={10} fill="#04101f" stroke="#22d3ee" strokeWidth="1" filter="url(#ai-btn-glow)" />
          <path d="M 1 -3 L -5 0 L 1 3 Z" fill="#04101f" stroke="#22d3ee" strokeWidth="1" />
          <text x={39} y={3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#a5f3fc" fontFamily="ui-monospace, monospace" letterSpacing="0.5">
            COME IN →
          </text>
        </g>
      </svg>
      <span className="relative inline-flex gap-[0.35em]">
        <span ref={leftWord} className="inline-block will-change-transform">
          {first}
        </span>
        <span ref={rightWord} className="inline-block will-change-transform">
          {second}
        </span>
      </span>
    </button>
  );
}

function splitLabel(label: string): [string, string] {
  const words = label.split(' ');
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}
