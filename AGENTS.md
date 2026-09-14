# AGENTS.md

## Project purpose

This repository implements an interactive body-composition planet with Three.js. Users rotate and zoom the globe, select four body-composition regions, and see editable terrain labels projected above the 3D surface.

## Run and validate

```bash
npm install
npm run dev
npm run build
```

A change is complete only when `npm run build` succeeds and the globe remains usable with mouse and touch input.

## Landmark editing contract

- `src/landmarks.js` is the only source of truth for terrain names and coordinates.
- Rename a label by changing only its `name`.
- Add a label by adding one object to `LANDMARKS`.
- Keep stable, unique `id` values.
- Latitude is -90 to 90. Longitude is -180 to 180.
- `minDetailLevel: 0` is visible from orbit.
- `minDetailLevel: 1` appears only in the closer view.
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

Use an adult Western animated science-fiction tone expressed through natural scenery: midnight indigo ocean, copper rock, smoky jade forest, cool ivory glacier, and restrained cyan water. Do not add technological props. Avoid children's picture-book colors, glossy plastic materials, identical cone mountains, rounded broccoli forests, or photoreal rendering.

## Interaction invariants

- Drag rotates the globe.
- Mouse wheel and pinch zoom within a limited range.
- Click selects a body-composition zone.
- Near details fade in as the camera approaches.
- Camera controls and labels must work at mobile widths.
