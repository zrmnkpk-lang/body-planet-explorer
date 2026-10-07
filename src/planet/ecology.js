import * as T from "three"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"
import {
  direction,
  sample,
  seeded,
  smooth,
  RIVERS,
  LAKES,
  basinPoint,
  waterHeight,
  sampleLatLon,
  FJORDS,
  fjordCenter,
  fjordWidth,
} from "./field.js"
import { channelGeometry, lakeGeometry, channelMaterial } from "./hydrology-mesh.js"
import { installReveal, revealMesh } from "./view-levels.js"
export const point = (lat, lon, r = 1) =>
  new T.Vector3(...direction(lat, lon)).multiplyScalar(r)
function oceanMaterial() {
  const material = new T.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.48,
    metalness: 0,
    emissive: 0x12394c,
    emissiveIntensity: 0.12,
  })
  material.userData.time = { value: 0 }
  material.userData.current = { value: 0 }
  material.userData.detail = { value: 0 }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.oceanTime = material.userData.time
    shader.uniforms.currentAmount = material.userData.current
    shader.uniforms.waterDetail = material.userData.detail
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vOceanPosition; varying vec3 vWaterView;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvOceanPosition=position;",
      ).replace("#include <project_vertex>", "#include <project_vertex>\nvWaterView=mvPosition.xyz;")
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vOceanPosition; varying vec3 vWaterView;
uniform float oceanTime;uniform float currentAmount;uniform float waterDetail;
float seaHeight(vec3 p){
  float filter=1.-smoothstep(.5,1.4,length(fwidth(p))*340.);
  return (sin(dot(p,vec3(193.,71.,137.))-oceanTime*1.5)
    +.55*sin(dot(p,vec3(-127.,213.,89.))+oceanTime*1.1)
    +.25*sin(dot(p,vec3(319.,-157.,211.))-oceanTime*2.))*filter;
}`,
      )
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
float waveHeight=seaHeight(vOceanPosition)*waterDetail*.00065;
vec3 waterDx=dFdx(vWaterView),waterDy=dFdy(vWaterView);
vec3 waterR1=cross(waterDy,normal),waterR2=cross(normal,waterDx);
float waterDet=dot(waterDx,waterR1);
normal=normalize(abs(waterDet)*normal-sign(waterDet)*(dFdx(waveHeight)*waterR1+dFdy(waveHeight)*waterR2));
`)
      .replace(
        "#include <opaque_fragment>",
        `float oceanCurrent=sin(vOceanPosition.y*32.+oceanTime*.32+sin(vOceanPosition.x*23.)*1.3);
float crossingCurrent=sin(vOceanPosition.z*25.-oceanTime*.24+vOceanPosition.y*9.);
float currentLight=max(0.,oceanCurrent*crossingCurrent)*currentAmount;
// Keep broad water highlights subordinate to the shelf/depth colors.
outgoingLight-=reflectedLight.directSpecular*(.7-.5*waterDetail);
float waveCrest=smoothstep(1.05,1.65,seaHeight(vOceanPosition));
outgoingLight+=vec3(.035,.065,.07)*waveCrest*waterDetail;
outgoingLight+=vec3(.04,.12,.15)*currentLight;
#include <opaque_fragment>`,
      )
  }
  material.customProgramCacheKey = () => "ocean-ripples-v2"
  return material
}
export function addWater(root) {
  const oceanGeometry = new T.SphereGeometry(1, 160, 96),
    oceanColors = [],
    oceanPoint = new T.Vector3()
  const deep = new T.Color("#155b82"),
    mid = new T.Color("#238da2"), shelf = new T.Color("#7dd7c9")
  for (let i = 0; i < oceanGeometry.attributes.position.count; i++) {
    oceanPoint.fromBufferAttribute(oceanGeometry.attributes.position, i)
    const s = sample(oceanPoint.x, oceanPoint.y, oceanPoint.z)
    const c = deep.clone().lerp(mid, smooth(-0.027, -0.009, s.h) * 0.85)
      .lerp(shelf, smooth(-0.01, 0.003, s.h) * 0.9)
    oceanColors.push(c.r, c.g, c.b)
  }
  oceanGeometry.setAttribute(
    "color",
    new T.Float32BufferAttribute(oceanColors, 3),
  )
  const ocean = new T.Mesh(oceanGeometry, oceanMaterial())
  root.add(ocean)
  const mat = new T.MeshLambertMaterial({ color: 0x68c8c3, side: T.DoubleSide })
  const primaryWater = [], tributaries = [], clock = { value: 0 }
  for (let k = 0; k < RIVERS.length; k++) {
    const r = RIVERS[k], m = installReveal(new T.Mesh(channelGeometry(k), channelMaterial(clock)))
    m.userData.riverIndex = k
    m.userData.channelOrder = r.order
    m.userData.channelWidth = r.width
    // All basin trunks appear together; finer tributaries follow at ecology zoom.
    ;(r.order === 0 ? primaryWater : tributaries).push(m)
    root.add(m)
  }
  for (const b of LAKES) {
    const material = new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide,
      roughness: 0.4, metalness: 0 })
    const m = installReveal(new T.Mesh(lakeGeometry(b), material))
    m.userData.lakeId = b.id
    ;(b.kind === "marsh" ? tributaries : primaryWater).push(m)
    root.add(m)
  }
  // Drowned glacial valleys share the carved terrain paths and ocean level.
  const fjordMeshes = []
  for (let f = 0; f < FJORDS.length; f++) {
    const path = FJORDS[f], vertices = [], indices = [], onIce = [], steps = 240
    for (let i = 0; i <= steps; i++) {
      const lat = T.MathUtils.lerp(path[0][0], path.at(-1)[0], i / steps)
      const lon = fjordCenter(f, lat)
      const width = fjordWidth(f, lat) * 0.15
      // Only tint the drowned valley within the ice coast. The sea supplies
      // the continuous water surface outside it, avoiding offshore cyan stripes.
      onIce.push(sample(...direction(lat, lon), false).polar > 0.15)
      for (const side of [-1, 1]) {
        const edgeLon = lon + side * width / Math.max(0.25, Math.cos(lat * Math.PI / 180))
        vertices.push(...point(lat, edgeLon, 1.00015).toArray())
      }
      if (i && onIce[i - 1] && onIce[i]) {
        const n = (i - 1) * 2
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2)
      }
    }
    const geometry = new T.BufferGeometry()
    geometry.setAttribute("position", new T.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    const fjordMaterial = mat.clone()
    fjordMaterial.color.set(0x3c9eaf)
    const fjord = installReveal(new T.Mesh(geometry, fjordMaterial))
    root.add(fjord)
    fjordMeshes.push(fjord)
  }
  // Short tapered flow marks follow the river's longitudinal direction.
  const marks = []
  for (let lat = -38; lat < 61; lat += 4) {
    const points = []
    for (let j = 0; j < 6; j++) {
      const a = lat + j * 0.16
      points.push(point(a, RIVERS[0].lon(a), 1 + waterHeight(a) + 0.0006))
    }
    if (points.some(p => sample(...p.clone().normalize().toArray(), false).h <= 0)) continue
    const line = new T.Line(
      new T.BufferGeometry().setFromPoints(points),
      new T.LineBasicMaterial({
        color: 0xb6ddd2,
        transparent: true,
        opacity: 0.4,
      }),
    )
    root.add(line)
    marks.push(line)
  }
  return {
    ocean,
    marks,
    riverMeshes: [...primaryWater, ...tributaries],
    fjordMeshes,
    update(weights, now, reduced) {
      clock.value = reduced ? 0 : now * 0.001
      ocean.material.userData.time.value = clock.value
      ocean.material.userData.current.value = 0.035 + weights.weather * 0.085
      ocean.material.userData.detail.value = weights.grain
      for (const m of primaryWater) revealMesh(m, weights.rivers)
      for (const m of tributaries) revealMesh(m, weights.tributaries)
      for (const m of fjordMeshes) revealMesh(m, weights.rivers)
      for (let i = 0; i < marks.length; i++) {
        marks[i].visible = weights.flow > 0.01
        marks[i].material.opacity =
          weights.flow *
          (reduced ? 0.38 : 0.3 + 0.16 * Math.sin(now * 0.0016 + i * 0.9))
      }
    },
  }
}
function treeGeometry(type) {
  // Two leafy silhouettes complement two conifers; placement remains the
  // existing moisture/slope mask. Biome-specific species routing remains a pending implementation requirement.
  if (type >= 2) {
    const parts = [new T.CylinderGeometry(0.035,0.07,0.65,5).translate(0,0.325,0).toNonIndexed()]
    for (let i=0;i<4;i++) {
      const crown = new T.IcosahedronGeometry(1,1)
      crown.scale(type === 2 ? 0.3 : 0.23,0.27,0.26)
      crown.translate(Math.sin(i*2.4)*0.13,0.62+i*0.075,Math.cos(i*2.4)*0.12)
      parts.push(crown)
    }
    const merged=mergeGeometries(parts)
    parts.forEach(part=>part.dispose())
    return merged
  }
  const p = [],
    idx = []
  const sides = 5 + (type % 3),
    levels = 12
  for (let j = 0; j < levels; j++) {
    const y = j / (levels - 1)
    const radius =
      (1 - y) *
      (0.3 + (j % 3 === 0 ? 0.11 : 0)) *
      (1 + 0.12 * Math.sin(j + type))
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 + type * 0.25
      p.push(Math.cos(a) * radius, y, Math.sin(a) * radius)
    }
    if (j)
      for (let i = 0; i < sides; i++) {
        const a = (j - 1) * sides + i,
          b = (j - 1) * sides + ((i + 1) % sides),
          c = j * sides + i,
          d = j * sides + ((i + 1) % sides)
        idx.push(a, c, b, b, c, d)
      }
  }
  const g = new T.BufferGeometry()
  g.setAttribute("position", new T.Float32BufferAttribute(p, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
export function addEcology(root) {
  const rand = seeded(3741),
    treeGroups = [[], [], [], []],
    shrubs = [],
    rocks = [],
    ice = [],
    reeds = []
  // Concave coasts leave more ocean: keep sampling until the vegetation budget
  // is filled, with a bounded initialization cost and unchanged biome filters.
  for (let i = 0; i < 125000; i++) {
    if (shrubs.length >= 4400 && treeGroups.every(group => group.length > 0) &&
        treeGroups.reduce((n, group) => n + group.length, 0) >= 2400) break
    const y = rand() * 2 - 1,
      a = rand() * Math.PI * 2,
      d = Math.sqrt(1 - y * y),
      v = new T.Vector3(Math.sin(a) * d, y, Math.cos(a) * d),
      s = sample(v.x, v.y, v.z)
    if (s.h < 0.005 || s.river < 2 || s.lake < 1.3) continue
    if (s.polar > 0.65) {
      if (ice.length < 300 && rand() < 0.14)
        ice.push({ v, s, scale: 0.004 + rand() * 0.011 })
      continue
    }
    if (s.h > 0.16) continue
    const nearby = v
      .clone()
      .add(new T.Vector3(0.001, 0, 0.001))
      .normalize()
    const slope =
      Math.abs(sample(nearby.x, nearby.y, nearby.z).h - s.h) / 0.0014
    // Use the same woodland mask as the terrain colors, with thinner cover
    // along steep ridges and upper plateau edges.
    const density =
      (1 - smooth(0.26, 0.85, slope)) *
      smooth(0.12, 0.7, s.forest) *
      (1 - smooth(0.09, 0.145, s.h))
    const shrubDensity =
      (1 - smooth(0.3, 0.9, slope)) *
      (1 - smooth(0.11, 0.16, s.h)) *
      Math.max(density * 1.35, smooth(0.38, 0.75, s.moisture) * 0.35)
    if (
      rand() < density &&
      treeGroups.reduce((n, a) => n + a.length, 0) < 2400
    ) {
      treeGroups[Math.floor(rand() * 4)].push({
        v,
        s,
        scale: 0.01 + rand() * 0.016,
      })
    } else if (rand() < shrubDensity && shrubs.length < 5600)
      shrubs.push({ v, s, scale: 0.002 + rand() * 0.004 })
    else if (rand() < 0.05 && rocks.length < 750)
      rocks.push({ v, s, scale: 0.003 + rand() * 0.007 })
  }
  // Irregular, broken reed colonies follow the actual lake shelf, never a
  // regular ring or a world-space grid. Marshes receive denser vegetation.
  for (const b of LAKES) for (let i = 0; i < (b.kind === "marsh" ? 200 : 90); i++) {
    const angle = rand() * Math.PI * 2
    if (Math.sin(angle * 4 + b.phase) + rand() < 0.15) continue
    const [lat, lon] = basinPoint(b, angle, 1.02 + rand() * 0.65)
    const v = new T.Vector3(...direction(lat, lon)), s = sampleLatLon(lat, lon)
    if (s.h <= b.level || s.river < 1.7 || s.polar > 0.4) continue
    reeds.push({ v, s, scale: 0.0018 + rand() * 0.0028 })
  }
  const o = new T.Object3D(),
    up = new T.Vector3(0, 1, 0),
    color = new T.Color()
  let count = 0
  function instances(geo, items, base, roughness = 1, castShadow = false) {
    const mat = new T.MeshStandardMaterial({ color: base, roughness })
    const m = new T.InstancedMesh(geo, mat, items.length)
    items.forEach(({ v, s, scale }, i) => {
      o.position.copy(v).multiplyScalar(1 + s.h)
      o.quaternion.setFromUnitVectors(up, v)
      o.rotateY(rand() * Math.PI * 2)
      o.scale.set(scale * (0.8 + rand() * 0.4), scale, scale)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      color.setHSL(
        0.37 + rand() * 0.12,
        0.08 + rand() * 0.16,
        0.8 + rand() * 0.16,
      )
      m.setColorAt(i, color)
    })
    m.instanceMatrix.needsUpdate = true
    m.castShadow = castShadow
    m.receiveShadow = true
    m.computeBoundingSphere()
    root.add(installReveal(m))
    count += items.length
    return m
  }
  const trees = treeGroups.map((arr, i) =>
    instances(
      treeGeometry(i),
      arr,
      [0x426f41, 0x305947, 0x82924c, 0x587f43][i],
      1,
      true,
    ),
  )
  const shrubMesh = instances(
    new T.IcosahedronGeometry(1, 0).scale(1, 0.65, 1),
    shrubs,
    0x81935f,
  )
  const reedMesh = instances(
    new T.ConeGeometry(0.17, 1.6, 3).translate(0, 0.8, 0), reeds, 0x789853,
  )
  const rockMesh = instances(
    new T.DodecahedronGeometry(1, 0).scale(1, 1.35, 0.7),
    rocks,
    0x938575,
  )
  const iceMesh = instances(
    new T.DodecahedronGeometry(1, 0).scale(1.25, 0.32, 0.7).translate(0, 0.03, 0),
    ice,
    0xc8e5e8,
    0.65,
  )
  return {
    trees,
    count,
    update(weights) {
      let shadowChanged = false
      for (const m of trees)
        shadowChanged = revealMesh(m, weights.trees) || shadowChanged
      for (const [m, w] of [
        [shrubMesh, weights.shrubs],
        [reedMesh, weights.shrubs],
        [rockMesh, weights.rocks],
        [iceMesh, weights.ice],
      ])
        shadowChanged = revealMesh(m, w) || shadowChanged
      return shadowChanged
    },
    treeCount: treeGroups.reduce((n, a) => n + a.length, 0),
    shrubCount: shrubs.length,
    reedCount: reeds.length,
  }
}
