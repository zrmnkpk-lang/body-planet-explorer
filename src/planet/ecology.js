import * as T from "three"
import {
  direction,
  sample,
  seeded,
  smooth,
  RIVERS,
  waterHeight,
  sampleLatLon,
} from "./field.js"
import { installReveal, revealMesh } from "./view-levels.js"
export const point = (lat, lon, r = 1) =>
  new T.Vector3(...direction(lat, lon)).multiplyScalar(r)
function oceanMaterial() {
  const material = new T.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.64,
    metalness: 0.07,
  })
  material.userData.time = { value: 0 }
  material.userData.current = { value: 0 }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.oceanTime = material.userData.time
    shader.uniforms.currentAmount = material.userData.current
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vOceanPosition;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvOceanPosition=position;",
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vOceanPosition;\nuniform float oceanTime;uniform float currentAmount;",
      )
      .replace(
        "#include <opaque_fragment>",
        `float oceanCurrent=sin(vOceanPosition.y*42.+oceanTime*.42+sin(vOceanPosition.x*31.)*1.7);
float crossingCurrent=sin(vOceanPosition.z*36.-oceanTime*.29+vOceanPosition.y*12.);
float currentLight=max(0.,oceanCurrent*crossingCurrent)*currentAmount;
outgoingLight+=vec3(.08,.32,.34)*currentLight;
#include <opaque_fragment>`,
      )
  }
  return material
}
export function addWater(root) {
  const oceanGeometry = new T.SphereGeometry(1, 160, 96),
    oceanColors = [],
    oceanPoint = new T.Vector3()
  const deep = new T.Color("#172b58"),
    shelf = new T.Color("#408eac")
  for (let i = 0; i < oceanGeometry.attributes.position.count; i++) {
    oceanPoint.fromBufferAttribute(oceanGeometry.attributes.position, i)
    const s = sample(oceanPoint.x, oceanPoint.y, oceanPoint.z)
    const c = deep.clone().lerp(shelf, smooth(-0.017, 0.005, s.h) * 0.85)
    oceanColors.push(c.r, c.g, c.b)
  }
  oceanGeometry.setAttribute(
    "color",
    new T.Float32BufferAttribute(oceanColors, 3),
  )
  const ocean = new T.Mesh(oceanGeometry, oceanMaterial())
  root.add(ocean)
  const mat = new T.MeshStandardMaterial({
    color: 0x43d2c1,
    roughness: 0.3,
    metalness: 0.08,
    side: T.DoubleSide,
  })
  const primaryWater = [],
    tributaries = []
  for (let k = 0; k < RIVERS.length; k++) {
    const r = RIVERS[k],
      verts = [],
      idx = []
    const steps = 640
    for (let i = 0; i <= steps; i++) {
      const lat = T.MathUtils.lerp(r.north, r.south, i / steps),
        lon = r.lon(lat)
      for (const side of [-1, 1]) {
        const ll =
          lon +
          (side * r.width * 0.68) /
            Math.max(0.35, Math.cos((lat * Math.PI) / 180))
        verts.push(
          ...point(lat, ll, 1 + waterHeight(lat, k) - 0.0001).toArray(),
        )
      }
      if (i < steps) {
        const n = i * 2
        idx.push(n, n + 1, n + 2, n + 1, n + 3, n + 2)
      }
    }
    const g = new T.BufferGeometry()
    g.setAttribute("position", new T.Float32BufferAttribute(verts, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    const m = new T.Mesh(g, k === 0 ? mat : mat.clone())
    if (k > 0) tributaries.push(installReveal(m))
    else primaryWater.push(installReveal(m))
    root.add(m)
  }
  const verts = [],
    idx = []
  const lat = 2,
    lon = RIVERS[0].lon(2)
  verts.push(...point(lat, lon, 1 + waterHeight(2)).toArray())
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2,
      k = 1 + 0.14 * Math.sin(a * 3) + 0.08 * Math.sin(a * 5 + 0.7)
    verts.push(
      ...point(
        lat + Math.cos(a) * 2.18 * k,
        lon + Math.sin(a) * 3 * k,
        1 + waterHeight(2),
      ).toArray(),
    )
    if (i) idx.push(0, i, i + 1)
  }
  const g = new T.BufferGeometry()
  g.setAttribute("position", new T.Float32BufferAttribute(verts, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  const lake = installReveal(new T.Mesh(g, mat))
  primaryWater.push(lake)
  root.add(lake)
  // Short tapered flow marks follow the river's longitudinal direction.
  const marks = []
  for (let lat = -38; lat < 61; lat += 4) {
    const points = []
    for (let j = 0; j < 6; j++) {
      const a = lat + j * 0.16
      points.push(point(a, RIVERS[0].lon(a), 1 + waterHeight(a) + 0.0006))
    }
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
    update(weights, now, reduced) {
      ocean.material.userData.time.value = reduced ? 0 : now * 0.001
      ocean.material.userData.current.value = 0.035 + weights.weather * 0.13
      for (const m of primaryWater) revealMesh(m, weights.rivers)
      for (const m of tributaries) revealMesh(m, weights.tributaries)
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
    ice = []
  for (let i = 0; i < 62000; i++) {
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
    const density =
      (1 - smooth(0.25, 0.8, slope)) *
      smooth(0.42, 0.78, s.moisture) *
      (1 - smooth(0.055, 0.125, s.h)) *
      (1 - smooth(0.16, 0.5, s.mountains))
    if (
      rand() < density &&
      treeGroups.reduce((n, a) => n + a.length, 0) < 2400
    ) {
      treeGroups[Math.floor(rand() * 4)].push({
        v,
        s,
        scale: 0.01 + rand() * 0.016,
      })
    } else if (rand() < density * 0.75 && shrubs.length < 5600)
      shrubs.push({ v, s, scale: 0.002 + rand() * 0.004 })
    else if (rand() < 0.05 && rocks.length < 750)
      rocks.push({ v, s, scale: 0.003 + rand() * 0.007 })
  }
  const o = new T.Object3D(),
    up = new T.Vector3(0, 1, 0),
    color = new T.Color()
  let count = 0
  function instances(geo, items, base, roughness = 1) {
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
        0.08 + rand() * 0.08,
        0.08 + rand() * 0.12,
        0.67 + rand() * 0.25,
      )
      m.setColorAt(i, color)
    })
    m.instanceMatrix.needsUpdate = true
    m.castShadow = true
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
      [0x287c70, 0x206071, 0x569e79, 0x327d84][i],
    ),
  )
  const shrubMesh = instances(
    new T.IcosahedronGeometry(1, 0).scale(1, 0.65, 1),
    shrubs,
    0x64ae86,
  )
  const rockMesh = instances(
    new T.DodecahedronGeometry(1, 0).scale(1, 1.35, 0.7),
    rocks,
    0xc18072,
  )
  const iceMesh = instances(
    new T.CylinderGeometry(0.75, 1, 1, 5).translate(0, 0.3, 0),
    ice,
    0x9bc9e7,
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
        [rockMesh, weights.rocks],
        [iceMesh, weights.ice],
      ])
        shadowChanged = revealMesh(m, w) || shadowChanged
      return shadowChanged
    },
    treeCount: treeGroups.reduce((n, a) => n + a.length, 0),
    shrubCount: shrubs.length,
  }
}
