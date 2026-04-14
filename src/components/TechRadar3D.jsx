import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Stars, Trail } from '@react-three/drei';
import * as THREE from 'three';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  cyan: '#00F0FF',
  yellow: '#FCEE0A',
  red: '#FF003C',
  white: '#FFFFFF',
  black: '#000000',
  cyanDim: 'rgba(0,240,255,0.15)',
};

// ─── Skill Data ───────────────────────────────────────────────────────────────
const RADAR_DATA = {
  BACKEND: [
    { name: 'JAVA', value: 94 },
    { name: 'SPRING BOOT', value: 94 },
    { name: 'POSTGRESQL', value: 86 },
    { name: 'MYSQL', value: 86 },
    { name: 'PYTHON', value: 40 },
  ],
  FRONTEND: [
    { name: 'REACT', value: 88 },
    { name: 'TAILWIND', value: 88 },
    { name: 'FRAMER MOTION', value: 88 },
    { name: 'RIVE', value: 75 },
    { name: 'THREE.JS', value: 60 },
  ],
  SYSTEMS: [
    { name: 'FLUTTER', value: 85 },
    { name: 'DART', value: 85 },
    { name: 'GEOSPATIAL AI', value: 79 },
    { name: 'LOCAL LLMS', value: 40 },
    { name: 'LINUX', value: 75 },
  ],
};

const CATEGORIES = Object.keys(RADAR_DATA);
const RADIUS_MAX = 4.2;
const PARTICLE_COUNT = 3200;   // total particles in the cloud
const SPOKE_COUNT = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Fibonacci sphere – evenly spread points on unit sphere */
function fibonacciSphere(n) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const phi = golden * i;
    pts.push(new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r));
  }
  return pts;
}

/** Spoke direction (XZ plane, Y=0) for index 0‥4 */
function spokeDir(i) {
  const a = (i / SPOKE_COUNT) * Math.PI * 2 - Math.PI / 2;
  return new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
}

/**
 * Build target positions for ALL particles given one category's data array.
 * Layout:
 *   – Dense glowing CORE sphere  (innermost ~30 % of particles)
 *   – Per-spoke STREAM jets      (remaining 70 % split across 5 spokes,
 *                                  length ∝ skill value)
 */
function buildTargetPositions(dataArray) {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const corePart = Math.floor(PARTICLE_COUNT * 0.30);
  const spokePart = PARTICLE_COUNT - corePart;
  const perSpoke = Math.floor(spokePart / SPOKE_COUNT);

  // Core
  const coreSphere = fibonacciSphere(corePart);
  for (let i = 0; i < corePart; i++) {
    const r = 0.4 + Math.random() * 0.7;        // tight inner shell
    const jit = (Math.random() - 0.5) * 0.2;
    positions[i * 3] = coreSphere[i].x * r + jit;
    positions[i * 3 + 1] = coreSphere[i].y * r + jit;
    positions[i * 3 + 2] = coreSphere[i].z * r + jit;
  }

  // Spokes
  for (let s = 0; s < SPOKE_COUNT; s++) {
    const skill = dataArray[s];
    const length = (skill.value / 100) * RADIUS_MAX;
    const dir = spokeDir(s);
    const base = corePart + s * perSpoke;
    const count = (s === SPOKE_COUNT - 1) ? (PARTICLE_COUNT - base) : perSpoke;

    for (let p = 0; p < count; p++) {
      const t = Math.pow(Math.random(), 0.8);   // bias toward tip
      const d = t * length;
      const rad = (1 - t) * 0.55 * Math.random(); // cone taper
      const ang = Math.random() * Math.PI * 2;

      // perpendicular spread
      const perp1 = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      const perp2 = dir.clone().cross(perp1).normalize();

      const jx = perp1.x * rad * Math.cos(ang) + perp2.x * rad * Math.sin(ang);
      const jy = perp1.y * rad * Math.cos(ang) + perp2.y * rad * Math.sin(ang);
      const jz = perp1.z * rad * Math.cos(ang) + perp2.z * rad * Math.sin(ang);

      const idx = (base + p) * 3;
      positions[idx] = dir.x * d + jx;
      positions[idx + 1] = dir.y * d + jy;
      positions[idx + 2] = dir.z * d + jz;
    }
  }
  return positions;
}

/** Vertex colours: core = bright cyan, spoke tip = yellow→red fade */
function buildColors(dataArray) {
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const coreEnd = Math.floor(PARTICLE_COUNT * 0.30);
  const perSpoke = Math.floor((PARTICLE_COUNT - coreEnd) / SPOKE_COUNT);

  const cC = new THREE.Color(C.cyan);
  const cY = new THREE.Color(C.yellow);
  const cR = new THREE.Color(C.red);

  for (let i = 0; i < coreEnd; i++) {
    const t = Math.random();
    const col = cC.clone().lerp(new THREE.Color('#ffffff'), t * 0.35);
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }

  for (let s = 0; s < SPOKE_COUNT; s++) {
    const norm = dataArray[s].value / 100;
    const base = coreEnd + s * perSpoke;
    const cnt = (s === SPOKE_COUNT - 1) ? (PARTICLE_COUNT - base) : perSpoke;
    for (let p = 0; p < cnt; p++) {
      const t = p / cnt;
      // low-value spokes stay cyan; high-value tips push toward yellow
      const col = cC.clone().lerp(norm > 0.7 ? cY : cC, t * norm);
      const idx = (base + p) * 3;
      colors[idx] = col.r; colors[idx + 1] = col.g; colors[idx + 2] = col.b;
    }
  }
  return colors;
}

// ─── Particle System ──────────────────────────────────────────────────────────
function NeuralParticles({ activeCategory }) {
  const pointsRef = useRef();
  const currentPos = useRef(null);
  const targetPos = useRef(null);

  // Pre-compute targets for all categories
  const allTargets = useMemo(() =>
    Object.fromEntries(CATEGORIES.map(cat => [cat, buildTargetPositions(RADAR_DATA[cat])])),
    []);
  const allColors = useMemo(() =>
    Object.fromEntries(CATEGORIES.map(cat => [cat, buildColors(RADAR_DATA[cat])])),
    []);

  // Seed random offsets for turbulence
  const turbulence = useMemo(() => {
    const t = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < t.length; i++) t[i] = (Math.random() - 0.5) * 0.06;
    return t;
  }, []);

  // Particle sizes
  const sizes = useMemo(() => {
    const s = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      s[i] = i < PARTICLE_COUNT * 0.3
        ? 6 + Math.random() * 10   // core – bigger
        : 2 + Math.random() * 5;   // spokes – finer
    }
    return s;
  }, []);

  // Init geometry once
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const initPos = allTargets['BACKEND'].slice();
    g.setAttribute('position', new THREE.BufferAttribute(initPos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(allColors['BACKEND'].slice(), 3));
    g.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    currentPos.current = initPos;
    targetPos.current = initPos;
    return g;
  }, []);

  // Shader material – additive blending + per-particle size + soft disk
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: window.devicePixelRatio },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uTime;
      uniform float uPixelRatio;

      void main() {
        vColor = color;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        // subtle breathing pulse on point size
        float pulse = 1.0 + 0.12 * sin(uTime * 1.8 + position.x * 3.0 + position.z * 2.5);
        gl_PointSize = size * pulse * uPixelRatio * (300.0 / -mvPos.z);
        gl_Position  = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        // Soft radial glow disk
        vec2 uv   = gl_PointCoord - vec2(0.5);
        float d   = length(uv);
        if (d > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.1, 0.5, d);
        alpha = pow(alpha, 1.6);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  }), []);

  // When category changes, set new target
  const prevCategory = useRef(activeCategory);
  useEffect(() => {
    if (activeCategory !== prevCategory.current) {
      targetPos.current = allTargets[activeCategory];
      // Update color buffer immediately (flash effect)
      const newColors = allColors[activeCategory];
      geometry.attributes.color.array.set(newColors);
      geometry.attributes.color.needsUpdate = true;
      prevCategory.current = activeCategory;
    }
  }, [activeCategory]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    material.uniforms.uTime.value = t;

    const pos = geometry.attributes.position.array;
    const tgt = targetPos.current;
    const cur = currentPos.current;
    const LERP = 0.055;

    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
      // Lerp toward target + add live turbulence
      cur[i] = THREE.MathUtils.lerp(cur[i], tgt[i], LERP);
      // Layered turbulence – different freq per axis
      const tb = turbulence[i];
      const freq = 0.9 + (i % 7) * 0.08;
      pos[i] = cur[i] + tb * Math.sin(t * freq + i * 0.004);
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

// ─── Wireframe Cage (5 spoke tips connected) ──────────────────────────────────
function WireframeCage({ activeCategory }) {
  const lineRef = useRef();
  const currentDist = useRef(RADAR_DATA[activeCategory].map(s => (s.value / 100) * RADIUS_MAX));

  const targetDist = useMemo(
    () => RADAR_DATA[activeCategory].map(s => (s.value / 100) * RADIUS_MAX),
    [activeCategory]
  );

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    // 5 perimeter edges + 5 radial spokes = 10 line segments = 20 points
    const pts = new Float32Array((SPOKE_COUNT + SPOKE_COUNT) * 2 * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    return g;
  }, []);

  useFrame(() => {
    for (let i = 0; i < SPOKE_COUNT; i++) {
      currentDist.current[i] = THREE.MathUtils.lerp(currentDist.current[i], targetDist[i], 0.07);
    }

    const pts = geometry.attributes.position.array;
    const tips = [];
    for (let i = 0; i < SPOKE_COUNT; i++) {
      const d = currentDist.current[i];
      tips.push(new THREE.Vector3(spokeDir(i).x * d, spokeDir(i).y * d, spokeDir(i).z * d));
    }

    // Perimeter ring
    for (let i = 0; i < SPOKE_COUNT; i++) {
      const a = tips[i], b = tips[(i + 1) % SPOKE_COUNT];
      const base = i * 6;
      pts[base] = a.x; pts[base + 1] = a.y; pts[base + 2] = a.z;
      pts[base + 3] = b.x; pts[base + 4] = b.y; pts[base + 5] = b.z;
    }
    // Radial spokes
    for (let i = 0; i < SPOKE_COUNT; i++) {
      const base = (SPOKE_COUNT + i) * 6;
      pts[base] = 0; pts[base + 1] = 0; pts[base + 2] = 0;
      pts[base + 3] = tips[i].x; pts[base + 4] = tips[i].y; pts[base + 5] = tips[i].z;
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color={C.cyan} transparent opacity={0.28} />
    </lineSegments>
  );
}

// ─── Grid Rings (background) ──────────────────────────────────────────────────
function GridRings() {
  return (
    <>
      {[0.2, 0.4, 0.6, 0.8, 1.0].map(step => {
        const pts = [];
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * step * RADIUS_MAX, 0, Math.sin(a) * step * RADIUS_MAX));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <line key={step} geometry={geo}>
            <lineBasicMaterial color={C.cyan} transparent opacity={0.06} />
          </line>
        );
      })}
      {/* Axis cross */}
      {[0, 1, 2, 3, 4].map(i => {
        const dir = spokeDir(i);
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(dir.x * RADIUS_MAX * 1.15, 0, dir.z * RADIUS_MAX * 1.15),
        ]);
        return (
          <line key={i} geometry={geo}>
            <lineBasicMaterial color={C.cyan} transparent opacity={0.09} />
          </line>
        );
      })}
    </>
  );
}

// ─── Core Sphere Rings (decorative) ──────────────────────────────────────────
function CoreDecor() {
  const g1 = useRef(), g2 = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (g1.current) g1.current.rotation.y = t * 0.4;
    if (g2.current) g2.current.rotation.x = t * 0.3;
  });

  const ring = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  return (
    <>
      <group ref={g1}>
        <line geometry={ring}>
          <lineBasicMaterial color={C.cyan} transparent opacity={0.18} />
        </line>
      </group>
      <group ref={g2}>
        <line geometry={ring}>
          <lineBasicMaterial color={C.yellow} transparent opacity={0.10} />
        </line>
      </group>
      {/* central glow sphere */}
      <mesh>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshBasicMaterial color={C.cyan} transparent opacity={0.55} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.38, 32, 32]} />
        <meshBasicMaterial color={C.cyan} transparent opacity={0.08} />
      </mesh>
    </>
  );
}

// ─── Tactical Label Nodes ─────────────────────────────────────────────────────
function TacticalLabels({ activeCategory }) {
  const groupRef = useRef();
  const dist = useRef(RADAR_DATA[activeCategory].map(s => (s.value / 100) * RADIUS_MAX));
  const prevCat = useRef(activeCategory);

  const targetDist = useMemo(
    () => RADAR_DATA[activeCategory].map(s => (s.value / 100) * RADIUS_MAX),
    [activeCategory]
  );

  const [positions, setPositions] = useState(() =>
    RADAR_DATA[activeCategory].map((_, i) => ({ x: 0, y: 0, z: 0 }))
  );

  // Track world positions for each label so Html connector line can draw
  const posRef = useRef(RADAR_DATA[activeCategory].map(() => new THREE.Vector3()));

  useFrame(() => {
    for (let i = 0; i < SPOKE_COUNT; i++) {
      dist.current[i] = THREE.MathUtils.lerp(dist.current[i], targetDist[i], 0.07);
    }
    const newPos = RADAR_DATA[activeCategory].map((_, i) => {
      const d = dist.current[i] + 1.1;   // offset outward from tip
      const dir = spokeDir(i);
      return { x: dir.x * d, y: dir.y * d, z: dir.z * d };
    });
    setPositions(newPos);
  });

  const data = RADAR_DATA[activeCategory];

  return (
    <group ref={groupRef}>
      {data.map((skill, i) => {
        const tipDist = (skill.value / 100) * RADIUS_MAX;
        const dir = spokeDir(i);
        return (
          <group key={skill.name} position={[
            dir.x * (tipDist + 1.1),
            dir.y * (tipDist + 1.1),
            dir.z * (tipDist + 1.1),
          ]}>
            <Html
              center
              distanceFactor={14}
              zIndexRange={[100, 0]}
              style={{ pointerEvents: 'none' }}
            >
              <TacticalLabel skill={skill} index={i} />
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function TacticalLabel({ skill, index }) {
  // Alternate label anchor side for readability
  const isRight = index === 0 || index === 1 || index === 4;

  // Fake memory string for God Tier look
  const hexMem = useMemo(() =>
    Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0'),
    []);

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexDirection: isRight ? 'row' : 'row-reverse',
    }}>
      {/* Connector tick */}
      <div style={{
        width: '30px',
        height: '2px',
        background: `linear-gradient(${isRight ? '90deg' : '270deg'}, ${C.cyan}, transparent)`,
        flexShrink: 0,
        boxShadow: `0 0 10px ${C.cyan}`,
      }} />

      {/* Card */}
      <div style={{
        background: 'rgba(0, 5, 10, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        padding: '12px 16px',
        minWidth: '160px',
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        overflow: 'hidden',
      }}>
        {/* Subtle grid/scanline overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 240, 255, 0.03) 2px, rgba(0, 240, 255, 0.03) 4px)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* Tiny horizontal scanning line animation inside card */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${C.cyan}, transparent)`,
          boxShadow: `0 0 8px ${C.cyan}`,
          animation: 'scanH 3s linear infinite',
          opacity: 0.8,
          zIndex: 1,
          pointerEvents: 'none',
        }} />

        {/* Corner Brackets */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '10px', height: '10px', borderTop: `2px solid ${C.cyan}`, borderLeft: `2px solid ${C.cyan}`, zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '10px', height: '10px', borderTop: `2px solid ${C.cyan}`, borderRight: `2px solid ${C.cyan}`, zIndex: 2 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '10px', height: '10px', borderBottom: `2px solid ${C.cyan}`, borderLeft: `2px solid ${C.cyan}`, zIndex: 2 }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderBottom: `2px solid ${C.cyan}`, borderRight: `2px solid ${C.cyan}`, zIndex: 2 }} />

        {/* Top Fake Data (HEX_MEM) */}
        <div style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '8px',
          color: C.red,
          letterSpacing: '0.15em',
          zIndex: 2,
          position: 'relative',
        }}>
          {`> HEX_MEM: 0x${hexMem}`}
        </div>

        {/* Header row: Status + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2, position: 'relative' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: C.cyan,
            boxShadow: `0 0 8px ${C.cyan}`,
            flexShrink: 0,
            animation: 'cpPulse 1.8s ease-in-out infinite',
            animationDelay: `${index * 0.22}s`,
          }} />
          <span style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '14px',
            letterSpacing: '0.2em',
            color: C.cyan,
            fontWeight: 'bold',
            textTransform: 'uppercase',
            textShadow: `0 0 5px ${C.cyan}88`,
          }}>
            {skill.name}
          </span>
        </div>

        {/* Value + Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 2, position: 'relative', marginTop: '2px' }}>
          <span style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: '20px',
            fontWeight: '900',
            color: C.yellow,
            letterSpacing: '0.05em',
            textShadow: `0 0 12px ${C.yellow}AA`,
            whiteSpace: 'nowrap',
          }}>
            [ {skill.value.toFixed(1)} ]
          </span>
          <div style={{
            flex: 1, height: '3px', background: 'rgba(0,240,255,0.1)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0, width: `${skill.value}%`,
              background: `linear-gradient(90deg, transparent, ${C.cyan}, ${C.yellow})`,
              boxShadow: `0 0 8px ${C.yellow}`,
              transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
            }} />
          </div>
        </div>

        {/* Bottom tag */}
        <div style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '9px',
          color: 'rgba(0,240,255,0.35)',
          letterSpacing: '0.15em',
          marginTop: '4px',
          textTransform: 'uppercase',
          zIndex: 2,
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span>SYS/{skill.value >= 85 ? 'PRIME' : skill.value >= 70 ? 'STABLE' : 'LEARN'}</span>
          <span>NET.OK</span>
        </div>
      </div>
    </div>
  );
}

// ─── Scene Rotation Wrapper ───────────────────────────────────────────────────
function SceneRotator({ children, paused }) {
  const g = useRef();
  useFrame((_, delta) => {
    if (g.current && !paused) g.current.rotation.y += delta * 0.18;
  });
  return <group ref={g}>{children}</group>;
}

// ─── Floating Data Stream (ambient particles) ─────────────────────────────────
function AmbientDrift() {
  const ref = useRef();
  const geo = useMemo(() => {
    const n = 600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = geo.attributes.position.array;
    for (let i = 0; i < 600; i++) {
      pos[i * 3 + 1] += Math.sin(t * 0.3 + i) * 0.002;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        color={C.cyan} size={0.04} transparent opacity={0.18}
        blending={THREE.AdditiveBlending} depthWrite={false}
      />
    </points>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function TechRadar3D() {
  const [activeCategory, setActiveCategory] = useState('BACKEND');
  const [hovered, setHovered] = useState(false);

  return (
    <>
      {/* Global CSS for animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Share+Tech+Mono&display=swap');

        @keyframes cpPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes scanH {
          0%   { top: -2px; }
          100% { top: 100%; }
        }
      `}</style>

      <div
        className="relative w-full bg-black overflow-hidden"
        style={{ height: '700px', border: '1px solid rgba(0,240,255,0.12)' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Scanline overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 4px)',
        }} />
        {/* Moving scan beam */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: '2px', zIndex: 2,
          background: 'linear-gradient(180deg,transparent,rgba(0,240,255,0.07),transparent)',
          animation: 'scanH 9s linear infinite', pointerEvents: 'none',
        }} />

        {/* ── Category Tabs ────────────────────────────── */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 flex gap-3 flex-wrap justify-center px-4">
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  fontFamily: "'Orbitron', monospace",
                  fontSize: '10px',
                  fontWeight: '700',
                  letterSpacing: '0.2em',
                  padding: '10px 22px',
                  background: active ? C.cyan : 'rgba(0,0,0,0.7)',
                  color: active ? '#000' : C.cyan,
                  border: `1px solid ${C.cyan}`,
                  clipPath: 'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)',
                  boxShadow: active ? `0 0 24px ${C.cyan}80` : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase',
                  outline: 'none',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* ── Three.js Canvas ───────────────────────────── */}
        <Canvas
          dpr={Math.min(window.devicePixelRatio, 2)}
          camera={{ position: [0, 9, 16], fov: 38 }}
          gl={{ antialias: true, alpha: false }}
        >
          <color attach="background" args={['#000000']} />
          <fog attach="fog" args={['#000000', 18, 40]} />

          <ambientLight intensity={0.3} />
          <pointLight position={[0, 8, 0]} intensity={2.0} color={C.cyan} distance={30} />
          <pointLight position={[8, -4, 4]} intensity={0.8} color={C.yellow} distance={20} />
          <pointLight position={[-8, -4, -4]} intensity={0.5} color={C.cyan} distance={20} />

          <Stars radius={80} depth={60} count={4000} factor={3} saturation={0} fade speed={0.6} />
          <AmbientDrift />

          <SceneRotator paused={hovered}>
            <GridRings />
            <CoreDecor />
            <NeuralParticles activeCategory={activeCategory} />
            <WireframeCage activeCategory={activeCategory} />
            <TacticalLabels activeCategory={activeCategory} />
          </SceneRotator>

          <CameraLookAt />
        </Canvas>

        {/* ── Corner HUD decorations ────────────────────── */}
        <div style={{
          position: 'absolute', top: 16, left: 16, width: 20, height: 20,
          borderTop: `1px solid ${C.cyan}`, borderLeft: `1px solid ${C.cyan}`, opacity: .35, pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', top: 16, right: 16, width: 20, height: 20,
          borderTop: `1px solid ${C.cyan}`, borderRight: `1px solid ${C.cyan}`, opacity: .35, pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: 16, left: 16, width: 20, height: 20,
          borderBottom: `1px solid ${C.cyan}`, borderLeft: `1px solid ${C.cyan}`, opacity: .35, pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: 16, right: 16, width: 20, height: 20,
          borderBottom: `1px solid ${C.cyan}`, borderRight: `1px solid ${C.cyan}`, opacity: .35, pointerEvents: 'none'
        }} />

        {/* ── Bottom status readout ─────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 20, left: 24, zIndex: 10,
          fontFamily: "'Share Tech Mono',monospace", fontSize: '9px',
          color: 'rgba(0,240,255,0.4)', letterSpacing: '0.15em', lineHeight: 1.9,
          pointerEvents: 'none',
        }}>
          <div>[ NODE_SCAN : ACTIVE ]</div>
          <div>[ CATEGORY : {activeCategory} ]</div>
          <div>[ PARTICLES : {PARTICLE_COUNT.toLocaleString()} ]</div>
          <div>[ CORE : STABLE ]</div>
        </div>

        {/* Right side vertical label */}
        <div style={{
          position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%) rotate(90deg)',
          fontFamily: "'Share Tech Mono',monospace", fontSize: '8px',
          color: 'rgba(0,240,255,0.2)', letterSpacing: '0.25em', pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          NEURAL·CORE · BINORE_M · v2.077
        </div>
      </div>
    </>
  );
}

function CameraLookAt() {
  useFrame(({ camera }) => { camera.lookAt(0, 0, 0); });
  return null;
}