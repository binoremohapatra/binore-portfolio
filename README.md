# 🌐 Binore Portfolio — Cyberpunk 2077-Inspired Developer Portfolio

> A Cyberpunk 2077-themed interactive portfolio built with React, Three.js, React Three Fiber, and Framer Motion. Features a 3D Earth with camera flight to Delhi, procedural city grid, VRM-style HUD boot sequence, interactive brain model, ambient audio, and a Konami code easter egg.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-3D-black?logo=threedotjs)](https://threejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Framer Motion](https://img.shields.io/badge/Framer-Motion-pink)](https://www.framer.com/motion)

---

## ✨ Features

- **3D Earth (Phase 0)** — High-altitude hex point-cloud Earth; Framer scroll drives camera altitude
- **Cinematic Camera Flight (Phase 1)** — Camera descends via `useFrame` lerp to Delhi coordinates
- **Procedural City (Phase 2)** — InstancedMesh city grid fades in below camera threshold; pulsing beacon marks Delhi
- **HUD Boot Sequence** — Framer `AnimatePresence` + staggered children with glitch-snap text scramble effect
- **NeuralMind** — Interactive 3D brain model (`.glb`) with hover effects
- **HolographicUplink** — Globe data visualization with country GeoJSON overlays
- **DataArchives** — Project showcase section
- **Ambient Audio System** — Background music, UI sounds (click, hover, glitch, alert) with volume toggle
- **Konami Code Easter Egg** — Hidden interaction
- **Adaptive Quality** — `useAdaptiveQuality` hook degrades 3D quality on low-end devices
- **Cyberpunk Font** — Custom `Cyberpunk.otf` / `.ttf` loaded locally

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Three.js + React Three Fiber | 3D WebGL rendering |
| @react-three/drei | 3D helpers (OrbitControls, useGLTF) |
| Framer Motion | Scroll-driven animations + transitions |
| Vite | Build tool |
| Tailwind CSS | Utility styling |

## 🚀 Run Locally

```bash
git clone https://github.com/binoremohapatra/binore-portfolio.git
cd binore-portfolio
npm install
npm run dev
```

## 📁 Key Components

```
src/
├── Home.jsx                   Main scroll experience (Earth → City → Sections)
├── SplashScreen.jsx           Cyberpunk boot screen
├── components/
│   ├── NeuralMind.jsx         Interactive 3D brain
│   ├── HolographicUplink.jsx  Globe visualization
│   ├── DataArchives.jsx       Projects section
│   ├── TechRadar3D.jsx        3D skills radar
│   ├── KonamiHandler.jsx      Easter egg
│   └── ui/
│       ├── NeuroLinkBadge.jsx
│       └── VolumeToggle.jsx
├── context/
│   ├── SoundContext.jsx       Global audio management
│   └── QualityContext.jsx     Adaptive quality settings
└── hooks/
    ├── useAdaptiveQuality.js  Performance tier detection
    └── useRelicScroll.ts      Custom scroll hook
```

---

**Built by [Binore Mohapatra](https://github.com/binoremohapatra)**
