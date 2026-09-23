import * as T from "three"
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js"
import { sample, noise, smooth, clamp } from "./field.js"
const palette = {
  sand: new T.Color("#bfa388"),
  dune: new T.Color("#c6a17a"),
  redSand: new T.Color("#a97866"),
  forest: new T.Color("#39776a"),
  forestEdge: new T.Color("#57937b"),
  grass: new T.Color("#7ca888"),
  rock: new T.Color("#927c75"),
  strata: new T.Color("#aa9584"),
  snow: new T.Color("#d8e6de"),
  ice: new T.Color("#91b9e2"),
  iceCrack: new T.Color("#668ea7"),
  wet: new T.Color("#277f85"),
  deep: new T.Color("#192e55"),
}
export function makeTerrain(detail) {
  const raw = new T.IcosahedronGeometry(1, detail)
  raw.deleteAttribute("normal")
  raw.deleteAttribute("uv")
  const g = mergeVertices(raw, 1e-6)
  raw.dispose()
  return bakeTerrain(g)
}
export function makeLocalTerrain(center, segments = 512) {
  const up = new T.Vector3(...center).normalize(),
    right = new T.Vector3(-up.z, 0, up.x)
  if (right.lengthSq() < 0.001) right.set(1, 0, 0)
  right.normalize()
  const north = new T.Vector3().crossVectors(up, right).normalize(),
    p = [],
    idx = [],
    v = new T.Vector3()
  for (let y = 0; y <= segments; y++)
    for (let x = 0; x <= segments; x++) {
      v.copy(up)
        .addScaledVector(right, (x / segments - 0.5) * 0.48)
        .addScaledVector(north, (y / segments - 0.5) * 0.48)
        .normalize()
      p.push(v.x, v.y, v.z)
      if (x < segments && y < segments) {
        const a = y * (segments + 1) + x,
          b = a + 1,
          c = a + segments + 1,
          d = c + 1
        idx.push(a, b, c, b, d, c)
      }
    }
  const g = new T.BufferGeometry()
  g.setAttribute("position", new T.Float32BufferAttribute(p, 3))
  g.setIndex(idx)
  return bakeTerrain(g)
}
// The sea-facing strip follows the height-field zero contour, including islands.
// Compute it in the terrain worker so map-scale outlines do not block dragging.
export function coastlinePositions(terrain) {
  const p = terrain.attributes.position,
    index = terrain.index,
    heights = new Float32Array(p.count),
    vertices = [],
    corners = [new T.Vector3(), new T.Vector3(), new T.Vector3()],
    sea = new T.Vector3(), land = new T.Vector3(),
    shoreA = new T.Vector3(), shoreB = new T.Vector3(),
    outward = new T.Vector3(), offsetA = new T.Vector3(), offsetB = new T.Vector3()
  for (let i = 0; i < p.count; i++)
    heights[i] = Math.hypot(p.getX(i), p.getY(i), p.getZ(i)) - 1
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)]
    for (let k = 0; k < 3; k++) corners[k].fromBufferAttribute(p, ids[k]).normalize()
    sea.set(0, 0, 0)
    land.set(0, 0, 0)
    let crossings = 0
    for (let j = 0; j < 3; j++) {
      const id = ids[j], other = ids[(j + 1) % 3]
      if (heights[id] < 0) sea.add(corners[j])
      else land.add(corners[j])
      const h1 = heights[id], h2 = heights[other]
      if ((h1 < 0) === (h2 < 0)) continue
      const target = crossings++ ? shoreB : shoreA
      target.copy(corners[j]).lerp(corners[(j + 1) % 3], h1 / (h1 - h2)).normalize()
    }
    if (crossings !== 2 || !sea.lengthSq() || !land.lengthSq()) continue
    outward.copy(sea.normalize().sub(land.normalize()))
    outward.addScaledVector(shoreA, -outward.dot(shoreA)).normalize().multiplyScalar(0.006)
    offsetA.copy(shoreA).add(outward).normalize().multiplyScalar(1.003)
    offsetB.copy(shoreB).add(outward).normalize().multiplyScalar(1.003)
    shoreA.multiplyScalar(1.003)
    shoreB.multiplyScalar(1.003)
    vertices.push(...shoreA, ...shoreB, ...offsetA, ...shoreB, ...offsetB, ...offsetA)
  }
  return new Float32Array(vertices)
}
function bakeTerrain(g) {
  const p = g.attributes.position,
    colors = new Float32Array(p.count * 3),
    normals = new Float32Array(p.count * 3),
    biomes = new Float32Array(p.count * 2),
    color = new T.Color(),
    duneColor = new T.Color(),
    forestColor = new T.Color(),
    rock = new T.Color()
  const v = new T.Vector3(),
    t = new T.Vector3(),
    b = new T.Vector3(),
    n = new T.Vector3(),
    u = new T.Vector3(),
    w = new T.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize()
    const s = sample(v.x, v.y, v.z)
    // Analytic finite-difference normals are shared at each LOD, including icosahedron edges.
    t.set(-v.z, 0, v.x)
    if (t.lengthSq() < 0.001) t.set(1, 0, 0)
    t.normalize()
    b.crossVectors(v, t).normalize()
    const e = 0.001
    u.copy(v).addScaledVector(t, e).normalize()
    const sh = sample(u.x, u.y, u.z).h
    u.multiplyScalar(1 + sh).addScaledVector(v, -(1 + s.h))
    w.copy(v).addScaledVector(b, e).normalize()
    const th = sample(w.x, w.y, w.z).h
    w.multiplyScalar(1 + th).addScaledVector(v, -(1 + s.h))
    n.crossVectors(u, w).normalize()
    if (n.dot(v) < 0) n.negate()
    const slope = 1 - clamp(n.dot(v))
    color.copy(palette.sand).lerp(palette.grass, smooth(0.008, 0.035, s.h))
    duneColor.copy(palette.dune).lerp(
      palette.redSand,
      smooth(0.24, 0.7, 0.5 + 0.5 * noise(v.x * 18, v.y * 18, v.z * 18)) * 0.46,
    )
    color.lerp(duneColor, s.desert * 0.96)
    forestColor.copy(palette.forestEdge).lerp(palette.forest, smooth(0.3, 0.8, s.forest))
    color.lerp(forestColor, smooth(0.08, 0.75, s.forest) * 0.94)
    const strata =
      0.5 + 0.5 * Math.sin(s.h * 170 + noise(v.x * 12, v.y * 12, v.z * 12))
    rock.copy(palette.rock).lerp(palette.strata, smooth(0.3, 0.7, strata) * 0.45)
    // Rock faces and high plateaus read as broad faceted forms; wooded slopes stay green.
    const rockAmount = Math.max(
      smooth(0.11, 0.36, slope) * 0.85,
      s.mountains * smooth(0.065, 0.115, s.h) * 0.7,
      s.plateau * smooth(0.085, 0.12, s.h) * 0.45,
    )
    color.lerp(rock, rockAmount * (1 - s.forest * 0.68) * (1 - s.desert * 0.35))
    color.lerp(palette.wet, (1 - smooth(1.5, 4, s.river)) * 0.55)
    const snow =
      smooth(0.135, 0.165, s.h + noise(v.x * 16, v.y * 16, v.z * 16) * 0.003) *
      (1 - smooth(0.5, 0.85, slope))
    color.lerp(palette.snow, snow)
    color.lerp(palette.ice, s.polar)
    color.lerp(palette.snow, s.polar * smooth(0.041, 0.058, s.h))
    const iceScar = smooth(0.22, 0.47, Math.abs(noise(v.x * 48, v.y * 48, v.z * 48)))
    color.lerp(palette.iceCrack, s.polar * iceScar * 0.23)
    if (s.h < 0) color.copy(palette.deep)
    // Fine color grain aliases at globe scale; retain detail in the near shader.
    color.multiplyScalar(0.99 + 0.015 * noise(v.x * 32, v.y * 32, v.z * 32))
    p.setXYZ(i, v.x * (1 + s.h), v.y * (1 + s.h), v.z * (1 + s.h))
    color.toArray(colors, i * 3)
    n.toArray(normals, i * 3)
    biomes[i * 2] = s.desert
    biomes[i * 2 + 1] = s.polar
  }
  g.setAttribute("color", new T.BufferAttribute(colors, 3))
  g.setAttribute("normal", new T.BufferAttribute(normals, 3))
  g.setAttribute("terrainBiome", new T.BufferAttribute(biomes, 2))
  g.computeBoundingSphere()
  return g
}
export function surfaceMaterial() {
  // Diffuse cartographic ink has no view-dependent specular lobe.
  const m = new T.MeshLambertMaterial({
    vertexColors: true,
  })
  m.userData.detail = { value: 0 }
  m.userData.relief = { value: 1 }
  m.userData.patch = {
    center: { value: new T.Vector3(0, 1, 0) },
    cos: { value: Math.cos(0.215) },
    mode: { value: 0 },
  }
  m.onBeforeCompile = (shader) => {
    shader.uniforms.detailAmount = m.userData.detail
    shader.uniforms.reliefAmount = m.userData.relief
    shader.uniforms.patchCenter = m.userData.patch.center
    shader.uniforms.patchCos = m.userData.patch.cos
    shader.uniforms.patchMode = m.userData.patch.mode
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute vec2 terrainBiome;\nvarying vec2 vTerrainBiome;\nvarying vec3 vTerrainPosition;\nvarying vec3 vTerrainViewPosition;\nuniform float reliefAmount;",
      )
      .replace(
        "#include <beginnormal_vertex>",
        "#include <beginnormal_vertex>\nobjectNormal=normalize(mix(normalize(position),objectNormal,reliefAmount));",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed=normalize(position)*mix(1.,length(position),reliefAmount);\nvTerrainPosition=transformed;\nvTerrainBiome=terrainBiome;",
      )
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvTerrainViewPosition=mvPosition.xyz;",
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
 varying vec3 vTerrainPosition;
 varying vec3 vTerrainViewPosition;
 varying vec2 vTerrainBiome;
 uniform float detailAmount;
 uniform vec3 patchCenter;uniform float patchCos;uniform float patchMode;
 float rockGrain(vec3 p){return sin(p.x*163.+sin(p.z*57.))*sin(p.y*151.+sin(p.x*61.));}
 `,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
 float insidePatch=dot(normalize(vTerrainPosition),patchCenter);
 if(patchMode>.5&&patchMode<1.5&&insidePatch>patchCos)discard;
 if(patchMode>1.5&&insidePatch<=patchCos)discard;
 `,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
 // Screen-space filtering avoids shimmer while the planet is zoomed out.
 float textureFootprint=length(fwidth(vTerrainPosition))*163.;
 float grainFilter=1.-smoothstep(.65,1.6,textureFootprint);
 float duneRipple=sin(vTerrainPosition.x*139.+vTerrainPosition.z*84.+sin(vTerrainPosition.y*33.)*2.5);
 float iceCrevasse=pow(1.-abs(sin(vTerrainPosition.x*104.+vTerrainPosition.y*39.-vTerrainPosition.z*71.)),10.);
 float fineGrain=(rockGrain(vTerrainPosition)*(1.-vTerrainBiome.y*.4)
   +duneRipple*vTerrainBiome.x*.42-iceCrevasse*vTerrainBiome.y*.72)*grainFilter;
 float roughHeight=fineGrain*detailAmount*(.00009+vTerrainBiome.x*.00012+vTerrainBiome.y*.00018);
 vec3 dp1=dFdx(vTerrainViewPosition),dp2=dFdy(vTerrainViewPosition);
 vec3 r1=cross(dp2,normal),r2=cross(normal,dp1);
 float det=dot(dp1,r1);
 normal=normalize(abs(det)*normal-sign(det)*(dFdx(roughHeight)*r1+dFdy(roughHeight)*r2));
 `,
      )
      .replace(
        "#include <opaque_fragment>",
        `float terrainLum=dot(outgoingLight,vec3(.2126,.7152,.0722));
 float terrainBand=floor(terrainLum*4.+.5)/4.;
 outgoingLight*=mix(1.,terrainBand/max(terrainLum,.001),.22);
 float broadGrain=sin(vTerrainPosition.x*47.+vTerrainPosition.z*29.)*sin(vTerrainPosition.y*53.-vTerrainPosition.z*19.);
 outgoingLight*=1.+detailAmount*(fineGrain*.037+broadGrain*.018)*(1.+vTerrainBiome.x*.6+vTerrainBiome.y*.9);
 #include <opaque_fragment>`,
      )
  }
  return m
}
