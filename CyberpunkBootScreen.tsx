import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, useAnimation, AnimatePresence } from "framer-motion"
// @ts-ignore - 'framer' module bindings are injected natively by the Framer Web Editor
import { addPropertyControls, ControlType } from "framer"

// ==============================
// 1. GRID & NOISE CANVAS LAYER
// ==============================
const BackgroundCanvas = ({ primaryColor }: { primaryColor: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d", { alpha: false })
        if (!ctx) return

        let animationFrameId: number
        let time = 0

        const render = () => {
            // Match canvas size to parent container securely
            const w = canvas.parentElement?.offsetWidth || window.innerWidth
            const h = canvas.parentElement?.offsetHeight || window.innerHeight
            
            if (canvas.width !== w) canvas.width = w
            if (canvas.height !== h) canvas.height = h

            // Background Fill - using signature Cyberpunk Yellow
            ctx.fillStyle = primaryColor
            ctx.fillRect(0, 0, w, h)

            // Grid lines (fixed to simulate hardware monitor geometry)
            ctx.strokeStyle = "rgba(0, 0, 0, 0.05)"
            ctx.lineWidth = 1
            const gridSize = 40
            
            ctx.beginPath()
            // Vertical lines
            for (let x = 0; x < w; x += gridSize) {
                ctx.moveTo(x, 0)
                ctx.lineTo(x, h)
            }
            // Horizontal lines
            for (let y = 0; y < h; y += gridSize) {
                ctx.moveTo(0, y)
                ctx.lineTo(w, y)
            }
            ctx.stroke()

            // Moving CRT Scanlines (performant canvas render)
            ctx.fillStyle = "rgba(0, 0, 0, 0.08)"
            const scanlineHeight = 2
            // Slowly translating downward
            const offset = (time * 1.5) % (scanlineHeight * 3)
            
            for (let y = -10; y < h; y += scanlineHeight * 3) {
                ctx.fillRect(0, y + offset, w, scanlineHeight)
            }

            time += 1
            animationFrameId = requestAnimationFrame(render)
        }

        render()
        return () => cancelAnimationFrame(animationFrameId)
    }, [primaryColor])

    return (
        <canvas 
            ref={canvasRef} 
            style={{ 
                position: "absolute", 
                top: 0, 
                left: 0, 
                width: "100%", 
                height: "100%", 
                pointerEvents: "none",
                zIndex: 0
            }} 
        />
    )
}

// ==============================
// 2. RELIC GLITCH TEXT COMPONENT
// ==============================
const GlitchText = ({ text, intensity, isGlitching }: { text: string, intensity: number, isGlitching: boolean }) => {
    const baseStyle: React.CSSProperties = {
        fontSize: "min(8vw, 120px)",
        fontFamily: "'Cyberpunk', 'Orbitron', 'Tektur', sans-serif",
        fontWeight: "normal",
        textTransform: "uppercase",
        letterSpacing: "4px",
        margin: 0,
        lineHeight: 1.1,
    }

    if (!isGlitching) {
        return <h1 style={{ ...baseStyle, color: "#000", position: "relative", zIndex: 10 }}>{text}</h1>
    }

    const offsetBase = 4 + (intensity * 6)

    return (
        <div style={{ position: "relative", zIndex: 10 }}>
            {/* Invisible placeholder for layout sizing */}
            <h1 style={{ ...baseStyle, color: "transparent" }}>{text}</h1>
            
            {/* Background solid black component */}
            <h1 style={{ ...baseStyle, color: "#000", position: "absolute", top: 0, left: 0 }}>{text}</h1>

            {/* Cyan Chromatic Aberration Layer (shifts right) */}
            <motion.h1
                style={{ ...baseStyle, color: "#00F0FF", position: "absolute", top: 0, left: 0, mixBlendMode: "screen", opacity: 0.8 }}
                animate={{ 
                    x: [offsetBase, -offsetBase, offsetBase/2, 0], 
                    y: [-1, 2, -1, 0],
                    clipPath: [
                        "inset(10% 0 60% 0)", 
                        "inset(30% 0 20% 0)", 
                        "inset(70% 0 10% 0)", 
                        "inset(0% 0 0% 0)"
                    ]
                }}
                transition={{ duration: 0.15, repeat: Infinity, repeatType: "reverse" }}
            >
                {text}
            </motion.h1>

            {/* Red Chromatic Aberration Layer (shifts left) */}
            <motion.h1
                style={{ ...baseStyle, color: "#FF003C", position: "absolute", top: 0, left: 0, mixBlendMode: "screen", opacity: 0.8 }}
                animate={{ 
                    x: [-offsetBase, offsetBase, -offsetBase/2, 0],
                    y: [1, -2, 1, 0],
                    clipPath: [
                        "inset(40% 0 30% 0)", 
                        "inset(10% 0 50% 0)", 
                        "inset(80% 0 5% 0)", 
                        "inset(0% 0 0% 0)"
                    ]
                }}
                transition={{ duration: 0.18, repeat: Infinity, repeatType: "reverse" }}
            >
                {text}
            </motion.h1>

            {/* Black shifting horizontal slices (Relic Malfunction core) */}
            <motion.h1
                style={{ ...baseStyle, color: "#000", position: "absolute", top: 0, left: 0 }}
                animate={{ 
                    x: [2, -5, 3, -1],
                    clipPath: [
                        "inset(20% 0 70% 0)", 
                        "inset(50% 0 40% 0)", 
                        "inset(15% 0 65% 0)", 
                        "inset(0% 0 0% 0)"
                    ]
                }}
                transition={{ duration: 0.1, repeat: Infinity, repeatType: "reverse" }}
            >
                {text}
            </motion.h1>
        </div>
    )
}

// ==============================
// 3. MAIN BOOT SCREEN COMPONENT
// ==============================
export interface BootScreenProps {
    primaryColor: string
    mainText: string
    glitchIntensity: number
    soundUrl?: string
    style?: React.CSSProperties
}

export default function CyberpunkBootScreen(props: BootScreenProps) {
    const { primaryColor, mainText, glitchIntensity, soundUrl, style } = props

    const [isBooting, setIsBooting] = useState(true)
    const [glitchActive, setGlitchActive] = useState(false)
    const controls = useAnimation()
    const flashControls = useAnimation()

    // Control the 3-5 second randomized 'Relic Glitch' interval loops
    useEffect(() => {
        if (!isBooting) return

        const triggerGlitch = () => {
            setGlitchActive(true)
            const duration = 200 + Math.random() * (300 * glitchIntensity)
            setTimeout(() => setGlitchActive(false), duration)
        }

        let timeoutId: NodeJS.Timeout

        const loop = () => {
            const nextTime = 3000 + Math.random() * 2000
            timeoutId = setTimeout(() => {
                triggerGlitch()
                loop()
            }, nextTime)
        }

        loop() // Init random glitch sequences
        return () => clearTimeout(timeoutId)
    }, [isBooting, glitchIntensity])

    const handleConnectClick = async () => {
        if (!isBooting) return

        if (soundUrl) {
            const audio = new Audio(soundUrl)
            audio.volume = 0.7
            audio.play().catch(e => console.log("Audio play failed:", e))
        }

        // 1. Trigger massive "Neural Flash" (White screen)
        await flashControls.start({ opacity: 1, transition: { duration: 0.05 } })
        
        setIsBooting(false) 

        // 2. Dissipate Flash
        flashControls.start({ opacity: 0, transition: { duration: 0.15 } })

        // 3. Old CRT TV Turn-Off Effect Sequence
        await controls.start({
            scaleY: 0.005,
            transition: { duration: 0.15, ease: "circIn", delay: 0.1 }
        })
        await controls.start({
            scaleX: 0,
            opacity: 0,
            transition: { duration: 0.2, ease: "circOut" }
        })
    }

    return (
        <motion.div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                overflow: "hidden",
                transformOrigin: "center center",
                ...style, // allow Framer's injected dimensional absolute positioning
            }}
            animate={controls}
            initial={{ scaleX: 1, scaleY: 1, opacity: 1 }}
        >
            {/* The Performant CRT Grid & Moving Scanline rendering Context */}
            <BackgroundCanvas primaryColor={primaryColor} />

            {/* Hardware Vignette Overlay */}
            <div 
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.7) 110%)",
                    pointerEvents: "none",
                    zIndex: 1
                }}
            />

            {/* CSS Filter Noise (Subtle grit effect mimicking film/crt grain) */}
            <div 
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')",
                    opacity: 0.08,
                    pointerEvents: "none",
                    zIndex: 2,
                    mixBlendMode: "overlay"
                }}
            />

            {/* UI Content Layer */}
            <div 
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    padding: "10%",
                    zIndex: 10,
                    boxSizing: "border-box"
                }}
            >
                {/* Glitched Branding Component */}
                <GlitchText text={mainText} intensity={glitchIntensity} isGlitching={glitchActive} />
                
                {/* Cyberdeck BIOS specs detail */}
                <motion.div
                   style={{
                       color: "#000",
                       fontFamily: "'Courier New', Courier, monospace",
                       fontWeight: 600,
                       marginTop: "1.5rem",
                       fontSize: "clamp(0.8rem, 1vw, 1.2rem)",
                       lineHeight: 1.4,
                       opacity: 0.8
                   }}
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 0.8 }}
                   transition={{ delay: 0.5, duration: 1 }}
                >
                    OS: ARASAKA BIOS v2.0.77 &lt;RELIC&gt;<br />
                    MEM: 8192 PB OK<br />
                    NEURO-LINK: STANDBY
                </motion.div>

                {/* Blinking Interaction Trigger */}
                <div style={{ position: "absolute", bottom: "12%", left: 0, width: "100%", display: "flex", justifyContent: "center" }}>
                    <motion.button
                        onClick={handleConnectClick}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#000",
                            fontFamily: "'Orbitron', 'Tektur', sans-serif",
                            fontSize: "clamp(1rem, 2vw, 1.5rem)",
                            fontWeight: 700,
                            letterSpacing: "2px",
                            cursor: isBooting ? "pointer" : "default",
                            padding: "1rem 2rem",
                            borderBottom: "2px solid #000",
                        }}
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        whileHover={{ scale: 1.05, textShadow: "0px 0px 8px rgba(0,0,0,0.5)" }}
                    >
                        PRESS [START] TO CONNECT
                    </motion.button>
                </div>
            </div>

            {/* Neural Flash Layer */}
            <motion.div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "#FFF",
                    pointerEvents: "none",
                    zIndex: 9999,
                }}
                initial={{ opacity: 0 }}
                animate={flashControls}
            />
        </motion.div>
    )
}

// ==============================
// 4. FRAMER PROPERTY CONTROLS
// ==============================

CyberpunkBootScreen.defaultProps = {
    primaryColor: "#FCEE0A",
    mainText: "BINORE MOHAPATRA",
    glitchIntensity: 0.5,
    soundUrl: "",
}

addPropertyControls(CyberpunkBootScreen, {
    primaryColor: {
        title: "Main Color",
        type: ControlType.Color,
        defaultValue: "#FCEE0A",
    },
    mainText: {
        title: "Main Text",
        type: ControlType.String,
        defaultValue: "BINORE MOHAPATRA",
    },
    glitchIntensity: {
        title: "Glitch Intensity",
        type: ControlType.Number,
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.5,
        displayStepper: true,
    },
    soundUrl: {
        title: "Glitch Sound",
        type: ControlType.File,
        allowedFileTypes: ["audio/*"],
    },
})
