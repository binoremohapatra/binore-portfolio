/**
 * useAdaptiveQuality.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Adaptive Quality Engine — Hardware Detection & Performance Tiering
 *
 * Tiers:
 *  HIGH   → Dedicated GPU (gpu.tier >= 2)  — Full post-processing, 6k stars, 128-seg globe
 *  MEDIUM → Integrated GPU (gpu.tier === 1) — No post-proc, simplified mats, lower res
 *  LOW    → No GPU / Mobile (tier 0 / null) — meshBasicMaterial, no lights, 30fps cap
 *
 * Static Mode:
 *  Triggered manually OR automatically when WebGL init fails / FPS < 10 for 3s.
 *  Replaces the Canvas with a parallax image that still responds to scroll.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDetectGPU } from '@react-three/drei';

// ─── Tier Thresholds ──────────────────────────────────────────────────────────
export const QUALITY_TIERS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/**
 * Classify GPU info into a quality tier.
 * @param {object|null} gpu - Result from useDetectGPU
 * @returns {'high'|'medium'|'low'}
 */
function classifyTier(gpu) {
  if (!gpu || gpu.tier === undefined || gpu.tier === null) return QUALITY_TIERS.LOW;
  if (gpu.isMobile) return QUALITY_TIERS.LOW;
  if (gpu.tier >= 2) return QUALITY_TIERS.HIGH;
  if (gpu.tier === 1) return QUALITY_TIERS.MEDIUM;
  return QUALITY_TIERS.LOW;
}

/**
 * Per-tier rendering configuration constants.
 * Consumed by HolographicUplink and NeuralMind.
 */
export const TIER_CONFIG = {
  [QUALITY_TIERS.HIGH]: {
    starCount: 6000,
    globeSegments: 128,
    globeTexSize: 2048,
    cityGrid: 20,
    cityEnabled: true,
    uplinkArcEnabled: true,
    dpr: [1, 2],
    antialias: true,
    frameCapMs: null,          // Unlimited FPS
    shadowMapSize: 2048,
    usePostProcessing: true,
    useSoftShadows: true,
    useFog: true,
    starSaturation: 1,
    brainWireframe: true,
    brainLights: 2,            // Number of point lights
    brainTetheredNodes: true,
    useDraco: true,
    precision: 'highp',
  },
  [QUALITY_TIERS.MEDIUM]: {
    starCount: 2000,
    globeSegments: 64,
    globeTexSize: 1024,
    cityGrid: 10,
    cityEnabled: true,
    uplinkArcEnabled: true,
    dpr: [1, 1],
    antialias: false,
    frameCapMs: null,
    shadowMapSize: 512,
    usePostProcessing: false,
    useSoftShadows: false,
    useFog: false,
    starSaturation: 0,
    brainWireframe: false,
    brainLights: 1,
    brainTetheredNodes: true,
    useDraco: true,
    precision: 'mediump',
  },
  [QUALITY_TIERS.LOW]: {
    starCount: 0,
    globeSegments: 32,
    globeTexSize: 512,
    cityGrid: 0,
    cityEnabled: false,
    uplinkArcEnabled: false,
    dpr: [0.75, 1],
    antialias: false,
    frameCapMs: 33,            // ~30 FPS cap
    shadowMapSize: 256,
    usePostProcessing: false,
    useSoftShadows: false,
    useFog: false,
    starSaturation: 0,
    brainWireframe: false,
    brainLights: 0,
    brainTetheredNodes: true,  // Enabled so skills show on mobile
    useDraco: true,
    precision: 'lowp',
  },
};

// ─── FPS Watchdog Config ──────────────────────────────────────────────────────
const FPS_DANGER_THRESHOLD = 10;     // Below this FPS = danger
const FPS_DANGER_DURATION_MS = 3000; // Must stay below threshold for this duration

/**
 * Main hook — call once at App root level, pass results via context or props.
 *
 * @returns {{
 *   tier: 'high'|'medium'|'low',
 *   config: object,
 *   gpuInfo: object|null,
 *   isStaticMode: boolean,
 *   setStaticMode: function,
 *   triggerStaticMode: function,
 *   onCanvasCreated: function,    // Pass to <Canvas onCreated={...}>
 *   reportFPS: function,          // Call from useFrame with current FPS
 *   tierLabel: string,            // Human-readable label for HUD
 *   tierColor: string,            // Accent color for HUD badge
 * }}
 */
export function useAdaptiveQuality() {
  const gpu = useDetectGPU();
  const [tier, setTier] = useState(QUALITY_TIERS.LOW); // Safe default while detecting
  const [isStaticMode, setIsStaticMode] = useState(false);
  const [gpuInfo, setGpuInfo] = useState(null);
  const [isDetected, setIsDetected] = useState(false);

  // FPS watchdog state
  const fpsWatchdog = useRef({
    dangerStart: null,
    triggered: false,
  });

  // Classify tier once GPU is detected
  useEffect(() => {
    if (gpu && !isDetected) {
      const detected = classifyTier(gpu);
      setTier(detected);
      setGpuInfo(gpu);
      setIsDetected(true);
      console.log(`[AdaptiveQuality] GPU Detected: Tier ${gpu.tier} → Quality: ${detected.toUpperCase()}`);
      console.log(`[AdaptiveQuality] GPU Info:`, gpu);
    }
  }, [gpu, isDetected]);

  // Manual static mode toggle
  const triggerStaticMode = useCallback(() => {
    console.warn('[AdaptiveQuality] Static Mode ACTIVATED — WebGL failure or FPS below threshold.');
    setIsStaticMode(true);
  }, []);

  // WebGL crash handler — pass as onCreated's error catcher
  const onCanvasCreated = useCallback(({ gl }) => {
    // Listen for WebGL context loss
    const canvas = gl.domElement;
    const handleContextLost = (e) => {
      e.preventDefault();
      console.error('[AdaptiveQuality] WebGL Context LOST! Switching to Static Mode.');
      triggerStaticMode();
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    // Store cleanup on the canvas element itself
    canvas._adaptiveCleanup = () => canvas.removeEventListener('webglcontextlost', handleContextLost);
  }, [triggerStaticMode]);

  // FPS reporter — call from useFrame inside Canvas
  const reportFPS = useCallback((fps) => {
    if (isStaticMode || fpsWatchdog.current.triggered) return;

    if (fps < FPS_DANGER_THRESHOLD) {
      if (!fpsWatchdog.current.dangerStart) {
        fpsWatchdog.current.dangerStart = Date.now();
      } else if (Date.now() - fpsWatchdog.current.dangerStart > FPS_DANGER_DURATION_MS) {
        fpsWatchdog.current.triggered = true;
        triggerStaticMode();
      }
    } else {
      // FPS recovered — reset watchdog
      fpsWatchdog.current.dangerStart = null;
    }
  }, [isStaticMode, triggerStaticMode]);

  // Human-readable tier metadata for the HUD badge
  const tierMeta = {
    [QUALITY_TIERS.HIGH]: {
      label: 'NEURAL-LINK OPTIMAL',
      sublabel: 'DEDICATED GPU // FULL RENDER PIPELINE',
      color: '#00F0FF',
      dot: '#00F0FF',
    },
    [QUALITY_TIERS.MEDIUM]: {
      label: 'HYBRID CORE ACTIVE',
      sublabel: 'INTEGRATED GPU // ADAPTIVE PIPELINE',
      color: '#FCEE0A',
      dot: '#FCEE0A',
    },
    [QUALITY_TIERS.LOW]: {
      label: 'SURVIVAL MODE',
      sublabel: 'LOW-POWER UNIT // STATIC RENDER',
      color: '#FF003C',
      dot: '#FF003C',
    },
  };

  const meta = tierMeta[tier];

  return {
    tier,
    config: TIER_CONFIG[tier],
    gpuInfo,
    isDetected,
    isStaticMode,
    setStaticMode: setIsStaticMode,
    triggerStaticMode,
    onCanvasCreated,
    reportFPS,
    tierLabel: meta.label,
    tierSublabel: meta.sublabel,
    tierColor: meta.color,
    tierDotColor: meta.dot,
  };
}
