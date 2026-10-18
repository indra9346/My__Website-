import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadAICorePortal, resetAICorePortal } from '../components/ai/loadPortal';
import { sfx } from '../components/ai/sfx';

export type AIModeState =
  | 'inactive'
  | 'activating'
  | 'video_forward'
  | 'portal'
  | 'world'
  | 'video_reverse'
  | 'deactivating';

export type AIModeError = 'load_failed' | 'timeout' | null;

interface AIContextProps {
  aiModeState: AIModeState;
  /** Accepts (and ignores) a click event so it can be used directly as onClick. */
  enterAIMode: (event?: unknown) => void;
  /** Leave AI mode instantly and return to the same place on the page. */
  exitAIMode: () => void;
  /** Leave AI mode, then scroll to a section of the home page (e.g. "projects"). */
  exitToSection: (sectionId: string) => void;
  /** Kept for compatibility: moving to 'inactive' exits cleanly. */
  setAiModeState: (state: AIModeState) => void;
  /** Called when the AI world fails to load or render. */
  failAIMode: (reason?: Exclude<AIModeError, null>) => void;
  retryAIMode: () => void;
  aiError: AIModeError;
  /** Increments on every retry so lazy components can be recreated. */
  attempt: number;
  reducedMotion: boolean;
  scrollPos: number;
}

const AIContext = createContext<AIContextProps | undefined>(undefined);

// Timeline of the experience (same as the original design).
const BOOT_MS = 2600; // boot log screen
const BOOT_MS_REDUCED = 900;
const INTRO_WATCHDOG_MS = 6500; // VideoBridge normally hands over at 4.2 s
const PORTAL_MS = 1500; // warp tunnel
const PORTAL_MS_REDUCED = 250;
const LOAD_TIMEOUT_MS = 15000; // give up waiting for the 3D world after this
const SECTION_OFFSET = 80; // same offset the page uses for its anchor links

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

export const AIContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [aiModeState, setState] = useState<AIModeState>('inactive');
  const [aiError, setAiError] = useState<AIModeError>(null);
  const [attempt, setAttempt] = useState(0);
  const [scrollPos, setScrollPos] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);

  // Refs mirror state so timers and browser events never act on stale values.
  const stateRef = useRef<AIModeState>('inactive');
  const scrollRef = useRef(0);
  const focusRef = useRef<HTMLElement | null>(null);
  const lockRef = useRef<{ html: string; body: string } | null>(null);
  const historyEntryRef = useRef(false);

  const go = useCallback((next: AIModeState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  // Lock page scrolling without moving the page: overflow on <html> keeps scrollY.
  const lockPage = useCallback(() => {
    if (lockRef.current) return;
    const html = document.documentElement;
    lockRef.current = { html: html.style.overflow, body: document.body.style.overflow };
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }, []);

  const unlockPage = useCallback(() => {
    if (!lockRef.current) return;
    document.documentElement.style.overflow = lockRef.current.html;
    document.body.style.overflow = lockRef.current.body;
    lockRef.current = null;
    // Clean up classes an older build may have left behind.
    document.body.classList.remove('ai-portal-active', 'ai-portal-glitch');
  }, []);

  const finishExit = useCallback((sectionId?: string) => {
    const top = scrollRef.current;
    if (Math.abs(window.scrollY - top) > 2) {
      window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
    }
    const focusTarget = focusRef.current;
    focusRef.current = null;
    if (focusTarget && document.contains(focusTarget)) focusTarget.focus({ preventScroll: true });
    if (!sectionId) return;
    window.requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      if (!el) return;
      const target = el.getBoundingClientRect().top + window.scrollY - SECTION_OFFSET;
      window.scrollTo({ top: Math.max(0, target), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
  }, []);

  const exit = useCallback(
    (sectionId?: string, fromHistory = false) => {
      if (stateRef.current === 'inactive') return;
      go('inactive');
      setAiError(null);
      sfx.sleep();
      unlockPage();

      const ownsHistoryEntry = historyEntryRef.current && !fromHistory;
      historyEntryRef.current = false;
      if (ownsHistoryEntry && (window.history.state as { aiMode?: boolean } | null)?.aiMode) {
        // Remove the entry we pushed on enter, without letting the browser
        // restore an old scroll position while it does.
        const previous = window.history.scrollRestoration;
        window.history.scrollRestoration = 'manual';
        let settled = false;
        const settle = () => {
          if (settled) return;
          settled = true;
          window.removeEventListener('popstate', settle);
          window.history.scrollRestoration = previous;
          finishExit(sectionId);
        };
        window.addEventListener('popstate', settle);
        window.history.back();
        window.setTimeout(settle, 400);
      } else {
        finishExit(sectionId);
      }
    },
    [finishExit, go, unlockPage],
  );

  const enterAIMode = useCallback(
    (_event?: unknown) => {
      if (stateRef.current !== 'inactive') return;
      const reduced = prefersReducedMotion();
      setReducedMotion(reduced);
      scrollRef.current = window.scrollY;
      setScrollPos(window.scrollY);
      focusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setAiError(null);
      lockPage();

      // A history entry lets the browser Back button close AI mode instead of leaving the site.
      try {
        const current = (window.history.state as Record<string, unknown> | null) ?? {};
        window.history.pushState({ ...current, aiMode: true }, '');
        historyEntryRef.current = true;
      } catch {
        historyEntryRef.current = false;
      }

      // Start downloading the 3D world now; it's needed about 7 seconds from here.
      loadAICorePortal().catch(() => undefined);
      go('activating');
    },
    [go, lockPage],
  );

  const exitAIMode = useCallback(() => exit(), [exit]);
  const exitToSection = useCallback((sectionId: string) => exit(sectionId), [exit]);

  const setAiModeState = useCallback(
    (next: AIModeState) => {
      if (next === 'inactive' || next === 'video_reverse' || next === 'deactivating') {
        exit();
        return;
      }
      // Ignore late callbacks (for example a video finishing) after AI mode was closed.
      if (stateRef.current === 'inactive') return;
      go(next);
    },
    [exit, go],
  );

  const failAIMode = useCallback((reason: Exclude<AIModeError, null> = 'load_failed') => {
    if (stateRef.current === 'inactive') return;
    setAiError(reason);
  }, []);

  const retryAIMode = useCallback(() => {
    if (stateRef.current === 'inactive') return;
    resetAICorePortal();
    setAiError(null);
    setAttempt((n) => n + 1);
    go('portal');
  }, [go]);

  // Phase timers. Exactly one runs at a time and each is cleared on every change,
  // so no step can be left waiting forever.
  useEffect(() => {
    if (aiModeState === 'activating') {
      const timer = window.setTimeout(() => {
        if (stateRef.current === 'activating') go(reducedMotion ? 'portal' : 'video_forward');
      }, reducedMotion ? BOOT_MS_REDUCED : BOOT_MS);
      return () => window.clearTimeout(timer);
    }

    if (aiModeState === 'video_forward') {
      const watchdog = window.setTimeout(() => {
        if (stateRef.current === 'video_forward') go('portal');
      }, INTRO_WATCHDOG_MS);
      return () => window.clearTimeout(watchdog);
    }

    if (aiModeState === 'portal' && !aiError) {
      let cancelled = false;
      let portalTimer = 0;
      const timeout = window.setTimeout(() => {
        if (!cancelled) setAiError('timeout');
      }, LOAD_TIMEOUT_MS);
      loadAICorePortal().then(
        () => {
          if (cancelled) return;
          window.clearTimeout(timeout);
          portalTimer = window.setTimeout(() => {
            if (!cancelled && stateRef.current === 'portal') go('world');
          }, reducedMotion ? PORTAL_MS_REDUCED : PORTAL_MS);
        },
        () => {
          if (cancelled) return;
          window.clearTimeout(timeout);
          setAiError('load_failed');
        },
      );
      return () => {
        cancelled = true;
        window.clearTimeout(timeout);
        window.clearTimeout(portalTimer);
      };
    }

    return undefined;
  }, [aiModeState, aiError, attempt, reducedMotion, go]);

  // Esc and the browser Back button always leave AI mode.
  const isActive = aiModeState !== 'inactive';
  useEffect(() => {
    if (!isActive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Panels inside the world call preventDefault when Esc only closes them.
      if (event.key === 'Escape' && !event.defaultPrevented) exit();
    };
    const onPopState = (event: PopStateEvent) => {
      const state = event.state as { aiMode?: boolean } | null;
      if (stateRef.current !== 'inactive' && !state?.aiMode) {
        historyEntryRef.current = false;
        exit(undefined, true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('popstate', onPopState);
    };
  }, [isActive, exit]);

  // Never leave the page locked if the provider unmounts mid-experience.
  useEffect(() => () => unlockPage(), [unlockPage]);

  const value = useMemo<AIContextProps>(
    () => ({
      aiModeState,
      enterAIMode,
      exitAIMode,
      exitToSection,
      setAiModeState,
      failAIMode,
      retryAIMode,
      aiError,
      attempt,
      reducedMotion,
      scrollPos,
    }),
    [aiModeState, enterAIMode, exitAIMode, exitToSection, setAiModeState, failAIMode, retryAIMode, aiError, attempt, reducedMotion, scrollPos],
  );

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIContextProvider');
  }
  return context;
};
