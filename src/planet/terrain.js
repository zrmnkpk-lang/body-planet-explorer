import * as T from "three"
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js"
import { sample, noise, smooth, clamp } from "./field.js"
const palette = {
  sand: new T.Color("#ab916a"),
  forest: new T.Color("#507762"),
  grass: new T.Color("#87936b"),
  rock: new T.Color("#986346"),
  strata: new T.Color("#bd8a60"),
  snow: new T.Color("#e0e8e0"),
  ice: new T.Color("#abcbd4"),
  wet: new T.Color("#3b6861"),
  deep: new T.Color("#192c43"),
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
function bakeTerrain(g) {
  const p = g.attributes.position,
    colors = new Float32Array(p.count * 3),
    normals = new Float32Array(p.count * 3),
    color = new T.Color()
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
    color.copy(palette.sand).lerp(palette.grass, smooth(0.008, 0.025, s.h))
    color.lerp(palette.forest, smooth(0.4, 0.8, s.moisture) * 0.8)
    const strata =
      0.5 + 0.5 * Math.sin(s.h * 660 + noise(v.x * 38, v.y * 38, v.z * 38) * 2)
    const rock = palette.rock.clone().lerp(palette.strata, strata * 0.55)
    color.lerp(rock, Math.max(smooth(0.08, 0.38, slope), s.mountains * 0.77))
    color.lerp(palette.wet, (1 - smooth(1.5, 4, s.river)) * 0.55)
    const snow =
      smooth(0.115, 0.15, s.h + noise(v.x * 36, v.y * 36, v.z * 36) * 0.011) *
      (1 - smooth(0.5, 0.85, slope))
    color.lerp(palette.snow, snow)
    color.lerp(palette.ice, s.polar)
    color.lerp(palette.snow, s.polar * smooth(0.041, 0.058, s.h))
    if (s.h < 0) color.copy(palette.deep)
    color.multiplyScalar(0.91 + 0.12 * noise(v.x * 120, v.y * 120, v.z * 120))
    p.setXYZ(i, v.x * (1 + s.h), v.y * (1 + s.h), v.z * (1 + s.h))
    color.toArray(colors, i * 3)
    n.toArray(normals, i * 3)
  }
  g.setAttribute("color", new T.BufferAttribute(colors, 3))
  g.setAttribute("normal", new T.BufferAttribute(normals, 3))
  g.computeBoundingSphere()
  return g
}
export function surfaceMaterial() {
  const m = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0,
  })
  m.userData.patch = {
    center: { value: new T.Vector3(0, 1, 0) },
    cos: { value: Math.cos(0.215) },
    mode: { value: 0 },
  }
  m.onBeforeCompile = (shader) => {
    shader.uniforms.patchCenter = m.userData.patch.center
    shader.uniforms.patchCos = m.userData.patch.cos
    shader.uniforms.patchMode = m.userData.patch.mode
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vTerrainPosition;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvTerrainPosition = position;",
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
 varying vec3 vTerrainPosition;
 uniform vec3 patchCenter;uniform float patchCos;uniform float patchMode;
 float rockGrain(vec3 p){return sin(p.x*483.+sin(p.z*173.))*sin(p.y*367.+sin(p.x*233.));}
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
        "#include <opaque_fragment>",
        `float terrainLum=dot(outgoingLight,vec3(.2126,.7152,.0722));
 float terrainBand=floor(terrainLum*6.+.5)/6.;
 outgoingLight*=mix(1.,terrainBand/max(terrainLum,.001),.28);
 #include <opaque_fragment>`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
 float grain=rockGrain(vTerrainPosition);
 vec3 dp1=dFdx(vViewPosition),dp2=dFdy(vViewPosition);
 vec3 r1=cross(dp2,normal),r2=cross(normal,dp1);
 float det=dot(dp1,r1);
 normal=normalize(abs(det)*normal - sign(det)*(dFdx(grain)*r1+dFdy(grain)*r2)*0.00016);
 `,
      )
  }
  return m
}
