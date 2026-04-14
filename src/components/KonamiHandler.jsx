import React, { useEffect, useState, useRef } from 'react';
import { useCyberAudio } from '../context/SoundContext';

const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp', 
  'ArrowDown', 'ArrowDown', 
  'ArrowLeft', 'ArrowRight', 
  'ArrowLeft', 'ArrowRight', 
  'KeyB', 'KeyA'
];

export default function KonamiHandler({ onUnlock }) {
  const [input, setInput] = useState([]);
  const { playAlert, triggerClassifiedMusic } = useCyberAudio();
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.code;
      setInput((prev) => {
        const next = [...prev, key];
        
        // Track the last N keys typed, where N is the Konami length
        const currentInput = next.slice(-KONAMI_CODE.length);
        
        // Compare
        const isMatch = KONAMI_CODE.every((val, index) => val === currentInput[index]);
        
        if (isMatch) {
          triggerUnlock();
          return []; // Reset input
        }
        return currentInput;
      });
    };

    const triggerUnlock = () => {
      setGlitch(true);
      playAlert();
      triggerClassifiedMusic();
      
      // Intensive glitch timeout
      setTimeout(() => {
        setGlitch(false);
        onUnlock();
      }, 1500);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUnlock, playAlert, triggerClassifiedMusic]);

  if (!glitch) return null;

  return (
    <div className="fixed inset-0 z-[100000] pointer-events-none overflow-hidden bg-black/20">
      <style>{`
        @keyframes fullGlitch {
          0% { clip-path: inset(10% 0 30% 0); transform: translate(-5px, 2px); filter: hue-rotate(90deg); }
          20% { clip-path: inset(40% 0 10% 0); transform: translate(5px, -2px); filter: invert(1); }
          40% { clip-path: inset(0 20% 0 50%); transform: translate(-2px, 5px); }
          60% { clip-path: inset(50% 10% 20% 0); transform: translate(2px, -5px); mix-blend-mode: difference; }
          80% { clip-path: inset(10% 40% 50% 10%); transform: translate(-5px, 2px); }
          100% { clip-path: inset(0 0 0 0); transform: translate(0); }
        }
        .glitch-active {
          animation: fullGlitch 0.15s infinite;
          background: rgba(255, 0, 60, 0.3);
          width: 100vw;
          height: 100vh;
        }
      `}</style>
      <div className="glitch-active" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-[#FF003C] font-black text-6xl md:text-8xl tracking-tighter uppercase italic" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          SYSTEM_OVERRIDE
        </div>
      </div>
    </div>
  );
}
