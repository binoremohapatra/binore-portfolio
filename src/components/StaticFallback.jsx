/**
 * StaticFallback.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaces the WebGL Canvas when Static Mode is active (WebGL crash or FPS < 10 for 3s).
 *
 * Features:
 *  • Shows a cyberpunk-stylized globe/earth image with parallax scroll response.
 *  • framer-motion useScroll + useTransform drives the Y-parallax so it still
 *    "responds" to scroll even without WebGL.
 *  • Pulsing neon HUD overlay maintaining the cyberpunk aesthetic.
 *  • "[ RETRY_WEBGL ]" button to re-initialize the Canvas.
 *  • "[ STATIC_MODE_ACTIVE ]" badge with red flicker animation.
 */

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useQuality } from '../context/QualityContext';

const COLORS = {
  yellow: '#FCEE0A',
  cyan: '#00F0FF',
  red: '#FF003C',
  magenta: '#FF00FF',
};

export default function StaticFallback({ sectionRef }) {
  const { setStaticMode, tierColor } = useQuality();
  const containerRef = useRef(null);

  // Scroll-driven parallax — image moves at 40% of scroll speed
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0.6, 0.9]);

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      left: 0,
      width: '100%',
      height: '100vh',
      overflow: 'hidden',
      background: '#000',
    }}>
      {/* ── Parallax Image ──────────────────────────────────────── */}
      <motion.div
        style={{
          position: 'absolute',
          inset: '-20%',        // oversized so parallax pan doesn't show edges
          y: imageY,
          willChange: 'transform',
        }}
      >
        <img
          src="/hero-fallback.webp"
          alt="Cyberpunk Globe — Static Mode"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'brightness(0.55) saturate(1.4) hue-rotate(5deg)',
          }}
          // Graceful degradation if image missing
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </motion.div>

      {/* Gradient darkening overlay that deepens on scroll */}
      <motion.div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)',
        opacity: overlayOpacity,
      }} />

      {/* CRT scan-line overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)',
      }} />

      {/* Grid lines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(0,240,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.04) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      {/* ── STATIC MODE HUD Badge (top-right) ───────────────────── */}
      <motion.div
        style={{
          position: 'absolute', top: 20, right: 20, zIndex: 20,
          fontFamily: "'Share Tech Mono', monospace",
        }}
        animate={{ opacity: [1, 0.6, 1] }}
        transition={{ duration: 0.9, repeat: Infinity }}
      >
        <div style={{
          padding: '8px 14px',
          background: 'rgba(255,0,60,0.1)',
          border: '1px solid #FF003C',
          clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
        }}>
          <div style={{ fontSize: '8px', color: '#FF003C', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
            ⚠ STATIC_MODE_ACTIVE
          </div>
          <div style={{ fontSize: '9px', color: '#555', marginTop: '2px', letterSpacing: '0.1em' }}>
            WEBGL_CONTEXT_UNAVAILABLE
          </div>
        </div>
      </motion.div>

      {/* ── Center Globe HUD ────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 10, pointerEvents: 'none',
        gap: '16px',
      }}>
        {/* Animated ring around center */}
        <motion.div style={{
          width: '180px', height: '180px',
          border: `1px solid ${COLORS.cyan}44`,
          borderRadius: '50%',
          position: 'relative',
        }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '120px', height: '120px',
            border: `1px solid ${COLORS.cyan}22`,
            borderRadius: '50%',
          }} />
          {/* Ping marker */}
          <motion.div style={{
            position: 'absolute', top: '10%', left: '50%',
            width: '8px', height: '8px',
            background: COLORS.red,
            borderRadius: '50%',
            transform: 'translateX(-50%)',
            boxShadow: `0 0 10px ${COLORS.red}`,
          }}
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ color: COLORS.yellow, fontSize: '10px', letterSpacing: '0.35em', marginBottom: '6px', fontFamily: "'Orbitron', sans-serif" }}>
            UPLINK SECURED // VISUAL MODE
          </div>
          <div style={{ color: COLORS.cyan, fontSize: '22px', fontWeight: 900, textShadow: `0 0 12px ${COLORS.cyan}`, fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.1em' }}>
            DELHI_CORE
          </div>
          <div style={{ color: '#555', fontSize: '11px', letterSpacing: '0.15em', marginTop: '6px', fontFamily: "'Share Tech Mono', monospace" }}>
            LAT: 28.6139 // LON: 77.2090
          </div>
        </div>
      </div>

      {/* ── RETRY button (bottom center) ────────────────────────── */}
      <div style={{ position: 'absolute', bottom: '40px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 20 }}>
        <motion.button
          whileHover={{ scale: 1.03, boxShadow: `0 0 20px ${COLORS.cyan}44` }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setStaticMode(false)}
          style={{
            pointerEvents: 'auto',
            padding: '10px 28px',
            background: 'transparent',
            border: `1px solid ${COLORS.cyan}`,
            color: COLORS.cyan,
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '11px',
            letterSpacing: '0.25em',
            cursor: 'pointer',
            textTransform: 'uppercase',
            clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
            transition: 'background 0.2s',
          }}
        >
          [ RETRY_WEBGL → REINITIALIZE ]
        </motion.button>
      </div>
    </div>
  );
}
