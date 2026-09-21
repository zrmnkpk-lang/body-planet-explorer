import * as T from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { LANDMARKS } from "./landmarks.js"
import { ZONES } from "./planet/zones.js"
import { sample, sampleLatLon, zoneAt, seeded } from "./planet/field.js"
import { makeTerrain, surfaceMaterial } from "./planet/terrain.js"
import { point, addWater, addEcology } from "./planet/ecology.js"
import "./styles.css"
const $ = (s) => document.querySelector(s),
  host = $("#scene"),
  data = structuredClone(ZONES)
let renderer
try {
  renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  })
} catch (e) {
  $("#loading").hidden = true
  $("#error").hidden = false
  throw e
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.outputColorSpace = T.SRGBColorSpace
renderer.toneMapping = T.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.16
renderer.shadowMap.enabled = true
renderer.shadowMap.type = T.PCFSoftShadowMap
renderer.shadowMap.autoUpdate = false
renderer.shadowMap.needsUpdate = true
host.appendChild(renderer.domElement)
const scene = new T.Scene(),
  camera = new T.PerspectiveCamera(36, 1, 0.02, 50)
camera.position.set(0, 0.16, 3.7)
const controls = new OrbitControls(camera, renderer.domElement)
Object.assign(controls, {
  enablePan: false,
  enableDamping: true,
  dampingFactor: 0.065,
  rotateSpeed: 0.5,
  zoomSpeed: 0.65,
  minDistance: 1.48,
  maxDistance: 5.6,
  autoRotateSpeed: 0.32,
})
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
scene.add(new T.HemisphereLight(0xcce9f3, 0x222a36, 1.75))
const key = new T.DirectionalLight(0xffe3c2, 3)
key.position.set(-3, 4, 5)
key.castShadow = true
key.shadow.mapSize.set(2048, 2048)
Object.assign(key.shadow.camera, {
  left: -1.4,
  right: 1.4,
  top: 1.4,
  bottom: -1.4,
  near: 0.1,
  far: 12,
})
key.shadow.bias = -0.00025
key.shadow.normalBias = 0.003
scene.add(key)
const fill = new T.DirectionalLight(0x699dbd, 1.6)
fill.position.set(4, 0, -3)
scene.add(fill)
const root = new T.Group()
scene.add(root)
const terrainMaterial = surfaceMaterial(),
  terrain = new T.Mesh(makeTerrain(15), terrainMaterial)
terrain.receiveShadow = true
terrain.castShadow = true
root.add(terrain)
const water = addWater(root),
  ecology = addEcology(root)
// A low-cost proxy bounds the ray search; final coordinates use the shared height field.
const collision = new T.Sphere(new T.Vector3(), 1.27),
  ray = new T.Raycaster(),
  pointer = new T.Vector2()
const atmosphere = new T.Mesh(
  new T.SphereGeometry(1.018, 80, 48),
  new T.ShaderMaterial({
    transparent: true,
    side: T.BackSide,
    depthWrite: false,
    vertexShader:
      "varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
    fragmentShader:
      "varying vec3 n;varying vec3 v;void main(){float a=pow(1.-abs(dot(normalize(n),normalize(v))),4.);gl_FragColor=vec4(.22,.49,.61,a*.25);}",
  }),
)
root.add(atmosphere)
const rand = seeded(997),
  stars = []
for (let i = 0; i < 220; i++) {
  const v = new T.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5)
    .normalize()
    .multiplyScalar(15)
  stars.push(...v.toArray())
}
const sg = new T.BufferGeometry()
sg.setAttribute("position", new T.Float32BufferAttribute(stars, 3))
scene.add(
  new T.Points(
    sg,
    new T.PointsMaterial({
      color: 0xa9c0cf,
      size: 0.016,
      transparent: true,
      opacity: 0.37,
    }),
  ),
)
const lods = new Map([[15, terrain.geometry]]),
  pending = new Set()
let quality = "fine",
  worker,
  localZone = null,
  localMesh = null,
  pendingZone = null
try {
  worker = new Worker(new URL("./planet/terrain.worker.js", import.meta.url), {
    type: "module",
  })
  worker.onmessage = ({ data: d }) => {
    pending.delete(d.detail)
    if (d.zone) pendingZone = null
    if (d.error) {
      $("#detail-label").textContent = "精细地形加载失败 · 基础地形可继续探索"
      return
    }
    const g = new T.BufferGeometry()
    for (const name of ["position", "normal", "color"])
      g.setAttribute(name, new T.BufferAttribute(d[name], 3))
    g.setIndex(new T.BufferAttribute(d.index, 1))
    g.computeBoundingSphere()
    if (d.zone) {
      if (localMesh) {
        root.remove(localMesh)
        localMesh.geometry.dispose()
        localMesh.material.dispose()
      }
      const m = surfaceMaterial()
      m.userData.patch.center.value.set(...d.center)
      m.userData.patch.mode.value = 2
      localMesh = new T.Mesh(g, m)
      localMesh.receiveShadow = true
      localMesh.visible = false
      root.add(localMesh)
      localZone = d.zone
    } else {
      lods.set(d.detail, g)
      if (d.detail === 63) requestTerrain(127)
    }
  }
  worker.onerror = () => {
    $("#detail-label").textContent = "精细地形不可用 · 基础地形可继续探索"
  }
} catch {
  $("#detail-label").textContent = "基础地形模式"
}
function requestTerrain(detail) {
  if (worker && !pending.has(detail) && !lods.has(detail)) {
    pending.add(detail)
    worker.postMessage({ detail })
  }
}
requestTerrain(63)
// Local GLB landmarks. The generated source and manifest live in the repository.
const loader = new GLTFLoader()
for (const landmark of LANDMARKS.filter((l) => l.model)) {
  loader.load(
    landmark.model,
    (gltf) => {
      const s = sampleLatLon(landmark.latitude, landmark.longitude),
        model = gltf.scene
      model.position.copy(
        point(landmark.latitude, landmark.longitude, 1 + s.h - 0.005),
      )
      model.quaternion.setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        point(landmark.latitude, landmark.longitude),
      )
      model.scale.setScalar(landmark.modelScale || 0.025)
      model.traverse((n) => {
        if (n.isMesh) {
          n.castShadow = true
          n.receiveShadow = true
        }
      })
      root.add(model)
      renderer.shadowMap.needsUpdate = true
    },
    undefined,
    () => {
      console.warn("Landmark asset unavailable:", landmark.id)
    },
  )
}
const labels = LANDMARKS.map((l) => {
  const el = document.createElement("div")
  el.className = "landmark landmark--" + l.type
  el.dataset.landmark = l.id
  const marker = document.createElement("span")
  marker.className = "landmark__marker"
  const text = document.createElement("span")
  text.className = "landmark__label"
  text.textContent = l.name
  el.append(marker, text)
  $("#landmark-layer").append(el)
  const h = sampleLatLon(l.latitude, l.longitude).h
  return {
    l,
    el,
    anchor: point(l.latitude, l.longitude, Math.max(1.01, 1 + h + 0.02)),
  }
})
const selectedOutline = new T.LineLoop(
  new T.BufferGeometry(),
  new T.LineBasicMaterial({ color: 0xe0ddbb, transparent: true, opacity: 0.8 }),
)
selectedOutline.visible = false
root.add(selectedOutline)
let selected = null,
  targetCamera = null,
  contextLost = false
function select(zone) {
  if (!data[zone]) return
  selected = zone
  const d = data[zone]
  $("#card").hidden = false
  $("#zone-title").textContent = d.title
  $("#zone-en").textContent = d.en
  $("#value").textContent = String(d.value)
  $("#unit").textContent = d.unit
  $("#metric-label").textContent = d.label
  $("#description").textContent = d.desc
  document
    .querySelectorAll("[data-zone]")
    .forEach((b) => b.classList.toggle("active", b.dataset.zone === zone))
  const pts = []
  for (let i = 0; i < 100; i++) {
    const a = (i / 100) * Math.PI * 2,
      lat = d.lat + 3.6 * Math.sin(a),
      lon = d.lon + (3.6 * Math.cos(a)) / Math.cos((d.lat * Math.PI) / 180),
      s = sampleLatLon(lat, lon)
    pts.push(point(lat, lon, Math.max(1.002, 1 + s.h + 0.002)))
  }
  selectedOutline.geometry.dispose()
  selectedOutline.geometry = new T.BufferGeometry().setFromPoints(pts)
  selectedOutline.visible = true
  setMotion(false)
}
function setMotion(active) {
  controls.autoRotate = active
  $("#motion").setAttribute("aria-pressed", String(active))
}
function close() {
  $("#card").hidden = true
  selected = null
  selectedOutline.visible = false
  document
    .querySelectorAll("[data-zone]")
    .forEach((b) => b.classList.remove("active"))
}
function focus(zone, distance = 3.1) {
  select(zone)
  if (!data[zone]) return
  targetCamera = point(data[zone].lat, data[zone].lon, distance)
  if (reduced) {
    camera.position.copy(targetCamera)
    targetCamera = null
  }
}
function zoom(factor) {
  targetCamera = null
  camera.position.setLength(
    T.MathUtils.clamp(
      camera.position.length() * factor,
      controls.minDistance,
      controls.maxDistance,
    ),
  )
}
function reset() {
  close()
  targetCamera = new T.Vector3(0, 0.16, innerWidth < 760 ? 4.4 : 3.7)
  setMotion(false)
}
for (const b of document.querySelectorAll("[data-zone]"))
  b.onclick = () => focus(b.dataset.zone)
$("#close").onclick = close
$("#focus").onclick = () => focus(selected, 1.85)
$("#plus").onclick = () => zoom(0.84)
$("#minus").onclick = () => zoom(1.19)
$("#reset").onclick = reset
$("#motion").onclick = () => {
  targetCamera = null
  setMotion(!controls.autoRotate)
}
$("#quality").onchange = (e) => {
  quality = e.target.value
  renderer.setPixelRatio(quality === "fine" ? Math.min(devicePixelRatio, 2) : 1)
  resize()
}
controls.addEventListener("start", () => {
  targetCamera = null
})
function pick(e) {
  const rect = host.getBoundingClientRect()
  pointer.set(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    (-(e.clientY - rect.top) / rect.height) * 2 + 1,
  )
  ray.setFromCamera(pointer, camera)
  const entry = ray.ray.intersectSphere(collision, new T.Vector3())
  if (!entry) {
    close()
    return
  }
  const p = new T.Vector3(),
    n = new T.Vector3()
  let lo = entry.distanceTo(ray.ray.origin),
    hi = lo
  const evaluate = (t) => {
    ray.ray.at(t, p)
    n.copy(p).normalize()
    return p.length() - Math.max(1, 1 + sample(n.x, n.y, n.z).h)
  }
  let found = false
  for (let i = 0; i < 180; i++) {
    hi += 0.007
    if (evaluate(hi) <= 0) {
      found = true
      break
    }
    lo = hi
  }
  if (!found) {
    close()
    return
  }
  for (let i = 0; i < 15; i++) {
    const mid = (lo + hi) / 2
    if (evaluate(mid) > 0) lo = mid
    else hi = mid
  }
  evaluate(hi)
  select(zoneAt(sample(n.x, n.y, n.z)))
}
const pointers = new Set()
let down = null,
  moved = 0,
  multi = false
host.addEventListener("pointerdown", (e) => {
  pointers.add(e.pointerId)
  host.setPointerCapture(e.pointerId)
  if (pointers.size > 1) multi = true
  else {
    multi = false
    down = { x: e.clientX, y: e.clientY }
    moved = 0
  }
})
host.addEventListener("pointermove", (e) => {
  if (down)
    moved = Math.max(moved, Math.hypot(e.clientX - down.x, e.clientY - down.y))
})
host.addEventListener("pointercancel", (e) => {
  pointers.delete(e.pointerId)
  down = null
})
host.addEventListener("pointerup", (e) => {
  pointers.delete(e.pointerId)
  if (down && !multi && moved < 7) pick(e)
  if (!pointers.size) down = null
})
host.addEventListener("keydown", (e) => {
  if (
    ![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "+",
      "=",
      "-",
      "Escape",
    ].includes(e.key)
  )
    return
  e.preventDefault()
  targetCamera = null
  if (e.key === "+" || e.key === "=") zoom(0.85)
  else if (e.key === "-") zoom(1.18)
  else if (e.key === "Escape") reset()
  else {
    const s = new T.Spherical().setFromVector3(camera.position)
    s.theta += e.key === "ArrowLeft" ? -0.12 : e.key === "ArrowRight" ? 0.12 : 0
    s.phi = T.MathUtils.clamp(
      s.phi + (e.key === "ArrowUp" ? -0.12 : e.key === "ArrowDown" ? 0.12 : 0),
      0.05,
      Math.PI - 0.05,
    )
    camera.position.setFromSpherical(s)
  }
})
window.addEventListener("body-planet:metrics", (e) => {
  for (const [zone, value] of Object.entries(e.detail || {}))
    if (data[zone] && typeof value === "number" && Number.isFinite(value))
      data[zone].value = value
  if (selected) select(selected)
})
function resize() {
  const w = host.clientWidth,
    h = host.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.fov = w < 760 ? 44 : 36
  camera.updateProjectionMatrix()
}
const observer = new ResizeObserver(resize)
observer.observe(host)
if (innerWidth < 760) camera.position.set(0, 0.16, 4.4)
resize()
let last = performance.now(),
  frames = 0,
  frameTime = 0,
  fps = 0,
  raf
function frame(now) {
  raf = requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.1)
  last = now
  if (document.hidden || contextLost) return
  if (targetCamera) {
    camera.position.lerp(targetCamera, reduced ? 1 : 1 - Math.exp(-dt * 5))
    if (camera.position.distanceTo(targetCamera) < 0.004) targetCamera = null
  }
  controls.update(dt)
  const distance = camera.position.length()
  const wanted = quality === "fine" && distance < 3.2 ? 127 : 63
  const nextGeometry = lods.get(wanted) || lods.get(63) || lods.get(15)
  if (terrain.geometry !== nextGeometry) {
    terrain.geometry = nextGeometry
    renderer.shadowMap.needsUpdate = true
  }
  const wantsLocal = quality === "fine" && distance < 2.45 && selected
  if (wantsLocal && localZone !== selected && !pendingZone && worker) {
    pendingZone = selected
    worker.postMessage({
      zone: selected,
      center: point(data[selected].lat, data[selected].lon).toArray(),
    })
  }
  const showLocal = !!(wantsLocal && localZone === selected)
  if (localMesh) localMesh.visible = showLocal
  terrainMaterial.userData.patch.mode.value = showLocal ? 1 : 0
  if (showLocal)
    terrainMaterial.userData.patch.center.value.copy(
      localMesh.material.userData.patch.center.value,
    )
  $("#level").textContent =
    distance < 2.5 ? "山川近景" : distance < 3.3 ? "大陆视角" : "星球全貌"
  $("#detail-label").textContent =
    pending.size || pendingZone ? "地貌细节加载中" : "山脊 · 河谷 · 森林"
  const rect = host.getBoundingClientRect()
  for (const { l, el, anchor } of labels) {
    const projected = anchor.clone().project(camera),
      normal = anchor.clone().normalize()
    const visible =
      (distance < 3.15 || l.minDetailLevel === 0) &&
      normal.dot(camera.position.clone().sub(anchor).normalize()) > 0.12 &&
      Math.abs(projected.x) < 0.95 &&
      Math.abs(projected.y) < 0.83
    el.classList.toggle("is-visible", visible)
    if (visible)
      el.style.transform = `translate(${(projected.x * 0.5 + 0.5) * rect.width}px,${(-projected.y * 0.5 + 0.5) * rect.height}px)`
  }
  for (let i = 0; i < water.marks.length; i++)
    water.marks[i].material.opacity =
      0.3 + 0.16 * Math.sin(now * 0.0016 + i * 0.9)
  renderer.render(scene, camera)
  frames++
  frameTime += dt
  if (frameTime > 0.75) {
    fps = Math.round(frames / frameTime)
    $("#render-stats").textContent =
      `${((terrain.geometry.index.count + (showLocal ? localMesh.geometry.index.count : 0)) / 3 / 1000).toFixed(0)}k 地形面 · ${ecology.treeCount.toLocaleString()} 棵树 · ${fps} FPS`
    frames = 0
    frameTime = 0
  }
}
raf = requestAnimationFrame(frame)
$("#loading").hidden = true
renderer.domElement.addEventListener("webglcontextlost", (e) => {
  e.preventDefault()
  contextLost = true
  $("#error").hidden = false
})
window.addEventListener(
  "pagehide",
  () => {
    cancelAnimationFrame(raf)
    worker?.terminate()
    controls.dispose()
    observer.disconnect()
    renderer.dispose()
  },
  { once: true },
)

const lifecycle = new AbortController()
if (document.modelContext?.registerTool) {
  try {
    Promise.resolve(
      document.modelContext.registerTool(
        {
          name: "explore_body_planet",
          description: "选择身体地貌并调整观察距离。仅操作模拟星球。",
          inputSchema: {
            type: "object",
            properties: {
              zone: { type: "string", enum: Object.keys(data) },
              view: { type: "string", enum: ["orbit", "region"] },
            },
            required: ["zone"],
            additionalProperties: false,
          },
          execute: ({ zone, view = "orbit" }) => {
            if (!data[zone] || !["orbit", "region"].includes(view))
              throw new Error("Invalid zone or view")
            focus(zone, view === "region" ? 1.85 : 3.1)
            return { zone, view, simulated: true }
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {})
  } catch {}
}
window.addEventListener("pagehide", () => lifecycle.abort(), { once: true })
