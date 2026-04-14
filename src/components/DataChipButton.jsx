import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCyberAudio } from '../context/SoundContext';

export default function DataChipButton() {
    const { playAlert, playClick, playHover } = useCyberAudio();
    const [state, setState] = useState('idle'); // idle, extracting, success
    const [terminalLines, setTerminalLines] = useState([]);

    const runSequence = async () => {
        if (state !== 'idle') return;
        
        playAlert();
        setState('extracting');
        setTerminalLines(['[ SYSTEM ] : ACCESSING_DATA_PORT_0X77...']);

        const wait = (ms) => new Promise(res => setTimeout(res, ms));

        await wait(600);
        setTerminalLines(prev => [...prev, '[ CRITICAL ] : EXTRACTING_ENGRUM_DATA...']);
        
        await wait(900);
        setTerminalLines(prev => [...prev, '[ DECRYPT ] : DECRYPTING_RESUME.docx...']);
        
        await wait(700);
        setTerminalLines(prev => [...prev, '[ SUCCESS ] : BYTES_TRANSFERRED: 1.2MB']);
        
        setState('success');
        
        // Trigger actual download
        const link = document.createElement('a');
        link.href = '/resume.docx'; // Updated to match uploaded file
        link.download = 'Binore_Mohapatra_Resume.docx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Reset after a delay
        await wait(3000);
        setState('idle');
        setTerminalLines([]);
    };

    return (
        <div className="relative group">
            {/* The "Hardware Chip" Button */}
            <motion.button
                onClick={runSequence}
                onMouseEnter={playHover}
                disabled={state !== 'idle'}
                className="relative flex items-center gap-4 bg-[#1a1a1a] border border-[#333] p-4 transition-all duration-300 overflow-hidden"
                style={{
                    clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                    minWidth: '220px',
                    cursor: state === 'idle' ? 'none' : 'wait',
                }}
                whileHover={state === 'idle' ? { scale: 1.02, borderColor: '#FF003C' } : {}}
                whileTap={{ scale: 0.98 }}
            >
                {/* Metallic Texture / Brushed Surface */}
                <div className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        background: 'linear-gradient(45deg, #eee 0%, transparent 40%, #eee 60%, transparent 100%)',
                        backgroundSize: '200% 200%',
                    }}
                />

                {/* Gold Pins (Left Side) */}
                <div className="flex flex-col gap-1 w-6">
                    {[1, 2, 3, 4].map(idx => (
                        <div key={idx} className="h-1 w-full" 
                            style={{ 
                                background: 'linear-gradient(90deg, #D4AF37 0%, #FFD700 50%, #B8860B 100%)',
                                boxShadow: '0 0 4px rgba(212, 175, 55, 0.4)'
                            }} 
                        />
                    ))}
                </div>

                {/* Status LED */}
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                    style={{
                        background: state === 'idle' ? '#444' : (state === 'extracting' ? '#F00' : '#0F0'),
                        boxShadow: state === 'idle' ? 'none' : `0 0 8px ${state === 'extracting' ? '#F00' : '#0F0'}`,
                        transition: 'all 0.3s ease'
                    }}
                />

                <div className="flex flex-col items-start leading-none gap-1">
                    <span className="text-[10px] tracking-[0.3em] text-gray-500 uppercase font-mono">
                        Hardware_ID: 0x77_BIM
                    </span>
                    <span className="text-sm font-bold tracking-[0.1em] text-white uppercase italic"
                        style={{ fontFamily: "'Orbitron', sans-serif" }}>
                        {state === 'idle' ? 'EXTRACT_RESUME' : (state === 'extracting' ? 'EXTRACTING...' : 'ENGRUM_SECURED')}
                    </span>
                </div>
            </motion.button>

            {/* Terminal Output (Overlay) */}
            <AnimatePresence>
                {state !== 'idle' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute left-full ml-4 top-0 w-[240px] bg-black/90 p-4 border border-[#FF003C] font-mono text-[10px] leading-tight z-50 pointer-events-none"
                        style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)' }}
                    >
                        <div className="text-[#FF003C] mb-2 uppercase tracking-widest border-b border-[#FF003C]/30 pb-1">
                            &gt; LOG_STREAM
                        </div>
                        <div className="flex flex-col gap-1">
                            {terminalLines.map((line, i) => (
                                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    {line}
                                </motion.div>
                            ))}
                            {state === 'extracting' && (
                                <div className="animate-pulse text-gray-600">_</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
