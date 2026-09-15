# Portal Fitness — Body Planet Explorer

> 你的身体是一颗星球。

A gamified fitness app prototype built with React + Vite + Three.js + AstraUI design system.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 8** + **Tailwind CSS v4**
- **Three.js** — procedural 3D planet renderer
- **@figma/astraui** — component library
- **lucide-react** — icon set

## Features

- 🌍 **Body Planet** — your body metrics (muscle/fat/water/bone) map to a living planet's geography
- 🏋️ **Training System** — 3 workout modes (strength/cardio/recovery) with XP and streaks
- 🪐 **Planet Ecology** — L1–L5 era progression with era cards and swipe navigation
- 📊 **Matter Scan** — body composition dashboard with manual data entry
- 👤 **Profile** — observer level, weekly progress, achievement system

## Planet Zones

| Zone | Body Metric | Visual Feature |
|------|------------|----------------|
| 造山带 (Highlands) | Muscle mass | Mountain range height |
| 极地骨骼要塞 (Polar Cap) | Bone density | Arctic ice cap size |
| 生命水道 (Rivers) | Body water % | River network width |
| 季风大陆 (Monsoon Plains) | Body fat % | Southern continent |

## Design System

All UI uses CSS variables from `src/index.css` (AstraUI tokens). Update the token values to restyle the entire app.

## Fonts

- **ZCOOL KuaiLe** — Chinese section titles, badges
- **Bangers** — English titles, large numbers
- **Comic Neue** — body copy, labels

## Getting Started

```bash
pnpm install
pnpm dev
```

## Image Assets

The following PNG files in `src/imports/` are required but not tracked in this repo due to size (each ~2.3–2.5 MB):

- `image.png` — Void Runner character (home poster)
- `image-1.png` — Black hole animation (portal mark)
- `image-2.png` — Body analysis character (stats page)
- `image-5.png` to `image-9.png` — Planet era backgrounds (L1–L5)
- `jimeng-2026-08-30-4227-*.png` — Cosmic background

Add these files to `src/imports/` before running the app.

## Product Docs

- [`src/imports/PortalFitness______v1.md`](src/imports/PortalFitness______v1.md) — Product spec v1.0
- [`src/imports/PortalFitness______v1-1.md`](src/imports/PortalFitness______v1-1.md) — Interaction design doc v1.0
