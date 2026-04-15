import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const SoundContext = createContext();

export const useCyberAudio = () => useContext(SoundContext);

// 1. Instantiate Native Audio Objects outside the component so they are pre-loaded
const hoverSfx = new Audio('/hover.mp3');
const clickSfx = new Audio('/click.mp3');
const bootSfx = new Audio('/glitch.mp3');
const alertSfx = new Audio('/alert.mp3');
const bgmSfx = new Audio('/i-really-want-to-stay-at-your-house.mp3');
const rotSfx = new Audio('/hover.mp3'); 
const rebelAudio = new Audio('/the-rebel-path.mp3');
const classifiedAudio = new Audio('/theme.mp3');

// Initial setup
[bgmSfx, rebelAudio, classifiedAudio].forEach(audio => {
    audio.loop = true;
});
bgmSfx.volume = 0.15;
rebelAudio.volume = 0.25;
classifiedAudio.volume = 0.3;

export const SoundProvider = ({ children }) => {
    const bgmStarted = useRef(false);
    const isRebelActive = useRef(false);
    const isClassifiedActive = useRef(false);

    const [isMuted, setIsMuted] = useState(() => {
        try {
            const saved = window.localStorage.getItem('cyberpunk_muted');
            return saved !== null ? JSON.parse(saved) : false;
        } catch (e) {
            return false;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem('cyberpunk_muted', JSON.stringify(isMuted));
        } catch (e) {}

        if (isMuted) {
            bgmSfx.pause();
            rebelAudio.pause();
            classifiedAudio.pause();
        } else if (bgmStarted.current) {
            const playCurrent = () => {
                if (isClassifiedActive.current) classifiedAudio.play().catch(() => {});
                else if (isRebelActive.current) rebelAudio.play().catch(() => {});
                else bgmSfx.play().catch(() => {});
            };
            playCurrent();
        }
    }, [isMuted]);

    // Visibility management
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                bgmSfx.pause();
                rebelAudio.pause();
                classifiedAudio.pause();
            } else if (!isMuted && bgmStarted.current) {
                if (isClassifiedActive.current) classifiedAudio.play().catch(() => {});
                else if (isRebelActive.current) rebelAudio.play().catch(() => {});
                else bgmSfx.play().catch(() => {});
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isMuted]);

    // Robust Looping fallback
    useEffect(() => {
        const setLoop = (audio) => {
            audio.onended = () => {
                if (!isMuted && bgmStarted.current) {
                    audio.currentTime = 0;
                    audio.play().catch(() => {});
                }
            };
        };
        setLoop(bgmSfx);
        setLoop(rebelAudio);
        setLoop(classifiedAudio);
    }, [isMuted]);

    const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);

    const playHover = useCallback(() => {
        if (isMuted) return;
        hoverSfx.currentTime = 0;
        hoverSfx.play().catch(() => {});
    }, [isMuted]);

    const playClick = useCallback(() => {
        if (isMuted) return;
        clickSfx.currentTime = 0;
        clickSfx.play().catch(() => {});
    }, [isMuted]);

    const playBoot = useCallback(() => {
        if (isMuted) return;
        bootSfx.currentTime = 0;
        bootSfx.play().catch(() => {});
    }, [isMuted]);

    const stopBoot = useCallback(() => {
        bootSfx.pause();
        bootSfx.currentTime = 0;
    }, []);

    const playAlert = useCallback(() => {
        if (isMuted) return;
        alertSfx.currentTime = 0;
        alertSfx.play().catch(() => {});
    }, [isMuted]);

    const playRot = useCallback(() => {
        if (isMuted) return;
        rotSfx.currentTime = 0;
        rotSfx.play().catch(() => {});
    }, [isMuted]);

    const playBGM = useCallback(() => {
        bgmStarted.current = true;
        if (!isMuted) bgmSfx.play().catch(() => {});
    }, [isMuted]);

    const triggerRebelPath = useCallback(() => {
        bgmSfx.pause();
        bgmSfx.currentTime = 0;
        isRebelActive.current = true;
        bgmStarted.current = true;
        if (!isMuted && rebelAudio.paused) rebelAudio.play().catch(() => {});
    }, [isMuted]);

    const triggerClassifiedMusic = useCallback(() => {
        bgmSfx.pause();
        rebelAudio.pause();
        isClassifiedActive.current = true;
        isRebelActive.current = false;
        bgmStarted.current = true;
        if (!isMuted) classifiedAudio.play().catch(() => {});
    }, [isMuted]);

    const stopClassifiedMusic = useCallback(() => {
        classifiedAudio.pause();
        classifiedAudio.currentTime = 0;
        isClassifiedActive.current = false;
        if (bgmStarted.current && !isMuted) triggerRebelPath();
    }, [isMuted, triggerRebelPath]);

    return (
        <SoundContext.Provider value={{
            isMuted, toggleMute, playHover, playClick, playBoot, stopBoot,
            playAlert, playRot, playBGM, triggerRebelPath,
            triggerClassifiedMusic, stopClassifiedMusic
        }}>
            {children}
        </SoundContext.Provider>
    );
};
