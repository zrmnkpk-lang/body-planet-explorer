import { continentalShape } from "./continents.js"

// All sampling takes place in 3D, so neither poles nor longitude seams exist.
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
export const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const deltaLon = (a, b) => ((a - b + 540) % 360) - 180
const mix = (a, b, t) => a + (b - a) * t
const hash = (x, y, z) => {
  let h =
    Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
export function noise(x, y, z) {
  const a = Math.floor(x),
    b = Math.floor(y),
    c = Math.floor(z),
    u = smooth(0, 1, x - a),
    v = smooth(0, 1, y - b),
    w = smooth(0, 1, z - c)
  return (
    mix(
      mix(
        mix(hash(a, b, c), hash(a + 1, b, c), u),
        mix(hash(a, b + 1, c), hash(a + 1, b + 1, c), u),
        v,
      ),
      mix(
        mix(hash(a, b, c + 1), hash(a + 1, b, c + 1), u),
        mix(hash(a, b + 1, c + 1), hash(a + 1, b + 1, c + 1), u),
        v,
      ),
      w,
    ) *
      2 -
    1
  )
}
export function fbm(x, y, z, octaves = 4) {
  let s = 0,
    a = 0.55
  for (let i = 0; i < octaves; i++) {
    s += a * noise(x, y, z)
    x = x * 2.07 + 17.3
    y = y * 2.07 - 4.1
    z = z * 2.07 + 8.7
    a *= 0.48
  }
  return s
}
export function direction(lat, lon) {
  const a = (lat * Math.PI) / 180,
    b = (lon * Math.PI) / 180
  return [Math.sin(b) * Math.cos(a), Math.sin(a), Math.cos(b) * Math.cos(a)]
}
export function coordinates(x, y, z) {
  return [
    (Math.asin(clamp(y, -1, 1)) * 180) / Math.PI,
    (Math.atan2(x, z) * 180) / Math.PI,
  ]
}
const aridRegions = [
  { d: direction(31, -148), inner: 11, outer: 27 },
  { d: direction(12, -39), inner: 8, outer: 24 },
].map((region) => ({
  ...region,
  cutoff: Math.cos(((region.outer + 6) * Math.PI) / 180),
}))
const riverProfiles = []
export const RIVERS = [
  {
    north: 64,
    south: -50,
    width: 0.55,
    lon: (lat) =>
      12 - lat * 0.29 + 4.3 * Math.sin(lat * 0.12) + 1.4 * Math.sin(lat * 0.31) +
      (0.85 * Math.sin(lat * 0.57 + 0.8) + 0.25 * Math.sin(lat * 1.05 - 2)) *
      smooth(-40, -32, lat) * (1 - smooth(54, 64, lat)),
  },
  {
    north: 37,
    south: 22,
    width: 0.2,
    lon: (lat) => {
      const t = (37 - lat) / 15
      return -15 * (1 - t) + RIVERS[0].lon(22) * t + Math.sin(t * Math.PI) * 2
    },
  },
  {
    north: 7,
    south: -14,
    width: 0.23,
    lon: (lat) => {
      const t = (7 - lat) / 21
      return 38 * (1 - t) + RIVERS[0].lon(-14) * t + Math.sin(t * Math.PI) * 3
    },
  },
]
function makeRiver(points, width, drop = 0.04, delta = false, mouthWater = 0.001, order = 0) {
  const north = points[0][0], south = points.at(-1)[0]
  return {
    north, south, width, drop, delta, mouthWater, order, path: points,
    lon(lat) {
      for (let i = 0; i < points.length - 1; i++) {
        const [aLat, aLon] = points[i], [bLat, bLon] = points[i + 1]
        if (lat <= aLat && lat >= bLat) {
          const t = (aLat - lat) / (aLat - bLat)
          const span = aLat - bLat, d = deltaLon(bLon, aLon)
          const before = points[Math.max(0, i - 1)]
          const after = points[Math.min(points.length - 1, i + 2)]
          const m0 = deltaLon(bLon, before[1]) / (before[0] - bLat) * span
          const m1 = deltaLon(after[1], aLon) / (aLat - after[0]) * span
          const t2 = t * t, t3 = t2 * t
          const curve = aLon + (-2 * t3 + 3 * t2) * d +
            (t3 - 2 * t2 + t) * m0 + (t3 - t2) * m1
          // Unequal, smoothly joined bends; no repeated zig-zag at control points.
          const phase = aLon * 0.73 + aLat * 0.41
          const amplitude = Math.min(delta ? 0.3 : order ? 1.25 : 1.7, span * 0.33)
          const bends = Math.sin(Math.PI * t) ** 2 *
            (Math.sin(t * Math.PI * (2.1 + span * 0.13) + phase) +
              0.24 * Math.sin(t * Math.PI * 5.3 - phase))
          return curve + amplitude * bends
        }
      }
      return points[lat > north ? 0 : points.length - 1][1]
    },
  }
}
function deltaBranches(outlet, spread, mouthWater) {
  const [lat, lon] = outlet
  return [-0.82, 0.12, 1.08].map((side, i) => makeRiver([
    [lat, lon], [lat - 0.8, lon + side * spread * 0.12],
    [lat - 1.7, lon + side * spread * 0.48],
    [lat - 3.1, lon + side * spread * 0.9 + Math.sin(i * 2.4) * 0.35],
    [lat - 4.8, lon + side * spread * 1.04],
    [lat - 7, lon + side * spread * 1.22],
  ], 0.085 + i * 0.019, 0.0009, true, mouthWater, 1))
}
function tributary(parentIndex, points, width, drop = 0.018, order = 1) {
  const parent = RIVERS[parentIndex]
  points = points.map(p => [...p])
  const join = points.at(-1)
  const bank = Math.sign(points[0][1] - parent.lon(points[0][0])) || 1
  // A feeder stays on one side of its parent until it actually joins. This
  // prevents artificial X crossings when their independently curved paths bend.
  for (const p of points.slice(0, -1))
    p[1] = parent.lon(p[0]) + bank * Math.max(0.18, Math.abs(p[1] - parent.lon(p[0])))
  join[1] = parent.lon(join[0])
  const stream = makeRiver(
    points, width, drop, false, waterHeight(join[0], parentIndex), order)
  const raw = stream.lon.bind(stream)
  const blendLength = Math.min(2.4, (stream.north - stream.south) * 0.28)
  stream.lon = lat => parent.lon(lat) + bank * Math.abs(raw(lat) - parent.lon(lat)) *
    smooth(stream.south, stream.south + blendLength, lat)
  stream.parentIndex = parentIndex
  stream.join = join
  return stream
}
// The two original straight feeders use the same curved confluence model.
RIVERS[1] = tributary(0, [[37,-15],[32,-10],[27,-5],[22,RIVERS[0].lon(22)]], 0.2, 0.025)
RIVERS[2] = tributary(0, [[7,38],[1,33],[-5,27],[-10,24],[-14,RIVERS[0].lon(-14)]], 0.23, 0.025)
const watersheds = [
  {
    trunk: makeRiver([[-16,-143],[-21,-138],[-27,-132],[-32,-132],[-36,-134],[-38,-136]], 0.34, 0.045),
    tributaries: [
      [[-18,-140],[-22,-140],[-27,-132]],
      [[-21,-125],[-24,-128],[-30,-132]],
      [[-27,-135],[-32,-135.5],[-36,-134]],
      [[-30,-130],[-32,-132],[-34,-133]],
    ],
    feeders: [{ parent: 0, points: [[-18,-143],[-20,-142],[-22,-140]] }],
    headwater: [[-17,-140],[-18,-141],[-20,-142]],
    mouth: 3.4,
  },
  {
    trunk: makeRiver([[-36,74],[-39,78],[-42,80],[-46,81],[-49,80],[-51,80]], 0.3, 0.04),
    tributaries: [
      [[-35,74],[-37,76],[-39,78]],
      [[-38,84],[-39,82],[-40,78.667]],
      [[-43,77],[-46,79],[-48,80.333]],
      [[-44,84],[-46,83],[-49,80]],
    ],
    feeders: [{ parent: 0, points: [[-34,78],[-35,77],[-37,76]] }],
    headwater: [[-34,77.5],[-34.5,77],[-35,77]],
    mouth: 2.8,
  },
  {
    trunk: makeRiver([[44,98],[42,100],[40,102],[38,104],[36,105],[34,105],[32,104],[30,104],[29,105]], 0.25, 0.038),
    tributaries: [
      [[43,95],[41,99],[39,103]],
      [[42,107],[40,106],[38,104]],
      [[36,104],[34,104],[32,104]],
      [[34,110],[32,108],[30,104]],
    ],
    feeders: [{ parent: 0, points: [[44,100],[42,100],[41,99]] }],
    headwater: [[44,102],[43,101],[42,100]],
    mouth: 2.6,
  },
  {
    trunk: makeRiver([[49,-159],[43,-154],[37,-150],[31,-145],[25,-141],[21,-143],[19,-142],[18,-141],[16,-142],[14,-140],[12,-134],[10,-131],[7,-130],[4,-130],[3,-130]], 0.32, 0.05),
    tributaries: [
      [[44,-169],[39,-160],[35,-148.3333333333]],
      [[40,-130],[35,-134],[31,-145]],
      [[34,-163],[29,-151],[25,-141]],
      [[22,-151],[18,-145],[16,-142]],
      [[13,-138],[11,-134],[9,-130.667]],
    ],
    feeders: [
      { parent: 0, points: [[44,-169],[40,-160],[37,-154.1666666667]] },
      { parent: 2, points: [[34,-168],[31,-160],[29,-151]] },
    ],
    headwater: [[44,-163],[42,-161],[40,-160]],
    mouth: 3.4,
  },
]
for (const basin of watersheds) {
  basin.trunk.order = 0
  const trunkIndex = RIVERS.length
  RIVERS.push(basin.trunk)
  const firstOrder = basin.tributaries.map((points) =>
    tributary(trunkIndex, points, 0.105, 0.018, 1))
  const firstStart = RIVERS.length
  RIVERS.push(...firstOrder)
  const secondOrder = (basin.feeders || []).map(({ parent, points }) =>
    tributary(firstStart + parent, points, 0.064, 0.011, 2))
  const secondStart = RIVERS.length
  RIVERS.push(...secondOrder)
  RIVERS.push(tributary(secondStart, basin.headwater, 0.043, 0.008, 3))
  const branches = deltaBranches(
    [basin.trunk.south, basin.trunk.lon(basin.trunk.south)], basin.mouth,
    waterHeight(basin.trunk.south, trunkIndex))
  for (const branch of branches) {
    const raw = branch.lon.bind(branch), outletLat = basin.trunk.south
    const outletLon = basin.trunk.lon(outletLat)
    const slope = (basin.trunk.lon(outletLat + 0.03) - outletLon) / 0.03
    branch.lon = lat => mix(outletLon + slope * (lat - outletLat), raw(lat),
      smooth(0, 1.3, outletLat - lat))
    branch.parentIndex = trunkIndex
    branch.join = [basin.trunk.south, basin.trunk.lon(basin.trunk.south)]
  }
  RIVERS.push(...branches)
}
RIVERS[0].order = 0
RIVERS[1].order = RIVERS[2].order = 1
const centralBranches = [
  [[52,-12],[48,-6],[44,RIVERS[0].lon(44)]],
  [[35,-14],[30,-5],[24,RIVERS[0].lon(24)]],
  [[9,34],[3,25],[-2,RIVERS[0].lon(-2)]],
  [[-6,38],[-16,33],[-26,RIVERS[0].lon(-26)]],
].map(points => tributary(0, points, 0.13, 0.02, 1))
const centralStart = RIVERS.length
RIVERS.push(...centralBranches)
RIVERS.push(
  tributary(centralStart, [[54,-10],[51,-8],[48,-6]], 0.075, 0.012, 2),
  tributary(centralStart + 1, [[34,-12],[32,-8],[30,-5]], 0.075, 0.012, 2),
)
// Four deeply incised, tide-filled channels cut inland from the polar coast.
export const FJORDS = [
  [[58,-151],[61,-144],[65,-138],[69,-135],[73,-130],[76,-133],[77.3,-138]],
  [[58,-77],[61,-72],[64,-68],[68,-64],[71,-59]],
  [[56,4],[60,8],[64,12],[68,18],[71,22]],
  [[59,119],[62,125],[66,130],[70,136],[73,143]],
]
const fjordCurves = FJORDS.map(points => makeRiver([...points].reverse(), 0.4))
export function fjordCenter(index, lat) {
  return fjordCurves[index].lon(lat)
}
export function fjordWidth(index, lat, side = 0) {
  const n = noise(lat * 0.43, index * 5.7, 3.1)
  return 0.5 + 0.21 * n + 0.12 * Math.sin(lat * 1.13 + index * 2.7) +
    side * 0.08 * noise(lat * 0.72, index * 3.4, 8)
}
// Dense segments are indexed in 2-degree cells. Geometry and carving query the
// same polyline, including curved junctions; work per terrain vertex stays bounded.
const riverCells = new Map()

const cellKey = (lat, lon) => `${Math.floor((lat + 90) / 2)}:${Math.floor((((lon + 180) % 360 + 360) % 360) / 2)}`
export function riverWidth(lat, index = 0) {
  const r = RIVERS[index], t = clamp((r.north - lat) / (r.north - r.south))
  const phase = index * 1.738
  const variability = 1 + 0.11 * Math.sin(lat * 1.8 + phase) + 0.07 * Math.sin(lat * 4.1 - phase)
  return r.width * variability * (r.delta ? 0.72 + 0.66 * smooth(0.45, 1, t) :
    0.58 + 0.42 * smooth(0, 0.75, t))
}
export function riverInfo(lat, lon) {
  let distance = 100, index = 0, water = 0, wetland = 0
  const cos = Math.max(0.15, Math.cos(lat * Math.PI / 180))
  for (const seg of riverCells.get(cellKey(lat, lon)) || []) {
    const x = deltaLon(lon, seg.a.lon) * cos, y = lat - seg.a.lat
    const dx = deltaLon(seg.b.lon, seg.a.lon) * cos, dy = seg.b.lat - seg.a.lat
    const t = clamp((x * dx + y * dy) / (dx * dx + dy * dy))
    const d = Math.hypot(x - dx * t, y - dy * t) / mix(seg.a.width, seg.b.width, t)
    if (d < distance) {
      distance = d; index = seg.index
      water = mix(seg.a.water, seg.b.water, t)
      wetland = (1 - smooth(1.2, RIVERS[index].delta ? 10 : 5.5, d)) *
        (RIVERS[index].delta ? 0.85 : 0.38)
    }
  }
  return { distance, index, water, wetland }
}
export function waterHeight(lat, index = 0) {
  const profile = riverProfiles[index]
  if (profile) {
    const r = RIVERS[index]
    const f = clamp((r.north - lat) / (r.north - r.south)) * (profile.length - 1)
    const i = Math.min(profile.length - 2, Math.floor(f))
    return mix(profile[i].water, profile[i + 1].water, f - i)
  }
  return plannedWaterHeight(lat, index)
}
function plannedWaterHeight(lat, index = 0) {
  if (index === 0) return 0.006 + smooth(-43, 64, lat) * 0.074
  const r = RIVERS[index]
  lat = clamp(lat, r.south, r.north)
  if (r.path) {
    const progress = clamp((r.north - lat) / (r.north - r.south))
    return r.delta
      ? r.mouthWater - r.drop * progress
      : r.mouthWater + r.drop * (1 - progress)
  }
  const end = waterHeight(r.south)
  return end + ((lat - r.south) / (r.north - r.south)) * 0.025
}
export const LAKES = []
export function basinOutline(basin, a) {
  const phase = basin.phase
  const notch = Math.exp(-Math.pow(Math.atan2(Math.sin(a - phase), Math.cos(a - phase)) / 0.36, 2))
  return 1 + 0.19 * Math.sin(a * 3 + phase) + 0.12 * Math.sin(a * 5 - phase * 1.7) +
    0.045 * Math.sin(a * 9 + phase * 2) - 0.28 * notch
}
export function basinPoint(basin, angle, radius = 1) {
  const r = basinOutline(basin, angle) * radius
  const x = Math.cos(angle) * basin.rx * r, y = Math.sin(angle) * basin.ry * r
  return [basin.lat + x * Math.cos(basin.rotation) - y * Math.sin(basin.rotation),
    basin.lon + (x * Math.sin(basin.rotation) + y * Math.cos(basin.rotation)) /
      Math.cos(basin.lat * Math.PI / 180)]
}
export function basinInfo(lat, lon) {
  let distance = 100, basin = null
  for (const b of LAKES) {
    const y = deltaLon(lon, b.lon) * Math.cos(b.lat * Math.PI / 180), x = lat - b.lat
    if (Math.abs(x) > (b.rx + b.ry) * 2.2 || Math.abs(y) > (b.rx + b.ry) * 2.2) continue
    const u = (x * Math.cos(b.rotation) + y * Math.sin(b.rotation)) / b.rx
    const v = (-x * Math.sin(b.rotation) + y * Math.cos(b.rotation)) / b.ry
    const d = Math.hypot(u, v) / basinOutline(b, Math.atan2(v, u))
    if (d < distance) { distance = d; basin = b }
  }
  return { distance, basin }
}
export function sample(x, y, z, hydrology = true) {
  const [lat, lon] = coordinates(x, y, z)
  const warp = fbm(x * 3 + 9, y * 3, z * 3, 3)
  let { continental, mainland, ice } = continentalShape(x, y, z)
  continental +=
    0.14 * fbm(x * 7 + warp, y * 7 - warp, z * 7 + warp, 4) +
    0.035 * noise(x * 28, y * 28, z * 28)
  const coastalDetail = 0.065 * fbm(x * 19 + warp * 2, y * 19 - 4, z * 19 + warp, 3) +
    0.021 * noise(x * 53 + 8, y * 53, z * 53)
  continental += coastalDetail * (1 - smooth(0.06, 0.24, Math.abs(continental)))
  ice += coastalDetail * (1 - smooth(0.05, 0.22, Math.abs(ice)))
  // Polar shore follows an asymmetric ice landmass, with small coastal inlets.
  const polar = smooth(-0.025, 0.16,
    ice + 0.045 * fbm(x * 23, y * 23, z * 23, 3))
  const land = smooth(-0.015, 0.15, continental)
  let desert = 0
  let dryWarp
  for (const region of aridRegions) {
    const dot = clamp(x * region.d[0] + y * region.d[1] + z * region.d[2], -1, 1)
    if (dot < region.cutoff) continue
    if (dryWarp === undefined)
      dryWarp = 3.2 * fbm(x * 8 + 4, y * 8 - 7, z * 8, 3)
    const angle = Math.acos(dot) * 180 / Math.PI
    desert = Math.max(desert, 1 - smooth(region.inner, region.outer, angle + dryWarp))
  }
  desert *= land * (1 - polar)
  // Long rolling ridges and broad plateau shoulders; avoid high-frequency spires.
  const broad = fbm(x * 5.5 + warp, y * 5.5 - warp, z * 5.5 + warp, 3)
  const ridge = 1 - Math.abs(fbm(x * 9.5 + warp, y * 9.5, z * 9.5 - warp, 3))
  const upland = smooth(-0.16, 0.15, broad)
  const plateau = smooth(0.08, 0.31, fbm(x * 4 - 8, y * 4, z * 4 + 5, 3))
  const belt = Math.exp(
    -((deltaLon(lon, -30 + lat * 0.1 - 4 * Math.sin(lat * 0.1)) / 13) ** 2) -
      ((lat - 23) / 35) ** 2,
  )
  const backBelt = Math.exp(
    -((deltaLon(lon, -146) / 13) ** 2) - ((lat - 32) / 27) ** 2,
  )
  const inland = smooth(0.035, 0.25, mainland)
  const mountains =
    inland * clamp(0.17 + upland * 0.5 + Math.max(belt, backBelt) * 0.36)
  let h =
    -0.018 +
    land * (0.032 + Math.max(0, continental) * 0.038) +
    mountains * (0.016 + smooth(0.34, 0.87, ridge) * 0.039) +
    inland * plateau * 0.014 +
    land * (0.0013 * fbm(x * 37, y * 37, z * 37, 2) +
      0.0011 * fbm(x * 75, y * 75, z * 75, 2))
  if (polar > 0) {
    // Wide ice plateaus and rounded ridges, carved by a meandering glacial trough.
    // Displacement belongs to the shared height field at every zoom level.
    const icePlateau = smooth(-0.22, 0.28, fbm(x * 5 + 7, y * 5 - 3, z * 5, 3))
    const iceRidge = 1 - smooth(0.08, 0.55,
      Math.abs(fbm(x * 14 + warp, y * 14, z * 14 - warp, 3)))
    const iceValley = 1 - smooth(0.012, 0.065,
      Math.abs(x + z * 0.35 + 0.07 * fbm(x * 11, y * 11, z * 11, 3)))
    const relief = 0.028 * icePlateau + 0.025 * iceRidge - 0.022 * iceValley
    h = Math.max(h, -0.018 + polar * (0.056 + relief)) +
      polar * (0.0017 * fbm(x * 64, y * 64, z * 64, 3) +
        0.0009 * noise(x * 112, y * 112, z * 112))
  }
  // Fjords are narrow drowned valleys; their carved beds meet the open ocean.
  let fjordDistance = Infinity
  if (lat >= 56 && lat <= 80) for (let i = 0; i < FJORDS.length; i++) {
    const path = FJORDS[i]
    if (lat < path[0][0] || lat > path.at(-1)[0]) continue
    const dx = deltaLon(lon, fjordCenter(i, lat)) * Math.cos(lat * Math.PI / 180)
    fjordDistance = Math.min(fjordDistance, Math.abs(dx) / fjordWidth(i, lat, Math.sign(dx)))
  }
  if (fjordDistance < 1.8)
    h = mix(h, -0.028, (1 - smooth(0.2, 1.65, fjordDistance)) *
      smooth(-0.018, 0.002, h))
  if (!hydrology) return { h, land, polar }
  const naturalHeight = h
  const river = naturalHeight > 0 ? riverInfo(lat, lon) : { distance: 100, index: 0 }
  const water = river.water || 0
  if (river.distance < 7) {
    const valley = 1 - smooth(1, 7, river.distance)
    // Never raise a coast or sea bed to the elevation of an inland river.
    h = mix(h, Math.min(h, water + 0.014), valley)
    h = mix(h, Math.min(h - 0.003, water - 0.004), 1 - smooth(0.7, 1.6, river.distance))
  }
  const lakeInfo = basinInfo(lat, lon)
  const lake = lakeInfo.distance
  if (lake < 1.8 && naturalHeight > 0) {
    const depth = lakeInfo.basin.kind === "marsh" ? 0.0025 : 0.006
    const bed = lakeInfo.basin.level - depth
    // A single contour drives the basin, shallow shelf and visible water edge.
    const target = lake <= 1
      ? mix(bed, lakeInfo.basin.level, smooth(0.35, 1, lake))
      : lakeInfo.basin.level + 0.006 * smooth(1, 1.8, lake)
    h = mix(h, Math.min(h, target), 1 - smooth(1.08, 1.8, lake))
  }
  const wetland = naturalHeight > 0 ? clamp(Math.max(river.wetland || 0,
    (1 - smooth(1, 2.15, lake)) * (lakeInfo.basin?.kind === "marsh" ? 1 : 0.7)) *
    (0.75 + 0.25 * noise(x * 90 + 5, y * 90, z * 90))) * (1 - polar) : 0
  const moisture = clamp(
    0.63 +
      0.48 * fbm(x * 5 - 20, y * 5, z * 5, 4) +
      0.13 * fbm(x * 12 + 3, y * 12, z * 12, 2) -
      0.12 * mountains -
      0.41 * desert +
      0.16 * (1 - smooth(2, 8, river.distance)) + wetland * 0.24,
  )
  const forest =
    land *
    (1 - polar) *
    smooth(0.43, 0.66, moisture) *
    smooth(0.012, 0.042, h) *
    (1 - smooth(0.075, 0.125, h)) *
    smooth(-0.2, 0.12, fbm(x * 8 + 12, y * 8, z * 8 - 6, 3)) *
    (1 - mountains * 0.38) *
    (1 - desert * 0.96)
  return {
    h,
    lat,
    lon,
    land,
    polar,
    mountains,
    moisture,
    desert,
    forest,
    plateau,
    ridge,
    river: river.distance,
    water,
    lake,
    wetland,
  }
}
export function sampleLatLon(lat, lon) {
  return sample(...direction(lat, lon))
}
export function zoneAt(s) {
  if (s.river < 1.7 || s.lake < 1 || s.h < 0.002) return "water"
  if (s.polar > 0.4) return "bone"
  return s.mountains > 0.22 || s.moisture < 0.42 ? "muscle" : "fat"
}
export function seeded(seed = 941) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

// Compute each estuary once against the uncarved terrain, not its own river bed.
// Bisection pins the outlet to the shoreline; no offshore continuation or re-entry.
for (const r of RIVERS) {
  if (!r.delta) continue
  let previous = r.north
  for (let lat = r.north - 0.04; lat >= r.south; lat -= 0.04) {
    if (sample(...direction(lat, r.lon(lat)), false).h <= 0) {
      let land = previous, sea = lat
      for (let j = 0; j < 18; j++) {
        const mid = (land + sea) / 2
        if (sample(...direction(mid, r.lon(mid)), false).h > 0) land = mid
        else sea = mid
      }
      r.south = land
      r.drop = r.mouthWater
      r.coastalOutlet = true
      break
    }
    previous = lat
  }
}

// Build monotone, terrain-constrained profiles once. Only positive inland
// heights constrain them; offshore pieces are clipped out of the water mesh.
for (let k = 0; k < RIVERS.length; k++) {
  const r = RIVERS[k], steps = Math.ceil((r.north - r.south) / 0.06)
  let previous = Infinity
  const profile = []
  for (let i = 0; i <= steps; i++) {
    const lat = mix(r.north, r.south, i / steps), lon = r.lon(lat)
    const natural = sample(...direction(lat, lon), false).h
    const cap = natural > 0.003 ? natural - 0.002 : Infinity
    const water = r.delta ? plannedWaterHeight(lat, k) :
      Math.max(0.001, Math.min(previous, plannedWaterHeight(lat, k), cap))
    profile.push({ lat, lon, width: riverWidth(lat, k), water })
    previous = water
  }
  riverProfiles.push(profile)
}
// A feeder may constrain its parent's downstream elevation, never create a
// step up at a junction. Descendants are resolved before their parent.
for (let k = RIVERS.length - 1; k >= 0; k--) {
  const r = RIVERS[k]
  if (r.parentIndex === undefined || r.delta) continue
  const end = riverProfiles[k].at(-1).water
  const parent = riverProfiles[r.parentIndex]
  const joinBlend = Math.min(2.4, (r.north - r.south) * 0.28)
  const joinIndex = parent.findIndex(p => p.lat <= r.south + joinBlend)
  for (let i = Math.max(0, joinIndex - 1); i < parent.length; i++)
    parent[i].water = Math.min(parent[i].water, end)
}
// Spread local height constraints upstream to avoid sudden dam-like steps.
for (const p of riverProfiles) for (let i = p.length - 2; i >= 0; i--)
  p[i].water = Math.min(p[i].water, p[i + 1].water + (p[i].lat - p[i + 1].lat) * 0.004)
// Fixed geographic seeds, varied shoreline lobes and rotations. Wetland pools
// are shallower and smaller, with an extended reed/soil transition.
const basinSeeds = [
  ["moon-mirror", 2, RIVERS[0].lon(2), 2.0, 2.7, "lake"],
  ["jade-lake", -20, 19, 1.6, 2.4, "lake"],
  ["amber-lake", 31, -153, 1.4, 2.2, "lake"],
  ["cape-lake", -25, -128, 1.5, 1.9, "lake"],
  ["southwind-lake", -42, 77, 1.1, 1.5, "lake"],
  ["dawn-lake", 39, 109, 1.5, 2.2, "lake"],
  ["west-lake", 19, -29, 1.1, 1.8, "lake"],
  ["reed-marsh", -29, 23, 0.9, 1.8, "marsh"],
  ["cape-marsh", -32, -129, 0.8, 1.4, "marsh"],
  ["dawn-marsh", 34, 108, 0.7, 1.3, "marsh"],
]
for (const [i, seed] of basinSeeds.entries()) {
  const [id, lat, lon, rx, ry, kind] = seed
  const b = { id, lat, lon, rx, ry, kind, rotation: i * 1.37, phase: 0.7 + i * 2.31 }
  // Fit the complete shoreline plus its wetland margin inside the continent.
  let minimum = Infinity
  for (let attempt = 0; attempt < 5; attempt++) {
    minimum = sample(...direction(lat, lon), false).h
    for (let j = 0; j < 96; j++)
      minimum = Math.min(minimum, sample(...direction(...basinPoint(b, j / 96 * Math.PI * 2, 1.5)), false).h)
    if (minimum > 0.007) break
    b.rx *= 0.75; b.ry *= 0.75
  }
  if (minimum <= 0.007) continue
  b.level = Math.max(0.002, minimum - 0.004)
  LAKES.push(b)
}
// Channels crossing a lake share its horizontal water level. Propagate any
// lowering downstream so that the outflow cannot climb above the lake.
for (const b of LAKES) {
  for (let k = 0; k < RIVERS.length; k++) {
    const p = riverProfiles[k]
    const inside = p.filter(v => basinInfo(v.lat, v.lon).basin === b && basinInfo(v.lat, v.lon).distance < 1.08)
    if (!inside.length) continue
    b.level = Math.min(b.level, inside.at(-1).water)
    let previous = Infinity
    for (const v of p) {
      const local = basinInfo(v.lat, v.lon)
      if (local.basin === b && local.distance < 1.4)
        v.water = mix(b.level, Math.max(b.level, v.water), smooth(1.08, 1.4, local.distance))
      v.water = Math.min(previous, v.water)
      previous = v.water
    }
  }
}
// Resolve exact shared endpoint heights after all terrain/lake constraints.
for (let k = 0; k < RIVERS.length; k++) {
  const r = RIVERS[k], p = riverProfiles[k]
  if (r.parentIndex === undefined) continue
  const level = waterHeight(r.join[0], r.parentIndex)
  if (r.delta) {
    for (let i = 0; i < p.length; i++) p[i].water = level * (1 - i / (p.length - 1))
  } else {
    for (const v of p) v.water = Math.max(level, v.water)
    const start = Math.floor((p.length - 1) * 0.7), upstream = p[start].water
    for (let i = start; i < p.length; i++)
      p[i].water = Math.min(p[i].water, mix(upstream, level, smooth(start, p.length - 1, i)))
    p.at(-1).water = level
  }
}
for (let k = 0; k < RIVERS.length; k++) {
  const p = riverProfiles[k]
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], seg = { a, b, index: k }
    const padding = Math.max(a.width, b.width) * 10 + 0.06
    const lonPadding = padding / Math.max(0.15, Math.cos(a.lat * Math.PI / 180))
    const y0 = Math.floor((Math.min(a.lat, b.lat) - padding + 90) / 2)
    const y1 = Math.floor((Math.max(a.lat, b.lat) + padding + 90) / 2)
    const x0 = Math.floor((Math.min(a.lon, b.lon) - lonPadding + 180) / 2)
    const x1 = Math.floor((Math.max(a.lon, b.lon) + lonPadding + 180) / 2)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const key = `${y}:${(x % 180 + 180) % 180}`
      if (!riverCells.has(key)) riverCells.set(key, [])
      riverCells.get(key).push(seg)
    }
  }
}
