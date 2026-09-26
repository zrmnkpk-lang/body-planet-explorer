// Original procedural geometry; no third-party model licensing dependency.
import * as T from "three"
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js"
import { writeFile } from "node:fs/promises"
import { noise } from "../src/planet/field.js"
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((a) => {
      this.result = a
      this.onloadend?.()
    })
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((a) => {
      this.result =
        "data:application/octet-stream;base64," +
        Buffer.from(a).toString("base64")
      this.onloadend?.()
    })
  }
}
for (const kind of ["basalt", "glacier"]) {
  const root = new T.Group()
  root.name =
    kind === "basalt" ? "Stratified basalt outcrop" : "Fractured glacier tongue"
  const count = kind === "basalt" ? 5 : 7
  for (let i = 0; i < count; i++) {
    const g = new T.IcosahedronGeometry(1, 3),
      p = g.attributes.position,
      colors = []
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j),
        y = p.getY(j),
        z = p.getZ(j),
        f = 1 + 0.16 * noise(x * 3 + i, y * 3, z * 3)
      p.setXYZ(
        j,
        x * f * 0.43,
        y * f * (kind === "basalt" ? 1.7 : 1.2),
        z * f * 0.6,
      )
      const c = new T.Color(kind === "basalt" ? "#966748" : "#bddbe2")
      c.multiplyScalar(0.83 + 0.17 * Math.sin(y * 28 + noise(x * 8, y, z * 8)))
      colors.push(c.r, c.g, c.b)
    }
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3))
    g.computeVertexNormals()
    const m = new T.Mesh(
      g,
      new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: kind === "basalt" ? 0.92 : 0.42,
      }),
    )
    m.position.set(
      (i - (count - 1) / 2) * 0.48,
      0.3 + Math.sin(i * 2) * 0.3,
      Math.cos(i * 2) * 0.4,
    )
    m.rotation.set(0.08 * Math.sin(i), i * 0.4, 0.18 * Math.cos(i))
    root.add(m)
  }
  const data = await new GLTFExporter().parseAsync(root, { binary: true })
  await writeFile(
    new URL(`../public/assets/landmarks/${kind}.glb`, import.meta.url),
    Buffer.from(data),
  )
  console.log(kind, data.byteLength)
}
