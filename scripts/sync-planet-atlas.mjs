// Keep the written effect inventory and the live field guide on one content source.
import { readFile, writeFile } from "node:fs/promises"
import { TERRAIN_ATLAS, WEATHER_ATLAS } from "../src/planet/atlas.js"
import { LANDMARKS } from "../src/landmarks.js"

const file = new URL("../docs/design/PLANET_ART.md", import.meta.url)
const begin = "<!-- atlas-inventory:start -->", end = "<!-- atlas-inventory:end -->"
const anchor = (entry) => {
  const landmark = LANDMARKS.find(l => l.id === entry.landmark)
  return landmark ? landmark.name + "（" + entry.landmark + "）"
    : entry.location[0] + "° 纬度 / " + entry.location[1] + "° 经度"
}
let block = begin + "\n\n## 8. 已实现地形与气候 → 演示页映射\n\n"
block += "由 `node scripts/sync-planet-atlas.mjs` 从 `src/planet/atlas.js` 生成；修改效果文案先改该源，再同步此表。观察按钮只调用现有相机与地理锚点，不触发新的天气模拟。\n\n"
for (const [name, entries] of [["地形", TERRAIN_ATLAS], ["气候与水流", WEATHER_ATLAS]]) {
  block += "### " + name + "\n\n| 主题 / 位置 | 画面定义 | 观察尺度与效果 | 实现边界 |\n| --- | --- | --- | --- |\n"
  for (const entry of entries) block += "| " + entry.title + " · " + anchor(entry) + " | " + entry.appearance + " | " + entry.layer + "；距离 " + entry.distance + "。" + entry.weather + " | " + entry.boundary + " |\n"
  block += "\n"
}
block += end
let source = await readFile(file, "utf8")
const from = source.indexOf(begin), to = source.indexOf(end)
if (from >= 0 && to > from) source = source.slice(0, from) + block + source.slice(to + end.length)
else if (from >= 0 || to >= 0) throw new Error("Incomplete atlas markers")
else source = source.trimEnd() + "\n\n" + block + "\n"
await writeFile(file, source)
console.log("Synced " + TERRAIN_ATLAS.length + " terrain and " + WEATHER_ATLAS.length + " weather topics")
