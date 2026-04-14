import React from 'react';
import { useCyberAudio } from '../../context/SoundContext';
import { motion } from 'framer-motion';

export default function VolumeToggle() {
    const { isMuted, toggleMute, playHover, playClick } = useCyberAudio();

    const handleClick = () => {
        playClick();
        toggleMute();
    };

    return (
        <motion.button
            onClick={handleClick}
            onMouseEnter={playHover}
            onTouchStart={playHover}
            // Safe-area-inset ensures the button clears the iOS Safari home bar
            // and Android nav buttons without being cropped or overlapping native UI
            className="fixed right-4 z-[9999] group flex items-center justify-center font-mono text-[10px] tracking-widest uppercase transition-all duration-200 outline-none select-none tactical-hover vol-toggle"
            style={{
                bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
                background: '#050a0a',
                border: `1px solid ${isMuted ? '#FF003C' : '#00F0FF'}`,
                color: isMuted ? '#FF003C' : '#00F0FF',
                padding: '6px 12px',
                clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                boxShadow: isMuted ? 'none' : '0 0 10px rgba(0,240,255,0.2)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
        >
            <div className="absolute inset-0 z-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="relative z-10 flex items-center gap-2">
                <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                    [ VOL_{isMuted ? 'OFF' : 'ON'} ]
                </span>
                {/* Tactical Indicator Dot */}
                <div 
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                        background: isMuted ? '#FF003C' : '#00F0FF',
                        boxShadow: isMuted ? 'none' : '0 0 5px #00F0FF'
                    }}
                />
            </div>
            
            {/* Corner Bracket Detail */}
            <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l ${isMuted ? 'border-[#FF003C]' : 'border-[#00F0FF]'}`}></div>
            <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r ${isMuted ? 'border-[#FF003C]' : 'border-[#00F0FF]'}`}></div>
        </motion.button>
    );
}
