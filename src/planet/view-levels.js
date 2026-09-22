import * as T from "three"
import { smooth } from "./field.js"
// Semantic zoom is independent of rendering quality and body-zone selection.
export const VIEW_LEVELS = [
  {
    id: "orbit",
    name: "天际",
    distance: 4.2,
    summary: "星球轮廓 · 薄云 · 极地",
    next: "缩放至 20%，查看大陆板块",
  },
  {
    id: "plates",
    name: "板块",
    distance: 3.45,
    summary: "大陆 · 群岛 · 海洋名称",
    next: "缩放至 40%，进入气候层",
  },
  {
    id: "climate",
    name: "气候",
    distance: 2.78,
    summary: "雨云 · 气流 · 主河道",
    next: "缩放至 60%，展开山林水系",
  },
  {
    id: "biome",
    name: "生态",
    distance: 2.12,
    summary: "山系 · 林地 · 支流水系",
    next: "缩放至 80%，查看地表细节",
  },
  {
    id: "surface",
    name: "地表",
    distance: 1.53,
    summary: "灌木 · 岩层 · 冰川裂隙",
    next: "已进入地表观察，可拖动探索周围",
  },
]
const boundaries = [3.82, 3.12, 2.45, 1.82]
export function levelForDistance(distance, previous = 0) {
  let level = Math.max(0, Math.min(VIEW_LEVELS.length - 1, previous))
  while (level < VIEW_LEVELS.length - 1 && distance < boundaries[level] - 0.045)
    level++
  while (level > 0 && distance > boundaries[level - 1] + 0.045) level--
  return level
}
export const zoomProgress = (distance) =>
  Math.max(0, Math.min(1, (4.2 - distance) / (4.2 - 1.53)))
const reveal = (progress, start, end) => smooth(start, end, progress)
export function detailWeights(distance) {
  const progress = zoomProgress(distance)
  return {
    progress,
    relief: 0.26 + reveal(progress, 0.26, 0.82) * 0.74,
    clouds: 1 - reveal(progress, 0.78, 1) * 0.48,
    weather:
      reveal(progress, 0.32, 0.5) * (1 - reveal(progress, 0.82, 1) * 0.4),
    rivers: reveal(progress, 0.34, 0.5),
    mountains: reveal(progress, 0.46, 0.68),
    trees: reveal(progress, 0.63, 0.82),
    shrubs: reveal(progress, 0.82, 0.96),
    rocks: reveal(progress, 0.8, 0.97),
    ice: reveal(progress, 0.68, 0.88),
    tributaries: reveal(progress, 0.54, 0.72),
    flow: reveal(progress, 0.62, 0.84),
    landmarks: reveal(progress, 0.84, 0.97),
    grain: reveal(progress, 0.73, 0.94),
  }
}
const levelProgress = [0, 0.28, 0.53, 0.78, 1]
export function layerVisibility(minLevel, maxLevel, progress) {
  const enter = levelProgress[minLevel] ?? 0,
    enterAmount = smooth(
      Math.max(0, enter - 0.08),
      Math.min(1, enter + 0.05),
      progress,
    )
  if (maxLevel >= VIEW_LEVELS.length - 1) return enterAmount
  const exit = levelProgress[maxLevel + 1]
  return (
    enterAmount *
    (1 - smooth(Math.max(0, exit - 0.1), Math.min(1, exit + 0.03), progress))
  )
}
// Store reveal values as uniforms; geometry size and geolocation never change.
export function installReveal(mesh) {
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material]
  for (const material of materials) {
    material.alphaHash = true
    material.opacity = 0
    material.needsUpdate = true
  }
  mesh.customDepthMaterial = new T.MeshDepthMaterial({
    depthPacking: T.RGBADepthPacking,
    alphaHash: true,
    opacity: 0,
  })
  mesh.visible = false
  return mesh
}
export function revealMesh(mesh, amount) {
  const previous = mesh.userData.reveal ?? 0
  mesh.visible = amount > 0.008
  for (const m of Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material])
    m.opacity = amount
  if (mesh.customDepthMaterial) mesh.customDepthMaterial.opacity = amount
  mesh.userData.reveal = amount
  return Math.floor(previous * 8) !== Math.floor(amount * 8)
}
