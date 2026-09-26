// Authored geographic silhouettes, projected into local spherical charts.
// Concave bays and long peninsulas survive every mesh LOD. Rasterized signed
// distances keep terrain/normal sampling independent of polygon edge count.
const RAD = Math.PI / 180
const SIZE = 192
const direction = (lat, lon) => [Math.sin(lon * RAD) * Math.cos(lat * RAD), Math.sin(lat * RAD), Math.cos(lon * RAD) * Math.cos(lat * RAD)]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

// [longitude, latitude]; custom geography informed by real peninsula, gulf,
// isthmus and island-arc proportions, with existing region anchors retained.
const outlines = [
  { center: [10, 0], points: [
    [-66,37],[-58,46],[-43,48],[-36,55],[-23,52],[-16,60],[-6,65],
    [9,62],[20,55],[28,57],[35,51],[29,43],[19,40],[26,34],[43,32],
    [51,23],[45,19],[30,24],[24,17],[35,12],[44,8],[49,-1],
    [43,-9],[47,-17],[54,-22],[52,-29],[44,-30],[41,-40],[33,-49],
    [25,-55],[20,-47],[19,-35],[12,-29],[7,-18],[9,-9],[2,-4],
    [-8,-9],[-18,-7],[-20,-16],[-29,-23],[-34,-17],[-33,-5],
    [-46,0],[-53,9],[-60,13],[-64,24],[-54,28],[-48,35],[-55,39],
  ] },
  { center: [31, -148], points: [
    [-181,43],[-169,52],[-155,56],[-145,53],[-140,46],[-127,44],
    [-116,35],[-112,24],[-121,19],[-126,26],[-136,29],[-133,18],
    [-125,10],[-129,1],[-140,5],[-147,15],[-158,17],[-167,25],
    [-176,27],[-178,34],[-168,39],
  ] },
  { center: [-9, 157], points: [
    [125,13],[137,19],[146,16],[154,22],[163,18],[166,9],[180,5],
    [188,-4],[185,-15],[179,-18],[180,-29],[172,-36],[164,-43],
    [158,-40],[156,-30],[147,-25],[142,-18],[132,-20],[126,-12],
    [128,-3],[139,1],[142,8],[134,10],
  ] },
]

function signedDistance(x, y, points) {
  let inside = false, distance2 = Infinity
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[j], [bx, by] = points[i]
    const dx = bx - ax, dy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
    distance2 = Math.min(distance2, (x - ax - dx * t) ** 2 + (y - ay - dy * t) ** 2)
    if ((ay > y) !== (by > y) && x < ax + (y - ay) * dx / dy) inside = !inside
  }
  return Math.sqrt(distance2) * (inside ? 1 : -1)
}
function chart({ center: [lat, lon], points }) {
  const center = direction(lat, lon)
  const east = [Math.cos(lon * RAD), 0, -Math.sin(lon * RAD)]
  const north = [-Math.sin(lat * RAD) * Math.sin(lon * RAD), Math.cos(lat * RAD), -Math.sin(lat * RAD) * Math.cos(lon * RAD)]
  const polygon = points.map(([lon, lat]) => {
    const p = direction(lat, lon), scale = 1 / (dot(p, center) * RAD)
    return [dot(p, east) * scale, dot(p, north) * scale]
  })
  const minX = Math.min(...polygon.map(p => p[0])) - 12
  const minY = Math.min(...polygon.map(p => p[1])) - 12
  const dx = (Math.max(...polygon.map(p => p[0])) + 12 - minX) / (SIZE - 1)
  const dy = (Math.max(...polygon.map(p => p[1])) + 12 - minY) / (SIZE - 1)
  const data = new Float32Array(SIZE * SIZE)
  for (let j = 0; j < SIZE; j++) for (let i = 0; i < SIZE; i++)
    data[j * SIZE + i] = signedDistance(minX + i * dx, minY + j * dy, polygon) / 28
  return { center, east, north, minX, minY, dx, dy, data }
}
const charts = outlines.map(chart)
const islands = [
  [-62,-8,11,5,0.5], [8,83,10,5,-0.7], [-7,96,7,3,0.8],
  [18,111,8,4,0.5], [-24,122,8,3,-0.6], [34,75,7,3,-0.5],
  [-31,-92,9,4,0.7], [12,-104,7,3,-0.5],
  [3,88,3,1.6,-0.7],[-14,104,3.5,1.8,0.6],[25,116,3,1.8,0.5],
].map(([lat,lon,length,width,rotation]) => ({
  center: direction(lat,lon), east: [Math.cos(lon*RAD),0,-Math.sin(lon*RAD)],
  north: [-Math.sin(lat*RAD)*Math.sin(lon*RAD),Math.cos(lat*RAD),-Math.sin(lat*RAD)*Math.cos(lon*RAD)],
  length,width,cos:Math.cos(rotation),sin:Math.sin(rotation),
}))
export function continentalShape(x, y, z) {
  let mainland = -1, continental = -1
  for (const c of charts) {
    const facing = x*c.center[0]+y*c.center[1]+z*c.center[2]
    if (facing < 0.25) continue
    const u = ((x*c.east[0]+y*c.east[1]+z*c.east[2]) / (facing*RAD) - c.minX) / c.dx
    const v = ((x*c.north[0]+y*c.north[1]+z*c.north[2]) / (facing*RAD) - c.minY) / c.dy
    if (u < 0 || v < 0 || u >= SIZE-1 || v >= SIZE-1) continue
    const i = Math.floor(u), j = Math.floor(v), a = u-i, b = v-j, k = j*SIZE+i
    const value = (c.data[k]*(1-a)+c.data[k+1]*a)*(1-b)+(c.data[k+SIZE]*(1-a)+c.data[k+SIZE+1]*a)*b
    mainland = Math.max(mainland, value)
  }
  continental = mainland
  for (const c of islands) {
    const facing = x*c.center[0]+y*c.center[1]+z*c.center[2]
    if (facing < 0.94) continue
    const u = (x*c.east[0]+y*c.east[1]+z*c.east[2]) / (facing*RAD)
    const v = (x*c.north[0]+y*c.north[1]+z*c.north[2]) / (facing*RAD)
    const along = (u*c.cos+v*c.sin)/c.length
    const across = (-u*c.sin+v*c.cos)/c.width + 0.26*Math.sin(along*3)
    continental = Math.max(continental, (1-Math.hypot(along,across))*0.55)
  }
  return { continental, mainland }
}
