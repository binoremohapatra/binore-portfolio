/**
 * NeuralMind.jsx — Adaptive Quality Edition
 * ─────────────────────────────────────────────────────────────────────────────
 * Cyberpunk Holographic Brain with full hardware-tier adaptive rendering.
 *
 * Tier Matrix:
 *  HIGH   → Full GLSL shaders, 2 point lights, 4000 stars, wireframe overlay, fog, Html nodes
 *  MEDIUM → Full GLSL shaders, 1 point light, 1500 stars, no wireframe, no fog, Html nodes
 *  LOW    → meshBasicMaterial (pre-baked look, 0 GPU cost), 0 lights, 0 stars, 30fps cap
 *
 * Draco: useGLTF('/brain.glb', true) — Drei auto-configures CDN DRACOLoader.
 */

import React, {
  useRef, useMemo, useState, useEffect, useCallback, Suspense,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html, Stars, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useCyberAudio } from '../context/SoundContext';
import { useQuality } from '../context/QualityContext';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  neonRed: '#FF003C',
  cyan: '#00F0FF',
  yellow: '#FCEE0A',
  black: '#000000',
  redV: new THREE.Color('#FF003C'),
  cyanV: new THREE.Color('#00F0FF'),
};

// ─── Data & Anatomy Map ───────────────────────────────────────────────────────
const REGIONS = {
  FRONTEND: { id: 'FRONTEND', label: 'FRONTEND', value: 88, sub: 'React · Tailwind', pos: [0, 0.4, 1.4], rot: [0, 0, 0], color: T.neonRed },
  BACKEND: { id: 'BACKEND', label: 'BACKEND', value: 94, sub: 'Java · Spring Boot', pos: [0, 0.5, -1.4], rot: [0, Math.PI, 0], color: T.neonRed },
  DATABASE: { id: 'DATABASE', label: 'DATABASE', value: 86, sub: 'PostgreSQL · MySQL', pos: [0, -1.0, -1.0], rot: [-Math.PI * 0.25, Math.PI, 0], color: T.neonRed },
  SYSTEMS: { id: 'SYSTEMS', label: 'SYSTEMS', value: 85, sub: 'Geospatial AI · Flutter', pos: [0, 1.4, 0.2], rot: [Math.PI * 0.35, 0, 0], color: T.neonRed },
  AI: { id: 'AI', label: 'AI / LLM', value: 82, sub: 'Ollama · Python', pos: [1.3, 0.3, 0.3], rot: [0, -Math.PI * 0.45, 0], color: T.neonRed },
};

// ─── GLSL: Full Holographic Brain Shader (HIGH / MEDIUM tier) ─────────────────
const BRAIN_VERT = /* glsl */`
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
  void main() {
    vec3 p = position;
    float glitchT = fract(uTime * 0.5);
    if(glitchT > 0.95) { float noise = random(p.xy * uTime); p += normal * noise * 0.04; }
    vec4 worldPos = modelMatrix * vec4(p, 1.0);
    vec4 mvPos    = modelViewMatrix * vec4(p, 1.0);
    vNormal       = normalize(normalMatrix * normal);
    vWorldPos     = worldPos.xyz;
    vViewDir      = normalize(cameraPosition - worldPos.xyz);
    gl_Position   = projectionMatrix * mvPos;
  }
`;

const BRAIN_FRAG = /* glsl */`
  uniform float uTime;
  uniform vec3  uColor;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;
  float hash(vec3 p) { p = fract(p * vec3(127.1,311.7,74.7)); p += dot(p, p + 19.19); return fract(p.x*p.y*p.z); }
  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  void main() {
    vec3 N = normalize(vNormal); vec3 V = normalize(vViewDir);
    float fresnel = pow(1.0 - max(dot(N,V), 0.0), 2.5);
    float n1 = noise(vWorldPos * 4.2 + uTime * 0.08);
    float n2 = noise(vWorldPos * 9.5 - uTime * 0.05);
    float fold = pow(n1*n2, 0.7);
    float scan = step(0.98, fract(vWorldPos.y * 5.0 - uTime * 3.0));
    vec3 base    = uColor * 0.1;
    vec3 crevice = uColor * fold * 1.5;
    vec3 rim     = uColor * fresnel * 2.0;
    vec3 col = base + crevice + rim + (uColor * scan * 1.5);
    float alpha = clamp(fresnel * 1.2 + fold * 0.4 + scan, 0.0, 1.0) * uOpacity;
    gl_FragColor = vec4(col, alpha);
  }
`;

const WIRE_FRAG = /* glsl */`
  uniform float uTime;
  uniform vec3  uColor;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec3 N = normalize(vNormal); vec3 V = normalize(vViewDir);
    float fresnel = pow(1.0 - max(dot(N,V), 0.0), 3.0);
    float pulse   = 0.5 + 0.5 * sin(uTime * 3.0);
    float alpha   = fresnel * pulse * 0.6;
    gl_FragColor  = vec4(uColor, alpha);
  }
`;

// ─── Matrix Rain (Canvas 2D — no WebGL cost) ──────────────────────────────────
function MatrixRain() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const cvs = canvasRef.current;
    const ctx = cvs.getContext('2d');
    const resize = () => { cvs.width = cvs.parentElement.clientWidth; cvs.height = cvs.parentElement.clientHeight; };
    window.addEventListener('resize', resize); resize();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*アァカサタナハマヤャラワガザダバパイィキシチニヒミリヂビピ'.split('');
    const fontSize = 14;
    const columns = Math.floor(cvs.width / fontSize) + 1;
    const drops = Array(columns).fill(1);
    const id = setInterval(() => {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      ctx.font = `${fontSize}px "Share Tech Mono"`;
      for (let i = 0; i < drops.length; i++) {
        ctx.fillStyle = Math.random() > 0.95 ? '#ffffff' : '#FF003C';
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > cvs.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }, 50);
    return () => { window.removeEventListener('resize', resize); clearInterval(id); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.8 }} />;
}

// ─── Tethered Node (Html overlay — disabled on LOW tier) ─────────────────────
function TetheredNode({ node, isActive, isMobileSize }) {
  const [glitchLabel, setGlitchLabel] = useState(node.label);

  useEffect(() => {
    if (isActive) {
      const chars = '!<>-_\\\\/[]{}—=+*^?#_';
      let iter = 0;
      const intv = setInterval(() => {
        setGlitchLabel(node.label.split('').map((c, i) => i < iter ? c : chars[Math.floor(Math.random() * chars.length)]).join(''));
        if (iter >= node.label.length) clearInterval(intv);
        iter += 1 / 3;
      }, 30);
      return () => clearInterval(intv);
    } else { setGlitchLabel(node.label); }
  }, [isActive, node.label]);
  const isRight = node.pos[0] >= 0;
  const signX = isRight ? 1 : -1;
  const signY = node.pos[1] >= 0 ? 1 : -1;

  // Responsive tether distances
  const elbowX = isMobileSize ? 0.25 : 0.4;
  const cardScale = isMobileSize ? 0.45 : 1;
  const cardX = isMobileSize ? 0.5 : 0.9;
  const tetherY = isMobileSize ? 0.15 : 0.3;

  const ptBrain = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const ptElbow = useMemo(() => new THREE.Vector3(signX * elbowX, signY * tetherY, 0), [signX, elbowX, signY, tetherY]);
  const ptCard = useMemo(() => new THREE.Vector3(signX * cardX, signY * tetherY, 0), [signX, cardX, signY, tetherY]);

  const lineGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints([ptBrain, ptElbow, ptCard]), [ptBrain, ptElbow, ptCard]);
  const ringRot = useMemo(() => {
    const normal = new THREE.Vector3(...node.pos).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return new THREE.Euler().setFromQuaternion(q);
  }, [node.pos]);
  const dotRef = useRef(), ringRef = useRef(), innerRef = useRef();
  useFrame(({ clock }) => {
    if (!node.priority) return;
    const t = clock.elapsedTime;
    const pulse = Math.sin(t * 15.0) * 0.2 + 0.8;
    if (dotRef.current) dotRef.current.scale.setScalar(pulse);
    if (ringRef.current) ringRef.current.scale.setScalar(pulse * 1.5);
    if (innerRef.current) innerRef.current.opacity = 0.4 + Math.sin(t * 15.0) * 0.4;
  });
  const nodeColor = isActive ? T.cyan : (node.priority ? T.yellow : T.neonRed);

  return (
    <group position={node.pos}>
      <line geometry={lineGeo}>
        <lineBasicMaterial color={nodeColor} linewidth={2} />
      </line>
      <mesh rotation={ringRot} ref={ringRef}>
        <ringGeometry args={[0.025, 0.045, 24]} />
        <meshBasicMaterial color={nodeColor} side={THREE.DoubleSide} transparent />
      </mesh>
      <mesh rotation={ringRot}>
        <circleGeometry args={[0.015, 12]} />
        <meshBasicMaterial ref={innerRef} color={nodeColor} transparent />
      </mesh>
      <mesh position={ptElbow} ref={dotRef}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color={nodeColor} />
      </mesh>
      <Html position={ptCard} center style={{ pointerEvents: 'none', zIndex: isActive ? 100 : 1 }} zIndexRange={[100, 0]}>
        <div style={{
          display: 'flex', alignItems: 'center',
          flexDirection: isRight ? 'row' : 'row-reverse',
          transition: 'all 0.6s cubic-bezier(0.16,1,0.3,1)',
          opacity: isActive ? 1 : 0.5,
          filter: isActive ? `drop-shadow(0 0 20px ${T.cyan})` : 'none',
          transform: isMobileSize 
            ? `scale(${isActive ? 1.2 * cardScale : 0.8 * cardScale})` 
            : `scale(${isActive ? 1.5 : 1.0})`,
        }}>
          <div style={{ 
            background: 'rgba(0,0,0,0.95)', 
            border: `1px solid ${isActive ? T.cyan : T.neonRed}aa`, 
            padding: isActive ? '12px 20px' : '8px 12px', 
            minWidth: isMobileSize ? '110px' : (isActive ? '220px' : '160px'), 
            clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%)', 
            position: 'relative',
            boxShadow: isActive ? `0 0 30px ${T.cyan}33` : 'none',
            transition: 'all 0.4s ease'
          }}>
            {isActive && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: T.cyan, boxShadow: `0 0 15px ${T.cyan}` }} />}
            <div style={{ 
              fontFamily: '"Share Tech Mono", monospace', 
              fontSize: isActive ? '14px' : '12px', 
              color: isActive ? T.cyan : T.neonRed, 
              letterSpacing: '0.15em', 
              fontWeight: 'bold', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px' 
            }}>
              <div style={{ width: '6px', height: '6px', background: 'currentColor', borderRadius: '50%', boxShadow: isActive ? `0 0 10px currentColor` : 'none' }} />
              {glitchLabel}
            </div>
            <div style={{ fontFamily: '"Space Mono", monospace', fontSize: isActive ? '11px' : '9px', color: '#aaa', marginTop: '4px', marginBottom: '8px' }}>[{node.sub}]</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ 
                fontFamily: '"Orbitron", monospace', 
                fontSize: isActive ? '24px' : '18px', 
                color: T.yellow, 
                fontWeight: '900', 
                textShadow: `0 0 12px ${T.yellow}88` 
              }}>{node.value}%</span>
              <div style={{ flex: 1, height: isActive ? '5px' : '3px', background: '#222' }}>
                <div style={{ width: `${node.value}%`, height: '100%', background: isActive ? T.cyan : T.neonRed, transition: 'width 1.2s ease-out' }} />
              </div>
            </div>
            {isActive && (
              <div style={{ 
                marginTop: '12px', 
                paddingTop: '8px', 
                borderTop: '1px solid #ffffff11', 
                fontSize: '9px', 
                color: T.cyan, 
                fontFamily: '"Share Tech Mono"', 
                letterSpacing: '0.1em' 
              }}>
                [ PRIORITY ACCESS GRANTED ] // DATA_STREAM_ACTIVE
              </div>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}

// ─── Brain Mesh — tier-adaptive materials ─────────────────────────────────────
function CyberBrain({ activeRegionId, tier, config, isMobile }) {
  // Draco flag = true → Drei auto-configures DRACOLoader from CDN
  const { scene } = useGLTF('/brain.glb', true);
  const groupRef = useRef();

  const brainGeo = useMemo(() => {
    const geos = [];
    scene.traverse(obj => {
      if (obj.isMesh && obj.geometry) {
        const g = obj.geometry.clone();
        obj.updateWorldMatrix(true, false);
        g.applyMatrix4(obj.matrixWorld);
        geos.push(g);
      }
    });
    if (geos.length === 0) return null;
    const merged = mergeGeometries(geos, false);
    merged.computeBoundingBox();
    const box = merged.boundingBox;
    const centre = new THREE.Vector3(); box.getCenter(centre);
    merged.translate(-centre.x, -centre.y, -centre.z);
    const size = new THREE.Vector3(); box.getSize(size);
    const brainScale = isMobile ? (activeRegionId ? 1.2 : 1.0) : 2.4;
    const scale = brainScale / Math.max(size.x, size.y, size.z);
    merged.scale(scale, scale, scale);
    return merged;
  }, [scene, isMobile, activeRegionId]);

  // HIGH / MEDIUM: Full GLSL holographic shader
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uColor: { value: T.redV.clone() }, uOpacity: { value: 0.9 } }), []);
  const wireUniforms = useMemo(() => ({ uTime: { value: 0 }, uColor: { value: T.redV.clone() } }), []);
  const holoMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: BRAIN_VERT, fragmentShader: BRAIN_FRAG, uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), [uniforms]);
  const wireMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: BRAIN_VERT, fragmentShader: WIRE_FRAG, uniforms: wireUniforms, transparent: true, depthWrite: false, wireframe: true, blending: THREE.AdditiveBlending }), [wireUniforms]);

  // LOW: meshBasicMaterial — pre-baked neon look, 0 shader cost
  const basicMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(T.neonRed),
    wireframe: false,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  }), []);
  const basicWireMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color('#330010'),
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  }), []);

  // Final material selection
  const isLow = tier === 'low';
  const primaryMat = isLow ? basicMat : holoMat;
  const secondaryMat = isLow ? basicWireMat : (config.brainWireframe ? wireMat : null);

  useFrame(({ clock }, delta) => {
    if (!isLow) {
      uniforms.uTime.value = clock.elapsedTime;
      wireUniforms.uTime.value = clock.elapsedTime;
    }
    if (groupRef.current) {
      if (activeRegionId) {
        const targetRot = REGIONS[activeRegionId].rot;
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRot[0], delta * 3.0);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot[1], delta * 3.0);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRot[2], delta * 3.0);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, delta * 2.0);
      } else {
        groupRef.current.rotation.y += delta * 0.2;
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, delta);
        groupRef.current.position.y = Math.sin(clock.elapsedTime * 0.5) * 0.1;
      }
    }
  });

  if (!brainGeo) return null;

  return (
    <group ref={groupRef}>
      <mesh geometry={brainGeo} material={primaryMat} />
      {secondaryMat && <mesh geometry={brainGeo} material={secondaryMat} />}

      {/* Inner core glow */}
      <mesh geometry={brainGeo} scale={[0.85, 0.85, 0.85]}>
        <meshBasicMaterial color={T.neonRed} transparent opacity={isLow ? 0.05 : 0.1} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Tethered HTML nodes — Only show all nodes during idle, focus single node when active */}
      {config.brainTetheredNodes && Object.values(REGIONS)
        .filter(r => !activeRegionId || r.id === activeRegionId)
        .map(r => (
          <TetheredNode key={r.id} node={r} isActive={activeRegionId === r.id} isMobileSize={isMobile} />
        ))}
    </group>
  );
}

// ─── Atmosphere — tier-adaptive lights & stars ────────────────────────────────
function Atmosphere({ isMobile, perfDown, tier, config }) {
  const starCount = perfDown ? Math.min(config.starCount, 800) : config.starCount;
  return (
    <>
      <ambientLight intensity={0.2} />
      {/* Lights: HIGH=2, MEDIUM=1, LOW=0 */}
      {config.brainLights >= 1 && (
        <pointLight position={[0, 4, 0]} intensity={4.0} color={T.neonRed} distance={15} decay={2} />
      )}
      {config.brainLights >= 2 && (
        <pointLight position={[-4, -2, 3]} intensity={2.0} color={T.cyan} distance={10} decay={2} />
      )}
      {starCount > 0 && (
        <Stars radius={100} depth={50} count={starCount} factor={3} saturation={config.starSaturation} fade speed={0.5} />
      )}
      {config.useFog && <fog attach="fog" args={['#000', 5, 25]} />}
    </>
  );
}

// ─── Loader Fallback ──────────────────────────────────────────────────────────
function BrainLoader() {
  return (
    <Html center>
      <div style={{ fontFamily: '"Share Tech Mono", monospace', color: T.neonRed, textAlign: 'center', background: '#000', padding: '10px', border: `1px solid ${T.neonRed}` }}>
        [ INITIALIZING CORTICAL STACK ]<br />
        <span style={{ fontSize: '10px', opacity: 0.5 }}>LOADING brain.glb (DRACO) // STANDBY</span>
      </div>
    </Html>
  );
}

// ─── 30 FPS Cap Controller ────────────────────────────────────────────────────
function FrameCapController({ frameCapMs }) {
  const lastTime = useRef(0);
  const { invalidate } = useThree();
  useFrame(() => {
    if (!frameCapMs) return;
    const now = performance.now();
    if (now - lastTime.current >= frameCapMs) {
      lastTime.current = now;
      invalidate();
    }
  });
  return null;
}

export default function NeuralMind() {
  const { tier, config, onCanvasCreated, reportFPS } = useQuality();
  const [activeRegion, setActiveRegion] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [perfDown, setPerfDown] = useState(false);
  const [isLocked, setIsLocked] = useState(window.innerWidth >= 768);
  const lastTap = useRef(0);
  const { playHover, playRot, playClick } = useCyberAudio();
  
  const handleInteractionToggle = useCallback((e) => {
    if (!isMobile) return; // Desktop is always unlocked
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      setIsLocked(prev => !prev);
    }
    lastTap.current = now;
  }, [isMobile]);

  // FPS buffer for watchdog
  const fpsBuffer = useRef([]);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsLocked(true); // Auto-unlock when switching to desktop
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Share+Tech+Mono&family=Space+Mono&display=swap');
      `}</style>

      <div style={{
        position: 'relative', width: '100%',
        height: isMobile ? '500px' : '800px',
        background: '#000', overflow: 'hidden',
        border: `2px solid ${T.neonRed}`,
        boxShadow: `0 0 30px ${T.neonRed}44`,
      }}>
        {/* Background Matrix Rain — Canvas 2D, no WebGL overhead */}
        <MatrixRain />

        {/* Scanlines overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)' }} />

        {/* HUD Header */}
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, fontFamily: '"Share Tech Mono", monospace', color: T.neonRed, textShadow: `0 0 8px ${T.neonRed}` }}>
          <div style={{ fontSize: isMobile ? '12px' : '18px', fontWeight: 'bold' }}>NEURAL ENGRAM CORE v3.0</div>
          <div style={{ fontSize: isMobile ? '8px' : '10px', opacity: 0.7, marginTop: '2px' }}>
            STATUS: {activeRegion ? `TARGET LOCKED [ ${activeRegion} ]` : 'IDLE // AWAITING COMMAND'}
          </div>
          {/* Tier indicator inside NeuralMind HUD */}
          <div style={{ fontSize: '8px', opacity: 0.5, marginTop: '2px', letterSpacing: '0.1em' }}>
            RENDER_TIER: {tier.toUpperCase()}
          </div>
        </div>

        {/* Global Interaction Hint — Only on Mobile */}
        {isMobile && (
          <div style={{
            position: 'absolute',
            top: isMobile ? '25%' : '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            pointerEvents: 'none',
            fontFamily: "'Orbitron', sans-serif",
            textAlign: 'center',
            background: 'rgba(0, 0, 0, 0.7)',
            padding: '8px 16px',
            border: `1px solid ${isLocked ? T.cyan : T.yellow}`,
            color: isLocked ? T.cyan : T.yellow,
            fontSize: isMobile ? '9px' : '11px',
            letterSpacing: '0.25em',
            textShadow: `0 0 8px ${isLocked ? T.cyan : T.yellow}`,
            clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
            animation: isLocked ? 'none' : 'pulseBio 2s infinite',
            opacity: 0.8
          }}>
            {isLocked 
              ? `NEURAL_BRIDGE ACTIVE [ TAP x2 TO LOCK ]` 
              : `NEURAL_ENGRAM_CORE [ TAP x2 TO ACCESS ]`
            }
          </div>
        )}

        <style>{`
          @keyframes pulseBio {
            0% { opacity: 0.4; transform: translateX(-50%) scale(0.95); }
            50% { opacity: 0.9; transform: translateX(-50%) scale(1.05); }
            100% { opacity: 0.4; transform: translateX(-50%) scale(0.95); }
          }
        `}</style>

        {/* Interactive Nav buttons */}
        <div style={{
          position: 'absolute', bottom: isMobile ? 12 : 20,
          left: 0, right: 0, zIndex: 10,
          display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
          gap: isMobile ? '6px' : '10px', padding: '0 8px', 
          pointerEvents: isLocked ? 'auto' : 'none',
          opacity: isLocked ? 1 : 0.2
        }}>
          {Object.values(REGIONS).map(r => {
            const isActive = activeRegion === r.id;
            return (
              <button
                key={r.id}
                onClick={() => { setActiveRegion(isActive ? null : r.id); playClick(); if (!isActive) playRot(); }}
                onTouchStart={() => playHover()}
                style={{
                  pointerEvents: 'auto',
                  background: isActive ? T.neonRed : 'rgba(0,0,0,0.6)',
                  border: `1px solid ${T.neonRed}`,
                  color: isActive ? '#000' : T.neonRed,
                  padding: isMobile ? '6px 10px' : '8px 16px',
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: isMobile ? '9px' : '12px',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? `0 0 15px ${T.neonRed}` : 'none',
                  textTransform: 'uppercase',
                }}
                onMouseEnter={e => { playHover(); if (!isActive) e.target.style.background = 'rgba(255,0,60,0.2)'; }}
                onMouseLeave={e => { if (!isActive) e.target.style.background = 'rgba(0,0,0,0.6)'; }}
              >
                [ {r.id} ]
              </button>
            );
          })}
        </div>

        {/* 3D Canvas */}
        <Canvas
          dpr={config.dpr}
          frameloop={config.frameCapMs ? 'demand' : 'always'}
          camera={{ position: [0, 1.2, isMobile ? 7.5 : 5.5], fov: isMobile ? 55 : 45 }}
          onTouchStart={handleInteractionToggle}
          onDoubleClick={handleInteractionToggle}
          style={{ 
            position: 'absolute', 
            inset: 0, 
            zIndex: 2, 
            touchAction: isLocked ? 'none' : 'pan-y pinch-zoom',
            pointerEvents: isLocked ? 'auto' : 'none'
          }}
          gl={{
            powerPreference: 'high-performance',
            precision: config.precision,
            antialias: config.antialias,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
          }}
          onCreated={onCanvasCreated}
        >
          {/* 30fps cap for LOW tier */}
          {config.frameCapMs && <FrameCapController frameCapMs={config.frameCapMs} />}

          {/* FPS Watchdog */}
          <FPSWatchdogInner reportFPS={reportFPS} fpsBuffer={fpsBuffer} />

          <PerformanceMonitor
            onDecline={() => setPerfDown(true)}
            onIncline={() => setPerfDown(false)}
          >
            <Atmosphere isMobile={isMobile} perfDown={perfDown} tier={tier} config={config} />
            <Suspense fallback={<BrainLoader />}>
            <CyberBrain activeRegionId={activeRegion} tier={tier} config={config} isMobile={isMobile} />
            </Suspense>
          </PerformanceMonitor>
        </Canvas>
      </div>
    </>
  );
}

// Inner FPS watchdog — lives inside Canvas context
function FPSWatchdogInner({ reportFPS, fpsBuffer }) {
  useFrame((_, delta) => {
    const fps = 1 / delta;
    fpsBuffer.current.push(fps);
    if (fpsBuffer.current.length > 30) fpsBuffer.current.shift();
    const avg = fpsBuffer.current.reduce((a, b) => a + b, 0) / fpsBuffer.current.length;
    reportFPS(avg);
  });
  return null;
}

// Preload with Draco decoder
useGLTF.preload('/brain.glb', true);
