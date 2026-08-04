import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, RefreshCw, Radio, Terminal } from 'lucide-react';

const RobotAssistant = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    'Initializing AI Core Matrix...',
    'Supabase Database: CONNECTED',
    'Neural Link: ESTABLISHED',
    'AIML Engine: ONLINE',
  ]);
  const [diagnosticProgress, setDiagnosticProgress] = useState(0);
  const [eyeColor, setEyeColor] = useState('#03e9f4'); // Cyan default
  const [isHovered, setIsHovered] = useState(false);

  const runDiagnostics = () => {
    if (isScanning) return;
    setIsScanning(true);
    setDiagnosticProgress(0);
    setEyeColor('#7B2CBF'); // Purple eye during scan

    const newLogs = [
      'Accessing local memory channels...',
      'Verifying academic credentials...',
      'Optimizing WebGL shaders...',
      'Injecting robotic micro-routines...',
      'Diagnostic Completed: 100% HEALTHY',
    ];

    let currentLogIndex = 0;
    const logInterval = setInterval(() => {
      if (currentLogIndex < newLogs.length) {
        setLogs((prev) => [...prev.slice(-3), `> ${newLogs[currentLogIndex]}`]);
        currentLogIndex++;
      }
    }, 1000);

    const progressInterval = setInterval(() => {
      setDiagnosticProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(logInterval);
          setIsScanning(false);
          setEyeColor('#03e9f4'); // Reset eye color
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  return (
    <div className="glass p-6 md:p-8 flex flex-col items-center gap-6 relative overflow-hidden border border-gray-700/50 shadow-[0_0_30px_rgba(3,233,244,0.05)] w-full max-w-md mx-auto">
      {/* Laser scanline overlay across the card */}
      {isScanning && (
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent z-10 shadow-[0_0_10px_#03e9f4]"
          initial={{ top: 0 }}
          animate={{ top: '100%' }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Floating Robot Chassis */}
      <motion.div
        className="relative cursor-pointer"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        onMouseEnter={() => {
          setIsHovered(true);
          setEyeColor('#FF2E63'); // Change to pink on direct hover
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          setEyeColor(isScanning ? '#7B2CBF' : '#03e9f4');
        }}
        onClick={runDiagnostics}
      >
        {/* Glowing aura around robot */}
        <div
          className="absolute inset-0 rounded-full blur-xl transition-all duration-500 opacity-30"
          style={{
            background: isHovered 
              ? 'radial-gradient(#FF2E63 0%, transparent 70%)' 
              : isScanning 
                ? 'radial-gradient(#7B2CBF 0%, transparent 70%)' 
                : 'radial-gradient(#03e9f4 0%, transparent 70%)',
          }}
        />

        {/* Robot Head SVG */}
        <svg width="160" height="160" viewBox="0 0 160 160" className="relative z-10">
          {/* Outer rotating bracket ring */}
          <motion.g
            animate={{ rotate: isHovered ? -360 : isScanning ? -180 : -60 }}
            transition={{ duration: isHovered ? 3 : 8, repeat: Infinity, ease: 'linear' }}
            transform-origin="80 80"
          >
            <circle cx="80" cy="80" r="70" fill="none" stroke={eyeColor} strokeWidth="1" strokeDasharray="10, 15" opacity="0.4" />
          </motion.g>

          {/* Inner rotating tech-ring */}
          <motion.g
            animate={{ rotate: isHovered ? 360 : isScanning ? 180 : 45 }}
            transition={{ duration: isHovered ? 2.5 : 6, repeat: Infinity, ease: 'linear' }}
            transform-origin="80 80"
          >
            <circle cx="80" cy="80" r="60" fill="none" stroke={eyeColor} strokeWidth="2" strokeDasharray="40, 10, 20, 10" opacity="0.7" />
            <path d="M 80,15 L 80,20 M 80,140 L 80,145 M 15,80 L 20,80 M 140,80 L 145,80" stroke={eyeColor} strokeWidth="2" />
          </motion.g>

          {/* Robot Core/Helmet Shape */}
          <path
            d="M 50,45 C 50,45 80,35 110,45 C 125,52 130,70 130,90 C 130,110 115,125 80,125 C 45,125 30,110 30,90 C 30,70 35,52 50,45 Z"
            fill="#0b1329"
            stroke={eyeColor}
            strokeWidth="3"
            className="transition-colors duration-500"
          />

          {/* Cybernetic Neck */}
          <path d="M 70,125 L 70,140 L 90,140 L 90,125" fill="#1c2541" stroke={eyeColor} strokeWidth="2" />
          <line x1="65" y1="133" x2="95" y2="133" stroke={eyeColor} strokeWidth="2" strokeDasharray="3, 3" />

          {/* Ears/Antenna Connectors */}
          <rect x="22" y="75" width="8" height="30" rx="3" fill="#1c2541" stroke={eyeColor} strokeWidth="2" />
          <rect x="130" y="75" width="8" height="30" rx="3" fill="#1c2541" stroke={eyeColor} strokeWidth="2" />

          {/* Glass Visor */}
          <path
            d="M 40,65 C 40,65 80,55 120,65 C 125,75 125,95 120,105 C 115,110 80,115 40,105 C 35,95 35,75 40,65 Z"
            fill="#030712"
            stroke={eyeColor}
            strokeWidth="1.5"
            opacity="0.85"
            className="transition-colors duration-500"
          />

          {/* Main Robotic Eye Lens */}
          <circle cx="80" cy="85" r="16" fill="#111827" stroke={eyeColor} strokeWidth="2" />
          
          {/* Glowing Aperture / Eye Core */}
          <motion.circle
            cx="80"
            cy="85"
            r={isHovered ? 8 : 6}
            fill={eyeColor}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="transition-colors duration-500"
          />

          {/* Laser scanning dot inside eye */}
          {isScanning && (
            <motion.circle
              cx="80"
              cy="85"
              r="2"
              fill="#ffffff"
              animate={{ x: [-8, 8, -8], y: [-4, 4, -4] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* Forehead sensor node */}
          <circle cx="80" cy="50" r="3" fill={eyeColor} className="transition-colors duration-500 animate-pulse" />
        </svg>
      </motion.div>

      {/* Robot Speech/Diagnostics Panel */}
      <div className="w-full space-y-3 relative z-10">
        <div className="flex items-center justify-between border-b border-gray-700/50 pb-2">
          <div className="flex items-center gap-2 font-mono text-xs text-neon-cyan">
            <Cpu size={14} className={isScanning ? 'animate-spin' : ''} />
            <span>AI CORE MODEL v4.0</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`inline-block w-2 h-2 rounded-full ${isScanning ? 'bg-neon-pink animate-ping' : 'bg-green-500 animate-pulse'}`} />
            <span className="text-[10px] font-mono text-gray-400">{isScanning ? 'SCANNING' : 'ONLINE'}</span>
          </div>
        </div>

        {/* Live Logs Terminal Screen */}
        <div className="bg-black/80 rounded-md p-3 font-mono text-[11px] text-green-400 h-28 overflow-y-auto space-y-1.5 border border-gray-800">
          <div className="flex items-center gap-1 text-gray-500 border-b border-gray-900 pb-1 mb-1">
            <Terminal size={10} />
            <span>Diagnostic Logs Console</span>
          </div>
          {logs.map((log, index) => (
            <div key={index} className="leading-relaxed whitespace-pre-wrap">
              {log}
            </div>
          ))}
          <div className="animate-pulse inline-block w-1.5 h-3.5 bg-green-400 ml-0.5 align-middle" />
        </div>

        {/* Progress bar of Diagnostic scan */}
        {isScanning && (
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[10px] text-gray-400">
              <span>SCANNING MATRIX SYSTEM...</span>
              <span>{diagnosticProgress}%</span>
            </div>
            <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
              <motion.div
                className="bg-neon-cyan h-full shadow-[0_0_8px_#03e9f4]"
                style={{ width: `${diagnosticProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Run Diagnostics button */}
        <button
          onClick={runDiagnostics}
          disabled={isScanning}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md font-mono text-xs border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all duration-300 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-neon-cyan shadow-[0_0_10px_rgba(3,233,244,0.1)] hover:shadow-[0_0_15px_rgba(3,233,244,0.3)]"
        >
          {isScanning ? (
            <>
              <RefreshCw className="animate-spin" size={14} />
              <span>Analyzing Memory...</span>
            </>
          ) : (
            <>
              <Radio className="animate-pulse" size={14} />
              <span>Trigger System Diagnostic</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RobotAssistant;
