import * as T from "three"
import { smooth } from "./field.js"
// Semantic zoom is independent of rendering quality and body-zone selection.
export const VIEW_LEVELS = [
  {
    id: "world",
    name: "全貌",
    distance: 3.7,
    summary: "大陆轮廓 · 海洋 · 极地",
    next: "拉近探索山系与水系",
  },
  {
    id: "continent",
    name: "大陆",
    distance: 2.85,
    summary: "山系 · 雪线 · 主河道",
    next: "继续拉近，展开森林与支流",
  },
  {
    id: "biome",
    name: "生态",
    distance: 2.12,
    summary: "针叶林 · 湖泊 · 河谷",
    next: "继续拉近，查看岩层与地标",
  },
  {
    id: "surface",
    name: "地表",
    distance: 1.53,
    summary: "灌木 · 岩层 · 冰川裂隙",
    next: "已进入地表观察，可拖动探索周围",
  },
]
const boundaries = [3.25, 2.5, 1.86]
export function levelForDistance(distance, previous = 0) {
  let level = Math.max(0, Math.min(3, previous))
  while (level < 3 && distance < boundaries[level] - 0.045) level++
  while (level > 0 && distance > boundaries[level - 1] + 0.045) level--
  return level
}
const reveal = (distance, near, far) => 1 - smooth(near, far, distance)
export function detailWeights(distance) {
  return {
    mountains: reveal(distance, 2.8, 3.55),
    trees: reveal(distance, 2.17, 3.04),
    shrubs: reveal(distance, 1.56, 2.05),
    rocks: reveal(distance, 1.65, 2.26),
    ice: reveal(distance, 1.84, 2.8),
    tributaries: reveal(distance, 2.22, 3.08),
    flow: reveal(distance, 1.7, 2.46),
    landmarks: reveal(distance, 1.73, 2.3),
    grain: reveal(distance, 1.7, 2.68),
  }
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
