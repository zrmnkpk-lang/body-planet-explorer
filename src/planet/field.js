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
const centers = [
  [17, -27, 37, 1.1],
  [-20, 28, 39, 1.12],
  [49, 2, 22, 0.72],
  [21, 6, 27, 0.9],
  [0, 10, 32, 0.8],
  [-9, 157, 32, 1.12],
  [31, -148, 29, 1.1],
  [-62, -8, 10, 0.92],
].map(([lat, lon, r, w]) => ({
  d: direction(lat, lon),
  r: (r * Math.PI) / 180,
  w,
}))
export const RIVERS = [
  {
    north: 64,
    south: -43,
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
export function riverInfo(lat, lon) {
  let distance = 100,
    index = 0
  for (let i = 0; i < RIVERS.length; i++) {
    const r = RIVERS[i]
    if (lat > r.north || lat < r.south) continue
    const d =
      (Math.abs(lon - r.lon(lat)) * Math.cos((lat * Math.PI) / 180)) / r.width
    if (d < distance) {
      distance = d
      index = i
    }
  }
  return { distance, index }
}
export function waterHeight(lat, index = 0) {
  if (index === 0) return 0.006 + smooth(-43, 64, lat) * 0.074
  const r = RIVERS[index],
    end = waterHeight(r.south)
  return end + ((lat - r.south) / (r.north - r.south)) * 0.025
}
export function sample(x, y, z) {
  const [lat, lon] = coordinates(x, y, z)
  const warp = fbm(x * 3 + 9, y * 3, z * 3, 3)
  let continental = -1
  for (const c of centers) {
    const angle = Math.acos(clamp(x * c.d[0] + y * c.d[1] + z * c.d[2], -1, 1))
    continental = Math.max(continental, (1 - angle / c.r) * c.w)
  }
  continental +=
    0.14 * fbm(x * 7 + warp, y * 7 - warp, z * 7 + warp, 4) +
    0.035 * noise(x * 28, y * 28, z * 28)
  const polar = smooth(56, 73, lat + 0.9 * noise(x * 22, y * 22, z * 22))
  const land = smooth(-0.015, 0.15, continental)
  const w = fbm(x * 8 + 16, y * 8 + 4, z * 8, 3)
  const ridge =
    1 - Math.abs(fbm(x * 26 + w * 2, y * 26 + w * 2, z * 26, 4) * 1.65)
  const belt = Math.exp(
    -((deltaLon(lon, -30 + lat * 0.1 - 4 * Math.sin(lat * 0.1)) / 13) ** 2) -
      ((lat - 23) / 35) ** 2,
  )
  const backBelt = Math.exp(
    -((deltaLon(lon, -146) / 13) ** 2) - ((lat - 32) / 27) ** 2,
  )
  const mountains = Math.max(belt, backBelt) * land
  let h =
    -0.018 +
    land * (0.028 + Math.max(0, continental) * 0.045) +
    mountains * (0.028 + Math.pow(clamp(ridge), 3) * 0.145) +
    land * 0.0028 * fbm(x * 75, y * 75, z * 75, 3)
  h = Math.max(h, -0.018 + polar * (0.06 + 0.018 * ridge))
  const river = riverInfo(lat, lon),
    water = waterHeight(lat, river.index)
  if (river.distance < 7) {
    const valley = 1 - smooth(1, 7, river.distance)
    h = mix(h, water + 0.014, valley)
    h = mix(h, water - 0.004, 1 - smooth(0.7, 1.6, river.distance))
  }
  const lakeAngle = Math.atan2((lon - RIVERS[0].lon(2)) / 3.3, (lat - 2) / 2.4)
  const lake =
    Math.hypot((lat - 2) / 2.4, (lon - RIVERS[0].lon(2)) / 3.3) /
    (1 + 0.14 * Math.sin(lakeAngle * 3) + 0.08 * Math.sin(lakeAngle * 5 + 0.7))
  if (lake < 1.4)
    h = mix(h, waterHeight(2) - 0.004, 1 - smooth(0.82, 1.4, lake))
  const moisture = clamp(
    0.5 +
      0.6 * fbm(x * 5 - 20, y * 5, z * 5, 4) +
      0.23 * smooth(-0.09, 0.42, x) -
      0.33 * mountains +
      0.24 * (1 - smooth(2, 8, river.distance)),
  )
  return {
    h,
    lat,
    lon,
    land,
    polar,
    mountains,
    moisture,
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
  if (s.polar > 0.4 || s.lat > 62) return "bone"
  if (s.river < 1.7 || s.lake < 1 || s.h < 0.002) return "water"
  return s.mountains > 0.22 || s.moisture < 0.42 ? "muscle" : "fat"
}
export function seeded(seed = 941) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}
