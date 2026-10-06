// Original procedural landmark meshes, art pass 2026-10-06.
// Broad layered basalt and fractured ice shelves replace stretched round rocks.
// Each asset is one merged mesh with vertex colors and no external textures.
import * as T from "three"
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js"
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js"
import { writeFile } from "node:fs/promises"
import { seeded } from "../src/planet/field.js"

globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(a => { this.result = a; this.onloadend?.() })
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(a => {
      this.result = "data:application/octet-stream;base64," + Buffer.from(a).toString("base64")
      this.onloadend?.()
    })
  }
}

// Layered polygon rings form closed watertight solids, with outward normals.
function layeredRock({ sides, height, width, depth, layers, color, seed }) {
  const random = seeded(seed), vertices = [], indices = []
  const outline = Array.from({ length: sides }, (_, i) => {
    const angle = i / sides * Math.PI * 2
    const radius = 0.88 + random() * 0.22
    return [Math.cos(angle) * radius, Math.sin(angle) * radius]
  })
  for (const [level, radius] of layers) {
    for (const [x, z] of outline) {
      vertices.push(x * width * radius + level * height * 0.06,
        level * height, z * depth * radius)
    }
  }
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3()
  function triangle(i, j, k) {
    a.fromArray(vertices, i * 3); b.fromArray(vertices, j * 3); c.fromArray(vertices, k * 3)
    const normal = b.clone().sub(a).cross(c.clone().sub(a))
    const outward = a.clone().add(b).add(c).multiplyScalar(1 / 3)
      .sub(new T.Vector3(height * 0.03, height / 2, 0))
    indices.push(i, ...(normal.dot(outward) < 0 ? [k, j] : [j, k]))
  }
  for (let level = 0; level < layers.length - 1; level++) {
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides
      const a = level * sides + i, b = level * sides + j
      triangle(a, b, b + sides); triangle(a, b + sides, a + sides)
    }
  }
  for (const ring of [0, layers.length - 1]) {
    const center = vertices.length / 3
    vertices.push(ring ? height * 0.06 : 0, ring ? height : 0, 0)
    for (let i = 0; i < sides; i++)
      triangle(center, ring * sides + i, ring * sides + (i + 1) % sides)
  }
  const indexed = new T.BufferGeometry()
  indexed.setAttribute("position", new T.Float32BufferAttribute(vertices, 3))
  indexed.setIndex(indices)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.computeVertexNormals()
  const colors = [], shade = new T.Color(color), point = geometry.attributes.position
  for (let i = 0; i < point.count; i++) {
    const level = point.getY(i) / height
    const c = shade.clone().multiplyScalar(0.78 + level * 0.18 + 0.07 * Math.sin(level * 34))
    colors.push(c.r, c.g, c.b)
  }
  geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3))
  return geometry
}

for (const kind of ["basalt", "glacier"]) {
  const geometries = [], ice = kind === "glacier", count = ice ? 11 : 9
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / (ice ? 4 : 5)), column = i % (ice ? 4 : 5)
    const height = ice
      ? 0.48 + row * 0.22 + (Math.sin(i * 2.3) + 1) * 0.18
      : 0.78 + (1 - Math.abs(column - 2) / 3) * 1.04 + Math.sin(i * 2.7) * 0.14
    const geometry = layeredRock({
      sides: ice ? 5 : 6, height,
      width: ice ? 0.49 : 0.34, depth: ice ? 0.64 : 0.47,
      layers: ice ? [[0, 1.08], [0.18, 1.03], [0.75, 0.95], [1, 0.87]]
        : [[0, 0.9], [0.12, 1.03], [0.4, 1], [0.43, 0.89], [0.7, 0.96], [0.74, 0.84], [1, 0.73]],
      color: ice ? [0xcbdcdd, 0xb2cbd1, 0xe0e8df][i % 3]
        : [0x777970, 0x8b8878, 0x696e69][i % 3],
      seed: 724 + i * 31,
    })
    geometry.rotateY(Math.sin(i * 1.4) * (ice ? 0.12 : 0.24))
    // Narrow gaps remain between broad ice slabs, reading as deep crevasses.
    geometry.translate((column - (ice ? 1.5 : 2)) * (ice ? 0.92 : 0.54),
      -0.05, (row - 0.7) * (ice ? 1.06 : 0.72) + Math.sin(i * 2) * 0.12)
    geometries.push(geometry)
  }
  const geometry = mergeGeometries(geometries)
  geometries.forEach(g => g.dispose())
  geometry.computeBoundingBox(); geometry.computeBoundingSphere()
  const material = new T.MeshStandardMaterial({
    vertexColors: true, roughness: ice ? 0.78 : 0.96, metalness: 0,
  })
  const model = new T.Mesh(geometry, material)
  model.name = ice ? "Fractured glacier shelf v2" : "Layered basalt ridge v2"
  model.userData = { version: 2, source: "scripts/generate-landmarks.mjs", concept: "04-planet-exploration-scale-v1" }
  const data = await new GLTFExporter().parseAsync(model, { binary: true })
  await writeFile(new URL("../public/assets/landmarks/" + kind + ".glb", import.meta.url), Buffer.from(data))
  console.log(JSON.stringify({kind, bytes: data.byteLength, triangles: geometry.attributes.position.count / 3,
    meshes: 1, bounds: { min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray() }}))
}
