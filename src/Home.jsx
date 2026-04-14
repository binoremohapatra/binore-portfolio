/**
 * Home.jsx — Cyberpunk 2077-Inspired Portfolio
 * 
 * Architecture:
 *  - Phase 0 (GLOBAL):   High-altitude hex-point-cloud Earth. Framer scroll drives camera altitude.
 *  - Phase 1 (DESCENT):  Cinematic camera flight via useFrame lerp; latitude/longitude interpolation.
 *  - Phase 2 (CITY):     Procedural InstancedMesh city grid fades in below camera threshold.
 *                        A pulsing beacon marks the exact Delhi coordinate.
 *  - UI:                 Framer AnimatePresence + staggerChildren "glitch-snap" HUD boot sequence.
 *  - Scroll:             scroll-snap-type on root; sections snap into view cleanly.
 *
 * Dependencies (add to package.json):
 *   @react-three/fiber ^8
 *   @react-three/drei ^9
 *   framer-motion ^11
 *   three ^0.165
 */

'use client';

import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import HolographicUplink from './components/HolographicUplink';
import NeuralMind from './components/NeuralMind';
import DataArchives from './components/DataArchives';
import KonamiHandler from './components/KonamiHandler';
import DataChipButton from './components/DataChipButton';
import StaticFallback from './components/StaticFallback';
import { useCyberAudio } from './context/SoundContext';
import { useQuality } from './context/QualityContext';


// ─────────────────────────────────────────────────────────
// CUSTOM UI COMPONENTS (Cursor, Text Scramble, Glitch CSS)
// ─────────────────────────────────────────────────────────

const CHARS = '!<>-_\\/[]{}—=+*^?#________';
function ScrambleText({ text, delay = 0 }) {
    const ref = useRef();
    const inView = useInView(ref, { once: true, amount: 0 });
    const [display, setDisplay] = useState(text.replace(/./g, '_'));

    useEffect(() => {
        if (!inView) return;
        let frame;
        let start = -1;
        const duration = 700; // ms to decode
        const timer = setTimeout(() => {
            const run = (now) => {
                if (start === -1) start = now;
                const progress = Math.min(1, (now - start) / duration);
                let result = '';
                for (let i = 0; i < text.length; i++) {
                    if (text[i] === ' ' || text[i] === '\n') {
                        result += text[i];
                        continue;
                    }
                    if (progress > (i / text.length)) {
                        result += text[i];
                    } else {
                        result += CHARS[Math.floor(Math.random() * CHARS.length)];
                    }
                }
                setDisplay(result);
                if (progress < 1) frame = requestAnimationFrame(run);
            };
            frame = requestAnimationFrame(run);
        }, delay * 1000);

        return () => { clearTimeout(timer); cancelAnimationFrame(frame); };
    }, [inView, text, delay]);

    return <span ref={ref} className="whitespace-pre-line">{display}</span>;
}

function CustomCursor() {
    const cursorRef = useRef(null);
    const [hovering, setHovering] = useState(false);

    useEffect(() => {
        const move = (e) => {
            if (cursorRef.current) cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        };
        const over = (e) => {
            setHovering(!!e.target.closest('button, a, [data-interactive]'));
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseover', over);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseover', over);
        };
    }, []);

    return (
        <div
            ref={cursorRef}
            className="fixed top-0 left-0 pointer-events-none z-[99999] flex items-center justify-center transition-transform duration-[10ms] ease-out will-change-transform"
            style={{ transform: 'translate3d(-100px, -100px, 0)' }}
        >
            <div className={`relative transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${hovering ? 'w-8 h-8 rotate-90 scale-110' : 'w-4 h-4 rotate-0 scale-100'}`}>
                <div className={`absolute inset-0 m-auto flex items-center justify-center transition-all ${hovering ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="w-[3px] h-[3px] bg-red-500 shadow-[0_0_8px_#F00]" />
                </div>
                <div className={`absolute top-0 left-0 w-[6px] h-[6px] border-l-2 border-t-2 transition-colors ${hovering ? 'border-cyan-400' : 'border-red-500'}`} />
                <div className={`absolute top-0 right-0 w-[6px] h-[6px] border-r-2 border-t-2 transition-colors ${hovering ? 'border-cyan-400' : 'border-red-500'}`} />
                <div className={`absolute bottom-0 left-0 w-[6px] h-[6px] border-l-2 border-b-2 transition-colors ${hovering ? 'border-cyan-400' : 'border-red-500'}`} />
                <div className={`absolute bottom-0 right-0 w-[6px] h-[6px] border-r-2 border-b-2 transition-colors ${hovering ? 'border-cyan-400' : 'border-red-500'}`} />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// CONSTANTS & MATH
// ─────────────────────────────────────────────────────────

const COLORS = {
    yellow: '#FCEE0A',
    cyan: '#00F0FF',
    red: '#FF003C',
    black: '#000000',
};



// ─────────────────────────────────────────────────────────
// SCAN LINE EFFECT (post-process via CSS overlay)
// handled in HTML layer for performance
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// GLITCH ANIMATION VARIANTS
// ─────────────────────────────────────────────────────────
const glitchContainer = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.07,
            delayChildren: 0.15,
        }
    }
};

const glitchItem = {
    hidden: { opacity: 0, x: -16, skewX: 8, filter: 'blur(4px)' },
    show: {
        opacity: 1, x: 0, skewX: 0, filter: 'blur(0px)',
        transition: {
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1], // Weightless cinematic tactical curve
        }
    }
};

const hudBoot = {
    hidden: { opacity: 0, scale: 0.96 },
    show: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.35,
            ease: [0.22, 1, 0.36, 1],
            staggerChildren: 0.05,
        }
    },
    exit: { opacity: 0, scale: 1.04, transition: { duration: 0.2 } }
};

// ─────────────────────────────────────────────────────────
// PROJECTS DATA
// ─────────────────────────────────────────────────────────
const PROJECTS = [
    {
        id: '01',
        title: 'REACTORX',
        type: 'E-COMMERCE PLATFORM',
        tags: ['Spring Boot', 'React', 'PostgreSQL'],
        desc: 'Full-stack shopping platform with Spring Boot REST APIs, React storefront, JWT authentication, and PostgreSQL. Built for real traffic and scale.',
        accent: COLORS.yellow,
    },
    {
        id: '02',
        title: 'CIVICSOLVER',
        type: 'AI CIVIC GRIEVANCE',
        tags: ['Python', 'Spring Boot', 'ML'],
        desc: 'Citizens report issues, ML models triage severity, system auto-routes to the right authorities.',
        accent: COLORS.cyan,
        experimental: true,
    },
    {
        id: '03',
        title: 'MAEVE AI',
        type: 'LOCAL AI ASSISTANT',
        tags: ['Ollama', 'Python', 'Local LLM'],
        desc: 'A fully private, on-device AI assistant powered by Ollama. No cloud, no data leaks — runs entirely on local hardware.',
        accent: COLORS.red,
        experimental: true,
    },
    {
        id: '04',
        title: 'SURAKSHA SETU',
        type: 'GEOSPATIAL AI',
        tags: ['Geospatial AI', 'Flutter', 'PostgreSQL'],
        desc: 'Urban intelligence platform that fuses satellite data, ML models, and live sensor feeds into a real-time geospatial layer for smart city infrastructure.',
        accent: COLORS.yellow,
    },
    {
        id: '05',
        title: 'DELHI KAVACH',
        type: 'AI NAVIGATION & SAFETY',
        tags: ['Java', 'Spring Boot', 'Flutter', 'Geospatial'],
        desc: 'Flagship: AI-driven safety navigation system for Delhi. Fuses real-time crime data, geospatial intelligence, and live feeds into a route-safety engine.',
        accent: COLORS.cyan,
    },
    {
        id: '06',
        title: 'MAVIS AI',
        type: 'AI · EDUCATION',
        tags: ['Ollama', 'FastAPI', 'RAG'],
        desc: 'AI-Powered personalized tutor. Uses local LLM inference and a RAG pipeline to adapt to how YOU learn. No cloud, no lock-in.',
        accent: COLORS.yellow,
        shipped: true,
    },
];

// TECH_STACK data has been moved to TechRadar3D.jsx for the 3D Holographic Radar.


const PAYLOAD_DATA = {
    '01': {
        title: 'How I Built a Geospatial AI Safety Engine in Semester 3',
        body: 'The problem was clear: dynamic urban safety. Standard maps route for speed, not safety. I architected Delhi Kavach to fuse real-time crime data, AQI, and traffic. The biggest bottleneck was API rate limits on geospatial data, which forced me to build an aggressive caching layer. It taught me that real-world systems break differently than academic projects.'
    },
    '02': {
        title: 'Why I Stopped Using Cloud AI and Built Everything Locally',
        body: 'Cloud APIs are fast but they are rented. I wanted ownership. I shifted my entire stack to my custom PC rig, running Ollama with Llama 3 and Mistral. It gave me zero-latency inference for my systems and absolute data sovereignty. When you wire the hardware yourself, you realize how much power you actually have without relying on external servers.'
    },
    '03': {
        title: 'Making a 3D Character Feel Alive – Maeve AI',
        body: "Maeve AI is not a chatbot; it's an interface. Using React Three Fiber and VRM models, I mapped procedural animations to conversation states. If the local LLM generates a hesitant response, Maeve's bone structure shifts to reflect that. The transition from a flat screen to a spatial, persona-driven entity was the hardest architectural challenge I've faced."
    }
};

function TypingBody({ text }) {
    const [display, setDisplay] = useState('');
    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            setDisplay(text.slice(0, i));
            i++;
            if (i > text.length) clearInterval(interval);
        }, 15);
        return () => clearInterval(interval);
    }, [text]);

    return (
        <div className="relative">
            <p className="font-mono text-base md:text-lg leading-relaxed text-[#0F0] glow-green">
                {display}<span className="inline-block w-2 h-4 bg-[#0F0] ml-1 animate-pulse" />
            </p>
            <style>{`
                .glow-green { text-shadow: 0 0 5px rgba(0, 255, 0, 0.5); }
            `}</style>
        </div>
    );
}

function PayloadReader({ id, onBack }) {
    const data = PAYLOAD_DATA[id];
    const { playClick, playHover } = useCyberAudio();

    if (!data) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-8 pb-10"
        >
            <div className="sticky top-0 bg-[#050505] z-10 py-4 border-b border-[#222] flex justify-between items-center">
                <button 
                    onClick={() => { playClick(); onBack(); }}
                    onMouseEnter={playHover}
                    className="group flex items-center gap-2 text-xs font-mono text-[#444] hover:text-[#FF003C] transition-colors"
                >
                    <span>[ &lt;- RETURN_TO_INDEX ]</span>
                </button>
                <div className="text-[10px] font-mono text-gray-600 tracking-widest uppercase">
                    FILE_REF: ARASAKA_INTEL_P{id}
                </div>
            </div>

            <div className="max-w-[800px] mx-auto w-full">
                <motion.h3 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter mb-8 leading-none"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}
                >
                    {data.title}
                </motion.h3>

                <TypingBody text={data.body} />
            </div>

            {/* CRT Scanline Local Overly */}
            <div className="fixed inset-0 pointer-events-none z-20 opacity-10"
                 style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} />
        </motion.div>
    );
}

// ─── ARASAKA CLASSIFIED MODAL ────────────────────────────────────────────────
function ArasakaModal({ onClose }) {
    const { playClick, playHover, stopClassifiedMusic } = useCyberAudio();
    const [activePayload, setActivePayload] = useState(null);
    
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200000] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-xl"
        >
            <div className="absolute inset-0 pointer-events-none opacity-20"
                 style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, #f00 1px, #f00 2px)' }} />
            
            <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="relative w-full max-w-5xl bg-[#050505] border-2 border-[#FF003C] p-8 md:p-12 overflow-y-auto max-h-[90vh]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 40px), calc(100% - 40px) 100%, 0 100%)' }}
            >
                {/* Header */}
                <div className="flex justify-between items-start border-b border-[#FF003C] pb-6 mb-10">
                    <div>
                        <div className="text-[#FF003C] text-xs font-mono tracking-[0.5em] mb-2 animate-pulse">
                            [ WARNING: CLASSIFIED_ACCESS_DETECTED ]
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter"
                            style={{ fontFamily: "'Orbitron', sans-serif" }}>
                            Arasaka Clearance: <span className="text-[#FCEE0A]">GRANTED</span>
                        </h2>
                    </div>
                    <button 
                        onClick={() => { playClick(); stopClassifiedMusic(); onClose(); }}
                        className="text-[#FF003C] border border-[#FF003C] px-4 py-2 hover:bg-[#FF003C] hover:text-black transition-colors font-mono text-xs"
                    >
                        [ DISCONNECT ]
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {!activePayload ? (
                        <motion.div 
                            key="grid"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col gap-12"
                        >
                            <div className="bg-[#FF003C]/10 p-6 border-l-4 border-[#FF003C]">
                                <p className="font-mono text-sm text-[#FF003C] leading-relaxed">
                                    Welcome, Netrunner. You found the hidden node. The following files have been decrypted from the private Arasaka server cluster. Read carefully. Knowledge is a weapon.
                                </p>
                            </div>

                            {/* Blog Posts */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { id: '01', title: 'How I Built a Geospatial AI Safety Engine in Semester 3', desc: 'The full story of Delhi Kavach — the problem, the architecture, what broke, and what worked.' },
                                    { id: '02', title: 'Why I Stopped Using Cloud AI and Built Everything Locally', desc: 'How I run Llama 3 and Mistral on my custom PC, and why local AI matters for privacy.' },
                                    { id: '03', title: 'Making a 3D Character Feel Alive — Maeve AI Dev Log', desc: 'Technical process of building a VRoid companion that reacts in real-time to conversation state.' },
                                ].map((post, i) => (
                                    <motion.div 
                                        key={post.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 + i * 0.2 }}
                                        onMouseEnter={playHover}
                                        onClick={() => { playClick(); setActivePayload(post.id); }}
                                        className="group p-6 bg-black border border-[#222] hover:border-[#FCEE0A] transition-colors cursor-pointer"
                                        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 80% 100%, 0 100%)' }}
                                    >
                                        <div className="text-[10px] text-[#FCEE0A] mb-3 font-mono tracking-widest">[ DECRYPTED_INTEL_{post.id} ]</div>
                                        <h4 className="text-lg font-bold text-white mb-4 leading-tight group-hover:text-[#FCEE0A]">
                                            <ScrambleText text={post.title} delay={0.8 + i * 0.2} />
                                        </h4>
                                        <p className="text-xs text-gray-500 font-mono leading-relaxed truncate-2-lines">{post.desc}</p>
                                        <div className="mt-6 text-[10px] text-[#FF003C] font-mono group-hover:translate-x-2 transition-transform">
                                            [ READ_FULL_PAYLOAD → ]
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <PayloadReader key="reader" id={activePayload} onBack={() => setActivePayload(null)} />
                    )}
                </AnimatePresence>

                <div className="mt-16 text-center text-[10px] font-mono text-[#444] tracking-[0.4em]">
                    ARASAKA_NETWORK_V4.2.0 // ESTABLISHED_ENCRYPTED_TUNNEL
                </div>
            </motion.div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────
export default function Home() {
    const { playHover, playClick, triggerRebelPath } = useCyberAudio();
    const { isStaticMode, setStaticMode } = useQuality();
    const containerRef = useRef(null);
    const [hudReady, setHudReady] = useState(false);
    const [section, setSection] = useState(0); 
    const [isClassified, setIsClassified] = useState(false);
    const progressRef = useRef(0); 


    // Track which snap section is visible
    const [scrollSection, setScrollSection] = useState(0);

    // Scroll within the globe section drives camera progress
    const globeSectionRef = useRef(null);
    const { scrollYProgress: globeScroll } = useScroll({
        target: globeSectionRef,
        offset: ['start start', 'end end'],
    });

    // Spring-smooth the progress value
    const smoothProgress = useSpring(globeScroll, { stiffness: 60, damping: 22, mass: 1 });

    // Mobile detect logic
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // Write spring value into ref for r3f to read each frame
    useEffect(() => {
        return smoothProgress.on('change', v => { progressRef.current = v; });
    }, [smoothProgress]);

    // Boot HUD after mount
    useEffect(() => {
        // Trigger the high-energy Rebel Path BGM switch upon OS init
        triggerRebelPath();
        
        const t = setTimeout(() => setHudReady(true), 400);
        return () => clearTimeout(t);
    }, [triggerRebelPath]);

    // Section tracking via IntersectionObserver
    const heroRef = useRef(null);
    const projectsRef = useRef(null);
    const commLinkRef = useRef(null);

    useEffect(() => {
        const opts = { threshold: 0.4 };
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                if (e.target === heroRef.current) setScrollSection(0);
                if (e.target === globeSectionRef.current) setScrollSection(1);
                if (e.target === projectsRef.current) setScrollSection(2);
            });
        }, opts);
        [heroRef, globeSectionRef, projectsRef].forEach(r => r.current && obs.observe(r.current));
        return () => obs.disconnect();
    }, []);

    return (
        <>
        {/* CustomCursor MUST be outside <main> — overflow:scroll on main creates a new
            stacking context that traps children below the WebGL canvas z-index. */}
        <CustomCursor />
        <main
            ref={containerRef}
            className="bg-black text-white hover:cursor-none !cursor-none home-arrival-flash overflow-x-hidden"
            style={{
                scrollSnapType: 'y mandatory',
                height: '100vh',
                overflowY: 'scroll',
                scrollbarWidth: 'none',
                fontFamily: "'Share Tech Mono', 'Courier New', monospace",
            }}
        >
            {/* ── GLOBAL GLITCH CSS PAYLOAD ── */}
            <style>{`
        * { cursor: none !important; }
        ::-webkit-scrollbar { display: none; }
        @keyframes microGlitch {
          0% { transform: translate(0) skew(0deg); text-shadow: none; }
          20% { transform: translate(-2px, 1px) skew(-4deg); text-shadow: 2px 0 #FF003C, -2px 0 #00F0FF; }
          40% { transform: translate(2px, -1px) skew(4deg); text-shadow: -2px 0 #FF003C, 2px 0 #00F0FF; }
          60% { transform: translate(-1px, 2px) skew(-2deg); text-shadow: 3px 0 #FF003C, -3px 0 #00F0FF; }
          80% { transform: translate(1px, -2px) skew(2deg); text-shadow: -1px 0 #FF003C, 1px 0 #00F0FF; }
          100% { transform: translate(0) skew(0deg); text-shadow: none; }
        }
        .tactical-hover { transition: transform 0.05s ease-out, border-color 0.1s; }
        .tactical-hover:hover { transform: scale(1.02); }
        .tactical-hover:hover h3 { animation: microGlitch 0.25s cubic-bezier(0.22, 1, 0.36, 1) forwards; color: #FFF !important; }
      `}</style>

            {/* Google Font – Share Tech Mono */}
            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap"
            />

            {/* Scan-line overlay */}
            <div
                className="fixed inset-0 pointer-events-none z-50"
                style={{
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
                }}
            />

            {/* Vignette */}
            <div
                className="fixed inset-0 pointer-events-none z-40"
                style={{
                    background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.72) 100%)',
                }}
            />

            <KonamiHandler onUnlock={() => setIsClassified(true)} />

            <AnimatePresence>
                {isClassified && (
                    <ArasakaModal onClose={() => setIsClassified(false)} />
                )}
            </AnimatePresence>

            {/* ── SECTION 0: HERO ─────────────────────────────── */}
            <section
                ref={heroRef}
                className="relative flex flex-col justify-start md:justify-center min-h-screen w-full overflow-y-auto overflow-x-hidden pt-24 md:pt-10"
                style={{ scrollSnapAlign: 'start' }}
            >
                {/* Noise texture bg */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'radial-gradient(ellipse 80% 60% at 70% 50%, rgba(0,240,255,0.07) 0%, transparent 70%)',
                    }}
                />

                {/* Horizontal rule lines */}
                <div className="absolute inset-0 pointer-events-none">
                    {[12, 38, 62, 88].map(t => (
                        <div key={t} className="absolute w-full h-px bg-white" style={{ top: `${t}%`, opacity: 0.04 }} />
                    ))}
                    {[5, 15, 85, 95].map(l => (
                        <div key={l} className="absolute h-full w-px bg-white" style={{ left: `${l}%`, opacity: 0.04 }} />
                    ))}
                </div>

                <AnimatePresence>
                    {hudReady && (
                        <motion.div
                            key="hero-content"
                            variants={glitchContainer}
                            initial="hidden"
                            animate="show"
                            className="relative z-10 flex flex-col md:flex-row items-center justify-start md:justify-center w-full min-h-full px-6 md:px-16 gap-8 md:gap-12 pt-10 pb-20 md:py-0"
                        >
                            {/* ── LEFT: Typography ── */}
                            <div className="flex-1 flex flex-col items-center text-center md:items-start md:text-left gap-4 md:gap-6 w-full">
                                {/* Status tag */}
                                <motion.div variants={glitchItem}
                                    className="flex items-center gap-2 text-xs tracking-[0.28em] uppercase"
                                    style={{ color: COLORS.cyan }}
                                >
                                    <span
                                        className="inline-block w-2 h-2 rounded-full animate-pulse"
                                        style={{ background: COLORS.cyan }}
                                    />
                                    [ AVAILABLE FOR INTERNSHIPS & COLLABS ]
                                </motion.div>

                                {/* Name */}
                                <motion.h1
                                    variants={glitchItem}
                                    className="text-4xl sm:text-5xl md:text-7xl font-black uppercase leading-none m-0 break-words w-full"
                                    style={{
                                        fontFamily: "var(--font-cyberpunk, 'Orbitron', 'Tektur', sans-serif)",
                                        color: COLORS.yellow,
                                        textShadow: isMobile ? `3px 3px 0 ${COLORS.cyan}` : `5px 5px 0 ${COLORS.cyan}`,
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    <ScrambleText text={isMobile ? "BINORE\nMOHAPATRA" : "BINORE\nMOHAPATRA"} delay={0.2} />
                                </motion.h1>

                                {/* Role badge — chamfered */}
                                <motion.div variants={glitchItem}>
                                    <div
                                        className="inline-block text-black font-bold uppercase tracking-[0.22em] px-4 md:px-6 py-2 md:py-3 text-[10px] sm:text-xs md:text-xl"
                                        style={{
                                            background: COLORS.yellow,
                                            clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                                            fontFamily: "'Orbitron', sans-serif",
                                        }}
                                    >
                                        FULL-STACK DEV · AI ENGINEER
                                    </div>
                                </motion.div>

                                {/* Skills pills */}
                                <motion.div variants={glitchItem} className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                                    {['Spring Boot', 'React', 'Flutter', 'Python', 'Ollama', 'Geospatial AI'].map(s => (
                                        <span
                                            key={s}
                                            className="text-xs px-3 py-1 border uppercase tracking-widest"
                                            style={{ borderColor: COLORS.cyan, color: COLORS.cyan }}
                                        >
                                            {s}
                                        </span>
                                    ))}
                                </motion.div>

                                {/* CTA row */}
                                <motion.div variants={glitchItem} className="flex flex-col sm:flex-row gap-4 mt-6 w-full max-w-sm md:max-w-none">
                                    <DataChipButton />
                                    <button
                                        data-interactive="true"
                                        onClick={() => {
                                            playClick();
                                            commLinkRef.current?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        onMouseEnter={playHover}
                                        className="text-sm uppercase tracking-[0.18em] px-6 py-3 border transition-all duration-75 hover:bg-white hover:text-black active:scale-95"
                                        style={{ borderColor: '#444', fontFamily: "'Orbitron', sans-serif" }}
                                    >
                                        CONTACT
                                    </button>
                                </motion.div>
                            </div>

                            {/* ── RIGHT: Terminal Bio ── */}
                            <motion.div variants={glitchItem} className="flex-shrink-0 w-full md:w-[450px] max-w-lg lg:max-w-xl">
                                <div
                                    className="relative overflow-hidden p-6 md:p-8 text-xs sm:text-sm font-mono leading-relaxed text-gray-300"
                                    style={{
                                        background: '#07101A',
                                        border: `1px solid ${COLORS.red}`,
                                        clipPath: 'polygon(24px 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%, 0 24px)',
                                    }}
                                >
                                    <div className="absolute top-0 left-0 w-full h-px" style={{ background: `linear-gradient(90deg, ${COLORS.red}, transparent)` }} />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none">
                                        <div className="absolute bottom-0 right-0 w-4 h-px" style={{ background: COLORS.red }} />
                                        <div className="absolute bottom-0 right-0 w-px h-4" style={{ background: COLORS.red }} />
                                    </div>

                                    <div className="text-xs uppercase tracking-widest mb-5 font-bold animate-pulse" style={{ color: COLORS.cyan }}>
                                        [ TERMINAL_UPLINK ESTABLISHED ]
                                    </div>

                                    <p className="mb-4">
                                        I'm a Full-Stack Developer currently in my 4th sem of B.Tech CSE, having shipped 5 production-grade projects.
                                    </p>

                                    <p className="mb-4">
                                        My core stack runs deep: Java Spring Boot on the backend, React and Flutter on the frontend, and PostgreSQL & MySQL for data. Architecture is my art. Code is my weapon.
                                    </p>

                                    <p className="tracking-widest mt-6 text-[#FF8800] font-bold">
                                        &gt; Currently expanding my neural architecture by actively learning Python and experimenting with local LLMs (Ollama).
                                    </p>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scroll indicator */}
                <motion.div
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-xs tracking-[0.3em] uppercase"
                    style={{ color: '#444' }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    <span>SCROLL</span>
                    <div className="w-px h-8 bg-current" />
                </motion.div>
            </section>

             {/* ── SECTION 1: 3D GLOBE (tall scroll container) ── */}
            <section
                ref={globeSectionRef}
                className="relative"
                style={{
                    scrollSnapAlign: 'start',
                    height: '100vh',
                    scrollSnapStop: 'always',
                }}
            >
                {/* Static Mode: WebGL failed — show parallax image fallback */}
                {isStaticMode ? (
                    <StaticFallback sectionRef={globeSectionRef} />
                ) : !isMobile ? (
                    <HolographicUplink smoothProgress={smoothProgress} progressRef={progressRef} />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#020202] border-y border-[#FF003C55]">
                       <div className="absolute top-10 left-10 text-[10px] text-[#FF003C] animate-pulse font-mono tracking-widest">[ SYSTEM_OPTIMIZED_FOR_MOBILE ]</div>
                       <h2 className="text-4xl font-bold text-white italic uppercase tracking-tighter" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                          <span className="text-[#FF003C]">GEOSPATIAL</span> ANALYTICS
                       </h2>
                       <div className="mt-6 flex flex-col gap-4 max-w-md border-l-2 border-[#FF003C] pl-6 py-2">
                           <p className="text-sm font-mono text-gray-400 leading-relaxed uppercase">
                              &gt; Global uplink operational. Mapping nodes in Delhi, Tokyo, London, and Night City.
                           </p>
                           <p className="text-xs font-mono text-[#555] tracking-widest">
                              LAT: 28.6139 // LON: 77.209
                           </p>
                       </div>
                    </div>
                )}

            </section>

            {/* ── SECTION 2: DATA ARCHIVES ───────────────────── */}
            <section
                ref={projectsRef}
                className="relative min-h-screen bg-black z-20"
                style={{
                    scrollSnapAlign: 'start',
                    borderTop: `1px solid ${COLORS.cyan}`,
                    boxShadow: `0 -8px 40px rgba(0,240,255,0.08)`,
                }}
            >
                <div className="max-w-[1400px] mx-auto px-6 md:px-16 py-24">

                    {/* Section header */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="flex items-end gap-6 mb-4">
                            <h2
                                className="text-3xl sm:text-5xl md:text-7xl font-bold uppercase leading-none"
                                style={{
                                    fontFamily: "'Orbitron', sans-serif",
                                    color: COLORS.yellow,
                                    textShadow: `3px 3px 0 #111`,
                                }}
                            >
                                <ScrambleText text="DATA_ARCHIVES" delay={0.1} />
                            </h2>
                            <div
                                className="text-xs font-mono mb-3 px-3 py-1 uppercase tracking-widest"
                                style={{ color: COLORS.red, border: `1px solid ${COLORS.red}` }}
                            >
                                {PROJECTS.length} ENTRIES
                            </div>
                        </div>
                        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${COLORS.red} 0%, transparent 100%)` }} />
                    </motion.div>

                    <div className="mt-20">
                      <DataArchives />
                    </div>

                    {/* Project grid */}
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-20"
                        variants={glitchContainer}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.1 }}
                    >
                        {PROJECTS.map((p, idx) => (
                            <motion.div
                                key={p.id}
                                variants={glitchItem}
                                data-interactive="true"
                                onMouseEnter={playHover}
                                onClick={playClick}
                                className="group relative cursor-pointer tactical-hover"
                                style={{
                                    background: '#06090D',
                                    border: p.shipped ? `1px solid ${COLORS.yellow}` : (p.id === '05' ? `1px solid ${COLORS.red}` : `1px solid #1a1a1a`),
                                    clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
                                    padding: '2.2rem',
                                }}
                            >
                                {p.shipped && (
                                    <div className="absolute top-4 right-4 text-[8px] font-bold text-[#FCEE0A] border border-[#FCEE0A] px-1 animate-pulse">
                                      SHIPPED
                                    </div>
                                )}
                                {/* Hover accent bar (top) */}
                                <div
                                    className="absolute top-0 left-0 right-0 h-px transition-all duration-200"
                                    style={{
                                        background: p.accent,
                                        opacity: 0,
                                    }}
                                    data-hover-line
                                />

                                {/* Hover color fill */}
                                <div
                                    className="absolute inset-0 transition-opacity duration-150 opacity-0 group-hover:opacity-100"
                                    style={{
                                        background: p.accent === COLORS.yellow
                                            ? 'rgba(252,238,10,0.04)'
                                            : p.accent === COLORS.cyan
                                                ? 'rgba(0,240,255,0.04)'
                                                : 'rgba(255,0,60,0.04)',
                                    }}
                                />

                                {/* Left accent bar */}
                                <div
                                    className="absolute top-0 left-0 bottom-0 w-0.5 transition-opacity duration-200 opacity-0 group-hover:opacity-100"
                                    style={{ background: p.accent }}
                                />

                                {/* Project ID */}
                                <div className="text-6xl font-bold absolute bottom-5 right-6 leading-none"
                                    style={{ color: '#0d0d0d', fontFamily: "'Orbitron', sans-serif" }}>
                                    {p.id}
                                </div>

                                <div className="relative z-10">
                                    {/* Class tag */}
                                    <div
                                        className="text-[10px] tracking-[0.3em] uppercase font-bold mb-3"
                                        style={{ color: p.accent }}
                                    >
                                        CLASS: {p.type}
                                    </div>

                                    {/* Title */}
                                    <h3
                                        className="text-2xl md:text-3xl font-bold uppercase mb-4 leading-tight group-hover:text-white transition-colors flex flex-col gap-2"
                                        style={{
                                            fontFamily: "'Orbitron', sans-serif",
                                            color: '#ddd',
                                        }}
                                    >
                                        {p.title}
                                        {p.experimental && (
                                            <span className="text-[10px] w-fit px-2 py-1 tracking-widest uppercase border" style={{ color: COLORS.yellow, borderColor: COLORS.yellow, background: 'rgba(252,238,10,0.1)' }}>
                                                [ EXPERIMENTAL BUILD ]
                                            </span>
                                        )}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm leading-relaxed mb-5" style={{ color: '#666' }}>
                                        {p.desc}
                                    </p>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2">
                                        {p.tags.map(t => (
                                            <span
                                                key={t}
                                                className="text-[10px] px-2 py-1 uppercase tracking-widest"
                                                style={{ background: '#111', color: '#555', border: '1px solid #222' }}
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* ── SKILLS SECTION (3D Holographic Tech Radar) ── */}
                    <motion.div
                        className="mt-28 min-h-[700px]"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2
                            className="text-4xl md:text-5xl font-bold uppercase mb-10"
                            style={{ fontFamily: "'Orbitron', sans-serif", color: COLORS.cyan }}
                        >
                            <ScrambleText text="NEURAL_CORE" delay={0} />
                        </h2>

                        {/* Static Mode or Mobile → text fallback card */}
                        {(isStaticMode || isMobile) ? (
                            <div className="p-8 bg-[#050505] border border-[#FF003C] flex flex-col gap-4" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}>
                                <div className="text-[10px] text-[#FF003C] font-mono tracking-[0.2em] uppercase flex items-center gap-2">
                                    <span className="w-2 h-2 bg-[#FF003C] rounded-full animate-ping" />
                                    {isStaticMode ? '[ CORTICAL_STACK_OFFLINE // STATIC_MODE ]' : '[ MOBILE_CORTICAL_DUMP_ACTIVE ]'}
                                </div>
                                <div className="space-y-3 font-mono text-xs md:text-sm text-gray-400 leading-relaxed">
                                    <p>&gt; Backend Neural Load: 94% (Java/Spring Boot)</p>
                                    <p>&gt; Frontend Neural Load: 88% (React/Next.js)</p>
                                    <p>&gt; AI Processing: 82% (Ollama/Python)</p>
                                    <p className="text-[#FCEE0A]">&gt; MAVIS AI Protocol: 100% Operational</p>
                                </div>
                                {isStaticMode && (
                                    <button
                                        onClick={() => setStaticMode(false)}
                                        className="mt-2 text-[10px] font-mono text-[#00F0FF] border border-[#00F0FF] px-4 py-2 hover:bg-[#00F0FF] hover:text-black transition-colors uppercase tracking-widest"
                                    >
                                        [ RETRY_WEBGL ]
                                    </button>
                                )}
                            </div>
                        ) : (
                            <NeuralMind />
                        )}
                    </motion.div>


                    {/* ── COMM_LINK SECTION ── */}
                    <motion.div
                        ref={commLinkRef}
                        className="mt-28 pt-12"
                        style={{ borderTop: `1px solid #111` }}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2
                            className="text-4xl md:text-5xl font-bold uppercase mb-12"
                            style={{ fontFamily: "'Orbitron', sans-serif", color: COLORS.cyan }}
                        >
                            <ScrambleText text="COMM_LINK" delay={0} />
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Left Column: Comms & Form */}
                            <div className="flex flex-col gap-6">
                                {/* System Readout */}
                                <div className="p-5 font-mono text-xs md:text-sm leading-relaxed" style={{ background: '#0a0a0a', border: '1px solid #222', borderLeft: `2px solid ${COLORS.yellow}` }}>
                                    <div className="text-[#555] mb-4 uppercase tracking-widest">[ DECRYPTED CHANNELS ]</div>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                                            <span className="text-[#555] min-w-[140px]">&gt; SECURE_RELAY:</span>
                                            <a href="mailto:binoremohapatra@gmail.com" data-interactive="true" className="text-white hover:text-[#00F0FF] transition-colors relative group w-fit">
                                                binoremohapatra@gmail.com
                                                <span className="absolute left-0 bottom-0 w-full h-px bg-[#00F0FF] origin-left scale-x-0 group-hover:scale-x-100 transition-transform" />
                                            </a>
                                        </div>
                                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                                            <span className="text-[#555] min-w-[140px]">&gt; ENCRYPTED_LINE:</span>
                                            <a href="tel:+918368027842" data-interactive="true" className="text-white hover:text-[#FCEE0A] transition-colors relative group w-fit">
                                                +91 8368027842
                                                <span className="absolute left-0 bottom-0 w-full h-px bg-[#FCEE0A] origin-left scale-x-0 group-hover:scale-x-100 transition-transform" />
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Tactical Form */}
                                <form className="flex flex-col gap-4 mt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input type="text" placeholder="ID / NAME" className="w-full bg-[#050505] border border-[#222] p-4 font-mono text-sm uppercase text-white focus:outline-none focus:border-[#00F0FF] transition-colors placeholder:text-[#444]" />
                                        <input type="email" placeholder="RETURN_NODE (EMAIL)" className="w-full bg-[#050505] border border-[#222] p-4 font-mono text-sm uppercase text-white focus:outline-none focus:border-[#00F0FF] transition-colors placeholder:text-[#444]" />
                                    </div>
                                    <textarea placeholder="PAYLOAD / MESSAGE" rows={5} className="w-full bg-[#050505] border border-[#222] p-4 font-mono text-sm uppercase text-white focus:outline-none focus:border-[#00F0FF] transition-colors resize-none placeholder:text-[#444]" />
                                    <button type="button" data-interactive="true" onClick={playClick} onMouseEnter={playHover} className="bg-[#FF003C] text-black font-bold uppercase tracking-[0.2em] py-4 hover:bg-white transition-colors active:scale-95" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                                        TRANSMIT
                                    </button>
                                </form>
                            </div>

                            {/* Right Column: Network Nodes */}
                            <div className="flex flex-col gap-6">
                                <div className="text-xs uppercase tracking-widest font-mono hidden lg:block" style={{ color: '#444' }}>[ SYSTEM_NODES ]</div>
                                <div className="flex flex-col gap-4">
                                    <a
                                        href="https://github.com/binoremohapatra"
                                        target="_blank"
                                        rel="noreferrer"
                                        data-interactive="true"
                                        onClick={playClick}
                                        onMouseEnter={playHover}
                                        className="group block p-6 tactical-hover"
                                        style={{ background: '#06090D', border: '1px solid #1a1a1a', clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
                                    >
                                        <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
                                            <div className="absolute top-0 right-0 w-4 h-[2px] bg-[#1a1a1a] group-hover:bg-[#00F0FF] transition-colors" />
                                            <div className="absolute top-0 right-0 w-[2px] h-4 bg-[#1a1a1a] group-hover:bg-[#00F0FF] transition-colors" />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-3xl font-bold uppercase group-hover:text-white transition-colors" style={{ fontFamily: "'Orbitron', sans-serif", color: COLORS.cyan }}>GITHUB</h3>
                                            <span className="text-[#00F0FF] text-2xl transform group-hover:translate-x-3 transition-transform">→</span>
                                        </div>
                                        <div className="text-[#555] font-mono text-xs tracking-widest mt-4 uppercase">&gt; REPOSITORY_ACCESS</div>
                                    </a>

                                    <a
                                        href="https://www.linkedin.com/in/binoremohapatra"
                                        target="_blank"
                                        rel="noreferrer"
                                        data-interactive="true"
                                        onClick={playClick}
                                        onMouseEnter={playHover}
                                        className="group block p-6 tactical-hover"
                                        style={{ background: '#06090D', border: '1px solid #1a1a1a', clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
                                    >
                                        <div className="absolute top-0 left-0 w-8 h-8 pointer-events-none">
                                            <div className="absolute top-0 left-0 w-4 h-[2px] bg-[#1a1a1a] group-hover:bg-[#FCEE0A] transition-colors" />
                                            <div className="absolute top-0 left-0 w-[2px] h-4 bg-[#1a1a1a] group-hover:bg-[#FCEE0A] transition-colors" />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-3xl font-bold uppercase group-hover:text-white transition-colors" style={{ fontFamily: "'Orbitron', sans-serif", color: COLORS.yellow }}>LINKEDIN</h3>
                                            <span className="text-[#FCEE0A] text-2xl transform group-hover:translate-x-3 transition-transform">→</span>
                                        </div>
                                        <div className="text-[#555] font-mono text-xs tracking-widest mt-4 uppercase">&gt; PROFESSIONAL_NETWORK</div>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── FOOTER ── */}
                    <footer className="mt-24 pt-8 flex flex-col md:flex-row justify-between items-start gap-4"
                        style={{ borderTop: `1px solid #1a1a1a` }}>
                        <div>
                            <div
                                className="text-2xl font-bold uppercase"
                                style={{ fontFamily: "'Orbitron', sans-serif", color: COLORS.yellow }}
                            >
                                BINORE MOHAPATRA · PORTFOLIO 2026
                            </div>
                            <div className="text-xs mt-1 tracking-[0.2em] uppercase" style={{ color: '#444' }}>
                                FULL-STACK · AI · GEOSPATIAL
                            </div>
                        </div>
                        <div className="text-xs font-mono" style={{ color: '#333' }}>
                            <div>© 2077 ALL RIGHTS RESERVED</div>
                            <div className="mt-1">BUILD: v2.0.77-ALPHA</div>
                        </div>
                    </footer>

                </div>
            </section>

            {/* Nav dots — section position indicator */}
            <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50">
                {[0, 1, 2].map(i => (
                    <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                        style={{
                            background: scrollSection === i ? COLORS.yellow : '#333',
                            transform: scrollSection === i ? 'scale(1.6)' : 'scale(1)',
                        }}
                    />
                ))}
            </div>

        </main>
        </>
    );
}
