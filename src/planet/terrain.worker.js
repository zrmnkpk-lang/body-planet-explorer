import { makeTerrain, makeLocalTerrain, coastlinePositions } from "./terrain.js"
self.onmessage = ({ data: { detail, center, zone } }) => {
  try {
    const g = center ? makeLocalTerrain(center) : makeTerrain(detail)
    const data = {
      detail,
      zone,
      center,
      position: g.attributes.position.array,
      normal: g.attributes.normal.array,
      color: g.attributes.color.array,
      index: g.index.array,
      coastline: detail === 63 ? coastlinePositions(g) : undefined,
    }
    self.postMessage(
      data,
      Object.values(data)
        .filter((x) => x?.buffer)
        .map((x) => x.buffer),
    )
    g.dispose()
  } catch (error) {
    self.postMessage({ error: String(error), detail, zone })
  }
}
