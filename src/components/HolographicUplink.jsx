/**
 * HolographicUplink.jsx — Tactical Map v4 (Circuit Stacking Edition)
 * ─────────────────────────────────────────────────────────────────────────────
 * High-fidelity CP2077 map with Neural-Mind style circuit lines.
 */

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { 
  PerspectiveCamera, Stars, Instances, Instance, 
  PerformanceMonitor, QuadraticBezierLine, OrbitControls, 
  Html, shaderMaterial 
} from '@react-three/drei';
import * as THREE from 'three';
import { geoEquirectangular, geoPath } from 'd3-geo';
import gsap from 'gsap';
import { useQuality } from '../context/QualityContext';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const GLOBE_R = 2.4;
const CITY_THRESHOLD = 0.72;
const CITY_CELL = 0.15;
const MAX_BUILDING_H = 1.0;

const COLORS = {
  yellow: '#f3e600', // Kiroshi/CP2077 Yellow
  cyan: '#00f0ff',   // Cyber-Cyan
  red: '#ff2a42',    // Arasaka Red
  magenta: '#ff00ff', // Neural-Link Magenta
};

// ─── Custom Shaders ───────────────────────────────────────────────────────────
const HolographicMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color(COLORS.cyan),
    uOpacity: 1.0,
    uTier: 3,
  },
  `
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform int uTier;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    float scanline = sin(vPosition.y * 20.0 - uTime * 4.0) * 0.5 + 0.5;
    float alpha = uOpacity * 0.4;
    
    if (uTier >= 3) {
      alpha *= (0.6 + scanline * 0.4);
      float glow = pow(1.0 - vUv.y, 2.0);
      alpha += glow * 0.2;
    }
    gl_FragColor = vec4(uColor, alpha);
  }
  `
);
extend({ HolographicMaterial });

// ─── Data ────────────────────────────────────────────────────────────────────
const HOST_LOC = { id: 'host', lat: 28.6139, lon: 77.209, name: 'DELHI_CORE' };

const CITIES = [
  { id: 'delhi', lat: 28.6139, lon: 77.209, name: 'DELHI_SURFACE' },
  { id: 'tokyo', lat: 35.6762, lon: 139.6503, name: 'NEO_TOKYO' },
  { id: 'london', lat: 51.5074, lon: -0.1278, name: 'LONDON_GRID' },
  { id: 'la', lat: 34.0522, lon: -118.2437, name: 'NIGHT_CITY' },
];

// ─── Utils ────────────────────────────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)));
}

function latLonToVec3(lat, lon, r = GLOBE_R) {
  const phi = lat * (Math.PI / 180);
  const theta = lon * (Math.PI / 180);
  const r_plane = r * Math.cos(phi);
  return new THREE.Vector3(
    r_plane * Math.cos(theta),
    r * Math.sin(phi),
    -r_plane * Math.sin(theta)
  );
}

// ─── Components ───────────────────────────────────────────────────────────────

function CircuitTether({ color, targetHeight }) {
  const pts = useMemo(() => [
    new THREE.Vector3(0, 0, 0),        // Start (The pin)
    new THREE.Vector3(0, targetHeight * 0.5, 0), // Elbow 1
    new THREE.Vector3(0.1, targetHeight * 0.7, 0), // Elbow 2 (Cyber zig-zag)
    new THREE.Vector3(0, targetHeight, 0) // End (The Card)
  ], [targetHeight]);

  return (
    <group>
      <line>
        <bufferGeometry attach="geometry" setFromPoints={pts} />
        <lineBasicMaterial attach="material" color={color} linewidth={2} transparent opacity={0.6} />
      </line>
      <mesh position={pts[1]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={pts[2]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function LocationMarker({ city, label, color = COLORS.cyan, isNeuralLink = false, yOffset = 0.2 }) {
  const localPos = useMemo(() => latLonToVec3(city.lat, city.lon, GLOBE_R + 0.02), [city]);
  const ringRef = useRef();

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const pulse = (clock.elapsedTime % 1.5) / 1.5;
      ringRef.current.scale.setScalar(1 + pulse * 5);
      ringRef.current.material.opacity = 0.8 * (1 - pulse);
    }
  });

  return (
    <group position={localPos}>
      {/* Pin Body */}
      <mesh>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.03, 0.07, 32]} />
        <meshBasicMaterial color={color} transparent side={THREE.DoubleSide} />
      </mesh>

      {/* Neural-Mind Circuit Tether */}
      <CircuitTether color={color} targetHeight={yOffset} />

      {/* Floating Card */}
      <Html distanceFactor={10} position={[0, yOffset, 0]} center>
        <div style={{
          color: color,
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '9px',
          whiteSpace: 'nowrap',
          background: 'rgba(0,0,0,0.9)',
          padding: '5px 12px',
          border: `1px solid ${color}`,
          clipPath: 'polygon(0 0, 90% 0, 100% 30%, 100% 100%, 10% 100%, 0 70%)',
          pointerEvents: 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          boxShadow: `0 0 15px ${color}33`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ width: '4px', height: '4px', background: 'currentColor' }} />
          {label}
          {isNeuralLink && <span style={{ color: '#fff', fontSize: '7px', opacity: 0.6 }}>[LINK_ACTIVE]</span>}
        </div>
      </Html>
    </group>
  );
}

function TacticalFloor({ opacity = 1 }) {
  const gridTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = COLORS.cyan; ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(20, 20);
    return tex;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshBasicMaterial map={gridTexture} transparent opacity={opacity * 0.2} depthWrite={false} />
    </mesh>
  );
}

function CityGrid({ progressRef, lat, lon, gridSize, tier, gridOpacity = 1 }) {
  const groupRef = useRef();
  const materialRef = useRef();
  useFrame(({ clock }) => { if (materialRef.current) materialRef.current.uTime = clock.elapsedTime; });
  
  const buildings = useMemo(() => {
    const arr = [];
    const offset = (gridSize * CITY_CELL) / 2;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = i * CITY_CELL - offset;
        const z = j * CITY_CELL - offset;
        const dist = Math.sqrt(x * x + z * z);
        const factor = Math.max(0.15, 1 - dist / offset);
        const h = Math.random() * MAX_BUILDING_H * factor;
        if (h > 0.02) arr.push({ position: [x, h / 2, z], scale: [CITY_CELL * 0.75, h, CITY_CELL * 0.75] });
      }
    }
    return arr;
  }, [gridSize]);

  const localPos = useMemo(() => latLonToVec3(lat, lon), [lat, lon]);
  const upQuat = useMemo(() => {
    const normal = localPos.clone().normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }, [localPos]);

  useFrame(() => {
    if (!groupRef.current) return;
    const p = progressRef?.current ?? 0;
    if (p > CITY_THRESHOLD - 0.15) {
      groupRef.current.visible = true;
      const targetScaleY = Math.min(1, (p - (CITY_THRESHOLD - 0.15)) * 5);
      groupRef.current.scale.lerp(new THREE.Vector3(1, targetScaleY, 1), 0.1);
    } else {
      groupRef.current.scale.set(1, 0.001, 1); groupRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef} position={localPos} quaternion={upQuat} visible={false}>
      <Instances limit={gridSize * gridSize} frustumCulled={false}>
        <boxGeometry />
        {tier >= 3 ? (
          <holographicMaterial ref={materialRef} transparent uColor={new THREE.Color(COLORS.cyan)} uOpacity={gridOpacity} uTier={tier} />
        ) : (
          <meshBasicMaterial color={COLORS.cyan} transparent opacity={gridOpacity * 0.6} />
        )}
        {buildings.map((b, i) => <Instance key={i} position={b.position} scale={b.scale} />)}
      </Instances>
    </group>
  );
}

function RotatingGlobe({ 
  progressRef, activeLoc, setActiveLoc, globeGroupRef, visitorLoc, config, 
  isNeuralLinked, globeOpacity, tacticalOpacity, uplinkDistance 
}) {
  const initialYaw = (-90 - CITIES[0].lon) * (Math.PI / 180);
  const localHostPos = useMemo(() => latLonToVec3(HOST_LOC.lat, HOST_LOC.lon), []);
  const upQuat = useMemo(() => {
    const normal = localHostPos.clone().normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }, [localHostPos]);

  useFrame((state) => {
    if (globeGroupRef.current) {
      const p = progressRef?.current ?? 0;
      // Rotation stops during zoom, resumes on manual drag
      const isRotating = !isNeuralLinked || globeGroupRef.current.userData.manualResume;
      const baseSpeed = p < 0.45 ? 0.001 : 0.0002;
      const rotSpeed = isRotating ? baseSpeed : 0;
      globeGroupRef.current.rotation.y += rotSpeed;
    }
  });

  return (
    <group ref={globeGroupRef} rotation={[0, initialYaw, 0]}>
      {/* Globe surface fallback */}
      <mesh>
        <sphereGeometry args={[GLOBE_R * 0.993, 64, 64]} />
        <meshBasicMaterial color="#050505" transparent opacity={globeOpacity} />
      </mesh>

      {/* Tactical Grid (Floor) */}
      <group position={localHostPos} quaternion={upQuat}>
        {isNeuralLinked && <TacticalFloor opacity={tacticalOpacity} />}
      </group>

      {/* Buildings */}
      {config.cityEnabled && (
        <CityGrid 
          progressRef={progressRef} lat={activeLoc.lat} lon={activeLoc.lon} 
          gridSize={config.cityGrid} tier={config.tier} 
          gridOpacity={tacticalOpacity} 
        />
      )}

      {/* Markers with Stacking Logic */}
      {(() => {
        const isClose = uplinkDistance !== null && uplinkDistance < 120;
        return (
          <>
            <LocationMarker
              city={HOST_LOC}
              label="DEVELOPER (DELHI)"
              color={COLORS.yellow}
              isNeuralLink={isNeuralLinked}
              yOffset={0.25}
            />
            {visitorLoc && (
              <LocationMarker
                city={visitorLoc}
                label={`YOU (${visitorLoc.name.replace('_NODE', '')})`}
                color={COLORS.magenta}
                isNeuralLink={isNeuralLinked}
                yOffset={isClose ? 0.75 : 0.25} // STACKED TETHER
              />
            )}
          </>
        );
      })()}

      {/* Hotspots */}
      {CITIES.map(city => (
        <group key={city.id} scale={globeOpacity}>
          <mesh position={latLonToVec3(city.lat, city.lon, GLOBE_R + 0.01)}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color={city.id === activeLoc.id ? COLORS.yellow : COLORS.cyan} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Main Logic ───────────────────────────────────────────────────────────────

export default function HolographicUplink({ progressRef }) {
  const { config, onCanvasCreated, reportFPS } = useQuality();
  const [activeLoc, setActiveLoc] = useState(CITIES[0]);
  const globeGroupRef = useRef();
  const [visitorLoc, setVisitorLoc] = useState(null);
  const [uplinkDistance, setUplinkDistance] = useState(null);
  const [isNeuralLinked, setIsNeuralLinked] = useState(false);
  const [linkingProgress, setLinkingProgress] = useState(0);
  const [globeOpacity, setGlobeOpacity] = useState(1);
  const [tacticalOpacity, setTacticalOpacity] = useState(0);
  const [isControlsReady, setIsControlsReady] = useState(false);
  const controlsRef = useRef();

  // Geolocation
  useEffect(() => {
    fetch('https://ipapi.co/json/').then(res => res.json()).then(data => {
      if (data.latitude) {
        setVisitorLoc({ lat: data.latitude, lon: data.longitude, name: data.city || 'UNKNOWN_NODE' });
        setUplinkDistance(haversineKm(data.latitude, data.longitude, HOST_LOC.lat, HOST_LOC.lon));
      }
    });
  }, []);

  // Proximity Zoom (The Dive)
  useEffect(() => {
    const threshold = 120;
    if (uplinkDistance !== null && uplinkDistance <= threshold && !isNeuralLinked && isControlsReady && controlsRef.current) {
      setIsNeuralLinked(true);
      const targetPos = latLonToVec3(HOST_LOC.lat, HOST_LOC.lon, GLOBE_R);
      const tl = gsap.timeline();
      
      tl.to({ v: 0 }, { v: 100, duration: 4, onUpdate: function() { setLinkingProgress(Math.floor(this.targets()[0].v)); } }, 0);
      tl.to(controlsRef.current.target, { x: targetPos.x, y: targetPos.y, z: targetPos.z, duration: 4, ease: "power4.inOut" }, 0);
      tl.to(controlsRef.current.object.position, { x: targetPos.x * 1.5, y: targetPos.y * 1.5, z: targetPos.z * 1.5, duration: 5, ease: "power4.inOut" }, 0);
      tl.to(controlsRef.current.object, { fov: 32, duration: 5, ease: "power4.inOut" }, 0);
      tl.to({ o: 1 }, { o: 0.1, duration: 3, onUpdate: function() { setGlobeOpacity(this.targets()[0].o); } }, 1);
      tl.to({ t: 0 }, { t: 1, duration: 3, onUpdate: function() { setTacticalOpacity(this.targets()[0].t); } }, 1);
    }
  }, [uplinkDistance, isNeuralLinked, isControlsReady]);

  return (
    <div style={{ position: 'sticky', top: 0, left: 0, width: '100%', height: '100vh', background: '#000' }}>
      {/* HUD */}
      <div style={{
        position: 'absolute', bottom: '40px', right: '40px', zIndex: 10,
        fontFamily: "'Orbitron', sans-serif", textAlign: 'right', pointerEvents: 'none'
      }}>
        <div style={{ color: COLORS.yellow, fontSize: '10px', letterSpacing: '0.4em' }}>[ NEURAL LINK STATUS ]</div>
        <div style={{ color: COLORS.cyan, fontSize: '28px', fontWeight: 900 }}>{isNeuralLinked ? 'LINK STABLE' : 'SCANNING...'}</div>
        {isNeuralLinked && <div style={{ color: COLORS.red, fontSize: '14px' }}>DISTANCE: {uplinkDistance} KM</div>}
      </div>

      <Canvas dpr={config.dpr} gl={{ antialias: config.antialias }} onCreated={onCanvasCreated}>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={45} />
        <OrbitControls 
          ref={(r) => { controlsRef.current = r; if (r && !isControlsReady) setIsControlsReady(true); }}
          enablePan={false} enableZoom={true} minDistance={3.5} maxDistance={15}
          onStart={() => { if (globeGroupRef.current) globeGroupRef.current.userData.manualResume = true; }}
        />
        <ambientLight intensity={1.5} />
        <Suspense fallback={null}>
          <RotatingGlobe 
            progressRef={progressRef} activeLoc={activeLoc} setActiveLoc={setActiveLoc}
            globeGroupRef={globeGroupRef} visitorLoc={visitorLoc} config={config}
            isNeuralLinked={isNeuralLinked} globeOpacity={globeOpacity}
            tacticalOpacity={tacticalOpacity} uplinkDistance={uplinkDistance}
          />
        </Suspense>
        <Stars count={2000} factor={4} fade />
      </Canvas>
    </div>
  );
}
