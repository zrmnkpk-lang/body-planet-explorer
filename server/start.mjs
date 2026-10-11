import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { resolve, extname, sep } from "node:path"
import { coachMiddleware } from "./coach.mjs"
const root = resolve("dist")
const api = coachMiddleware()
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".glb": "model/gltf-binary",
  ".svg": "image/svg+xml",
}
createServer((req, res) =>
  api(req, res, async () => {
    try {
      const name = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      )
      let file = resolve(root, `.${name === "/" ? "/index.html" : name}`)
      if (!file.startsWith(`${root}${sep}`)) {
        res.statusCode = 403
        return res.end()
      }
      if ((await stat(file)).isDirectory()) file = resolve(file, "index.html")
      const data = await readFile(file)
      res.setHeader(
        "Content-Type",
        types[extname(file)] ?? "application/octet-stream",
      )
      res.end(data)
    } catch {
      res.statusCode = 404
      res.end("Not found")
    }
  }),
).listen(
  Number(process.env.PORT || 8445),
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(`Portal Fitness: http://localhost:${process.env.PORT || 8445}`),
)
