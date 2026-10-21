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
      let info = await stat(file)
      if (info.isDirectory()) {
        file = resolve(file, "index.html")
        info = await stat(file)
      }
      // Hashed artwork and Vite bundles can stay cached across app launches.
      // HTML is revalidated so a deployment immediately points at new hashes.
      const versioned = /^\/assets\/.+-[\w-]{8,}\.[\w]+$/.test(name)
      const tag = `W/"${info.size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}"`
      res.setHeader("ETag", tag)
      res.setHeader("Cache-Control", extname(file) === ".html"
        ? "no-cache"
        : versioned ? "public, max-age=31536000, immutable" : "public, max-age=3600")
      if (req.headers["if-none-match"] === tag) {
        res.statusCode = 304
        return res.end()
      }
      res.setHeader(
        "Content-Type",
        types[extname(file)] ?? "application/octet-stream",
      )
      res.setHeader("Content-Length", info.size)
      if (req.method === "HEAD") return res.end()
      const data = await readFile(file)
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
