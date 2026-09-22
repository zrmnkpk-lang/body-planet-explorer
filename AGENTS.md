# AGENTS.md

## Project purpose

This repository is the Portal Fitness prototype. Its current React entry point is a workout logger with plans, a broad exercise library, local persistence, and a local Credit calculation. It also contains a separate Three.js body-planet exploration prototype that is not yet mounted by the React entry point.

The product target and interaction rules live in `docs/product-spec.md` and `docs/interaction-spec.md`. Keep the distinction clear: those documents describe the target MVP; the current implementation status is recorded in `README.md` and `docs/reference-gap-analysis.md`.

## Run and validate

```bash
npm install
npm run dev
npm run build
```

A change is complete only when `npm run build` succeeds. Changes to the standalone planet scene must also keep the globe usable with mouse and touch input.

For React workout changes, verify the training flows and localStorage behavior in `src/App.tsx`. For globe changes, verify the standalone scene only when its HTML host is present; `index.html` currently mounts `src/main.tsx`, not `src/app.js`.

## File ownership

- `src/App.tsx`: React workout, plans, exercise picker, history, and local Credit prototype.
- `src/exerciseLibrary.ts`: sole source of truth for exercise IDs and tracking modes.
- `src/main.tsx`: React mount and error boundary; keep business state out of this file.
- `src/app.js`: standalone Three.js planet scene; do not treat it as the React screen.
- `src/landmarks.js`: sole source of truth for globe landmark names, coordinates, and detail levels.
- `public/assets/`: runtime images; update `docs/assets.md` whenever an asset is added, replaced, resized, or removed.
- `docs/product-spec.md`: product rules and MVP acceptance criteria.
- `docs/interaction-spec.md`: page transitions, states, errors, offline behavior, and analytics.
- `docs/exercise-library.md`: exercise and local persistence contract.
- `docs/assets.md`: complete resource index.
- `src/imports/` and `docs/*v1.2.md`: historical inputs; do not use them as current requirements.

When a product rule changes, update the product spec first. When a page behavior changes, update the interaction spec first. When code is not yet aligned with the target spec, update the gap analysis instead of describing planned behavior as implemented.

## Landmark editing contract

- `src/landmarks.js` is the only source of truth for terrain names and coordinates.
- Rename a label by changing only its `name`.
- Add a label by adding one object to `LANDMARKS`.
- Keep stable, unique `id` values.
- Latitude is -90 to 90. Longitude is -180 to 180.
- `minDetailLevel: 0` is visible from orbit.
- `minDetailLevel: 1/2/3` targets continent/ecosystem/surface views; `maxDetailLevel` hides parent labels and `priority` controls collision avoidance.
- Do not bake labels into textures, CanvasTexture, SVG paths, or 3D meshes.
- Labels must remain HTML elements in `#landmark-layer`.
- Keep `pointer-events: none` on the label layer so labels never block globe gestures.
- Hide labels when their anchor rotates to the back of the globe.
- All user-facing Chinese names must remain editable without touching `src/app.js`.

## Terrain definitions

- `glacier`: permanent northern ice cap and fractured ice fields.
- `ocean`: open water outside continental shelves.
- `river`: continuous glacier-fed water system crossing the planet.
- `forest`: directional conifer vegetation on the monsoon continent.
- `desert`: dry copper and sienna highland plateau around the mountain belt.

## Visual direction

Use an adult Western animated science-fiction tone expressed through natural scenery: midnight indigo ocean, vermilion-copper rock, saturated jade forest, cool ivory glacier, and restrained cyan water. Do not add technological props. Avoid children's picture-book colors, glossy plastic materials, identical cone mountains, rounded broccoli forests, or photoreal rendering.

## Interaction invariants

- Drag rotates the globe.
- Mouse wheel and pinch zoom within a limited range.
- Click selects a body-composition zone.
- Near details fade in as the camera approaches.
- Camera controls and labels must work at mobile widths.

## Continuous terrain modules

- `src/planet/field.js` is the shared height/biome/river classifier. Geometry, water, vegetation and picking must use it.
- `src/planet/terrain.js` builds global and local surfaces; `terrain.worker.js` computes them off the render thread.
- `src/planet/zones.js` owns body-zone labels, metric defaults and focus coordinates.
- `src/landmarks.js` remains the sole source of truth for landmark names and coordinates; optional model/scale fields place local GLBs.
- After terrain edits run `node scripts/validate-planet.mjs` and `npm run build`. Report actual browser/GPU test limitations; never claim a performance target as measured.
- Do not remove the standalone scene's WebMCP tool or change the React workout entry as part of terrain-only work.

- `src/planet/view-levels.js` owns semantic zoom thresholds and reveal weights. Zoom must not scale vegetation or change its location; depth shadows follow reveal weights.
