import * as T from "three"
import { point } from "./ecology.js"
import { sample, seeded } from "./field.js"

const cloudMaterial = (color, opacity) =>
  new T.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  })

export function addClimate(root) {
  const rand = seeded(8217),
    up = new T.Vector3(0, 1, 0),
    helper = new T.Object3D(),
    cloudGeometry = new T.SphereGeometry(1, 8, 5),
    cloudItems = [],
    rainItems = []

  for (let attempt = 0; attempt < 600 && cloudItems.length < 78; attempt++) {
    const y = rand() * 1.72 - 0.86,
      longitude = rand() * Math.PI * 2,
      radius = Math.sqrt(1 - y * y),
      v = new T.Vector3(
        Math.sin(longitude) * radius,
        y,
        Math.cos(longitude) * radius,
      ),
      s = sample(v.x, v.y, v.z)
    if (s.h > 0 && s.moisture < 0.48 && rand() > 0.18) continue
    cloudItems.push({ v, scale: 0.026 + rand() * 0.032 })
    if (s.moisture > 0.64 && s.h < 0.04 && rainItems.length < 18)
      rainItems.push({ v: v.clone(), scale: 0.03 + rand() * 0.025, s })
  }

  function cloudMesh(items, material, altitude) {
    const mesh = new T.InstancedMesh(cloudGeometry, material, items.length)
    items.forEach(({ v, scale }, i) => {
      helper.position.copy(v).multiplyScalar(altitude)
      helper.quaternion.setFromUnitVectors(up, v)
      helper.rotateY(rand() * Math.PI * 2)
      helper.scale.set(scale * (1.7 + rand()), scale * 0.18, scale)
      helper.updateMatrix()
      mesh.setMatrixAt(i, helper.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    mesh.renderOrder = 3
    return mesh
  }

  const clouds = cloudMesh(cloudItems, cloudMaterial(0xd9edf1, 0.32), 1.052),
    weather = new T.Group(),
    rainClouds = cloudMesh(rainItems, cloudMaterial(0x70899c, 0), 1.047)
  weather.add(rainClouds)

  const rainPositions = []
  for (const { v, s } of rainItems) {
    const tangent = new T.Vector3(-v.z, 0, v.x)
    if (tangent.lengthSq() < 0.001) tangent.set(1, 0, 0)
    tangent.normalize()
    const ground = 1 + Math.max(0, s.h) + 0.003
    for (let j = -1; j <= 1; j++) {
      const offset = tangent.clone().multiplyScalar(j * 0.007)
      rainPositions.push(
        ...v
          .clone()
          .multiplyScalar(ground + 0.029)
          .add(offset)
          .toArray(),
        ...v
          .clone()
          .multiplyScalar(ground + 0.005)
          .add(offset)
          .toArray(),
      )
    }
  }
  const rainMaterial = new T.LineBasicMaterial({
      color: 0x79c5cf,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    rain = new T.LineSegments(
      new T.BufferGeometry().setAttribute(
        "position",
        new T.Float32BufferAttribute(rainPositions, 3),
      ),
      rainMaterial,
    )
  rain.renderOrder = 3
  weather.add(rain)

  const airflow = new T.Group(),
    airflowMaterial = new T.LineBasicMaterial({
      color: 0xb9e6e5,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  for (let band = 0; band < 11; band++) {
    const latitude = -56 + band * 11.2 + (rand() - 0.5) * 5,
      start = rand() * 360 - 180,
      span = 26 + rand() * 34,
      points = []
    for (let i = 0; i <= 52; i++) {
      const t = i / 52
      points.push(
        point(
          latitude + Math.sin(t * Math.PI) * (2 + rand() * 0.08),
          start + span * t,
          1.062,
        ),
      )
    }
    airflow.add(
      new T.Line(new T.BufferGeometry().setFromPoints(points), airflowMaterial),
    )
  }

  root.add(clouds, airflow, weather)
  return {
    cloudCount: cloudItems.length,
    update(weights, now, reduced) {
      clouds.material.opacity = 0.13 + weights.clouds * 0.2
      airflow.visible = weights.weather > 0.01
      airflowMaterial.opacity = weights.weather * 0.28
      weather.visible = weights.weather > 0.01
      rainClouds.material.opacity = weights.weather * 0.28
      rainMaterial.opacity =
        weights.weather * (reduced ? 0.22 : 0.17 + 0.08 * Math.sin(now * 0.004))
      if (!reduced) {
        clouds.rotation.y = now * 0.000009
        airflow.rotation.y = -now * 0.000005
        weather.rotation.y = now * 0.000013
      }
    },
  }
}
