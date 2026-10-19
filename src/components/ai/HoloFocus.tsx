import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

// Tap a data card in the AI world and it "pops" out of its place into a large
// holographic card: it grows from the exact spot that was tapped, a light sweep
// runs across it and its edge lights up. Closing shrinks it back into place.

export type FocusRequest = {
  /** Identifies what is shown (a second tap on the same card closes it). */
  key: string;
  /** The element that was tapped; the card grows out of it and returns to it. */
  origin: HTMLElement;
  label: string;
  content: ReactNode;
};

type FocusApi = { open: (request: FocusRequest) => void; close: () => void; openKey: string | null };

const FocusContext = createContext<FocusApi>({ open: () => undefined, close: () => undefined, openKey: null });
export const useHoloFocus = () => useContext(FocusContext);

const POP = 'cubic-bezier(0.18, 1.25, 0.32, 1)'; // a little overshoot, like a hologram snapping into place
const SHRINK = 'cubic-bezier(0.55, 0, 0.75, 0.25)';

function fromRect(card: HTMLElement, origin: HTMLElement): string | null {
  const a = origin.getBoundingClientRect();
  const b = card.getBoundingClientRect();
  if (!a.width || !b.width) return null;
  const dx = a.left + a.width / 2 - (b.left + b.width / 2);
  const dy = a.top + a.height / 2 - (b.top + b.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${a.width / b.width}, ${a.height / b.height})`;
}

function flashOrigin(origin: HTMLElement) {
  origin.animate(
    [
      { boxShadow: '0 0 0 0 rgba(3,233,244,0)', filter: 'brightness(1)' },
      { boxShadow: '0 0 28px 6px rgba(3,233,244,0.55)', filter: 'brightness(1.6)', offset: 0.35 },
      { boxShadow: '0 0 0 0 rgba(3,233,244,0)', filter: 'brightness(1)' },
    ],
    { duration: 520, easing: 'ease-out' },
  );
}

export function HoloFocusProvider({ children, reducedMotion }: { children: ReactNode; reducedMotion: boolean }) {
  const [request, setRequest] = useState<FocusRequest | null>(null);
  const [closing, setClosing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sweepRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  const finishClose = useCallback(() => {
    setRequest(null);
    setClosing(false);
  }, []);

  const close = useCallback(() => {
    if (!request || closing) return;
    setClosing(true);
    const card = cardRef.current;
    const back = card && request.origin.isConnected ? fromRect(card, request.origin) : null;
    if (reducedMotion || !card) {
      finishClose();
      return;
    }
    scrimRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
    contentRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' });
    const anim = card.animate(
      [{ transform: 'none', opacity: 1 }, { transform: back ?? 'scale(0.6)', opacity: back ? 0.9 : 0 }],
      { duration: 300, easing: SHRINK, fill: 'forwards' },
    );
    anim.onfinish = finishClose;
    anim.oncancel = finishClose;
    request.origin.focus?.({ preventScroll: true });
  }, [closing, finishClose, reducedMotion, request]);

  const open = useCallback(
    (next: FocusRequest) => {
      if (request?.key === next.key) return close();
      navigator.vibrate?.(8);
      flashOrigin(next.origin);
      setClosing(false);
      setRequest(next);
    },
    [close, request],
  );

  // Pop in from the tapped card.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!request || !card) return;
    closeButton.current?.focus({ preventScroll: true });
    if (reducedMotion) return;
    const from = fromRect(card, request.origin);
    scrimRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
    card.animate(
      [
        { transform: from ?? 'scale(0.7)', opacity: from ? 0.85 : 0, filter: 'brightness(2.2) saturate(1.4)' },
        { transform: 'none', opacity: 1, filter: 'brightness(1) saturate(1)' },
      ],
      { duration: 560, easing: POP },
    );
    contentRef.current?.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], {
      duration: 320,
      delay: 200,
      easing: 'ease-out',
      fill: 'backwards',
    });
    sweepRef.current?.animate([{ transform: 'translateX(-130%) skewX(-18deg)' }, { transform: 'translateX(230%) skewX(-18deg)' }], {
      duration: 950,
      delay: 260,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'both',
    });
    ringRef.current?.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0.9 },
        { transform: 'translate(-50%, -50%) scale(2.6)', opacity: 0 },
      ],
      { duration: 700, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
    );
  }, [request, reducedMotion]);

  // Esc closes the focused card before anything else.
  useEffect(() => {
    if (!request) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [close, request]);

  const api: FocusApi = { open, close, openKey: request?.key ?? null };

  return (
    <FocusContext.Provider value={api}>
      {children}
      {request && (
        <div className="fixed inset-0 z-[9995] flex items-center justify-center p-3 sm:p-6" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div ref={scrimRef} className="absolute inset-0 bg-slate-950/70 backdrop-blur-[3px]" onClick={close} aria-hidden="true" />
          <div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-label={request.label}
            className="ai-holo-focus relative w-full max-w-xl max-h-[min(82dvh,720px)] flex flex-col rounded-2xl border border-neon-cyan/60 bg-[#04101f]/95 shadow-[0_0_60px_rgba(3,233,244,0.35),inset_0_0_40px_rgba(3,233,244,0.08)] overflow-hidden select-text"
            style={{ transformOrigin: 'center center' }}
          >
            {/* illumination: sweep, scanlines and a ring burst */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
              <div ref={sweepRef} className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" style={{ transform: 'translateX(-130%) skewX(-18deg)' }} />
              <div className="absolute inset-0 ai-scanlines opacity-40" />
              <div ref={ringRef} className="absolute left-1/2 top-1/2 w-40 h-40 rounded-full border-2 border-neon-cyan/70" style={{ transform: 'translate(-50%, -50%) scale(0)', opacity: 0 }} />
            </div>
            <button
              ref={closeButton}
              onClick={close}
              aria-label="Close"
              className="absolute top-2.5 right-2.5 z-10 w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-neon-cyan bg-slate-900/70 border border-slate-700/80 transition-colors"
            >
              <X size={16} />
            </button>
            <div ref={contentRef} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pt-5">
              {request.content}
            </div>
          </div>
        </div>
      )}
    </FocusContext.Provider>
  );
}

/** Makes any data card tappable: it pops out into the focus view. */
export function ZoomableCard({ id, label, children, zoomed }: { id: string; label: string; children: ReactNode; zoomed?: ReactNode }) {
  const { open } = useHoloFocus();
  const ref = useRef<HTMLDivElement>(null);
  const trigger = () => ref.current && open({ key: id, origin: ref.current, label, content: zoomed ?? <div className="ai-zoomed">{children}</div> });
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={`${label}: tap to enlarge`}
      className="ai-zoomable rounded-lg w-full outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a,button,input,iframe,video')) return;
        trigger();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          trigger();
        }
      }}
    >
      {children}
    </div>
  );
}
