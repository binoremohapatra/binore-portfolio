import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Stars, Instances, Instance, PerformanceMonitor, QuadraticBezierLine } from '@react-three/drei';
import * as THREE from 'three';
import { geoEquirectangular, geoPath } from 'd3-geo';

// ─── Constants ───────────────────────────────────────────────────────────────
const GLOBE_R = 2.4;
const CITY_THRESHOLD = 0.72;
const CITY_GRID = 20;
const CITY_CELL = 0.15;
const MAX_BUILDING_H = 1.0;

const COLORS = {
  yellow: '#FCEE0A',
  cyan: '#00F0FF',
  red: '#FF003C',
  magenta: '#FF00FF',
};

// Host base — always Delhi
const HOST_LOC = { id: 'host', lat: 28.6139, lon: 77.209, name: 'DELHI_CORE' };

const CITIES = [
  { id: 'delhi', lat: 28.6139, lon: 77.209, name: 'DELHI_SURFACE' },
  { id: 'tokyo', lat: 35.6762, lon: 139.6503, name: 'NEO_TOKYO' },
  { id: 'london', lat: 51.5074, lon: -0.1278, name: 'LONDON_GRID' },
  { id: 'la', lat: 34.0522, lon: -118.2437, name: 'NIGHT_CITY' }
];

// ─── Haversine Distance Calculator ───────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)));
}

// ─── Spherical coordinate mapping matching Three.js Canvas UV layout ─────────
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

// ─── GeoJSON To Canvas Texture ───────────────────────────────────────────────
function useGlobeTexture() {
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
          if (indiaRes.ok) {
            indiaGeoJson = await indiaRes.json();
          }
        } catch (e) {
          console.warn('Official India Map not found, falling back to default.', e);
        }

        if (!active) return;

        const canvas = document.createElement('canvas');
        canvas.width = 4096;
        canvas.height = 2048;
        const context = canvas.getContext('2d');

        // Oceans — Pitch Black
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);

        const projection = geoEquirectangular()
          .translate([canvas.width / 2, canvas.height / 2])
          .scale(canvas.width / (2 * Math.PI));

        const path = geoPath().projection(projection).context(context);

        // 1. Draw World Map
        context.strokeStyle = '#00F0FF';
        context.lineWidth = 2.5;
        context.fillStyle = '#0a0a0a';

        worldGeoJson.features.forEach(feature => {
          // If we have official India JSON, skip the world-map version of India
          if (indiaGeoJson) {
            const name = (feature.properties?.name || '').toLowerCase();
            const id = (feature.id || feature.properties?.id || '').toString().toUpperCase();
            if (name.includes('india') || id === 'IND' || id === '356') return;
          }

          context.beginPath();
          path(feature);
          context.fill();
          context.stroke();
        });

        // 2. Draw Official India (only if loaded successfully)
        if (indiaGeoJson) {
          context.strokeStyle = '#00F0FF';
          context.lineWidth = 4.0;
          context.fillStyle = '#0a0a0a';

          indiaGeoJson.features.forEach(feature => {
            context.beginPath();
            path(feature);
            context.fill();
            context.stroke();
          });
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        setTexture(tex);
      } catch (err) {
        console.error('Critical Map Loading Error:', err);
      }
    }

    loadMaps();
    return () => { active = false; };
  }, []);

  return texture;
}

// ─── Camera Controller ────────────────────────────────────────────────────────
function CameraController({ progressRef, target, globeGroupRef }) {
  const { camera } = useThree();
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));

  const localPos = useMemo(() => latLonToVec3(target.lat, target.lon), [target]);

  useFrame(() => {
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
    if (p < 0.5) {
      desiredPos.lerpVectors(camGlobal, camMedium, p * 2);
    } else {
      desiredPos.lerpVectors(camMedium, camClose, (p - 0.5) * 2);
    }

    camera.position.lerp(desiredPos, 0.08);

    let desiredLook = new THREE.Vector3();
    if (p < 0.3) {
      desiredLook.set(0, 0, 0);
    } else {
      desiredLook.copy(targetWorldPos);
    }

    lookTarget.current.lerp(desiredLook, 0.08);
    camera.lookAt(lookTarget.current);
  });

  return null;
}

// ─── Animated Parabolic Cyber-Arc ─────────────────────────────────────────────
function UplinkArc({ visitorLoc }) {
  const packetRef = useRef();
  const tRef = useRef(0);

  const { start, mid, end } = useMemo(() => {
    const s = latLonToVec3(visitorLoc.lat, visitorLoc.lon);
    const e = latLonToVec3(HOST_LOC.lat, HOST_LOC.lon);
    // Midpoint pushed outward from globe center to create parabolic arc above surface
    const midRaw = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
    const m = midRaw.clone().normalize().multiplyScalar(GLOBE_R * 1.65);
    return { start: s, mid: m, end: e };
  }, [visitorLoc]);

  // Animate data packet along the quadratic bezier curve
  useFrame((_, delta) => {
    tRef.current = (tRef.current + delta * 0.35) % 1;
    const t = tRef.current;

    if (packetRef.current) {
      // Quadratic Bezier formula: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
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
      {/* Glowing Arc Line */}
      <QuadraticBezierLine
        start={start}
        mid={mid}
        end={end}
        color={COLORS.red}
        lineWidth={2}
        dashed
        dashScale={15}
        dashSize={0.5}
        gapSize={0.3}
      />
      {/* Data Packet Sphere traveling along the arc */}
      <mesh ref={packetRef}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color={COLORS.magenta} toneMapped={false} />
      </mesh>
      {/* Glow halo around the packet */}
      <mesh ref={null}>
        {/* Static glow at visitor origin */}
        <mesh position={start}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={COLORS.magenta} transparent opacity={0.25} toneMapped={false} />
        </mesh>
        {/* Static glow at host */}
        <mesh position={end}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color={COLORS.red} transparent opacity={0.25} toneMapped={false} />
        </mesh>
      </mesh>
    </group>
  );
}

// ─── Pings & Rings ────────────────────────────────────────────────────────────
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
    <group
      position={localPos}
      quaternion={upQuat}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(city); }}
      onPointerOver={() => document.body.style.cursor = 'pointer'}
      onPointerOut={() => document.body.style.cursor = 'auto'}
    >
      <mesh ref={dotRef}>
        <circleGeometry args={[isActive ? 0.04 : 0.025, 32]} />
        <meshBasicMaterial color={dotColor} transparent />
      </mesh>
      {/* Pulsing ring — always visible on visitor node */}
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

// ─── Procedural CityGrid ──────────────────────────────────────────────────────
function CityGrid({ progressRef, lat, lon }) {
  const groupRef = useRef();

  const buildings = useMemo(() => {
    const arr = [];
    const offset = (CITY_GRID * CITY_CELL) / 2;
    for (let i = 0; i < CITY_GRID; i++) {
      for (let j = 0; j < CITY_GRID; j++) {
        const x = i * CITY_CELL - offset;
        const z = j * CITY_CELL - offset;
        const dist = Math.sqrt(x * x + z * z);
        const factor = Math.max(0.15, 1 - dist / offset);
        const h = Math.random() * MAX_BUILDING_H * factor;
        if (h > 0.02) {
          arr.push({ position: [x, h / 2, z], scale: [CITY_CELL * 0.75, h, CITY_CELL * 0.75] });
        }
      }
    }
    return arr;
  }, []);

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
      <Instances limit={500} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial color={COLORS.cyan} />
        {buildings.map((b, i) => (
          <Instance key={i} position={b.position} scale={b.scale} />
        ))}
      </Instances>
    </group>
  );
}

// ─── Wireframe Globe Envelope ─────────────────────────────────────────────────
function GlobeWireframe() {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.003;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[GLOBE_R * 1.005, 36, 36]} />
      <meshBasicMaterial color={COLORS.cyan} wireframe transparent opacity={0.1} />
    </mesh>
  );
}

// ─── Main Rotating Globe Group ────────────────────────────────────────────────
function RotatingGlobe({ progressRef, activeLoc, setActiveLoc, globeGroupRef, isMobile, visitorLoc }) {
  const texture = useGlobeTexture();
  const sphereDetail = isMobile ? 64 : 128;
  const initialYaw = (-90 - CITIES[0].lon) * (Math.PI / 180);

  useFrame(() => {
    if (globeGroupRef.current) {
      const p = progressRef?.current ?? 0;
      const rotSpeed = p < 0.45 ? 0.001 : 0.0002;
      globeGroupRef.current.rotation.y += rotSpeed;
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

      {/* Atmospheric rim */}
      <mesh>
        <sphereGeometry args={[GLOBE_R * 1.015, 64, 64]} />
        <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>

      <GlobeWireframe />

      <CityGrid progressRef={progressRef} lat={activeLoc.lat} lon={activeLoc.lon} />
      <ActiveRing lat={activeLoc.lat} lon={activeLoc.lon} />

      {CITIES.map(city => (
        <HotspotPing
          key={city.id}
          city={city}
          isActive={city.id === activeLoc.id}
          onClick={setActiveLoc}
        />
      ))}

      {/* Visitor location — pulsing Magenta ping */}
      {visitorLoc && (
        <HotspotPing
          city={visitorLoc}
          isActive={true}
          color={COLORS.magenta}
        />
      )}

      {/* Parabolic uplink arc from visitor to Delhi */}
      {visitorLoc && <UplinkArc visitorLoc={visitorLoc} />}
    </group>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────
export default function HolographicUplink({ progressRef }) {
  const [activeLoc, setActiveLoc] = useState(CITIES[0]);
  const globeGroupRef = useRef();
  const [isMobile] = useState(() => window.innerWidth < 768);
  const [perfDown, setPerfDown] = useState(false);

  // Visitor geolocation via IP
  const [visitorLoc, setVisitorLoc] = useState(null);
  const [uplinkDistance, setUplinkDistance] = useState(null);

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.latitude && data.longitude) {
          const loc = {
            id: 'visitor',
            lat: data.latitude,
            lon: data.longitude,
            name: data.city ? `${data.city.toUpperCase()}_NODE` : 'UNKNOWN_NODE',
          };
          setVisitorLoc(loc);
          // Calculate distance from visitor to Delhi host base
          const km = haversineKm(data.latitude, data.longitude, HOST_LOC.lat, HOST_LOC.lon);
          setUplinkDistance(km);
        }
      })
      .catch(() => {
        // Fail silently — visitor loc is optional enhancement
        console.warn('Visitor geolocation unavailable.');
      });
  }, []);

  return (
    <div style={{ position: 'sticky', top: 0, left: 0, width: '100%', height: '100vh', overflow: 'hidden' }}>

      {/* HUD Target Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '50px',
        right: '50px',
        zIndex: 10,
        pointerEvents: 'none',
        fontFamily: "'Orbitron', sans-serif",
        textAlign: 'right'
      }}>
        <div style={{ color: COLORS.yellow, fontSize: '11px', letterSpacing: '0.35em', marginBottom: '6px' }}>UPLINK SECURED</div>
        <div style={{ color: COLORS.cyan, fontSize: '32px', fontWeight: 900, textShadow: `0 0 12px ${COLORS.cyan}` }}>
          {activeLoc.name}
        </div>
        <div style={{ color: '#fff', fontSize: '12px', opacity: 0.8, letterSpacing: '0.15em', marginTop: '8px' }}>
          LAT: {activeLoc.lat.toFixed(4)} // LON: {activeLoc.lon.toFixed(4)}
        </div>

        {/* Visitor uplink data */}
        {visitorLoc && (
          <div style={{ marginTop: '12px', borderTop: '1px solid #FF00FF44', paddingTop: '10px' }}>
            <div style={{ color: COLORS.magenta, fontSize: '9px', letterSpacing: '0.3em', marginBottom: '4px' }}>
              INBOUND UPLINK DETECTED
            </div>
            <div style={{ color: '#fff', fontSize: '13px', fontWeight: 700, textShadow: `0 0 8px ${COLORS.magenta}` }}>
              {visitorLoc.name}
            </div>
            <div style={{ color: COLORS.magenta, fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>
              UPLINK DISTANCE: {uplinkDistance ? uplinkDistance.toLocaleString() + ' KM' : 'CALCULATING...'}
            </div>
          </div>
        )}
      </div>

      {/* Canvas with strict DPR cap for mobile perf */}
      <Canvas dpr={[1, Math.min(window.devicePixelRatio, 1.5)]}>
        <PerspectiveCamera makeDefault position={[0, 0, 9.5]} fov={45} near={0.1} far={1000} />
        <CameraController progressRef={progressRef} target={activeLoc} globeGroupRef={globeGroupRef} />

        <PerformanceMonitor onDecline={() => setPerfDown(true)} onIncline={() => setPerfDown(false)}>
          <Stars radius={120} depth={60} count={isMobile || perfDown ? 800 : 6000} factor={4} saturation={0} fade speed={0.5} />
          <ambientLight intensity={1.0} />

          <Suspense fallback={null}>
            <RotatingGlobe
              progressRef={progressRef}
              activeLoc={activeLoc}
              setActiveLoc={setActiveLoc}
              globeGroupRef={globeGroupRef}
              isMobile={isMobile}
              visitorLoc={visitorLoc}
            />
          </Suspense>
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}
