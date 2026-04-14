/**
 * NeuroLinkBadge.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Cyberpunk GPU-Tier HUD Badge — Always visible in the corner.
 * Shows detected hardware tier with neon-bordered, glitch-animated UI.
 *
 * Tiers:
 *  HIGH   → Cyan  — "NEURAL-LINK OPTIMAL"
 *  MEDIUM → Yellow — "HYBRID CORE ACTIVE"
 *  LOW    → Red   — "SURVIVAL MODE"
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuality } from '../../context/QualityContext';

// Glitch frames for the label scanline effect
const GLITCH_CHARS = '!<>-_\\/[]{}—=+*^?#';
function useGlitchText(text, active) {
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    if (!active) { setDisplay(text); return; }
    let iter = 0;
    const id = setInterval(() => {
      setDisplay(
        text.split('').map((c, i) => {
          if (c === ' ') return ' ';
          if (i < iter) return c;
          return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }).join('')
      );
      if (iter >= text.length) clearInterval(id);
      iter += 1.5;
    }, 25);
    return () => clearInterval(id);
  }, [text, active]);
  return display;
}

export default function NeuroLinkBadge() {
  const { tier, tierLabel, tierSublabel, tierColor, tierDotColor, isDetected, gpuInfo, isStaticMode, setStaticMode } = useQuality();
  const [expanded, setExpanded] = useState(false);
  const [glitching, setGlitching] = useState(false);
  const displayLabel = useGlitchText(tierLabel, glitching);

  // Trigger glitch animation once on tier detection
  useEffect(() => {
    if (isDetected) {
      setGlitching(true);
      const t = setTimeout(() => setGlitching(false), 1200);
      return () => clearTimeout(t);
    }
  }, [isDetected, tier]);

  const glowStyle = `0 0 8px ${tierColor}44, 0 0 20px ${tierColor}22`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.8, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 99998,
        fontFamily: "'Share Tech Mono', monospace",
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onClick={() => setExpanded(v => !v)}
    >
      {/* ── Main Badge ─────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        padding: '8px 14px 8px 10px',
        background: '#000',
        border: `1px solid ${tierColor}`,
        boxShadow: glowStyle,
        clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
        minWidth: '220px',
        transition: 'box-shadow 0.3s ease',
      }}>
        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '10px', height: '1px', background: tierColor }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '1px', height: '10px', background: tierColor }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '1px', background: tierColor }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '1px', height: '10px', background: tierColor }} />

        {/* Scanning top line */}
        <motion.div
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: tierColor, opacity: 0.6 }}
          animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
        />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          {/* Pulsing status dot */}
          <motion.div
            style={{ width: '6px', height: '6px', borderRadius: '50%', background: tierDotColor, flexShrink: 0 }}
            animate={{ opacity: [1, 0.3, 1], boxShadow: [`0 0 6px ${tierDotColor}`, `0 0 2px ${tierDotColor}`, `0 0 6px ${tierDotColor}`] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <div style={{
            fontSize: '10px',
            letterSpacing: '0.2em',
            color: '#444',
            textTransform: 'uppercase',
          }}>
            [ GPU_TIER: <span style={{ color: tierColor }}>{tier.toUpperCase()}</span> ]
          </div>
        </div>

        {/* Main label — glitching on detect */}
        <div style={{
          fontSize: '12px',
          fontWeight: 'bold',
          letterSpacing: '0.15em',
          color: tierColor,
          textShadow: `0 0 8px ${tierColor}88`,
          textTransform: 'uppercase',
          lineHeight: 1.3,
          minHeight: '16px',
        }}>
          {isDetected ? displayLabel : '[ SCANNING HARDWARE... ]'}
        </div>

        {/* Sublabel */}
        <div style={{ fontSize: '8px', color: '#555', letterSpacing: '0.1em', marginTop: '3px', textTransform: 'uppercase' }}>
          {isDetected ? tierSublabel : 'UPLINK PENDING...'}
        </div>

        {/* Static mode indicator */}
        {isStaticMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{ fontSize: '8px', color: '#FF003C', marginTop: '4px', letterSpacing: '0.15em' }}
          >
            ⚠ STATIC_MODE_ACTIVE
          </motion.div>
        )}

        {/* Expand arrow */}
        <div style={{
          position: 'absolute', right: '10px', top: '50%', transform: `translateY(-50%) rotate(${expanded ? '180deg' : '0deg'})`,
          color: tierColor, fontSize: '10px', transition: 'transform 0.3s',
        }}>▼</div>
      </div>

      {/* ── Expanded Panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              marginTop: '2px',
              padding: '10px 14px',
              background: '#000',
              border: `1px solid ${tierColor}44`,
              borderTop: 'none',
              clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
            }}>
              {/* GPU Details */}
              {gpuInfo && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                  {[
                    ['RENDERER', gpuInfo.gpu || 'UNKNOWN'],
                    ['FP32_OPS', gpuInfo.fps ? `${gpuInfo.fps} ESTIMATED` : 'N/A'],
                    ['MOBILE_UNIT', gpuInfo.isMobile ? 'YES' : 'NO'],
                    ['TIER_SCORE', String(gpuInfo.tier ?? 'N/A')],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#555', letterSpacing: '0.1em' }}>
                      <span>&gt; {k}:</span>
                      <span style={{ color: '#888', maxWidth: '120px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {String(v).toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Static Mode Toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); setStaticMode(v => !v); }}
                style={{
                  width: '100%',
                  padding: '5px',
                  background: isStaticMode ? '#FF003C22' : 'transparent',
                  border: `1px solid ${isStaticMode ? '#FF003C' : '#333'}`,
                  color: isStaticMode ? '#FF003C' : '#555',
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: '8px',
                  letterSpacing: '0.15em',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s',
                }}
              >
                {isStaticMode ? '[ RETRY_WEBGL → REINITIALIZE ]' : '[ FORCE_STATIC_MODE ]'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
