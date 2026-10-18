import { Component, Suspense, lazy, useMemo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { useAI } from '../../context/AIContext';
import VideoBridge from '../VideoBridge';
import AIActivationScreen from './AIActivationScreen';
import { loadAICorePortal } from './loadPortal';

class PortalBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('AI world failed to render', error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Shown during the warp only if the 3D world is still downloading. */
function PortalLoading() {
  return (
    <div className="fixed inset-0 z-[9990] bg-[#020617] flex flex-col items-center justify-center gap-5 text-white select-none" aria-live="polite">
      <div className="relative w-28 h-28">
        <span className="absolute inset-0 rounded-full border border-neon-cyan/50 animate-ping" />
        <span className="absolute inset-4 rounded-full border border-neon-purple/60 animate-ping [animation-delay:300ms]" />
        <span className="absolute inset-9 rounded-full bg-neon-cyan/20 border border-neon-cyan/70" />
      </div>
      <p className="font-mono text-[11px] sm:text-xs text-neon-cyan tracking-[0.2em] uppercase">Loading AI world…</p>
    </div>
  );
}

function AIErrorScreen() {
  const { aiError, retryAIMode, exitAIMode } = useAI();
  const message =
    aiError === 'timeout'
      ? 'The AI world is taking longer than usual to load on this connection.'
      : "The AI world couldn't load. Check your connection and try again.";

  return (
    <div role="alertdialog" aria-modal="true" aria-label="AI mode unavailable" className="fixed inset-0 z-[9995] bg-[#020617] flex items-center justify-center p-4 text-white">
      <div className="border border-pink-500/30 bg-black/90 p-5 rounded-xl max-w-xs w-full text-center shadow-[0_0_20px_rgba(255,46,99,0.15)]">
        <AlertTriangle className="mx-auto text-pink-500 mb-3" size={24} />
        <p className="font-mono text-xs text-pink-400 uppercase font-bold tracking-wider mb-2">AI world unavailable</p>
        <p className="text-[11px] text-gray-400 font-mono leading-relaxed mb-4">{message}</p>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={retryAIMode}
            className="border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black font-mono text-[11px] px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 font-bold"
          >
            <RotateCcw size={12} />
            Try again
          </button>
          <button
            type="button"
            onClick={exitAIMode}
            className="border border-pink-500/60 text-pink-400 hover:bg-pink-500 hover:text-black font-mono text-[11px] px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 font-bold"
          >
            <X size={12} />
            Back to portfolio
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Everything AI mode renders. Mounted once in App. The boot screen and the
 * eye video are in the main bundle; the 3D world is loaded on demand.
 */
export default function AIModeLayer() {
  const { aiModeState, aiError, attempt, failAIMode } = useAI();
  // A fresh lazy component per attempt, so "Try again" really retries.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const AICorePortal = useMemo(() => lazy(loadAICorePortal), [attempt]);

  const active = aiModeState !== 'inactive';
  const showWorld = (aiModeState === 'portal' || aiModeState === 'world') && !aiError;

  return (
    <>
      {/* Solid backdrop so the page never shows through between steps. */}
      {active && <div className="fixed inset-0 z-[9989] bg-[#020617]" aria-hidden="true" />}
      {active && aiModeState === 'activating' && <AIActivationScreen />}
      {showWorld && (
        <PortalBoundary key={attempt} onError={() => failAIMode('load_failed')}>
          <Suspense fallback={<PortalLoading />}>
            <AICorePortal />
          </Suspense>
        </PortalBoundary>
      )}
      {active && aiError && <AIErrorScreen />}
      <VideoBridge />
    </>
  );
}
