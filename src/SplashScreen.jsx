import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useCyberAudio } from './context/SoundContext';

// ==============================
// 1. CRT NOISE FILTER
// ==============================
const NoiseFilter = () => (
    <svg className="fixed pointer-events-none w-0 h-0">
        <filter id="noiseFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
    </svg>
);

// ==============================
// 2. MAIN SPLASH SCREEN EXPORT
// ==============================
export default function SplashScreen({
    mainText = "BINORE MOHAPATRA",
    soundUrl = "",
    style = {},
    onComplete
}) {
    const { playBoot, playHover, playBGM } = useCyberAudio();
    const [isBooting, setIsBooting] = useState(true);
    const [isCinematicGlitch, setIsCinematicGlitch] = useState(false);
    const titleControls = useAnimation();
    const sparkControls = useAnimation();
    const screenControls = useAnimation();
    const flashControls = useAnimation();

    // The 'Snap' to 'Glitch' Sequence
    useEffect(() => {
        if (!isBooting) return;

        let timeoutId;
        const base3DShadow = "-5px 5px 0px #00F0FF, 0 0 15px rgba(252,238,10,0.3)";

        const runSequence = async () => {
            // STEP A: Initial 'Neural Snap' Animation
            const isSmallScreen = window.innerWidth < 768;
            await titleControls.start({
                letterSpacing: [isSmallScreen ? "40px" : "150px", "4px"],
                scale: [1.5, 1],
                opacity: [0, 1],
                textShadow: base3DShadow,
                transition: { duration: 1.5, ease: "easeOut" }
            });

            // STEP A.2: The Impact Flash
            flashControls.start({
                opacity: [0, 1, 0],
                transition: { duration: 0.1, ease: "linear" }
            });

            // STEP B: The Glitch Engine
            const triggerGlitch = async () => {
                // Run sparks synchronously with text glitch
                sparkControls.start({
                    opacity: [0, 1, 0, 1, 0],
                    x: [0, 40, -30, 20, 0],
                    scaleX: [1, 1.5, 0.5, 2, 1],
                    transition: { duration: 0.2, ease: "linear" }
                });

                // Realistic Glitch: Skew, Y-axis drop, and irregular framer timing for stutter effect
                await titleControls.start({
                    x: [0, -4, 8, -12, 10, -5, 2, 0],
                    y: [0, -2, 2, -1, 3, -1, 0, 0],
                    skewX: [0, -10, 15, -20, 10, -5, 0, 0],
                    opacity: [1, 0.8, 1, 0.4, 1, 0.9, 1, 1],
                    textShadow: [
                        base3DShadow,
                        "-6px 0px 0px #FF003C, 6px 0px 0px #00F0FF",
                        "8px 0px 0px #FF003C, -8px 0px 0px #00F0FF",
                        "-15px 4px 0px #FF003C, 15px -4px 0px #00F0FF",
                        "4px -2px 0px #FF003C, -4px 2px 0px #00F0FF",
                        "-2px 1px 0px #FF003C, 2px -1px 0px #00F0FF",
                        base3DShadow,
                        base3DShadow
                    ],
                    transition: {
                        duration: 0.35,
                        times: [0, 0.1, 0.2, 0.4, 0.6, 0.8, 0.9, 1],
                        ease: "anticipate"
                    }
                });

                // Re-trigger every 3.5 seconds strictly
                timeoutId = setTimeout(triggerGlitch, 3500);
            };

            // Start the intermittent glitch loop (starts 0.5s after the snap/flash)
            timeoutId = setTimeout(triggerGlitch, 500);
        };

        runSequence();

        return () => clearTimeout(timeoutId);
    }, [isBooting, titleControls, sparkControls, flashControls]);

    const handleConnectClick = async () => {
        if (!isBooting) return;
        setIsBooting(false);

        // Turn on CSS Transition and trigger Audio Climax
        setIsCinematicGlitch(true);
        playBoot();
        playBGM();

        // Unmount exactly after 1000ms glitch finishes
        setTimeout(() => {
            if (onComplete) onComplete();
        }, 1000);
    };

    return (
        <motion.div
            className={`absolute inset-0 overflow-hidden flex flex-col items-center justify-center text-white origin-center ${isCinematicGlitch ? 'system-glitch-transition' : ''}`}
            style={{
                background: "radial-gradient(circle at center, #050a0a 0%, #000000 85%)",
                fontFamily: "var(--font-cyberpunk, 'Orbitron', 'Tektur', sans-serif)",
                ...style
            }}
            initial={{ scale: 1, opacity: 1 }}
            animate={screenControls}
        >
            <NoiseFilter />

            {/* 3. The Grit: SVG Noise Layer Overlay */}
            <div
                className="absolute inset-0 pointer-events-none opacity-10 mix-blend-overlay z-0"
                style={{ filter: "url(#noiseFilter)" }}
            />

            {/* 4. CRT Scanlines Geometry and Moving lines */}
            <div className="absolute inset-0 pointer-events-none crt-lines z-20" />

            {/* Ambient vignette to block screen edges slightly */}
            <div className="absolute inset-0 pointer-events-none crt-overlay z-20 opacity-80 mix-blend-multiply" />

            {/* UI Content Layer */}
            <div className="relative z-30 flex flex-col items-center justify-center w-full h-full p-4 md:p-8 text-center select-none">

                {/* Layer 4: The Thunder/Cyber-Sparks */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[60%] pointer-events-none z-0">
                    <motion.div
                        initial={{ opacity: 0 }} animate={sparkControls}
                        className="absolute top-[30%] left-[15%] h-[2px] w-[90px] bg-white shadow-[0_0_12px_4px_#00F0FF]"
                    />
                    <motion.div
                        initial={{ opacity: 0 }} animate={sparkControls}
                        className="absolute top-[65%] right-[20%] h-[1px] w-[120px] bg-white shadow-[0_0_15px_3px_#00F0FF]"
                    />
                    <motion.div
                        initial={{ opacity: 0 }} animate={sparkControls}
                        className="absolute top-[45%] left-[55%] h-[2px] w-[50px] bg-white shadow-[0_0_8px_2px_#00F0FF]"
                    />
                    <motion.div
                        initial={{ opacity: 0 }} animate={sparkControls}
                        className="absolute top-[80%] left-[30%] h-[1px] w-[100px] bg-white shadow-[0_0_10px_4px_#00F0FF]"
                    />
                </div>

                {/* Layer 5: Typography - Main Title with Relic Chromatic Glitch */}
                <motion.h1
                    className="relative z-10 font-black uppercase m-0 leading-[0.82] whitespace-pre-line text-center"
                    style={{
                        fontSize: "clamp(2.8rem, 9.5vw, 10rem)",
                        color: "#FCEE0A", // Bright Neon Yellow
                        textShadow: "-4px 4px 0px #00F0FF, 0 0 15px rgba(252,238,10,0.3)",
                        willChange: "transform, text-shadow, opacity, letter-spacing, skew",
                        maxWidth: "100vw",
                        padding: "0 10px"
                    }}
                    initial={{ scale: 1.5, letterSpacing: window.innerWidth < 768 ? "2px" : "150px", opacity: 0 }}
                    animate={titleControls}
                >
                    {mainText.split(' ').join('\n')}
                </motion.h1>

                {/* Layer 5: Subtitle */}
                <motion.h2
                    className="relative z-10 mt-4 tracking-[0.5em] uppercase font-bold text-lg md:text-3xl"
                    style={{
                        color: "#00F0FF",
                        textShadow: "0px 0px 10px rgba(0, 240, 255, 0.7)",
                        fontFamily: "'Orbitron', 'Inter', sans-serif"
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5, duration: 1.5 }}
                >
                    FULL STACK DEVELOPER
                </motion.h2>

                {/* Layer 5: Cyberpunk Menu Button (Bottom Center) */}
                <div className="absolute bottom-[10%] w-full flex justify-center z-50">
                    <motion.button
                        onClick={handleConnectClick}
                        onMouseEnter={playHover}
                        className="group relative flex items-center gap-2 bg-transparent border-[1px] border-[#ff3e3e] text-[#ff3e3e] font-sans text-xs md:text-sm font-bold tracking-[0.15em] px-5 py-2 cursor-pointer outline-none hover:bg-[#ff3e3e]/10 transition-colors duration-300 shadow-[0_0_8px_rgba(255,62,62,0.15)]"
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        whileHover={{ scale: 1.02, textShadow: "0px 0px 8px rgba(255, 62, 62, 0.6)" }}
                    >
                        <span>PRESS</span>

                        {/* The Cyan Game Icon inside the button */}
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00F0FF" strokeWidth="1.5" className="drop-shadow-[0_0_6px_rgba(0,240,255,0.6)]">
                            {/* Outer box */}
                            <rect x="2" y="2" width="20" height="20" rx="4" />
                            {/* Inner Enter/Tray line */}
                            <path d="M7 10 v4 h10 v-4" />
                        </svg>

                        <span>TO CONTINUE.</span>

                        {/* Aesthetic corner brackets */}
                        <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-[#ff3e3e]"></div>
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-[#ff3e3e]"></div>
                    </motion.button>
                </div>
            </div>

            {/* Layer 6: Neural Flash Layer (Triggers after snap) */}
            <motion.div
                className="absolute inset-0 pointer-events-none bg-white z-[99]"
                initial={{ opacity: 0 }}
                animate={flashControls}
            />
        </motion.div>
    );
}
