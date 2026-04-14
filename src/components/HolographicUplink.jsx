/**
 * HolographicUplink.jsx — Hyper-Local Connectivity Edition v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects visitor proximity and triggers a cinematic "Neural Link" sequence.
 * Features a Cyberpunk Pre-Consent HUD and Holographic Materials.
 */

import React, { useRef, useMemo, useEffect, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  PerspectiveCamera, Stars, Instances, Instance, PerformanceMonitor, 
  QuadraticBezierLine, OrbitControls, Html, MeshTransmissionMaterial 
} from '@react-three/drei';
import * as THREE from 'three';
import { geoEquirectangular, geoPath } from 'd3-geo';
import gsap from 'gsap';
import { useQuality } from '../context/QualityContext';
import { useProximity } from '../hooks/useProximity';

// ─── Constants ───────────────────────────────────────────────────────────────
const GLOBE_R = 2.4;
const CITY_CELL = 0.15;
const MAX_BUILDING_H = 1.0;

const COLORS = {
  yellow: '#FCEE0A',
  cyan: '#00F0FF',
  red: '#FF003C',
  magenta: '#FF00FF',
};

// DEV CORE: GGSIPU, Delhi
const HOST_LOC = { id: 'host', lat: 28.5947, lon: 77.0191, name: 'BINORE (DEV)' };

const CITIES = [
  { id: 'delhi', lat: 28.5947, lon: 77.0191, name: 'DELHI_CORE' },
  { id: 'tokyo', lat: 35.6762, lon: 139.6503, name: 'NEO_TOKYO' },
  { id: 'london', lat: 51.5074, lon: -0.1278, name: 'LONDON_GRID' },
  { id: 'la', lat: 34.0522, lon: -118.2437, name: 'NIGHT_CITY' },
];

// ─── Geo Math ────────────────────────────────────────────────────────────────
function latLonToVec3(lat, lon, r = GLOBE_R) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

// ─── GeoJSON Texture Generator ──────────────────────────────────────────────
function useGlobeTexture(texSize) {
  const [texture, setTexture] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadMaps() {
      try {
        setLoading(true);
        const [worldRes, indiaRes] = await Promise.all([
          fetch('/world-50m.geo.json'),
          fetch('/india-official.geo.json').catch(() => null)
        ]);

        if (!worldRes.ok) throw new Error('World map load failed');
        const worldGeoJson = await worldRes.json();
        let indiaGeoJson = indiaRes?.ok ? await indiaRes.json() : null;

        if (!active) return;

        const canvas = document.createElement('canvas');
        canvas.width = texSize;
        canvas.height = texSize / 2;
        const context = canvas.getContext('2d');

        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);

        const projection = geoEquirectangular()
          .translate([canvas.width / 2, canvas.height / 2])
          .scale(canvas.width / (2 * Math.PI));
        const path = geoPath().projection(projection).context(context);

        context.strokeStyle = '#00F0FF';
        context.lineWidth = texSize > 1024 ? 2.5 : 1.5;
        context.fillStyle = '#0a0a0a';

        worldGeoJson.features.forEach(feature => {
          if (indiaGeoJson) {
            const name = (feature.properties?.name || '').toLowerCase();
            if (name.includes('india')) return;
          }
          context.beginPath(); path(feature); context.fill(); context.stroke();
        });

        if (indiaGeoJson) {
          context.strokeStyle = '#00F0FF';
          context.lineWidth = texSize > 1024 ? 4.0 : 2.0;
          context.fillStyle = '#0f0f0f';
          indiaGeoJson.features.forEach(feature => {
            context.beginPath(); path(feature); context.fill(); context.stroke();
          });
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = texSize > 1024 ? 8 : 4;
        setTexture(tex);
        setLoading(false);
      } catch (err) {
        console.error('[Uplink] Map Load Error:', err);
        setLoading(false);
      }
    }
    loadMaps();
    return () => { active = false; };
  }, [texSize]);

  return { texture, loading };
}

// ─── Components ─────────────────────────────────────────────────────────────

function Beacon({ lat, lon, label, color = COLORS.cyan }) {
  const pos = useMemo(() => latLonToVec3(lat, lon, GLOBE_R), [lat, lon]);
  const ringRef = useRef();

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const pulse = (clock.elapsedTime % 1.5) / 1.5;
      ringRef.current.scale.setScalar(1 + pulse * 4);
      ringRef.current.material.opacity = 0.8 * (1 - pulse);
    }
  });

  return (
    <group position={pos}>
      <mesh>
        <cylinderGeometry args={[0.01, 0.01, 0.4, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.07, 32]} />
        <meshBasicMaterial color={color} transparent side={THREE.DoubleSide} />
      </mesh>
      <Html distanceFactor={10} position={[0, 0.3, 0]} center>
        <div style={{
          color: color,
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '10px',
          whiteSpace: 'nowrap',
          background: 'rgba(0,0,0,0.8)',
          padding: '2px 8px',
          border: `1px solid ${color}`,
          pointerEvents: 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          {label}
        </div>
      </Html>
    </group>
  );
}

function UplinkArc({ startLoc, endLoc }) {
  const packetRef = useRef();
  const tRef = useRef(0);
  const { start, mid, end } = useMemo(() => {
    const s = latLonToVec3(startLoc.lat, startLoc.lon);
    const e = latLonToVec3(endLoc.lat, endLoc.lon);
    const midRaw = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
    const m = midRaw.clone().normalize().multiplyScalar(GLOBE_R * 1.6);
    return { start: s, mid: m, end: e };
  }, [startLoc, endLoc]);

  useFrame((_, delta) => {
    tRef.current = (tRef.current + delta * 0.4) % 1;
    const t = tRef.current;
    const u = 1 - t;
    if (packetRef.current) {
      const pos = new THREE.Vector3()
        .addScaledVector(start, u * u)
        .addScaledVector(mid, 2 * u * t)
        .addScaledVector(end, t * t);
      packetRef.current.position.copy(pos);
    }
  });

  return (
    <group>
      <QuadraticBezierLine start={start} mid={mid} end={end} color={COLORS.magenta} lineWidth={2} dashed dashScale={10} />
      <mesh ref={packetRef}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color={COLORS.magenta} toneMapped={false} />
      </mesh>
    </group>
  );
}

function CityGrid({ isHolographic, lat, lon, gridSize }) {
  const buildings = useMemo(() => {
    const arr = [];
    const offset = (gridSize * CITY_CELL) / 2;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = i * CITY_CELL - offset;
        const z = j * CITY_CELL - offset;
        const dist = Math.sqrt(x * x + z * z);
        const factor = Math.max(0.1, 1 - dist / offset);
        const h = Math.random() * MAX_BUILDING_H * factor;
        if (h > 0.05) arr.push({ position: [x, h / 2, z], scale: [CITY_CELL * 0.7, h, CITY_CELL * 0.7] });
      }
    }
    return arr;
  }, [gridSize]);

  const localPos = useMemo(() => latLonToVec3(lat, lon), [lat, lon]);
  const upQuat = useMemo(() => {
    const normal = localPos.clone().normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }, [localPos]);

  return (
    <group position={localPos} quaternion={upQuat}>
      {isHolographic ? (
        buildings.map((b, i) => (
          <mesh key={i} position={b.position} scale={b.scale}>
            <boxGeometry />
            <MeshTransmissionMaterial 
              backside 
              samples={4} 
              thickness={0.5} 
              chromaticAberration={0.05} 
              anisotropy={0.1} 
              distortion={0.1} 
              distortionScale={0.1} 
              temporalDistortion={0.1} 
              color={COLORS.cyan} 
            />
          </mesh>
        ))
      ) : (
        <Instances limit={buildings.length}>
          <boxGeometry />
          <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.6} />
          {buildings.map((b, i) => <Instance key={i} position={b.position} scale={b.scale} />)}
        </Instances>
      )}
    </group>
  );
}

// ─── Main Scene ─────────────────────────────────────────────────────────────

export default function HolographicUplink({ progressRef }) {
  const { config, onCanvasCreated } = useQuality();
  const proximity = useProximity();
  const globeGroupRef = useRef();
  const controlsRef = useRef();
  const [hudMessage, setHudMessage] = useState('');
  const [autoRotate, setAutoRotate] = useState(true);
  const [isMobile] = useState(() => window.innerWidth < 768);
  const { texture, loading } = useGlobeTexture(config.globeTexSize);

  // Sat-Descent Cinematic
  useEffect(() => {
    if (proximity.status === 'SUCCESS' && proximity.isNearby && controlsRef.current) {
      const zoomDone = sessionStorage.getItem('neural_link_zoomed');
      if (zoomDone) return;

      setAutoRotate(false);
      sessionStorage.setItem('neural_link_zoomed', 'true');
      const hostPos = latLonToVec3(HOST_LOC.lat, HOST_LOC.lon, GLOBE_R);
      const targetPos = hostPos.clone();
      
      const tl = gsap.timeline();
      tl.to(controlsRef.current.target, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration: 4,
        ease: "power4.inOut"
      });
      tl.to(controlsRef.current.object.position, {
        x: targetPos.x + 2,
        y: targetPos.y + 5,
        z: targetPos.z + 3,
        duration: 5,
        ease: "power4.inOut"
      }, 0);
    }
  }, [proximity.status, proximity.isNearby]);

  // HUD Message Logic
  useEffect(() => {
    if (proximity.status === 'TIMEOUT' || proximity.status === 'DENIED') {
      setHudMessage('UPLINK TIMEOUT: SIGNAL INTERFERENCE DETECTED');
      setTimeout(() => setHudMessage('ROUTING TO GLOBAL GRID...'), 2000);
      setTimeout(() => setHudMessage(''), 4000);
    }
  }, [proximity.status]);

  return (
    <div style={{ position: 'sticky', top: 0, left: 0, width: '100%', height: '100vh', overflow: 'hidden', background: '#000' }}>
      
      {/* Cyberpunk HUD / Pre-Consent */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
        zIndex: 100, pointerEvents: proximity.status === 'IDLE' ? 'auto' : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px'
      }}>
        {proximity.status === 'IDLE' && (
          <div 
            onClick={proximity.requestLocation}
            style={{
              padding: '20px 40px', border: `2px solid ${COLORS.cyan}`, background: 'rgba(0,0,0,0.9)',
              color: COLORS.cyan, fontFamily: "'Orbitron', sans-serif", fontSize: '14px',
              cursor: 'pointer', textAlign: 'center', boxShadow: `0 0 20px ${COLORS.cyan}44`,
              letterSpacing: '0.2em'
            }}>
            [ WARNING: NEURAL-LINK DISCONNECTED ]<br/>
            <span style={{ fontSize: '10px', opacity: 0.7 }}>ENABLE GEOLOCATION FOR PROXIMITY UPLINK?</span>
          </div>
        )}

        {(proximity.status === 'SUCCESS' && proximity.isNearby) && (
          <div style={{ color: COLORS.red, fontFamily: "'Orbitron', sans-serif", textAlign: 'center' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.5em', marginBottom: '8px' }}>[ NEURAL LINK DETECTED ]</div>
            <div style={{ fontSize: '32px', fontWeight: 900, textShadow: `0 0 15px ${COLORS.red}` }}>
              {proximity.distance?.toFixed(1)} KM TO TARGET
            </div>
          </div>
        )}

        {hudMessage && (
          <div style={{ 
            color: COLORS.red, fontFamily: "'Share Tech Mono', monospace", 
            fontSize: '18px', textShadow: `0 0 10px ${COLORS.red}`, textAlign: 'center'
          }}>
            {hudMessage}
          </div>
        )}
      </div>

      <Canvas
        dpr={config.dpr}
        gl={{ powerPreference: 'high-performance', antialias: config.antialias }}
        onCreated={onCanvasCreated}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={isMobile ? 50 : 40} />
        
        <OrbitControls 
          ref={controlsRef}
          enablePan={false}
          enableZoom={true}
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
          onStart={() => setAutoRotate(false)}
        />

        <Stars radius={120} depth={60} count={config.starCount} factor={4} saturation={0} fade speed={0.5} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color={COLORS.cyan} />

        <group ref={globeGroupRef}>
          <mesh>
            <sphereGeometry args={[GLOBE_R * 0.99, config.globeSegments, config.globeSegments]} />
            <meshBasicMaterial map={texture} color={loading ? '#050505' : '#ffffff'} />
          </mesh>

          <mesh>
            <sphereGeometry args={[GLOBE_R * 1.02, 64, 64]} />
            <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.03} side={THREE.BackSide} />
          </mesh>

          {/* Markers */}
          <Beacon lat={HOST_LOC.lat} lon={HOST_LOC.lon} label="BINORE (DEV)" color={COLORS.yellow} />
          
          {proximity.visitorCoords && (
            <>
              <Beacon lat={proximity.visitorCoords.lat} lon={proximity.visitorCoords.lng} label="VISITOR (YOU)" color={COLORS.magenta} />
              <UplinkArc startLoc={proximity.visitorCoords} endLoc={HOST_LOC} />
            </>
          )}

          {/* Adaptive City Grid */}
          {config.cityEnabled && (proximity.status === 'SUCCESS' && proximity.isNearby) && (
            <CityGrid 
              isHolographic={config.quality === 'high'} 
              lat={HOST_LOC.lat} 
              lon={HOST_LOC.lon} 
              gridSize={config.cityGrid} 
            />
          )}

          {/* Default City Markers */}
          {!proximity.isNearby && CITIES.map(c => (
            <Beacon key={c.id} lat={c.lat} lon={c.lon} label={c.name} />
          ))}
        </group>

        <PerformanceMonitor onDecline={() => {}} onIncline={() => {}} />
      </Canvas>
    </div>
  );
}
