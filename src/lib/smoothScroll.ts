// One smooth scroll for every in-page link on the home page.
//
// The browser's own smooth scrolling decides where to stop at the moment it
// starts. On this page the stopping point can still move while the page is
// travelling (project data arriving, a banner opening above the target), so a
// long jump could land a little off. Here the destination is measured again on
// every frame, the move is re-aimed if it changes, and the final position is
// checked once more after arriving.

/** Space kept above the target for the fixed header. */
export const SCROLL_OFFSET = 88;

type ScrollOptions = {
  offset?: number;
  /** Scrolled to while the real target is not on the page yet (e.g. still loading). */
  fallbackId?: string;
  /** Called once the page rests on the real target. */
  onArrive?: (element: HTMLElement) => void;
};

const WAIT_FOR_TARGET_MS = 8000;
const SETTLE_MS = 700;
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

let stopCurrent: (() => void) | null = null;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

const jumpTo = (top: number) => window.scrollTo({ top, left: window.scrollX, behavior: 'instant' as ScrollBehavior });

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// Longer trips take longer, but never so long that the page feels slow.
const durationFor = (distance: number) => Math.min(1150, Math.max(420, 280 + Math.abs(distance) * 0.22));

export function smoothScrollToId(id: string, options: ScrollOptions = {}): void {
  if (typeof window === 'undefined') return;
  stopCurrent?.();

  const offset = options.offset ?? SCROLL_OFFSET;
  const target = () => document.getElementById(id);
  const fallback = () => (options.fallbackId ? document.getElementById(options.fallbackId) : null);

  const destinationOf = (element: HTMLElement) => {
    const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return Math.min(limit, Math.max(0, element.getBoundingClientRect().top + window.scrollY - offset));
  };

  const first = target() ?? fallback();
  if (!first) return;

  if (prefersReducedMotion()) {
    jumpTo(destinationOf(first));
    const real = target();
    if (real) options.onArrive?.(real);
    return;
  }

  let frame = 0;
  let stopped = false;
  let from = window.scrollY;
  let startedAt = performance.now();
  let aim = destinationOf(first);
  let duration = durationFor(aim - from);
  let ease = easeInOut;
  let arrivedAt = 0; // when the move ended on the real target
  let waitingSince = 0; // when the move ended on the fallback

  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('wheel', stop);
    window.removeEventListener('touchstart', stop);
    window.removeEventListener('keydown', onKey);
    if (stopCurrent === stop) stopCurrent = null;
  };
  const onKey = (event: KeyboardEvent) => {
    if (SCROLL_KEYS.has(event.key)) stop();
  };
  // The visitor always wins: any scroll of their own ends this one.
  window.addEventListener('wheel', stop, { passive: true });
  window.addEventListener('touchstart', stop, { passive: true });
  window.addEventListener('keydown', onKey);
  stopCurrent = stop;

  const step = (now: number) => {
    if (stopped) return;
    const real = target();
    const element = real ?? fallback();
    if (!element) return stop();

    const destination = destinationOf(element);

    if (arrivedAt) {
      // Resting on the target: follow it if the page still shifts for a moment.
      if (Math.abs(destination - window.scrollY) > 1) jumpTo(destination);
      if (now - arrivedAt >= SETTLE_MS) {
        stop();
        if (real) options.onArrive?.(real);
        return;
      }
      frame = requestAnimationFrame(step);
      return;
    }

    if (waitingSince) {
      // Resting on the fallback until the real target shows up.
      if (real) {
        waitingSince = 0;
        from = window.scrollY;
        startedAt = now;
        aim = destination;
        duration = durationFor(aim - from);
        ease = easeInOut;
      } else if (now - waitingSince >= WAIT_FOR_TARGET_MS) {
        return stop();
      }
      frame = requestAnimationFrame(step);
      return;
    }

    if (Math.abs(destination - aim) > 8) {
      // The stopping point moved: carry on from here towards the new one.
      from = window.scrollY;
      startedAt = now;
      duration = Math.max(280, durationFor(destination - from) * 0.75);
      ease = easeOut;
    }
    aim = destination;

    const progress = Math.min(1, (now - startedAt) / duration);
    jumpTo(from + (aim - from) * ease(progress));

    if (progress >= 1) {
      if (real) arrivedAt = now;
      else waitingSince = now;
    }
    frame = requestAnimationFrame(step);
  };

  frame = requestAnimationFrame(step);
}

// Go to one block of the Projects section (the home-page cards and the jump links
// use this). While the projects are still loading the page travels to the section
// itself and carries on to the block as soon as it exists; on arrival the block's
// heading takes focus and lights up briefly so it is clear where the jump ended.
export function goToProjectGroup(anchor: string): void {
  smoothScrollToId(anchor, {
    fallbackId: 'projects',
    onArrive: (block) => {
      block.querySelector<HTMLElement>('[data-group-heading]')?.focus({ preventScroll: true });
      block.setAttribute('data-arrived', 'true');
      window.setTimeout(() => block.removeAttribute('data-arrived'), 1900);
    },
  });
}
