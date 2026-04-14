import { useState, useEffect } from 'react';
import { useScroll, useVelocity } from 'framer-motion';

export const useRelicScroll = (velocityThreshold = 150) => {
    const [isGlitching, setIsGlitching] = useState(false);
    const { scrollY } = useScroll();
    const scrollVelocity = useVelocity(scrollY);

    useEffect(() => {
        return scrollVelocity.onChange((latestVelocity) => {
            if (Math.abs(latestVelocity) > velocityThreshold && !isGlitching) {
                // Trigger a Relic Glitch when scrolling fast (Cyberpunk aesthetic)
                setIsGlitching(true);
                
                // Random duration for the glitch burst
                const duration = 200 + Math.random() * 400;
                
                setTimeout(() => {
                    setIsGlitching(false);
                }, duration);
            }
        });
    }, [scrollVelocity, isGlitching, velocityThreshold]);

    return { isGlitching };
};
