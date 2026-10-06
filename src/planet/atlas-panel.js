import { TERRAIN_ATLAS, WEATHER_ATLAS } from "./atlas.js"
import { LANDMARKS } from "../landmarks.js"

// UI-only navigation into existing renderer views; no second planet scene.
export function mountAtlas({ navigate, closeMetric, facts }) {
  const panel = document.querySelector("#atlas-panel")
  const tabs = panel.querySelectorAll("[data-atlas-tab]")
  const select = panel.querySelector("#atlas-topic")
  let group = TERRAIN_ATLAS
  const text = (id, value) => { panel.querySelector(id).textContent = value }
  function current() { return group.find(entry => entry.id === select.value) || group[0] }
  function render() {
    const entry = current()
    text("#atlas-feedback", "")
    text("#atlas-title", entry.title)
    text("#atlas-layer", entry.layer)
    text("#atlas-body", entry.body)
    text("#atlas-appearance", entry.appearance)
    text("#atlas-weather", entry.weather)
    text("#atlas-boundary", entry.boundary)
    panel.querySelector("#atlas-near").hidden = !entry.detail
  }
  function setGroup(kind) {
    group = kind === "weather" ? WEATHER_ATLAS : TERRAIN_ATLAS
    for (const button of tabs) button.setAttribute("aria-pressed", String(button.dataset.atlasTab === kind))
    select.replaceChildren(...group.map(entry => new Option(entry.title, entry.id)))
    render()
  }
  function go(near = false) {
    const entry = current(), landmark = LANDMARKS.find(l => l.id === entry.landmark)
    const location = entry.location || [landmark.latitude, landmark.longitude]
    navigate(location, near ? 1.53 : entry.distance)
    text("#atlas-feedback", "正在观察：" + entry.title + (near ? " · 地表细节" : ""))
  }
  for (const button of tabs) button.onclick = () => setGroup(button.dataset.atlasTab)
  select.onchange = render
  panel.querySelector("#atlas-go").onclick = () => go()
  panel.querySelector("#atlas-near").onclick = () => go(true)
  panel.ontoggle = () => { if (panel.open) closeMetric() }
  text("#atlas-facts", facts)
  panel.open = matchMedia("(min-width: 1100px)").matches
  setGroup("terrain")
}
