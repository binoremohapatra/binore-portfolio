import React, {
  useRef, useMemo, useState, useEffect, useCallback, Suspense,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, PerformanceMonitor, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useCyberAudio } from '../context/SoundContext';
import { useQuality } from '../context/QualityContext';

// ─── Arasaka Design Tokens ───────────────────────────────────────────────────
const T = {
  arasakaRed: '#ff2a42',
  neonOrange: '#ff4500',
  darkCrimson: '#4a000d',
  black: '#000000',
  white: '#ffffff',
  redV: new THREE.Color('#ff2a42'),
  orangeV: new THREE.Color('#ff4500'),
};

const REGIONS = {
  FRONTEND: {
    id: 'FRONTEND', label: 'FRONTEND', value: 88, sub: 'React · Tailwind',
    pos: [0, 0, 1.3], rot: [0, 0, 0],
    color: T.arasakaRed, side: 'right'
  },
  BACKEND: {
    id: 'BACKEND', label: 'BACKEND', value: 94, sub: 'Java · Spring Boot',
    pos: [0, 0.35, -1.3], rot: [0, Math.PI, 0],
    color: T.arasakaRed, side: 'left'
  },
  DATABASE: {
    id: 'DATABASE', label: 'DATABASE', value: 86, sub: 'PostgreSQL · MySQL',
    pos: [1.1, -0.55, 0.55], rot: [0.3, -Math.PI * 0.4, 0],
    color: T.arasakaRed, side: 'left'
  },
  SYSTEMS: {
    id: 'SYSTEMS', label: 'URBAN_INTEL', value: 85, sub: 'Geospatial AI',
    pos: [-1.1, 0.75, 0.35], rot: [-0.4, Math.PI * 0.4, 0],
    color: T.arasakaRed, side: 'right'
  },
  AI: {
    id: 'AI', label: 'CORTEX_AI', value: 82, sub: 'Ollama · Python',
    pos: [0, 1.35, 0], rot: [Math.PI * 0.5, 0, 0],
    color: T.arasakaRed, side: 'left'
  },
};

// ─── Arasaka Logo Component SVG ──────────────────────────────────────────────
function ArasakaLogo({ color = T.arasakaRed, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <path d="M50 0L65 40H100L70 65L80 100L50 75L20 100L30 65L0 40H35L50 0Z" fill={color} />
    </svg>
  );
}

// ─── Matrix Digital Rain (Arasaka Overload Edition) ──────────────────────────
function MatrixRain() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const resize = () => {
      cvs.width = cvs.parentElement.clientWidth;
      cvs.height = cvs.parentElement.clientHeight;
    };
    window.addEventListener('resize', resize); resize();

    // Multi-Language Matrix: Katakana + Sanskrit + Hebrew + Danish + Latin
    const chars = (
      'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ' + // Katakana
      'अआइईउऊऋएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह' + // Sanskrit
      'אבגדהוזחטיכלמנסעפצקרשת' + // Hebrew
      'ÆØÅ' + // Danish
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' // Latin
    ).split('');

    const fontSize = 14;
    const columns = Math.floor(cvs.width / (fontSize * 0.45)) + 1;
    const drops = Array(columns).fill(1).map(() => Math.random() * -150);

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      ctx.font = `bold ${fontSize}px "Share Tech Mono"`;

      for (let i = 0; i < drops.length; i++) {
        if (Math.random() > 0.6) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const x = i * (fontSize * 0.45);
          const y = drops[i] * fontSize;

          const gradient = ctx.createLinearGradient(x, y - 80, x, y);
          gradient.addColorStop(0, T.darkCrimson);
          gradient.addColorStop(0.5, T.arasakaRed);
          gradient.addColorStop(1, T.arasakaRed);

          ctx.fillStyle = Math.random() > 0.99 ? '#ffffff' : gradient;
          ctx.fillText(char, x, y);

          if (y > cvs.height && Math.random() > 0.985) drops[i] = 0;
          drops[i] += 1.2;
        }
      }
    };

    const id = setInterval(draw, 35); // Slightly slower to let characters be read
    return () => { window.removeEventListener('resize', resize); clearInterval(id); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 1.0, pointerEvents: 'none', background: '#000' }} />;
}

// ─── Internal Wireframe Icons (High Performance) ─────────────────────────────
const Icons = {
  FRONTEND: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
  BACKEND: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),
  DATABASE: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  SYSTEMS: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="15" x2="23" y2="15" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="15" x2="4" y2="15" />
    </svg>
  ),
  AI: ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 0 0-10 10 10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2z" />
      <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
      <line x1="12" y1="8" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="16" />
      <line x1="8" y1="12" x2="2" y2="12" />
      <line x1="22" y1="12" x2="16" y2="12" />
    </svg>
  ),
};

// ─── Ambient Floating Data Tag (3D Node Label) ──────────────────────────────
const ICON_MAP = {
  FRONTEND: Icons.FRONTEND,
  BACKEND: Icons.BACKEND,
  DATABASE: Icons.DATABASE,
  SYSTEMS: Icons.SYSTEMS,
  AI: Icons.AI,
};

function AmbientTag({ region, activeId, onClick }) {
  const Icon = ICON_MAP[region.id] || Icons.FRONTEND;
  const isVisible = !activeId;

  // Circuit line geometry: Surface -> Elbow -> Card
  const { linePoints, elevatedPos } = useMemo(() => {
    const surfacePos = new THREE.Vector3(...region.pos);
    const normal = surfacePos.clone().normalize();
    // Move closer to the surface for shorter lines
    const elevated = surfacePos.clone().add(normal.clone().multiplyScalar(0.35));

    // Create a tighter elbow point
    const ortho = new THREE.Vector3(0, 1, 0).cross(normal).normalize();
    if (ortho.length() < 0.1) ortho.set(1, 0, 0).cross(normal).normalize();
    const elbow = surfacePos.clone().add(normal.clone().multiplyScalar(0.15)).add(ortho.clone().multiplyScalar(0.12));

    return {
      linePoints: [surfacePos, elbow, elevated],
      elevatedPos: elevated,
    };
  }, [region.pos]);

  return (
    <group>
      {/* 3D Glowing Line Tether (Circuit Style) */}
      {isVisible && (
        <Line
          points={linePoints}
          color={T.arasakaRed}
          lineWidth={1.2}
          transparent
          opacity={0.3}
        />
      )}

      <Html
        position={elevatedPos}
        center
        distanceFactor={4}
        style={{
          transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
          transform: `scale(${isVisible ? 1 : 0.5})`,
        }}
      >
        <div
          onClick={() => isVisible && onClick(region.id)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/90 border border-red-600/60 backdrop-blur-xl cursor-pointer group hover:bg-red-600/30 transition-all duration-300"
          style={{
            boxShadow: `0 0 20px ${T.arasakaRed}33`,
            clipPath: 'polygon(0 0, 100% 0, 100% 70%, 90% 100%, 0 100%)',
            whiteSpace: 'nowrap',
          }}
        >
          {/* Scanning Animation Accent */}
          <div className="absolute top-0 left-0 w-0.5 h-full bg-red-600 animate-pulse opacity-40" />

          <div className="p-1 bg-red-600/20 group-hover:bg-red-600/40 transition-colors rounded-sm">
            <Icon size={11} color={T.arasakaRed} />
          </div>

          <div className="flex flex-col">
            <span className="text-[8.5px] font-black uppercase tracking-[0.15em] text-white font-['Orbitron']">
              {region.id}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[5px] font-mono text-red-500/80 leading-none">
                SYNC_ACTIVE
              </span>
              <div className="w-1 h-1 rounded-full bg-red-600 animate-ping" />
            </div>
          </div>

          {/* Decorative Corner */}
          <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-red-500" />
        </div>
      </Html>
    </group>
  );
}

// ─── CyberBrain (Arasaka Red Elite) ──────────────────────────────────────────
function CyberBrain({ activeId, onNodesUpdate, onNodeClick }) {
  const { scene } = useGLTF('/brain.glb', true);
  const { camera, size } = useThree();
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
    const s = 2.6 / Math.max(box.getSize(new THREE.Vector3()).x);
    merged.scale(s, s, s);
    return merged;
  }, [scene]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: T.redV.clone() },
    uOpacity: { value: 0.95 }
  }), []);

  const pointLightRef = useRef();

  useEffect(() => {
    if (!groupRef.current) return;
    if (activeId) {
      const target = REGIONS[activeId].rot;
      gsap.to(groupRef.current.rotation, { x: target[0], y: target[1], z: target[2], duration: 1.6, ease: "power4.inOut" });
      gsap.to(groupRef.current.position, { x: 0, y: 0, duration: 1.6, ease: "power4.inOut" });
    }
  }, [activeId]);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;

    // Rotation logic: Only rotate if nothing is selected
    if (groupRef.current && !activeId) {
      groupRef.current.rotation.y += 0.008; // Faster idle rotation
      groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.3) * 0.08;
      groupRef.current.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.15;
    }

    if (onNodesUpdate && groupRef.current) {
      const updates = {};
      Object.keys(REGIONS).forEach(id => {
        const node = REGIONS[id];
        const worldPos = new THREE.Vector3(...node.pos).applyEuler(groupRef.current.rotation).add(groupRef.current.position);
        const screenPos = worldPos.clone().project(camera);
        updates[id] = {
          x: (screenPos.x * 0.5 + 0.5) * size.width,
          y: (-(screenPos.y * 0.5) + 0.5) * size.height,
          z: screenPos.z // Depth info to hide back-facing labels
        };

        if (activeId === id && pointLightRef.current) {
          pointLightRef.current.position.copy(worldPos);
        }
      });
      onNodesUpdate(updates);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={brainGeo}>
        <shaderMaterial
          transparent depthWrite={false} blending={THREE.AdditiveBlending}
          uniforms={uniforms}
          vertexShader={`
            varying vec3 vNormal; varying vec3 vWorldPos;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform float uTime; uniform vec3 uColor; uniform float uOpacity;
            varying vec3 vNormal; varying vec3 vWorldPos;
            void main() {
              float fresnel = pow(1.2 - max(dot(normalize(vNormal), vec3(0,0,1)), 0.0), 3.5);
              float scan = step(0.975, fract(vWorldPos.y * 15.0 - uTime * 3.5));
              gl_FragColor = vec4(uColor * (fresnel * 2.8 + scan * 2.0), (fresnel + scan) * uOpacity);
            }
          `}
        />
      </mesh>

      {/* Ambient Data Tags - Only active during Idle */}
      {Object.values(REGIONS).map(r => (
        <AmbientTag
          key={`tag-${r.id}`}
          region={r}
          activeId={activeId}
          onClick={onNodeClick}
        />
      ))}

      {/* Surface Nodes */}
      {Object.values(REGIONS).map(r => (
        <mesh key={r.id} position={r.pos}>
          <sphereGeometry args={[0.03, 24, 24]} />
          <meshBasicMaterial color={activeId === r.id ? T.neonOrange : T.arasakaRed} />
          {activeId === r.id && (
            <mesh scale={[1.8, 1.8, 1.8]}>
              <ringGeometry args={[0.035, 0.045, 32]} />
              <meshBasicMaterial color={T.neonOrange} transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
          )}
        </mesh>
      ))}

      {activeId && (
        <pointLight ref={pointLightRef} distance={2} intensity={4} color={T.arasakaRed} />
      )}
    </group>
  );
}

// ─── SVG Overlay (Global Scanning & Active Tether) ───────────────────────────
function SVGOverlay({ activeId, nodesData, cardAnchor }) {
  if (!nodesData) return null;

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 20, pointerEvents: 'none' }}>
      <defs>
        <filter id="arasakaGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feFlood floodColor={T.arasakaRed} result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Active Tether */}
      {activeId && nodesData[activeId] && cardAnchor && (
        <polyline
          points={`${nodesData[activeId].x},${nodesData[activeId].y} ${nodesData[activeId].x + (cardAnchor.x > nodesData[activeId].x ? 80 : -80)},${nodesData[activeId].y} ${nodesData[activeId].x + (cardAnchor.x > nodesData[activeId].x ? 80 : -80)},${cardAnchor.y} ${cardAnchor.x},${cardAnchor.y}`}
          fill="none" stroke={T.arasakaRed} strokeWidth="2.5"
          strokeDasharray="15,8" filter="url(#arasakaGlow)" style={{ opacity: 0.95 }}
        >
          <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2.5s" repeatCount="indefinite" />
        </polyline>
      )}
    </svg>
  );
}

// ─── HUD Skill Card (Arasaka Corporation Card) ──────────────────────────────
function HUDCard({ activeId, onAnchorUpdate, isMobile }) {
  const cardRef = useRef();
  const node = REGIONS[activeId];

  useEffect(() => {
    const update = () => {
      if (cardRef.current && node) {
        const rect = cardRef.current.getBoundingClientRect();
        const pRect = cardRef.current.parentElement.getBoundingClientRect();
        // Adjust anchor points for mobile centering
        const x = isMobile 
          ? pRect.width / 2 
          : (node.side === 'right' ? (rect.left - pRect.left) : (rect.right - pRect.left));
        const y = (rect.top - pRect.top) + rect.height / 2;
        onAnchorUpdate({ x, y });
      }
    };
    update();
    const obs = new ResizeObserver(update);
    if (cardRef.current) obs.observe(cardRef.current);
    window.addEventListener('resize', update);
    return () => { obs.disconnect(); window.removeEventListener('resize', update); };
  }, [activeId, node, onAnchorUpdate, isMobile]);

  if (!node) return null;
  const isRight = node.side === 'right';

  return (
    <div
      ref={cardRef}
      className={`absolute z-50 transition-all duration-500 p-0
        ${isMobile 
          ? 'top-[15%] left-1/2 -translate-x-1/2 w-[88%]' 
          : `top-1/2 -translate-y-1/2 ${isRight ? 'right-16' : 'left-16'} w-64`
        }`}
      style={{
        boxShadow: `0 0 40px ${T.arasakaRed}11`,
        animation: isMobile 
          ? 'cardEnterMobile 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          : `cardEnter${isRight ? 'Right' : 'Left'} 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards`
      }}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-red-600 text-black font-black uppercase text-[9px] tracking-tighter"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 95% 100%, 0 100%)' }}>
        <div className="flex items-center gap-1.5">
          <ArasakaLogo color="#000" size={10} />
          <span>ARASAKA CORP // 荒坂企業</span>
        </div>
        <div className="opacity-70">L-07</div>
      </div>

      {/* Main Content Body */}
      <div className="bg-black/95 backdrop-blur-2xl border-l-[4px] border-red-600 p-4"
        style={{ border: `1px solid ${T.arasakaRed}33`, borderLeft: `4px solid ${T.arasakaRed}` }}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-[8px] font-mono tracking-[3px] opacity-40 mb-1" style={{ color: T.white }}>// ENGRAM</div>
            <h2 className="text-2xl font-black uppercase italic leading-none" style={{ fontFamily: '"Orbitron"', color: '#fff' }}>{node.label}</h2>
          </div>
          <div className="text-[8px] font-mono text-right opacity-30" style={{ color: T.white }}>
            ASN-{Math.floor(Math.random() * 899 + 100)}<br />
            SEC-07
          </div>
        </div>

        <div className="text-[10px] font-mono mb-5 p-1 bg-red-600/10 w-fit" style={{ color: T.neonOrange }}>
          &gt; {node.sub}
        </div>

        <div className="space-y-4">
          <div className="bg-white/5 p-3 border-r-2 border-white/10">
            <div className="flex justify-between text-[9px] font-bold mb-2 uppercase tracking-widest">
              <span style={{ color: '#888' }}>Synaptic_Load</span>
              <span style={{ color: T.neonOrange }}>{node.value}%</span>
            </div>
            <div className="h-2 bg-red-950/20 relative" style={{ outline: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="h-full transition-all duration-2000 ease-in-out" style={{ width: `${node.value}%`, background: T.arasakaRed, boxShadow: `0 0 15px ${T.arasakaRed}88` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[8px] font-mono" style={{ color: T.arasakaRed }}>
            <div className="bg-white/5 p-1.5">
              <span className="opacity-40">INTEGRITY:</span> 1.0<br />
              <span className="opacity-40">LATENCY:</span> 0.0ms
            </div>
            <div className="bg-white/5 p-1.5">
              <span className="opacity-40">BUFFER:</span> 100%<br />
              <span className="opacity-40">STREAM:</span> OK
            </div>
          </div>
        </div>

        {/* Hazard Stripes Bottom */}
        <div className="mt-6 h-2 w-full" style={{ background: 'repeating-linear-gradient(45deg, #ff2a42, #ff2a42 8px, #000 8px, #000 16px)', opacity: 0.4 }} />
      </div>

      <style>{`
        @keyframes cardEnterRight { 
          from { transform: translate(100px, -50%); opacity: 0; filter: blur(10px); } 
          to { transform: translate(0, -50%); opacity: 1; filter: blur(0); } 
        }
        @keyframes cardEnterLeft { 
          from { transform: translate(-100px, -50%); opacity: 0; filter: blur(10px); } 
          to { transform: translate(0, -50%); opacity: 1; filter: blur(0); } 
        }
        @keyframes cardEnterMobile {
          from { transform: translate(-50%, -20px); opacity: 0; filter: blur(10px); }
          to { transform: translate(-50%, 0); opacity: 1; filter: blur(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Main NeuralMind Component ──────────────────────────────────────────────
export default function NeuralMind() {
  const { onCanvasCreated } = useQuality();
  const [activeId, setActiveId] = useState(null);
  const [nodesData, setNodesData] = useState({});
  const [cardAnchor, setCardAnchor] = useState(null);
  const { playClick, playHover, playRot } = useCyberAudio();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleToggle = (id) => {
    if (activeId === id) setActiveId(null);
    else {
      setActiveId(id);
      playClick();
      playRot();
    }
  };

  return (
    <div className="relative w-full overflow-hidden bg-black transition-all duration-500" 
      style={{ height: isMobile ? '650px' : '900px' }}>
      <MatrixRain />

      {/* Scanline & Vignette Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-40"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px), radial-gradient(circle, transparent 30%, #000 100%)' }} />

      <SVGOverlay activeId={activeId} nodesData={nodesData} cardAnchor={cardAnchor} />
      <HUDCard activeId={activeId} onAnchorUpdate={setCardAnchor} isMobile={isMobile} />

      {/* Header HUD */}
      <div className={`absolute z-20 font-mono text-red-600 transition-all duration-500
        ${isMobile ? 'top-6 left-6' : 'top-12 left-12'}`}>
        <div className={`font-black tracking-tighter uppercase italic leading-none
          ${isMobile ? 'text-xl' : 'text-3xl'}`}>Neural_Engram_Core</div>
        <div className={`font-bold mt-2 flex items-center gap-2
          ${isMobile ? 'text-[9px]' : 'text-[12px]'}`}>
          <span className={`${isMobile ? 'w-3' : 'w-5'} h-[2px] bg-red-600 animate-pulse`} />
          {activeId ? (
            <span className="text-white">STATUS: TARGET_LOCKED [ {activeId} ]</span>
          ) : (
            <span className="opacity-60">STATUS: GLOBAL_SCAN_ACTIVE</span>
          )}
        </div>
      </div>

      {/* Corporate Label Bottom Right */}
      <div className="absolute bottom-12 right-12 z-20 font-mono text-red-600/30 text-[10px] text-right hidden lg:block">
        ARASAKA_TECH_SYSTEMS_DIVISION<br />
        ENCRYPTED_ENVELOPE_V7.22<br />
        SECURITY_LEVEL_A+
      </div>

      {/* Buttons Panel */}
      <div className={`absolute left-0 right-0 z-40 flex justify-center flex-wrap gap-2 md:gap-4 px-6 transition-all duration-500
        ${isMobile ? 'bottom-6' : 'bottom-12'}`}>
        {Object.values(REGIONS).map(r => (
          <button
            key={r.id}
            id={`btn-${r.id}`}
            onClick={() => handleToggle(r.id)}
            onMouseEnter={playHover}
            className={`group relative font-mono uppercase font-black transition-all duration-300
              ${isMobile ? 'px-4 py-2 text-[9px] tracking-[0.2em]' : 'px-8 py-4 text-[11px] tracking-[0.3em]'}
              ${activeId === r.id
                ? 'bg-red-600 text-black shadow-[0_0_40px_#ff2a42]'
                : 'bg-black/80 text-red-600 border border-red-600/40 hover:border-white hover:text-white'
              }`}
            style={{ 
              clipPath: isMobile 
                ? 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)'
                : 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' 
            }}
          >
            {/* Hover Glitch Effect */}
            <div className="absolute inset-0 bg-red-600 opacity-0 group-hover:animate-pulse transition-opacity pointer-events-none" style={{ mixBlendingMode: 'overlay' }} />
            <span className="relative z-10">[{r.id}]</span>
            {activeId === r.id && (
              <div className="absolute bottom-0 left-0 h-1 bg-white animate-pulse" style={{ width: '100%' }} />
            )}
          </button>
        ))}
      </div>

      <Canvas
        camera={{ position: [0, 1.2, 5.5], fov: 45 }}
        style={{ zIndex: 10, position: 'absolute', inset: 0 }}
        gl={{ alpha: true, antialias: true }}
        onCreated={onCanvasCreated}
      >
        <PerformanceMonitor>
          <ambientLight intensity={1.2} />
          <Suspense fallback={null}>
            <group scale={isMobile ? 0.65 : 1} position={[0, isMobile ? 0.2 : 0, 0]}>
              <CyberBrain activeId={activeId} onNodesUpdate={setNodesData} onNodeClick={handleToggle} />
            </group>
          </Suspense>
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}

useGLTF.preload('/brain.glb', true);
