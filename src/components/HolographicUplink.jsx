/**
 * HolographicUplink.jsx — Adaptive Quality Edition
 * ─────────────────────────────────────────────────────────────────────────────
 * Globe scene with full hardware-tier adaptive rendering.
 *
 * Tier Matrix:
 *  HIGH   → 6000 stars, 128-seg globe, 2048px tex, full city grid, uplink arc, antialias
 *  MEDIUM → 2000 stars, 64-seg globe, 1024px tex, 10x10 city grid, no antialias
 *  LOW    → 0 stars, 32-seg globe, 512px tex, no city, no arc, 30fps cap, 0.75 DPR
 */

import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Stars, Instances, Instance, PerformanceMonitor, QuadraticBezierLine, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { useQuality } from '../context/QualityContext';

// ─── Constants ───────────────────────────────────────────────────────────────
const GLOBE_R = 2.4;
const CITY_THRESHOLD = 0.72;
const CITY_CELL = 0.15;
const MAX_BUILDING_H = 1.0;

const COLORS = {
  yellow: '#FCEE0A',
  cyan: '#00F0FF',
  red: '#FF003C',
  magenta: '#FF00FF',
};

const HOST_LOC = { id: 'host', lat: 28.6139, lon: 77.209, name: 'DELHI_CORE' };

const CITIES = [
  { id: 'delhi', lat: 28.6139, lon: 77.209, name: 'DELHI_SURFACE' },
  { id: 'tokyo', lat: 35.6762, lon: 139.6503, name: 'NEO_TOKYO' },
  { id: 'london', lat: 51.5074, lon: -0.1278, name: 'LONDON_GRID' },
  { id: 'la', lat: 34.0522, lon: -118.2437, name: 'NIGHT_CITY' },
];

// ─── Haversine ────────────────────────────────────────────────────────────────
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

// ─── GeoJSON Texture (tier-aware resolution) ──────────────────────────────────
function useGlobeTexture(texSize) {
  const [texture, setTexture] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadMaps() {
      try {
        const worldRes = await fetch('/world-50m.geo.json');
        const worldGeoJson = await worldRes.json();

        let indiaGeoJson = null;
        try {
          const indiaRes = await fetch('/india-official.geo.json');
          if (indiaRes.ok) indiaGeoJson = await indiaRes.json();
        } catch (e) { /* optional */ }

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
            const id = (feature.id || feature.properties?.id || '').toString().toUpperCase();
            if (name.includes('india') || id === 'IND' || id === '356') return;
          }
          context.beginPath(); path(feature); context.fill(); context.stroke();
        });

        if (indiaGeoJson) {
          context.strokeStyle = '#00F0FF';
          context.lineWidth = texSize > 1024 ? 4.0 : 2.0;
          context.fillStyle = '#0a0a0a';
          indiaGeoJson.features.forEach(feature => {
            context.beginPath(); path(feature); context.fill(); context.stroke();
          });
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = texSize > 1024 ? 8 : 4;
        setTexture(tex);
      } catch (err) {
        console.error('Map Load Error:', err);
      }
    }
    loadMaps();
    return () => { active = false; };
  }, [texSize]);

  return texture;
}

// ─── FPS Watchdog (runs inside Canvas) ───────────────────────────────────────
function FPSWatchdog({ reportFPS }) {
  const fpsBuffer = useRef([]);
  useFrame((_, delta) => {
    const fps = 1 / delta;
    fpsBuffer.current.push(fps);
    if (fpsBuffer.current.length > 30) fpsBuffer.current.shift();
    const avg = fpsBuffer.current.reduce((a, b) => a + b, 0) / fpsBuffer.current.length;
    reportFPS(avg);
  });
  return null;
}

// ─── Frame Rate Cap (Low tier) ────────────────────────────────────────────────
function FrameCapController({ frameCapMs }) {
  const lastFrameTime = useRef(0);
  useFrame((state) => {
    if (!frameCapMs) return;
    const now = performance.now();
    if (now - lastFrameTime.current < frameCapMs) {
      state.gl.setAnimationLoop(null); // pause
    } else {
      lastFrameTime.current = now;
    }
  });
  return null;
}

// ─── Camera Controller ────────────────────────────────────────────────────────
function CameraController({ progressRef, target, globeGroupRef, isManual }) {
  const { camera } = useThree();
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));
  const localPos = useMemo(() => latLonToVec3(target.lat, target.lon), [target]);

  useFrame(() => {
    if (isManual) return; // Yield control to OrbitControls
    const p = progressRef?.current ?? 0;
    let targetWorldPos = new THREE.Vector3();
    if (globeGroupRef.current) {
      targetWorldPos.copy(localPos);
      targetWorldPos.applyMatrix4(globeGroupRef.current.matrixWorld);
    } else {
      targetWorldPos.copy(localPos);
    }
    const normal = targetWorldPos.clone().normalize();
    const camMedium = normal.clone().multiplyScalar(GLOBE_R * 2.1);
    const camClose = normal.clone().multiplyScalar(GLOBE_R * 1.8);
    const sway = Math.sin(Date.now() * 0.0003) * 0.4;
    const camGlobal = new THREE.Vector3(sway, sway * 0.5, 9.5);
    let desiredPos = new THREE.Vector3();
    if (p < 0.5) desiredPos.lerpVectors(camGlobal, camMedium, p * 2);
    else desiredPos.lerpVectors(camMedium, camClose, (p - 0.5) * 2);
    camera.position.lerp(desiredPos, 0.08);
    let desiredLook = new THREE.Vector3();
    if (p < 0.3) desiredLook.set(0, 0, 0);
    else desiredLook.copy(targetWorldPos);
    lookTarget.current.lerp(desiredLook, 0.08);
    camera.lookAt(lookTarget.current);
  });
  return null;
}

// ─── Uplink Arc (disabled on Low tier) ───────────────────────────────────────
function UplinkArc({ visitorLoc }) {
  const packetRef = useRef();
  const tRef = useRef(0);
  const { start, mid, end } = useMemo(() => {
    const s = latLonToVec3(visitorLoc.lat, visitorLoc.lon);
    const e = latLonToVec3(HOST_LOC.lat, HOST_LOC.lon);
    const midRaw = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
    const m = midRaw.clone().normalize().multiplyScalar(GLOBE_R * 1.65);
    return { start: s, mid: m, end: e };
  }, [visitorLoc]);

  useFrame((_, delta) => {
    tRef.current = (tRef.current + delta * 0.35) % 1;
    const t = tRef.current;
    if (packetRef.current) {
      const u = 1 - t;
      const pos = new THREE.Vector3()
        .addScaledVector(start, u * u)
        .addScaledVector(mid, 2 * u * t)
        .addScaledVector(end, t * t);
      packetRef.current.position.copy(pos);
    }
  });

  return (
    <group>
      <QuadraticBezierLine start={start} mid={mid} end={end} color={COLORS.red} lineWidth={2} dashed dashScale={15} dashSize={0.5} gapSize={0.3} />
      <mesh ref={packetRef}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color={COLORS.magenta} toneMapped={false} />
      </mesh>
      <mesh position={start}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={COLORS.magenta} transparent opacity={0.25} toneMapped={false} />
      </mesh>
      <mesh position={end}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={COLORS.red} transparent opacity={0.25} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ─── Hotspot Ping ─────────────────────────────────────────────────────────────
function HotspotPing({ city, isActive, onClick, color }) {
  const localPos = useMemo(() => latLonToVec3(city.lat, city.lon, GLOBE_R + 0.02), [city]);
  const upQuat = useMemo(() => {
    const normal = localPos.clone().normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  }, [localPos]);
  const dotRef = useRef();
  const ringRef = useRef();
  const dotColor = color || (isActive ? COLORS.yellow : COLORS.cyan);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (dotRef.current) {
      if (isActive) {
        dotRef.current.material.opacity = 0.8 + 0.2 * Math.sin(t * 10);
        dotRef.current.scale.setScalar(1 + 0.2 * Math.sin(t * 10));
      } else {
        dotRef.current.material.opacity = 0.6;
        dotRef.current.scale.setScalar(1);
      }
    }
    if (ringRef.current) {
      const pulse = (t % 2.0) / 2.0;
      ringRef.current.scale.setScalar(1 + pulse * 5);
      ringRef.current.material.opacity = 0.8 * (1 - pulse);
    }
  });

  return (
    <group position={localPos} quaternion={upQuat}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(city); }}
      onPointerOver={() => document.body.style.cursor = 'pointer'}
      onPointerOut={() => document.body.style.cursor = 'auto'}
    >
      <mesh ref={dotRef}>
        <circleGeometry args={[isActive ? 0.04 : 0.025, 32]} />
        <meshBasicMaterial color={dotColor} transparent />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.03, 0.05, 32]} />
        <meshBasicMaterial color={dotColor} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function ActiveRing({ lat, lon }) {
  const localPos = useMemo(() => latLonToVec3(lat, lon, GLOBE_R + 0.02), [lat, lon]);
  const upQuat = useMemo(() => {
    const normal = localPos.clone().normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  }, [localPos]);
  const ringRef = useRef();
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime % 1.8) / 1.8;
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + t * 6);
      ringRef.current.material.opacity = 0.9 * (1 - t);
    }
  });
  return (
    <group position={localPos} quaternion={upQuat}>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.028, 0.045, 32]} />
        <meshBasicMaterial color={COLORS.yellow} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── City Grid (tier-aware grid size, disabled on Low) ────────────────────────
function CityGrid({ progressRef, lat, lon, gridSize }) {
  const groupRef = useRef();
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
      groupRef.current.scale.set(1, 0.001, 1);
      groupRef.current.visible = false;
    }
  });

  return (
    <group ref={groupRef} position={localPos} quaternion={upQuat} visible={false}>
      <Instances limit={gridSize * gridSize} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial color={COLORS.cyan} />
        {buildings.map((b, i) => <Instance key={i} position={b.position} scale={b.scale} />)}
      </Instances>
    </group>
  );
}

// ─── Wireframe Globe ──────────────────────────────────────────────────────────
function GlobeWireframe() {
  const ref = useRef();
  useFrame(() => { if (ref.current) ref.current.rotation.y += 0.003; });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[GLOBE_R * 1.005, 36, 36]} />
      <meshBasicMaterial color={COLORS.cyan} wireframe transparent opacity={0.1} />
    </mesh>
  );
}

// ─── Rotating Globe (tier-injected) ──────────────────────────────────────────
function RotatingGlobe({ progressRef, activeLoc, setActiveLoc, globeGroupRef, visitorLoc, config }) {
  const texture = useGlobeTexture(config.globeTexSize);
  const sphereDetail = config.globeSegments;
  const initialYaw = (-90 - CITIES[0].lon) * (Math.PI / 180);

  useFrame((state) => {
    if (globeGroupRef.current) {
      const p = progressRef?.current ?? 0;
      const rotSpeed = p < 0.45 ? 0.001 : 0.0002;
      globeGroupRef.current.rotation.y += rotSpeed;

      // Subtle mouse tilt (Parallax)
      const mouseX = state.mouse.x;
      const mouseY = state.mouse.y;
      globeGroupRef.current.rotation.x = THREE.MathUtils.lerp(globeGroupRef.current.rotation.x, mouseY * 0.15, 0.05);
      globeGroupRef.current.rotation.z = THREE.MathUtils.lerp(globeGroupRef.current.rotation.z, -mouseX * 0.1, 0.05);
    }
  });

  return (
    <group ref={globeGroupRef} rotation={[0, initialYaw, 0]}>
      {texture && (
        <mesh>
          <sphereGeometry args={[GLOBE_R * 0.993, sphereDetail, sphereDetail]} />
          <meshBasicMaterial map={texture} />
        </mesh>
      )}
      <mesh>
        <sphereGeometry args={[GLOBE_R * 1.015, 64, 64]} />
        <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
      <GlobeWireframe />

      {/* City grid — disabled on LOW tier */}
      {config.cityEnabled && (
        <CityGrid progressRef={progressRef} lat={activeLoc.lat} lon={activeLoc.lon} gridSize={config.cityGrid} />
      )}
      <ActiveRing lat={activeLoc.lat} lon={activeLoc.lon} />

      {CITIES.map(city => (
        <HotspotPing key={city.id} city={city} isActive={city.id === activeLoc.id} onClick={setActiveLoc} />
      ))}

      {visitorLoc && <HotspotPing city={visitorLoc} isActive color={COLORS.magenta} />}

      {/* Uplink Arc — disabled on LOW tier */}
      {config.uplinkArcEnabled && visitorLoc && <UplinkArc visitorLoc={visitorLoc} />}
    </group>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────
export default function HolographicUplink({ progressRef }) {
  const { config, onCanvasCreated, reportFPS } = useQuality();
  const [activeLoc, setActiveLoc] = useState(CITIES[0]);
  const globeGroupRef = useRef();
  const [isMobile] = useState(() => window.innerWidth < 768);
  const [perfDown, setPerfDown] = useState(false);
  const [visitorLoc, setVisitorLoc] = useState(null);
  const [uplinkDistance, setUplinkDistance] = useState(null);

  const [isManual, setIsManual] = useState(false);

  // Visitor IP geolocation
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.latitude && data.longitude) {
          setVisitorLoc({
            id: 'visitor',
            lat: data.latitude,
            lon: data.longitude,
            name: data.city ? `${data.city.toUpperCase()}_NODE` : 'UNKNOWN_NODE',
          });
          setUplinkDistance(haversineKm(data.latitude, data.longitude, HOST_LOC.lat, HOST_LOC.lon));
        }
      })
      .catch(() => console.warn('Visitor geolocation unavailable.'));
  }, []);

  // Merge PerformanceMonitor downgrades with tier config
  const effectiveStarCount = perfDown
    ? Math.min(config.starCount, 800)
    : config.starCount;

  return (
    <div style={{ position: 'sticky', top: 0, left: 0, width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* HUD Overlay — Responsive scales */}
      <div style={{
        position: 'absolute',
        bottom: isMobile ? '30px' : '50px',
        right: isMobile ? '30px' : '50px',
        zIndex: 10,
        pointerEvents: 'none',
        fontFamily: "'Orbitron', sans-serif",
        textAlign: 'right'
      }}>
        <div style={{ color: COLORS.yellow, fontSize: isMobile ? '8px' : '11px', letterSpacing: '0.35em', marginBottom: '6px' }}>UPLINK SECURED</div>
        <div style={{ color: COLORS.cyan, fontSize: isMobile ? '20px' : '32px', fontWeight: 900, textShadow: `0 0 12px ${COLORS.cyan}` }}>
          {activeLoc.name}
        </div>
        <div style={{ color: '#fff', fontSize: isMobile ? '9px' : '12px', opacity: 0.8, letterSpacing: '0.15em', marginTop: '8px' }}>
          LAT: {activeLoc.lat.toFixed(4)} // LON: {activeLoc.lon.toFixed(4)}
        </div>
        {visitorLoc && (
          <div style={{ marginTop: '12px', borderTop: '1px solid #FF00FF44', paddingTop: '10px' }}>
            <div style={{ color: COLORS.magenta, fontSize: isMobile ? '7px' : '9px', letterSpacing: '0.3em', marginBottom: '4px' }}>INBOUND UPLINK DETECTED</div>
            <div style={{ color: '#fff', fontSize: isMobile ? '10px' : '13px', fontWeight: 700, textShadow: `0 0 8px ${COLORS.magenta}` }}>{visitorLoc.name}</div>
            <div style={{ color: COLORS.magenta, fontSize: isMobile ? '8px' : '10px', marginTop: '4px', opacity: 0.8 }}>
              {uplinkDistance ? uplinkDistance.toLocaleString() + ' KM' : 'CALCULATING...'}
            </div>
          </div>
        )}
      </div>

      {/* Canvas — tier-adaptive DPR, antialias, precision */}
      <Canvas
        dpr={config.dpr}
        gl={{
          powerPreference: 'high-performance',
          precision: config.precision,
          antialias: config.antialias,
        }}
        onCreated={onCanvasCreated}
      >
        <PerspectiveCamera makeDefault position={[0, 0, isMobile ? 12 : 9.5]} fov={isMobile ? 50 : 45} near={0.1} far={1000} />
        <CameraController progressRef={progressRef} target={activeLoc} globeGroupRef={globeGroupRef} isManual={isManual} />
        
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          autoRotate={false} 
          onStart={() => setIsManual(true)} 
          makeDefault 
        />

        {/* FPS Watchdog — reports to quality engine */}
        <FPSWatchdog reportFPS={reportFPS} />

        {/* 30fps cap for LOW tier */}
        {config.frameCapMs && <FrameCapController frameCapMs={config.frameCapMs} />}

        <PerformanceMonitor onDecline={() => setPerfDown(true)} onIncline={() => setPerfDown(false)}>
          {effectiveStarCount > 0 && (
            <Stars
              radius={120}
              depth={60}
              count={effectiveStarCount}
              factor={4}
              saturation={config.starSaturation}
              fade
              speed={0.5}
            />
          )}
          <ambientLight intensity={1.0} />

          <Suspense fallback={null}>
            <group scale={isMobile ? 0.75 : 1}>
              <RotatingGlobe
                progressRef={progressRef}
                activeLoc={activeLoc}
                setActiveLoc={setActiveLoc}
                globeGroupRef={globeGroupRef}
                visitorLoc={visitorLoc}
                config={config}
              />
            </group>
          </Suspense>
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}
