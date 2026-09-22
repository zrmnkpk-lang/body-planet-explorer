import assert from "node:assert/strict"
import * as T from "three"
import { readFile } from "node:fs/promises"
import {
  makeTerrain,
  makeLocalTerrain,
  surfaceMaterial,
} from "../src/planet/terrain.js"
import {
  sampleLatLon,
  sample,
  direction,
  zoneAt,
  RIVERS,
  waterHeight,
} from "../src/planet/field.js"
import { addEcology } from "../src/planet/ecology.js"
import { addClimate } from "../src/planet/climate.js"
import { ZONES } from "../src/planet/zones.js"
import { LANDMARKS } from "../src/landmarks.js"
// Longitude wrap and poles must sample identical terrain and biomes.
for (let lat = -89; lat <= 89; lat += 2) {
  const a = sampleLatLon(lat, -180),
    b = sampleLatLon(lat, 180)
  for (const key of ["h", "moisture", "polar"])
    assert.ok(Math.abs(a[key] - b[key]) < 1e-8, `longitude seam ${lat}/${key}`)
}
for (const lat of [-90, 90])
  for (let lon = -180; lon < 180; lon += 13)
    assert.ok(
      Math.abs(sampleLatLon(lat, lon).h - sampleLatLon(lat, 0).h) < 1e-8,
      "polar seam",
    )
const g = makeTerrain(63)
assert.equal(g.index.count / 3, 81920)
// Closed manifold: every undirected edge belongs to exactly two faces.
const edges = new Map()
for (let i = 0; i < g.index.count; i += 3) {
  const f = [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)]
  for (let j = 0; j < 3; j++) {
    const a = f[j],
      b = f[(j + 1) % 3],
      k = a < b ? `${a}:${b}` : `${b}:${a}`
    edges.set(k, (edges.get(k) || 0) + 1)
  }
}
assert.ok(
  [...edges.values()].every((x) => x === 2),
  "open global terrain edge",
)
for (const name of ["position", "normal", "color"])
  assert.ok(
    g.attributes[name].array.every(Number.isFinite),
    `${name} must be finite`,
  )
const n = new T.Vector3(),
  p = new T.Vector3()
for (let i = 0; i < g.attributes.position.count; i += 31) {
  p.fromBufferAttribute(g.attributes.position, i)
  n.fromBufferAttribute(g.attributes.normal, i)
  assert.ok(p.dot(n) > 0, "inward normal")
}
for (const [id, z] of Object.entries(ZONES))
  assert.equal(zoneAt(sampleLatLon(z.lat, z.lon)), id, `zone binding ${id}`)
for (let k = 0; k < RIVERS.length; k++) {
  const r = RIVERS[k]
  let previous = Infinity
  for (let lat = r.north - 0.1; lat > r.south + 0.1; lat -= 0.25) {
    const h = waterHeight(lat, k),
      s = sampleLatLon(lat, r.lon(lat))
    assert.ok(h <= previous + 1e-9, "uphill water")
    assert.ok(s.h < h + 0.0001, "river bed above water")
    previous = h
  }
}
assert.ok(sampleLatLon(0, 100).h < 0, "open ocean must be below sea level")
for (const [lat, lon] of [
  [8, 83],
  [-7, 96],
  [18, 111],
])
  assert.ok(sampleLatLon(lat, lon).h > 0.008, `ocean island ${lat}/${lon}`)
const near = makeTerrain(127)
assert.equal(near.index.count / 3, 327680)
const local = makeLocalTerrain(direction(ZONES.muscle.lat, ZONES.muscle.lon))
assert.equal(local.index.count / 3, 524288)
assert.ok(local.attributes.position.array.every(Number.isFinite))
for (let i = 0; i < local.attributes.position.count; i += 999) {
  p.fromBufferAttribute(local.attributes.position, i)
  const radius = p.length()
  p.normalize()
  assert.ok(
    Math.abs(radius - 1 - sample(p.x, p.y, p.z).h) < 1e-6,
    "patch height mismatch",
  )
}
const eco = addEcology(new T.Group())
assert.ok(eco.treeCount >= 1000 && eco.treeCount <= 3000)
assert.ok(eco.shrubCount >= 3000 && eco.shrubCount <= 8000)
for (const l of LANDMARKS.filter((x) => x.model)) {
  const buf = await readFile(new URL("../public" + l.model, import.meta.url))
  assert.equal(buf.toString("utf8", 0, 4), "glTF")
  assert.equal(buf.readUInt32LE(4), 2)
  assert.equal(buf.readUInt32LE(8), buf.length)
}
// Verify shader insertions against this checkout's actual Three.js shader chunks.
const shader = {
  uniforms: {},
  vertexShader: T.ShaderLib.standard.vertexShader,
  fragmentShader: T.ShaderLib.standard.fragmentShader,
}
surfaceMaterial().onBeforeCompile(shader)
assert.ok(shader.fragmentShader.includes("uniform vec3 patchCenter;"))
assert.ok(shader.vertexShader.includes("vTerrainPosition=transformed;"))
assert.ok(shader.vertexShader.includes("uniform float reliefAmount;"))
assert.ok(shader.vertexShader.includes("mix(1.,length(position),reliefAmount)"))
console.log(
  JSON.stringify(
    {
      result: "PASS",
      globalTriangles: 81920,
      nearTriangles: 327680,
      localTriangles: 524288,
      trees: eco.treeCount,
      shrubs: eco.shrubCount,
      checks: [
        "closed manifold",
        "dateline and poles",
        "outward normals",
        "shared patch heights",
        "downhill waterways",
        "body zones",
        "GLB resources",
        "shader insertion",
      ],
    },
    null,
    2,
  ),
)

// Semantic map zoom: actual reveal state must change without moving instances.
const { VIEW_LEVELS, detailWeights, levelForDistance, layerVisibility } =
  await import("../src/planet/view-levels.js")
assert.equal(VIEW_LEVELS.length, 5)
assert.equal(new Set(LANDMARKS.map((l) => l.id)).size, LANDMARKS.length)
for (const l of LANDMARKS) {
  assert.ok(l.minDetailLevel >= 0 && l.minDetailLevel <= 4)
  assert.ok(l.maxDetailLevel >= l.minDetailLevel && l.maxDetailLevel <= 4)
}
const orbit = detailWeights(VIEW_LEVELS[0].distance),
  surface = detailWeights(VIEW_LEVELS[4].distance)
assert.equal(orbit.trees, 0)
assert.equal(orbit.shrubs, 0)
assert.equal(orbit.landmarks, 0)
assert.equal(orbit.progress, 0)
assert.ok(orbit.relief < 0.3)
assert.ok(orbit.clouds > 0.95)
assert.equal(surface.trees, 1)
assert.equal(surface.shrubs, 1)
assert.equal(surface.landmarks, 1)
assert.equal(surface.progress, 1)
assert.equal(surface.relief, 1)
let level = 0
for (let d = 4; d > 1.5; d -= 0.01) level = levelForDistance(d, level)
assert.equal(level, 4)
for (let d = 1.5; d < 4; d += 0.01) level = levelForDistance(d, level)
assert.equal(level, 0)
assert.equal(levelForDistance(3.8, 0), 0)
assert.equal(levelForDistance(3.76, 0), 1)
assert.equal(levelForDistance(3.84, 1), 1)
assert.equal(levelForDistance(3.88, 1), 0)
assert.ok(layerVisibility(1, 1, 0.28) > 0.4)
assert.ok(layerVisibility(1, 1, 0.7) < 0.01)
const matrix = eco.trees[0].instanceMatrix.array.slice()
eco.update(orbit)
assert.equal(eco.trees[0].visible, false)
eco.update(surface)
assert.equal(eco.trees[0].visible, true)
assert.equal(eco.trees[0].material.opacity, 1)
assert.deepEqual(eco.trees[0].instanceMatrix.array, matrix)
eco.update(orbit)
assert.equal(eco.trees[0].visible, false)
const climate = addClimate(new T.Group())
assert.ok(climate.cloudCount >= 60)
climate.update(orbit, 0, true)
console.log(
  "PASS: five map levels, continuous zoom, islands, climate layer, hysteresis and label ranges",
)

// Desktop input must reserve OrbitControls rotation for the hold handler and avoid polar clamps.
const appSource = await readFile(
  new URL("../src/app.js", import.meta.url),
  "utf8",
)
assert.match(appSource, /controls\.mouseButtons\.LEFT = null/)
assert.match(appSource, /controls\.enableRotate = false/)
assert.match(appSource, /HOLD_TO_ROTATE_MS = 180/)
assert.match(appSource, /setTimeout\(beginMouseRotate, HOLD_TO_ROTATE_MS\)/)
assert.match(
  appSource,
  /performance\.now\(\) - down\.pressedAt >= HOLD_TO_ROTATE_MS/,
)
assert.doesNotMatch(appSource, /moved > 7\) clearMouseHold\(\)/)
assert.match(appSource, /function rotateGlobe\(yaw, pitch\)/)
assert.match(appSource, /targetGlobeQuaternion/)
assert.match(appSource, /root\.quaternion\.slerp/)
assert.match(
  appSource,
  /\(dx \/ rect\.width\) \* Math\.PI \* controls\.rotateSpeed/,
)
assert.doesNotMatch(appSource, /setFromSpherical\(spherical\)/)
console.log(
  "PASS: press-and-hold rotation, drag-aligned smoothing, polar-safe quaternion, and short-press picking",
)
