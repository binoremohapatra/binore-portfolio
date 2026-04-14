/**
 * NeuralMind.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AAA-Grade Cyberpunk Holographic Brain — Anatomically Mapped Engram
 *
 * Features:
 *  • Red Matrix aesthetic (#FF003C / Black)
 *  • Brain mapped to specific regions for Skills.
 *  • Interactive camera rotation targeting lobes.
 *  • Statically tethered physical data cards rotating with the mesh.
 *  • Matrix code rain backdrop.
 */

import React, {
  useRef, useMemo, useState, useEffect, Suspense,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html, Stars, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useCyberAudio } from '../context/SoundContext';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  neonRed: '#FF003C',
  cyan: '#00F0FF',
  yellow: '#FCEE0A',
  black: '#000000',
  redV: new THREE.Color('#FF003C'),
};

// ─── Data & Anatomy Map ───────────────────────────────────────────────────────
// pos: [x, y, z] relative to the brain's local space
// rot: [x, y, z] target rotation for the entire group when clicked
const REGIONS = {
  FRONTEND: {
    id: 'FRONTEND', label: 'FRONTEND', value: 88, sub: 'React · Tailwind',
    pos: [0, 0.4, 1.4], rot: [0, 0, 0],
    color: T.neonRed,
  },
  BACKEND: {
    id: 'BACKEND', label: 'BACKEND', value: 94, sub: 'Java · Spring Boot',
    pos: [0, 0.5, -1.4], rot: [0, Math.PI, 0],
    color: T.neonRed,
  },
  DATABASE: {
    id: 'DATABASE', label: 'DATABASE', value: 86, sub: 'PostgreSQL · MySQL',
    pos: [0, -1.0, -1.0], rot: [-Math.PI * 0.25, Math.PI, 0], // Tilt up to see bottom back
    color: T.neonRed,
  },
  SYSTEMS: {
    id: 'SYSTEMS', label: 'SYSTEMS', value: 85, sub: 'Geospatial AI · Flutter',
    pos: [0, 1.4, 0.2], rot: [Math.PI * 0.35, 0, 0], // Tilt down to see top
    color: T.neonRed,
  },
  AI: {
    id: 'AI', label: 'AI / LLM', value: 82, sub: 'Ollama · Python',
    pos: [1.3, 0.3, 0.3], rot: [0, -Math.PI * 0.45, 0], // Turn to side
    color: T.neonRed,
  },
  MAVIS: {
    id: 'MAVIS', label: 'MAVIS AI', value: 98, sub: 'Local RAG · Tutor',
    pos: [-1.4, -0.6, 0.2], rot: [0, Math.PI * 0.45, 0],
    color: T.yellow,
    priority: true
  },
};

// ─── GLSL: Intense Glitch Red Brain Shader ────────────────────────────────────
const BRAIN_VERT = /* glsl */`
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  // Simple pseudo-random
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vec3 p = position;
    
    // Glitching vertex animation: occasionally spasm outward based on time
    float glitchT = fract(uTime * 0.5);
    if(glitchT > 0.95) {
        float noise = random(p.xy * uTime);
        p += normal * noise * 0.04;
    }

    vec4 worldPos   = modelMatrix * vec4(p, 1.0);
    vec4 mvPos      = modelViewMatrix * vec4(p, 1.0);
    vNormal         = normalize(normalMatrix * normal);
    vWorldPos       = worldPos.xyz;
    vViewDir        = normalize(cameraPosition - worldPos.xyz);
    gl_Position     = projectionMatrix * mvPos;
  }
`;

const BRAIN_FRAG = /* glsl */`
  uniform float uTime;
  uniform vec3  uColor;
  uniform float uOpacity;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewDir;

  float hash(vec3 p) {
    p = fract(p * vec3(127.1, 311.7, 74.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y * p.z);
  }

  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y), mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);

    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.5);
    float n1  = noise(vWorldPos * 4.2 + uTime * 0.08);
    float n2  = noise(vWorldPos * 9.5 - uTime * 0.05);
    float fold = pow(n1 * n2, 0.7);

    // Glitch bands passing down
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
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    float pulse   = 0.5 + 0.5 * sin(uTime * 3.0);
    float alpha   = fresnel * pulse * 0.6;
    gl_FragColor  = vec4(uColor, alpha);
  }
`;

// ─── Matrix Rain Hook ─────────────────────────────────────────────────────────
function MatrixRain() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    const ctx = cvs.getContext('2d');

    // Fit parent
    const resize = () => {
      cvs.width = cvs.parentElement.clientWidth;
      cvs.height = cvs.parentElement.clientHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*アァカサタナハマヤャラワガザダバパイィキシチニヒミリヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレゲゼデベペオォコソトノホモヨョロゴゾドボポヴッン'.split('');
    const fontSize = 14;
    const columns = Math.floor(cvs.width / fontSize) + 1;
    const drops = [];
    for (let x = 0; x < columns; x++) drops[x] = 1;

    let intervalId;

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'; // Deep black fade
      ctx.fillRect(0, 0, cvs.width, cvs.height);

      ctx.font = `${fontSize}px "Share Tech Mono"`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];

        // Front drops are bright red, tails fade into dark red
        ctx.fillStyle = Math.random() > 0.95 ? '#ffffff' : '#FF003C';

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > cvs.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    intervalId = setInterval(draw, 50);
    return () => {
      window.removeEventListener('resize', resize);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        opacity: 0.8
      }}
    />
  );
}

// ─── Tethered Node Component ──────────────────────────────────────────────────
function TetheredNode({ node, isActive }) {
  const [glitchLabel, setGlitchLabel] = useState(node.label);

  useEffect(() => {
    if (isActive) {
      const chars = '!<>-_\\\\/[]{}—=+*^?#_';
      let iter = 0;
      const intv = setInterval(() => {
        setGlitchLabel(node.label.split('').map((c, i) => {
          if (i < iter) return c;
          return chars[Math.floor(Math.random() * chars.length)];
        }).join(''));
        if (iter >= node.label.length) clearInterval(intv);
        iter += 1 / 3;
      }, 30);
      return () => clearInterval(intv);
    } else {
      setGlitchLabel(node.label);
    }
  }, [isActive, node.label]);

  const isRight = node.pos[0] >= 0;
  const signX = isRight ? 1 : -1;
  const signY = node.pos[1] >= 0 ? 1 : -1;

  // 3D PCB Trace Points (local to the node's position)
  const ptBrain = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const ptElbow = useMemo(() => new THREE.Vector3(signX * 0.4, signY * 0.3, 0), [signX, signY]);
  const ptCard = useMemo(() => new THREE.Vector3(signX * 0.9, signY * 0.3, 0), [signX, signY]);

  const lineGeo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints([ptBrain, ptElbow, ptCard]);
  }, [ptBrain, ptElbow, ptCard]);

  // Terminal Ring Rotation to face flush against the brain's "surface normal"
  const ringRot = useMemo(() => {
    const normal = new THREE.Vector3(...node.pos).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return new THREE.Euler().setFromQuaternion(q);
  }, [node.pos]);

  // Pulse Refs
  const dotRef = useRef();
  const ringRef = useRef();
  const innerRef = useRef();

  useFrame(({ clock }) => {
    if (!node.priority) return;
    const t = clock.elapsedTime;
    const pulse = Math.sin(t * 15.0) * 0.2 + 0.8; // High frequency
    if (dotRef.current) dotRef.current.scale.setScalar(pulse);
    if (ringRef.current) ringRef.current.scale.setScalar(pulse * 1.5);
    if (innerRef.current) innerRef.current.opacity = 0.4 + Math.sin(t * 15.0) * 0.4;
  });

  const nodeColor = isActive ? T.cyan : (node.priority ? T.yellow : T.neonRed);

  return (
    <group position={node.pos}>
      {/* The Circuit Trace (Line) */}
      <line geometry={lineGeo}>
        <lineBasicMaterial color={nodeColor} linewidth={2} />
      </line>

      {/* The PCB Pad (Terminal Ring + Via) embedded into the topology */}
      <mesh rotation={ringRot} ref={ringRef}>
        <ringGeometry args={[0.025, 0.045, 24]} />
        <meshBasicMaterial color={nodeColor} side={THREE.DoubleSide} transparent />
      </mesh>
      <mesh rotation={ringRot}>
        <circleGeometry args={[0.015, 12]} />
        <meshBasicMaterial ref={innerRef} color={nodeColor} transparent />
      </mesh>

      {/* Elbow Bend Dot (PCB Joint) */}
      <mesh position={ptElbow} ref={dotRef}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color={nodeColor} />
      </mesh>

      {/* HTML Card placed exactly at the end of the 3D trace */}
      <Html position={ptCard} center style={{ pointerEvents: 'none' }} zIndexRange={[100, 0]}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          flexDirection: isRight ? 'row' : 'row-reverse',
          transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
          opacity: isActive ? 1 : 0.4,
          filter: isActive ? 'drop-shadow(0 0 10px #FF003C)' : 'none',
          transform: window.innerWidth < 768 ? 'scale(0.7)' : 'scale(1)'
        }}>

          {/* Brutalist Data Card */}
          <div
            className="neural-data-card"
            style={{
              background: '#000',
              border: `1px solid ${isActive ? T.cyan : T.neonRed}`,
              padding: '10px 14px',
              minWidth: '160px',
              clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
            }}
          >
            {/* Top scanning line for active */}
            {isActive && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: T.cyan, boxShadow: `0 0 10px ${T.cyan}` }} />}

            <div style={{
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: '12px',
              color: isActive ? T.cyan : T.neonRed,
              letterSpacing: '0.15em',
              fontWeight: 'bold',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <div style={{ width: '6px', height: '6px', background: 'currentColor', borderRadius: '50%' }} />
              {glitchLabel}
            </div>

            <div style={{
              fontFamily: '"Space Mono", monospace',
              fontSize: '9px',
              color: '#888',
              marginTop: '4px',
              marginBottom: '8px'
            }}>
              [{node.sub}]
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontFamily: '"Orbitron", monospace',
                fontSize: '18px',
                color: T.yellow,
                fontWeight: '900',
                textShadow: `0 0 10px ${T.yellow}66`
              }}>{node.value}%</span>

              <div style={{ flex: 1, height: '3px', background: '#222' }}>
                <div style={{
                  width: `${node.value}%`,
                  height: '100%',
                  background: isActive ? T.cyan : T.neonRed,
                  transition: 'width 1s ease-out'
                }} />
              </div>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}

// ─── Brain Mesh with Tethered Nodes ───────────────────────────────────────────
function CyberBrain({ activeRegionId }) {
  const { scene } = useGLTF('/brain.glb');
  const groupRef = useRef();

  // Parse Geometry
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
    const centre = new THREE.Vector3();
    box.getCenter(centre);
    merged.translate(-centre.x, -centre.y, -centre.z);

    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = 2.4 / Math.max(size.x, size.y, size.z);
    merged.scale(scale, scale, scale);
    merged.computeVertexNormals();
    return merged;
  }, [scene]);

  // Shaders
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: T.redV.clone() },
    uOpacity: { value: 0.9 },
  }), []);

  const wireUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: T.redV.clone() },
  }), []);

  const holoMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: BRAIN_VERT,
    fragmentShader: BRAIN_FRAG,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), [uniforms]);

  const wireMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: BRAIN_VERT,
    fragmentShader: WIRE_FRAG,
    uniforms: wireUniforms,
    transparent: true,
    depthWrite: false,
    wireframe: true,
    blending: THREE.AdditiveBlending,
  }), [wireUniforms]);

  // Frame Loop / Smooth Rotation
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    uniforms.uTime.value = t;
    wireUniforms.uTime.value = t;

    if (groupRef.current) {
      if (activeRegionId) {
        // Lerp to target rotation
        const targetRot = REGIONS[activeRegionId].rot;
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRot[0], delta * 3.0);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot[1], delta * 3.0);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRot[2], delta * 3.0);

        // Stabilize Y position
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, delta * 2.0);
      } else {
        // Idle rotation & breathing
        groupRef.current.rotation.y += delta * 0.2;
        // Normalize x and z back to 0
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, delta);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, delta);
        groupRef.current.position.y = Math.sin(t * 0.5) * 0.1;
      }
    }
  });

  if (!brainGeo) return null;

  return (
    <group ref={groupRef}>
      <mesh geometry={brainGeo} material={holoMat} />
      <mesh geometry={brainGeo} material={wireMat} />

      {/* Intense inner core */}
      <mesh geometry={brainGeo} scale={[0.85, 0.85, 0.85]}>
        <meshBasicMaterial
          color={T.neonRed}
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Tethered Nodes */}
      {Object.values(REGIONS).map(r => (
        <TetheredNode key={r.id} node={r} isActive={activeRegionId === r.id} />
      ))}
    </group>
  );
}

// ─── Environment ──────────────────────────────────────────────────────────────
function Atmosphere({ isMobile, perfDown }) {
  // Mobile / Low-End Downgrades: Reduce stars from 4000 -> 800, disable fog if perf drops
  const starCount = isMobile || perfDown ? 800 : 4000;

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 4, 0]} intensity={4.0} color={T.neonRed} distance={15} decay={2} />
      <pointLight position={[-4, -2, 3]} intensity={2.0} color={T.cyan} distance={10} decay={2} />

      <Stars radius={100} depth={50} count={starCount} factor={3} saturation={1} fade speed={0.5} />
      {!perfDown && <fog attach="fog" args={['#000', 5, 25]} />}
    </>
  );
}

// ─── Fallback Loader ──────────────────────────────────────────────────────────
function BrainLoader() {
  return (
    <Html center>
      <div style={{
        fontFamily: '"Share Tech Mono", monospace',
        color: T.neonRed,
        textAlign: 'center',
        background: '#000', padding: '10px',
        border: `1px solid ${T.neonRed}`
      }}>
        [ INITIALIZING CORTICAL STACK ]<br />
        <span style={{ fontSize: '10px', opacity: 0.5 }}>LOADING brain.glb // STANDBY</span>
      </div>
    </Html>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NeuralMind() {
  const [activeRegion, setActiveRegion] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [perfDown, setPerfDown] = useState(false); // Throttle flag
  const { playHover, playRot, playClick } = useCyberAudio();
  
  useEffect(() => {
    const checkViewport = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Share+Tech+Mono&family=Space+Mono&display=swap');
      `}</style>

      <div
        className="neural-engram-container"
        style={{
          position: 'relative',
          width: '100%',
          height: isMobile ? '500px' : '800px',
          background: '#000',
          overflow: 'hidden',
          border: `2px solid ${T.neonRed}`,
          boxShadow: `0 0 30px ${T.neonRed}44`
        }}
      >
        {/* Background Layer: Matrix Rain */}
        <MatrixRain />

        {/* Scanlines / Noise Overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
        }} />

        {/* Top Header UI — font scales down on mobile */}
        <div
          className="neural-hud-label"
          style={{
            position: 'absolute', top: 20, left: 20, zIndex: 10,
            fontFamily: '"Share Tech Mono", monospace',
            color: T.neonRed,
            textShadow: `0 0 8px ${T.neonRed}`
          }}
        >
          <div style={{ fontSize: isMobile ? '12px' : '18px', fontWeight: 'bold' }}>NEURAL ENGRAM CORE v3.0</div>
          <div className="neural-version-tag" style={{ fontSize: isMobile ? '8px' : '10px', opacity: 0.7, marginTop: '2px' }}>
            STATUS: {activeRegion ? `TARGET LOCKED [ ${activeRegion} ]` : "IDLE // AWAITING COMMAND"}
          </div>
        </div>

        {/* Bottom Interactive Nav — safe area aware, compact on mobile */}
        <div style={{
          position: 'absolute',
          bottom: isMobile ? 12 : 20,
          left: 0, right: 0, zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: isMobile ? '6px' : '10px',
          padding: '0 8px',
          pointerEvents: 'none'
        }}>
          {Object.values(REGIONS).map(r => {
            const isActive = activeRegion === r.id;
            return (
              <button
                key={r.id}
                onClick={() => {
                  setActiveRegion(isActive ? null : r.id);
                  playClick();
                  if (!isActive) playRot();
                }}
                // Touch events for mobile — mirrors mouse logic
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
                  textTransform: 'uppercase'
                }}
                onMouseEnter={(e) => { 
                  playHover();
                  if (!isActive) e.target.style.background = 'rgba(255,0,60,0.2)'; 
                }}
                onMouseLeave={(e) => { if (!isActive) e.target.style.background = 'rgba(0,0,0,0.6)'; }}
              >
                [ {r.id} ]
              </button>
            );
          })}
        </div>

        {/* 3D Canvas with Adaptive Performance Safeguards */}
        <Canvas
          dpr={[1, 1]}
          // Mobile: pull camera back (larger Z + wider FOV) so brain fits narrow viewport
          camera={{ position: [0, 1.2, isMobile ? 7.5 : 5.5], fov: isMobile ? 55 : 45 }}
          style={{ position: 'absolute', inset: 0, zIndex: 2 }}
          gl={{ powerPreference: "high-performance", antialias: false, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <PerformanceMonitor 
             onDecline={() => setPerfDown(true)} 
             onIncline={() => setPerfDown(false)} 
             bounds={(fps) => fps < 50} 
          >
            <Atmosphere isMobile={isMobile} perfDown={perfDown} />
            <Suspense fallback={<BrainLoader />}>
              <CyberBrain activeRegionId={activeRegion} />
            </Suspense>
          </PerformanceMonitor>
        </Canvas>
      </div>
    </>
  );
}

useGLTF.preload('/brain.glb');
