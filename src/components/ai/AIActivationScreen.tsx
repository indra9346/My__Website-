import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { useAI } from '../../context/AIContext';
import { sfx } from './sfx';

const LOG_TIMES = [600, 1400, 2200];
const LOG_TEXTS = [
  '> INITIALIZING ADVANCED AI ROBOTICS DECK...',
  '> ENGAGING DIRECT COGNITIVE PATHWAY...',
  '> REALITY DECONSTRUCTION OVERRIDE SEQUENCE LOADED.',
];

/**
 * Boot screen shown the instant "Go Into AI Mode" is clicked. It is part of
 * the main bundle (no three.js), so it never waits for the 3D world to load.
 */
export default function AIActivationScreen() {
  const { reducedMotion } = useAI();
  const [terminalLogs, setTerminalLogs] = useState<string[]>(() => (reducedMotion ? LOG_TEXTS : []));

  useEffect(() => {
    sfx.playEntryBgm();
    if (reducedMotion) return;
    const timers = LOG_TIMES.map((time, index) =>
      window.setTimeout(() => {
        setTerminalLogs((prev) => [...prev, LOG_TEXTS[index]]);
        sfx.playBeep(550 + index * 40, 0.06, 0.015);
      }, time),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [reducedMotion]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Entering AI mode"
      className={`fixed inset-0 z-[9990] flex flex-col items-center justify-center p-4 bg-[#030712] text-white font-sans select-none ${
        reducedMotion ? '' : 'ai-portal-glitch'
      }`}
    >
      <div className="border border-neon-cyan/30 bg-black/80 max-w-sm sm:max-w-md w-[92%] rounded-lg p-5 font-mono text-sm shadow-[0_0_20px_rgba(3,233,244,0.1)] relative">
        <div className="absolute -top-1 -left-1 w-4 h-4 border-t border-l border-neon-cyan" />
        <div className="absolute -top-1 -right-1 w-4 h-4 border-t border-r border-neon-cyan" />
        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b border-l border-neon-cyan" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b border-r border-neon-cyan" />

        <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-2 text-neon-cyan text-xs sm:text-sm">
            <Shield className="animate-pulse" size={14} />
            <span>AI GATEWAY OVERRIDE</span>
          </div>
          <span className="text-[10px] sm:text-xs text-red-500 animate-ping font-bold">ACTIVE</span>
        </div>

        <div className="h-36 sm:h-44 flex flex-col gap-2 overflow-y-auto text-green-400 text-[10px] sm:text-xs leading-relaxed" aria-live="polite">
          <div>&gt; System override initialized...</div>
          {terminalLogs.map((log, idx) => (
            <div key={idx} className="animate-fade-in">
              {log}
            </div>
          ))}
          <div className="animate-pulse inline-block w-1.5 h-3.5 bg-green-400 align-middle" />
        </div>
      </div>
      <p className="mt-4 text-[10px] font-mono text-gray-500 tracking-wider hidden sm:block">Press Esc to return to the portfolio</p>
    </div>
  );
}
