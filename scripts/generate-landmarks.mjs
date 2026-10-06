// Original procedural landmark meshes, art pass 2026-10-07.
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
      ? 0.32 + row * 0.18 + (Math.sin(i * 2.3) + 1) * 0.11
      : 0.78 + (1 - Math.abs(column - 2) / 3) * 1.04 + Math.sin(i * 2.7) * 0.14
    const geometry = layeredRock({
      sides: ice ? 4 : 6, height,
      width: ice ? 0.68 : 0.34, depth: ice ? 0.9 : 0.47,
      layers: ice ? [[0, 1.08], [0.18, 1.03], [0.75, 0.95], [1, 0.87]]
        : [[0, 0.9], [0.12, 1.03], [0.4, 1], [0.43, 0.89], [0.7, 0.96], [0.74, 0.84], [1, 0.73]],
      color: ice ? [0xe0eee8, 0xbddce1, 0xf0f4ec][i % 3]
        : [0x858578, 0xa49c82, 0x747b75][i % 3],
      seed: 724 + i * 31,
    })
    geometry.rotateY((ice ? Math.PI / 4 : 0) + Math.sin(i * 1.4) * (ice ? 0.08 : 0.24))
    // Narrow gaps remain between broad ice slabs, reading as deep crevasses.
    geometry.translate((column - (ice ? 1.5 : 2)) * (ice ? 0.92 : 0.54) + row * 0.13,
      -0.08, (row - 0.7) * (ice ? 1.06 : 0.72) + Math.sin(i * 2) * 0.12)
    geometries.push(geometry)
  }
  // A low continuous foot joins the pieces to their slope; angular talus breaks
  // the regular outline without extra runtime meshes or external textures.
  const foot = layeredRock({sides: 8, height: ice ? 0.25 : 0.4,
    width: ice ? 1.95 : 1.7, depth: ice ? 1.9 : 1.15,
    layers: [[0,1.12],[0.45,1],[1,0.72]],
    color: ice ? 0x96c5d1 : 0x999480, seed: 932})
  foot.translate(0,-0.25,ice ? 0.35 : -0.1)
  geometries.push(foot)
  for(let i=0;i<6;i++) {
    const fragment = layeredRock({sides:4,height:0.17+(i%3)*0.08,
      width:0.24,depth:0.35,layers:[[0,1],[1,0.45]],
      color:ice ? 0xd7e9e8 : 0xaaa28a,seed:1481+i})
    fragment.rotateY(i*1.73)
    fragment.translate(Math.cos(i*2.4)*(ice ? 1.8 : 1.5),-0.08,
      Math.sin(i*2.4)*(ice ? 1.8 : 0.95))
    geometries.push(fragment)
  }
  const geometry = mergeGeometries(geometries)
  geometries.forEach(g => g.dispose())
  geometry.computeBoundingBox(); geometry.computeBoundingSphere()
  const material = new T.MeshStandardMaterial({
    vertexColors: true, roughness: ice ? 0.78 : 0.96, metalness: 0,
  })
  const model = new T.Mesh(geometry, material)
  model.name = ice ? "Connected glacier shelf v3" : "Basalt ridge and talus v3"
  model.userData = { version: 3, source: "scripts/generate-landmarks.mjs", concept: "04-planet-exploration-scale-v1" }
  const data = await new GLTFExporter().parseAsync(model, { binary: true })
  await writeFile(new URL("../public/assets/landmarks/" + kind + ".glb", import.meta.url), Buffer.from(data))
  console.log(JSON.stringify({kind, bytes: data.byteLength, triangles: geometry.attributes.position.count / 3,
    meshes: 1, bounds: { min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray() }}))
}
