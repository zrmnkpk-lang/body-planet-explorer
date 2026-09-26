import assert from "node:assert/strict"
import * as T from "three"
import { readFile } from "node:fs/promises"
import {
  makeTerrain,
  makeLocalTerrain,
  coastlinePositions,
  surfaceMaterial,
} from "../src/planet/terrain.js"
import {
  sampleLatLon,
  sample,
  direction,
  zoneAt,
  RIVERS,
  waterHeight,
  FJORDS,
  riverInfo,
} from "../src/planet/field.js"
import { addEcology, addWater } from "../src/planet/ecology.js"
import { addClimate } from "../src/planet/climate.js"
import { ZONES } from "../src/planet/zones.js"
import { LANDMARKS } from "../src/landmarks.js"
// Longitude wrap and poles must sample identical terrain and biomes.
for (let lat = -89; lat <= 89; lat += 2) {
  const a = sampleLatLon(lat, -180),
    b = sampleLatLon(lat, 180)
  for (const key of ["h", "moisture", "polar", "desert"])
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
const coastline = coastlinePositions(g)
assert.ok(coastline.length > 3000 && coastline.length % 18 === 0)
assert.ok(coastline.every(Number.isFinite), "coastline contour must be finite")
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
for (const name of ["position", "normal", "color", "terrainBiome"])
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
// Desert belts retain their terrain; other continents preserve their forests.
const mainlands = [
  [17, -27], [-20, 28], [49, 2], [21, 6],
  [0, 10], [-9, 157], [31, -148],
]
for (const [latitude, longitude] of mainlands) {
  let min = Infinity, max = -Infinity, woodland = 0, dryland = 0, landSamples = 0
  for (let lat = latitude - 12; lat <= latitude + 12; lat += 2)
    for (let lon = longitude - 12; lon <= longitude + 12; lon += 2) {
      const s = sampleLatLon(lat, lon)
      if (s.h <= 0.015) continue
      landSamples++
      min = Math.min(min, s.h)
      max = Math.max(max, s.h)
      if (s.forest > 0.3) woodland++
      if (s.desert > 0.55) dryland++
    }
  assert.ok(max - min > 0.02, `flat mainland ${latitude}/${longitude}`)
  if (longitude === -148)
    assert.ok(dryland / landSamples > 0.7, "red sand continent lacks desert")
  else if (longitude === -27) {
    assert.ok(dryland / landSamples > 0.3, "western arid belt is too small")
    assert.ok(woodland / landSamples > 0.05, "western woodland edge vanished")
  } else
    assert.ok(woodland / landSamples > 0.13, `forestless mainland ${latitude}/${longitude}`)
}
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
// Large-scale bays must stay open while their adjacent capes stay on land.
// These geography probes guard against regressing to overlapping round disks.
for (const [lat, lon] of [[32, -57], [24, -132], [-13, -13]])
  assert.ok(sampleLatLon(lat, lon).h < 0, `bay filled in ${lat}/${lon}`)
for (const [lat, lon] of [[44, -52], [-43, 29], [-32, 169]])
  assert.ok(sampleLatLon(lat, lon).h > 0.015, `peninsula lost ${lat}/${lon}`)
// Trunks remain in terrestrial watersheds; distributaries reach the coast.
for (let i = 0; i < RIVERS.length; i++) {
  const r = RIVERS[i]
  for (let lat = r.south + 2; lat < r.north - 1; lat += 1) {
    const s = sampleLatLon(lat, r.lon(lat))
    if (!r.delta && lat < r.north - 3 && lat > r.south + 4)
      assert.ok(s.land > 0.55, `river outside watershed ${i}/${lat}`)
    assert.ok(s.river < 7, `river valley missed ${i}/${lat}`)
    if (i >= 3 && !r.delta && lat < r.north - 3 && lat > r.south + 3) {
      const flank = sampleLatLon(lat, r.lon(lat) + 1)
      assert.ok(s.h < flank.h, `river channel not carved ${i}/${lat}`)
    }
  }
}
// Every delta has three braided distributaries with falling water levels.
const deltas = RIVERS.map((river, index) => ({ river, index })).filter(({ river }) => river.delta)
assert.equal(deltas.length, 12)
for (const { river, index } of deltas) {
  const startLevel = waterHeight(river.north, index)
  const mouthLevel = waterHeight(river.south, index)
  const mouth = sampleLatLon(river.south, river.lon(river.south))
  assert.ok(startLevel > mouthLevel, "delta flow must descend toward the sea")
  assert.ok(mouth.river < 1.7, "delta mouth missing from water classifier")
}
// Fjord beds cut through ice into the tide level and remain selectable as water.
assert.equal(FJORDS.length, 4)
for (const path of FJORDS) {
  for (const [lat, lon] of path) {
    const s = sampleLatLon(lat, lon)
    assert.ok(s.h <= -0.02, `fjord not carved at ${lat}/${lon}`)
    assert.equal(zoneAt(s), "water", "fjord should map to water")
  }
}
// Small continents are real raised landforms with surrounding ocean passages.
for (const [lat, lon] of [[-28, -130], [-44, 83], [36, 104]]) {
  const center = sampleLatLon(lat, lon)
  assert.ok(center.h > 0.015 && center.land > 0.8, `small continent ${lat}/${lon}`)
  const heights = []
  for (let a = lat - 5; a <= lat + 5; a += 1)
    for (let b = lon - 5; b <= lon + 5; b += 1)
      heights.push(sampleLatLon(a, b).h)
  assert.ok(Math.max(...heights) - Math.min(...heights) > 0.015, "flat small continent")
}
for (const [lat, lon] of [[-13, -112], [-29, 80], [22, 92]])
  assert.ok(sampleLatLon(lat, lon).h < 0, `small-continent strait ${lat}/${lon}`)
// Deep polar bays stay open and are selectable as water; ice tongues extend south.
for (const [lat, lon] of [[66, 48], [70, -122]]) {
  const bay = sampleLatLon(lat, lon)
  assert.ok(bay.h < 0 && bay.polar < 0.1, "polar bay filled in")
  assert.equal(zoneAt(bay), "water", "high-latitude ocean misclassified as ice")
}
for (const [lat, lon] of [[63, 85], [65, 0], [67, -85]])
  assert.ok(sampleLatLon(lat, lon).polar > 0.8, "ice tongue missing")
let iceLow = Infinity, iceHigh = -Infinity
for (let lat = 78; lat <= 88; lat += 2)
  for (let lon = -180; lon < 180; lon += 6) {
    const s = sampleLatLon(lat, lon)
    assert.ok(s.polar > 0.95 && s.h > 0.01, "polar interior gap")
    iceLow = Math.min(iceLow, s.h)
    iceHigh = Math.max(iceHigh, s.h)
  }
assert.ok(iceHigh - iceLow > 0.035 && iceHigh < 0.13, "glacier needs broad moderate relief")
const near = makeTerrain(127)
assert.equal(near.index.count / 3, 327680)
const local = makeLocalTerrain(direction(ZONES.muscle.lat, ZONES.muscle.lon))
assert.equal(local.index.count / 3, 524288)
assert.ok(local.attributes.position.array.every(Number.isFinite))
assert.ok(local.attributes.terrainBiome.array.every(Number.isFinite))
for (let i = 0; i < local.attributes.position.count; i += 999) {
  p.fromBufferAttribute(local.attributes.position, i)
  const radius = p.length()
  p.normalize()
  assert.ok(
    Math.abs(radius - 1 - sample(p.x, p.y, p.z).h) < 1e-6,
    "patch height mismatch",
  )
  assert.ok(
    Math.abs(local.attributes.terrainBiome.getX(i) - sample(p.x, p.y, p.z).desert) < 1e-6,
    "patch biome mismatch",
  )
}
assert.ok(sampleLatLon(31, -148).desert > 0.9)
assert.ok(sampleLatLon(12, -39).desert > 0.9)
assert.ok(sampleLatLon(-20, 28).desert < 0.05)
assert.ok(LANDMARKS.some((l) => l.id === "red-sand-continent"))
const eco = addEcology(new T.Group())
assert.ok(eco.treeCount >= 1000 && eco.treeCount <= 3000)
assert.ok(eco.shrubCount >= 3000 && eco.shrubCount <= 8000)
for (const [lat, lon] of mainlands) {
  if (lon === -148) continue
  const center = new T.Vector3(...direction(lat, lon))
  let canopy = 0
  for (const mesh of eco.trees) {
    const array = mesh.instanceMatrix.array
    for (let i = 0; i < mesh.count; i++) {
      p.set(array[i * 16 + 12], array[i * 16 + 13], array[i * 16 + 14]).normalize()
      if (p.dot(center) > Math.cos(20 * Math.PI / 180)) canopy++
    }
  }
  assert.ok(canopy >= 12, `missing trees on ${lat}/${lon}`)
}
for (const l of LANDMARKS.filter((x) => x.model)) {
  const buf = await readFile(new URL("../public" + l.model, import.meta.url))
  assert.equal(buf.toString("utf8", 0, 4), "glTF")
  assert.equal(buf.readUInt32LE(4), 2)
  assert.equal(buf.readUInt32LE(8), buf.length)
}
// Verify shader insertions against this checkout's actual Three.js shader chunks.
const shader = {
  uniforms: {},
  vertexShader: T.ShaderLib.lambert.vertexShader,
  fragmentShader: T.ShaderLib.lambert.fragmentShader,
}
surfaceMaterial().onBeforeCompile(shader)
assert.equal(surfaceMaterial().isMeshLambertMaterial, true, "terrain must stay matte")
assert.ok(shader.fragmentShader.includes("uniform vec3 patchCenter;"))
assert.ok(shader.vertexShader.includes("attribute vec2 terrainBiome;"))
assert.ok(shader.fragmentShader.includes("float textureFootprint="))
assert.ok(shader.fragmentShader.includes("iceCrevasse="))
assert.ok(shader.fragmentShader.includes("vec3 inkWarp="))
assert.ok(shader.fragmentShader.includes("smoothstep(.42,.79,gapWave)"))
assert.ok(shader.fragmentShader.includes("duneRipple="))
assert.ok(!shader.fragmentShader.includes("fwidth(diffuseColor.rgb)"), "mesh edge grid returned")
assert.ok(!shader.fragmentShader.includes("float strata="), "repeating contour bands returned")
assert.ok(shader.fragmentShader.includes("float inkDots(vec3 p,float frequency,float coverage)"))
assert.ok(shader.fragmentShader.includes("float coarseDots="))
assert.ok(shader.fragmentShader.includes("float fineFilter=1.-smoothstep"))
assert.ok(shader.fragmentShader.includes("float closeInk=smoothstep(.28,.88,detailAmount)*land;"))
assert.ok(shader.vertexShader.includes("vTerrainViewPosition=mvPosition.xyz;"))
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
assert.equal(orbit.grain, 0)
assert.ok(detailWeights(VIEW_LEVELS[2].distance).grain > 0)
assert.equal(surface.grain, 1)
assert.equal(detailWeights(4.2 - 0.63 * (4.2 - 1.53)).relief, 1)
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
assert.equal(eco.trees[0].castShadow, false)
eco.update(detailWeights(4.2 - 0.73 * (4.2 - 1.53)))
assert.equal(eco.trees[0].material.alphaHash, false)
assert.equal(eco.trees[0].castShadow, false)
eco.update(surface)
assert.equal(eco.trees[0].visible, true)
assert.equal(eco.trees[0].material.opacity, 1)
assert.equal(eco.trees[0].castShadow, true)
assert.deepEqual(eco.trees[0].instanceMatrix.array, matrix)
eco.update(orbit)
assert.equal(eco.trees[0].visible, false)
const climateRoot = new T.Group(),
  climate = addClimate(climateRoot)
assert.ok(climate.cloudCount >= 190)
assert.deepEqual(climate.cloudSizeCounts, [10, 20, 38])
assert.equal(climate.windParticleCount, 520)
assert.equal(climate.rainParticleCount, 720)
assert.ok(climate.stormCloudCount >= 50)
assert.equal(climate.stormCenters.length, 3)
for (const [lat, lon] of climate.stormCenters) {
  assert.ok(sampleLatLon(lat, lon).moisture > 0.6, `dry storm center ${lat}/${lon}`)
  assert.ok(sampleLatLon(lat, lon).desert < 0.1, `desert storm center ${lat}/${lon}`)
}
assert.equal(climate.windRibbonCount, 120)
assert.equal(climate.polarVortexCount, 2)
assert.ok(climate.polarCloudCount > 350 && climate.polarCloudCount < 500)
assert.equal(climate.lightningCount, 24)
const cycloneClouds = climateRoot.children[2], thinWind = climateRoot.children[3],
  monsoon = climateRoot.children[4], vortices = climateRoot.children[5],
  lightning = climateRoot.children[7]
assert.ok(climate.windRibbonCount < climate.windParticleCount / 3)
assert.ok(cycloneClouds.isInstancedMesh && cycloneClouds.count === climate.polarCloudCount)
assert.equal(cycloneClouds.geometry.attributes.aVortexCenter.count, cycloneClouds.count)
assert.equal(new Set(cycloneClouds.geometry.attributes.aVortexCycle.array).size, 2)
assert.ok(cycloneClouds.material.vertexShader.includes("cross(aVortexCenter,offset)*s"))
assert.ok(cycloneClouds.material.vertexShader.includes("fract(uTime*0.042+aVortexCycle)"))
let closestToEye = Infinity, farthestFromEye = 0
const cloudDirection = new T.Vector3(), eyeDirection = new T.Vector3(),
  vortexMatrix = new T.Matrix4()
for (let i = 0; i < cycloneClouds.count; i++) {
  cycloneClouds.getMatrixAt(i, vortexMatrix)
  cloudDirection.setFromMatrixPosition(vortexMatrix).normalize()
  eyeDirection.fromBufferAttribute(cycloneClouds.geometry.attributes.aVortexCenter, i)
  const separation = cloudDirection.angleTo(eyeDirection)
  closestToEye = Math.min(closestToEye, separation)
  farthestFromEye = Math.max(farthestFromEye, separation)
}
assert.ok(closestToEye > 0.035 && farthestFromEye > 0.18,
  "cyclone needs an open eye and outer cloud walls")
assert.ok(thinWind.isMesh && thinWind.geometry.index.count > 6000)
assert.equal(thinWind.material.uniforms.uColor.value.getHex(), 0xffffff)
assert.equal(monsoon.material.uniforms.uColor.value.getHex(), 0xffffff)
assert.equal(climateRoot.children[6].material.uniforms.uColor.value.getHex(), 0xa8dff7)
assert.ok(thinWind.geometry.attributes.aWidth.array.every((width) => width <= 0.0019))
assert.ok(monsoon.isMesh && monsoon.geometry.index.count > 3000)
assert.ok(monsoon.geometry.attributes.aWidth.array.every((width) => width <= 0.0035))
assert.ok(thinWind.material.vertexShader.includes("fract(uTime*0.067+aLifetime)"))
assert.ok(monsoon.material.vertexShader.includes("fract(uTime*0.028+aLifetime)"))
assert.ok(new Set(thinWind.geometry.attributes.aLifetime.array).size > 400)
assert.ok(new Set(monsoon.geometry.attributes.aLifetime.array).size > 100)
for (let i = 0; i < climate.windRibbonCount; i++) {
  const [lat, lon] = climate.stormCenters[i % 3],
    anchor = monsoon.geometry.attributes.aAnchor
  assert.ok(Math.abs(anchor.getX(i * 14) - lon * Math.PI / 180) <= 15 * Math.PI / 180)
  assert.ok(Math.abs(anchor.getY(i * 14) - lat * Math.PI / 180) <= 8 * Math.PI / 180)
}
assert.ok(vortices.isMesh && vortices.geometry.index.count > 600)
assert.ok(vortices.geometry.attributes.aCenter.array.every((_, i) =>
  i % 3 !== 1 || vortices.geometry.attributes.aCenter.array[i] > 0.94))
assert.equal(new Set(vortices.geometry.attributes.aCycle.array).size, 2)
assert.ok(lightning.isMesh && lightning.geometry.index.count > 800)
const boltVertices = lightning.geometry.attributes.position.array
let highestBolt = 0
for (let i = 0; i < boltVertices.length; i += 3)
  highestBolt = Math.max(highestBolt, Math.hypot(...boltVertices.slice(i, i + 3)))
assert.ok(highestBolt > 1.16, "lightning must reach above storm clouds")
const cloudMatrix = new T.Matrix4(), cloudScale = new T.Vector3()
climateRoot.children[0].getMatrixAt(0, cloudMatrix)
cloudScale.setFromMatrixScale(cloudMatrix)
assert.ok(cloudScale.y > 0.03, "large clouds need visible radial volume")
assert.ok(climateRoot.children[0].material.vertexShader.includes("normalScale="))
assert.ok(
  climateRoot.children.filter((child) => child.material?.isShaderMaterial)
    .length >= 6,
)
climate.update(orbit, 0, true)
assert.equal(lightning.visible, false)
assert.equal(cycloneClouds.visible, false)
const farCloudOpacity = climateRoot.children[0].material.uniforms.uOpacity.value
climate.update(detailWeights(VIEW_LEVELS[2].distance), 0, true)
assert.ok(climateRoot.children[0].material.uniforms.uOpacity.value < farCloudOpacity * 0.6)
assert.equal(monsoon.visible, true)
assert.equal(cycloneClouds.visible, true)
climate.update(detailWeights(VIEW_LEVELS[2].distance), 2000, false)
assert.equal(lightning.visible, true)
const waterRoot = new T.Group(),
  waterSystem = addWater(waterRoot),
  oceanShader = {
    uniforms: {},
    vertexShader: T.ShaderLib.lambert.vertexShader,
    fragmentShader: T.ShaderLib.lambert.fragmentShader,
  }
waterSystem.ocean.material.onBeforeCompile(oceanShader)
assert.equal(waterSystem.ocean.material.isMeshLambertMaterial, true, "ocean must stay matte")
assert.ok(oceanShader.fragmentShader.includes("float oceanCurrent="))
assert.equal(waterSystem.riverMeshes.length, RIVERS.length + 1)
assert.equal(waterSystem.fjordMeshes.length, FJORDS.length)
for (const channel of [...waterSystem.riverMeshes, ...waterSystem.fjordMeshes])
  assert.ok(channel.geometry.attributes.position.array.every(Number.isFinite),
    "river, delta, or fjord mesh has invalid coordinates")
console.log(
  "PASS: five map levels, islands, GPU climate particles, cloud and ocean shaders, hysteresis and labels",
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
