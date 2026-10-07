import * as T from "three"
import { RIVERS, direction, sample, riverWidth, waterHeight, basinPoint, smooth } from "./field.js"

// Daylight palette: blue river cores, jade shallows and warmer reed pools.
const deep = new T.Color("#268eaa"), shallow = new T.Color("#88d6c3")
const estuary = new T.Color("#50b8bc"), marsh = new T.Color("#739e78")
const lerp = T.MathUtils.lerp
const naturalHeight = v => sample(...direction(v.lat, v.lon), false).h
function interpolate(a, b, t) {
  return Object.fromEntries(Object.keys(a).map(k => [k, lerp(a[k], b[k], t)]))
}
function geometry(vertices, indices) {
  const positions = [], normals = [], colors = [], uv = []
  for (const v of vertices) {
    const n = direction(v.lat, v.lon)
    positions.push(...n.map(c => c * (1 + v.level + 0.00018)))
    normals.push(...n)
    const c = deep.clone().lerp(shallow, smooth(0.25, 1, Math.abs(v.side)) * 0.85)
    c.lerp(estuary, v.mouth || 0).lerp(marsh, v.marsh || 0)
    colors.push(c.r, c.g, c.b)
    uv.push(v.side, v.flow || 0)
  }
  const g = new T.BufferGeometry()
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3))
  g.setAttribute("normal", new T.Float32BufferAttribute(normals, 3))
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3))
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2))
  g.setIndex(indices)
  return g
}
export function channelGeometry(k) {
  const r = RIVERS[k], vertices = [], indices = []
  const steps = Math.max(80, Math.ceil((r.north - r.south) / 0.06)), columns = 5
  for (let i = 0; i <= steps; i++) {
    const lat = lerp(r.north, r.south, i / steps), lon = r.lon(lat)
    const cosine = Math.max(0.15, Math.cos(lat * Math.PI / 180))
    const a = Math.min(r.north, lat + 0.008), b = Math.max(r.south, lat - 0.008)
    const dx = (r.lon(a) - r.lon(b)) * cosine, dy = a - b, length = Math.hypot(dx, dy)
    for (let j = 0; j < columns; j++) {
      const side = j / (columns - 1) * 2 - 1
      const width = riverWidth(lat, k) * 0.64
      const v = { lat: lat - side * width * dx / length,
        lon: lon + side * width * dy / length / cosine,
        level: waterHeight(lat, k), side, flow: (r.north - lat) * 1.3,
        mouth: r.delta ? smooth(0.55, 1, i / steps) * 0.9 : 0 }
      v.height = naturalHeight(v)
      vertices.push(v)
    }
  }
  function triangle(ids) {
    const input = ids.map(i => ({ ...vertices[i], id: i })), polygon = []
    // Clip against the analytic coast. Keep intersection vertices on the land
    // side to avoid turquoise tails protruding into the open ocean.
    for (let i = 0; i < 3; i++) {
      const a = input[i], b = input[(i + 1) % 3]
      if (a.height > 0.0000005) polygon.push(a.id)
      if ((a.height > 0.0000005) === (b.height > 0.0000005)) continue
      let land = a.height > 0.0000005 ? a : b, sea = a.height > 0.0000005 ? b : a
      for (let j = 0; j < 22; j++) {
        const mid = interpolate(land, sea, 0.5)
        if (naturalHeight(mid) > 0.0000005) land = mid
        else sea = mid
      }
      // At the mouth the shallow tint meets the ocean at sea level.
      land.level = Math.min(land.level, 0.0002)
      polygon.push(vertices.length)
      vertices.push(land)
    }
    for (let i = 1; i < polygon.length - 1; i++) indices.push(polygon[0], polygon[i], polygon[i + 1])
  }
  for (let i = 0; i < steps; i++) for (let j = 0; j < columns - 1; j++) {
    const a = i * columns + j, b = a + 1, c = a + columns, d = c + 1
    triangle([a, b, c]); triangle([b, d, c])
  }
  return geometry(vertices, indices)
}
export function lakeGeometry(basin) {
  const vertices = [], indices = [], rings = 16, segments = 128
  for (let ring = 0; ring <= rings; ring++) for (let i = 0; i <= segments; i++) {
    const fraction = ring / rings
    const [lat, lon] = basinPoint(basin, i / segments * Math.PI * 2, fraction * 0.98)
    vertices.push({ lat, lon, level: basin.level, side: fraction,
      marsh: basin.kind === "marsh" ? 0.65 : 0 })
    if (ring && i) {
      const d = ring * (segments + 1) + i, c = d - 1, b = d - segments - 1, a = b - 1
      indices.push(a, b, c, b, d, c)
    }
  }
  return geometry(vertices, indices)
}
export function channelMaterial(clock) {
  const m = new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide,
    roughness: 0.4, metalness: 0 })
  m.onBeforeCompile = shader => {
    shader.uniforms.channelTime = clock
    shader.vertexShader = shader.vertexShader.replace("#include <common>",
      "#include <common>\nvarying vec2 vChannelUv; varying vec3 vChannelView;").replace("#include <begin_vertex>",
      "#include <begin_vertex>\nvChannelUv=uv;").replace("#include <project_vertex>",
      "#include <project_vertex>\nvChannelView=mvPosition.xyz;")
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>",
      `#include <common>
varying vec2 vChannelUv; varying vec3 vChannelView; uniform float channelTime;
float channelWave(vec2 p){return sin(p.y*8.-channelTime*2.4+sin(p.x*5.)*.8)
  +.35*sin(p.y*19.-channelTime*4.1+p.x*9.);}`).replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
float channelBump=channelWave(vChannelUv)*.000045;
vec3 cdx=dFdx(vChannelView),cdy=dFdy(vChannelView);
vec3 cr1=cross(cdy,normal),cr2=cross(normal,cdx);
float cdet=dot(cdx,cr1);
normal=normalize(abs(cdet)*normal-sign(cdet)*(dFdx(channelBump)*cr1+dFdy(channelBump)*cr2));
`).replace("#include <opaque_fragment>", `
float flowPhase=vChannelUv.y*8.-channelTime*2.4+sin(vChannelUv.y*2.3)*.4;
float ripple=pow(max(0.,sin(flowPhase)),12.)*(1.-smoothstep(.15,.82,abs(vChannelUv.x)));
outgoingLight+=vec3(.12,.19,.18)*ripple;
#include <opaque_fragment>`)
  }
  m.customProgramCacheKey = () => "river-flow-v2"
  return m
}
