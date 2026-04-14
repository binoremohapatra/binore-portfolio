import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const SoundContext = createContext();

export const useCyberAudio = () => useContext(SoundContext);

// 1. Instantiate Native Audio Objects outside the component so they are pre-loaded
const hoverSfx = new Audio('/hover.mp3');
const clickSfx = new Audio('/click.mp3');
const bootSfx = new Audio('/glitch.mp3');
const alertSfx = new Audio('/alert.mp3');
const bgmSfx = new Audio('/i-really-want-to-stay-at-your-house.mp3');
// Fallback for NeuralMind rotation since it wasn't requested for change
const rotSfx = new Audio('/hover.mp3'); 

// 2. The Rebel Path dynamic drop
const rebelAudio = new Audio('/the-rebel-path.mp3');

// Base Configurations
bgmSfx.loop = true;
bgmSfx.volume = 0.15;

rebelAudio.loop = true;
rebelAudio.volume = 0.25;

export const SoundProvider = ({ children }) => {
    const bgmStarted = useRef(false);
    const isRebelActive = useRef(false);

    // Attempt to load from localStorage so choice persists across reloads
    const [isMuted, setIsMuted] = useState(() => {
        try {
            const saved = window.localStorage.getItem('cyberpunk_muted');
            return saved !== null ? JSON.parse(saved) : false;
        } catch (e) {
            return false;
        }
    });

    // Handle global Mute/Unmute BGM toggle logic
    useEffect(() => {
        try {
            window.localStorage.setItem('cyberpunk_muted', JSON.stringify(isMuted));
        } catch (e) {}

        if (isMuted) {
            bgmSfx.pause();
            rebelAudio.pause();
        } else {
            // Only resume if the user actually officially started the BGM before toggling mute
            if (bgmStarted.current) {
                if (isRebelActive.current) {
                    rebelAudio.play().catch(e => console.warn("Failed to resume Rebel BGM:", e));
                } else {
                    bgmSfx.play().catch(e => console.warn("Failed to resume BGM:", e));
                }
            }
        }
    }, [isMuted]);

    const toggleMute = () => setIsMuted(prev => !prev);

    // Overlapping SFX Logic
    const playHover = () => {
        if (isMuted) return;
        hoverSfx.currentTime = 0;
        hoverSfx.volume = 1.0;
        hoverSfx.play().catch(e => console.warn(e));
    };

    const playClick = () => {
        if (isMuted) return;
        clickSfx.currentTime = 0;
        clickSfx.volume = 1.0;
        clickSfx.play().catch(e => console.warn(e));
    };

    const playBoot = () => {
        if (isMuted) return;
        bootSfx.currentTime = 0;
        bootSfx.volume = 1.0;
        bootSfx.play().catch(e => console.warn(e));
    };

    const stopBoot = () => {
        bootSfx.pause();
        bootSfx.currentTime = 0;
    };

    const playAlert = () => {
        if (isMuted) return;
        alertSfx.currentTime = 0;
        alertSfx.volume = 0.8;
        alertSfx.play().catch(e => console.warn(e));
    };

    const playRot = () => {
        if (isMuted) return;
        rotSfx.currentTime = 0;
        rotSfx.volume = 0.5;
        rotSfx.play().catch(e => console.warn(e));
    };

    const playBGM = () => {
        bgmStarted.current = true;
        if (isMuted) return;
        bgmSfx.play().catch(e => console.warn(e));
    };

    const triggerRebelPath = () => {
        // Halt any existing BGM
        bgmSfx.pause();
        bgmSfx.currentTime = 0;

        // Switch active flag to Rebel Path
        isRebelActive.current = true;
        bgmStarted.current = true; // Safety in case Boot Sequence was skipped

        if (isMuted) return;
        rebelAudio.play().catch(e => console.warn("Rebel Path trigger failed:", e));
    };

    const triggerClassifiedMusic = () => {
        // Halt all other BGM
        bgmSfx.pause();
        rebelAudio.pause();
        bgmSfx.currentTime = 0;
        rebelAudio.currentTime = 0;

        // Use theme.mp3 as the darker "Arasaka" theme
        const classifiedAudio = new Audio('/theme.mp3');
        classifiedAudio.loop = true;
        classifiedAudio.volume = 0.3;
        
        bgmStarted.current = true;
        if (!isMuted) {
            classifiedAudio.play().catch(e => console.warn("Classified Music trigger failed:", e));
        }
    };

    return (
        <SoundContext.Provider value={{
            isMuted,
            toggleMute,
            playHover,
            playClick,
            playBoot,
            stopBoot,
            playAlert,
            playRot,
            playBGM,
            triggerRebelPath,
            triggerClassifiedMusic
        }}>
            {children}
        </SoundContext.Provider>
    );
};
