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
export const RIVERS = [
  {
    north: 64,
    south: -50,
    width: 0.55,
    lon: (lat) =>
      12 - lat * 0.29 + 4.3 * Math.sin(lat * 0.12) + 1.4 * Math.sin(lat * 0.31),
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
          const amplitude = Math.min(delta ? 0.16 : order ? 0.48 : 0.85, span * 0.2)
          const bends = Math.sin(Math.PI * t) ** 2 *
            Math.sin(t * Math.PI * (2.4 + span * 0.21) + phase)
          return curve + amplitude * bends
        }
      }
      return points[lat > north ? 0 : points.length - 1][1]
    },
  }
}
function deltaBranches(outlet, spread, mouthWater) {
  const [lat, lon] = outlet
  return [-1, 0, 1].map((side) => makeRiver([
    [lat, lon], [lat - 0.7, lon + side * spread * 0.32],
    [lat - 1.5, lon + side * spread * 0.72],
    [lat - 2.4, lon + side * spread],
    [lat - 4, lon + side * spread * 1.05],
    [lat - 6, lon + side * spread * 1.25],
  ], 0.11, 0.0009, true, mouthWater, 1))
}
function tributary(parentIndex, points, width, drop = 0.018, order = 1) {
  const parent = RIVERS[parentIndex]
  points = points.map(p => [...p])
  const join = points.at(-1)
  join[1] = parent.lon(join[0])
  const stream = makeRiver(
    points, width, drop, false, waterHeight(join[0], parentIndex), order)
  stream.parentIndex = parentIndex
  stream.join = join
  return stream
}
const watersheds = [
  {
    trunk: makeRiver([[-16,-143],[-21,-138],[-27,-132],[-32,-132],[-36,-134],[-38,-136]], 0.34, 0.045),
    tributaries: [
      [[-18,-140],[-22,-140],[-27,-132]],
      [[-21,-125],[-24,-128],[-30,-132]],
      [[-27,-136],[-32,-137],[-36,-134]],
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
export function riverInfo(lat, lon) {
  let distance = 100,
    index = 0
  for (let i = 0; i < RIVERS.length; i++) {
    const r = RIVERS[i]
    if (lat > r.north + r.width * 7 || lat < r.south - r.width * 7) continue
    const routeLat = clamp(lat, r.south, r.north)
    const center = r.lon(routeLat), cosLat = Math.max(0.1, Math.cos(lat * Math.PI / 180))
    if (Math.abs(deltaLon(lon, center)) * cosLat > r.width * 16) continue
    const slope = deltaLon(r.lon(Math.min(r.north, routeLat + 0.025)),
      r.lon(Math.max(r.south, routeLat - 0.025))) * cosLat /
      Math.max(0.001, Math.min(r.north, routeLat + 0.025) - Math.max(r.south, routeLat - 0.025))
    const lateral = Math.abs(deltaLon(lon, center)) * cosLat
    const distanceToPath = lat === routeLat ? lateral / Math.sqrt(1 + slope * slope) :
      Math.hypot(lateral, lat - routeLat)
    const d = distanceToPath /
      (r.width *
        (r.delta ? 0.85 + 0.55 * (r.north - lat) / (r.north - r.south) : 1))
    if (d < distance) {
      distance = d
      index = i
    }
  }
  return { distance, index }
}
export function waterHeight(lat, index = 0) {
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
  const water = waterHeight(lat, river.index)
  if (river.distance < 7) {
    const valley = 1 - smooth(1, 7, river.distance)
    // Never raise a coast or sea bed to the elevation of an inland river.
    h = mix(h, Math.min(h, water + 0.014), valley)
    h = mix(h, Math.min(h - 0.003, water - 0.004), 1 - smooth(0.7, 1.6, river.distance))
  }
  const lakeAngle = Math.atan2((lon - RIVERS[0].lon(2)) / 3.3, (lat - 2) / 2.4)
  const lake =
    Math.hypot((lat - 2) / 2.4, (lon - RIVERS[0].lon(2)) / 3.3) /
    (1 + 0.14 * Math.sin(lakeAngle * 3) + 0.08 * Math.sin(lakeAngle * 5 + 0.7))
  if (lake < 1.4)
    h = mix(h, waterHeight(2) - 0.004, 1 - smooth(0.82, 1.4, lake))
  const moisture = clamp(
    0.63 +
      0.48 * fbm(x * 5 - 20, y * 5, z * 5, 4) +
      0.13 * fbm(x * 12 + 3, y * 12, z * 12, 2) -
      0.12 * mountains -
      0.41 * desert +
      0.16 * (1 - smooth(2, 8, river.distance)),
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
