import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { RotateCcw } from "lucide-react"
import type { BodyMetrics, Metric } from "./model"
export default forwardRef<{
  command: (action: string, metric?: Metric) => void
}, {
  bodyMetrics: BodyMetrics | null
  thumbnail?: boolean
  reduceMotion?: boolean
  onRegion?: (metric: Metric) => void
}>(function PlanetView(
  { bodyMetrics, thumbnail = false, reduceMotion = false, onRegion },
  ref,
) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const latestRegion = useRef(onRegion)
  latestRegion.current = onRegion
  const src = useMemo(
    () =>
      `/planet.html?${new URLSearchParams({ mode: "app", embed: "1", thumbnail: thumbnail ? "1" : "0", body: JSON.stringify(bodyMetrics), motion: reduceMotion ? "0" : "1", retry: String(retry) })}`,
    [
      bodyMetrics?.muscle,
      bodyMetrics?.water,
      bodyMetrics?.bone,
      bodyMetrics?.fat,
      thumbnail,
      reduceMotion,
      retry,
    ],
  )
  useImperativeHandle(ref, () => ({
    command(action, metric) {
      frame.current?.contentWindow?.postMessage(
        { type: "portal:command", action, metric },
        location.origin,
      )
    },
  }))
  useEffect(() => {
    setReady(false)
    setFailed(false)
    const timeout = window.setTimeout(() => setFailed(true), 45000)
    const message = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== frame.current?.contentWindow
      )
        return
      if (event.data?.type === "portal:ready") {
        setReady(true)
        setFailed(false)
        clearTimeout(timeout)
      } else if (event.data?.type === "portal:error") {
        setFailed(true)
        clearTimeout(timeout)
      } else if (
        event.data?.type === "portal:region" &&
        ["muscle", "water", "bone", "fat"].includes(event.data.metric)
      )
        latestRegion.current?.(event.data.metric)
    }
    window.addEventListener("message", message)
    return () => {
      clearTimeout(timeout)
      window.removeEventListener("message", message)
    }
  }, [src])
  return (
    <section
      className={`latest-planet-view ${thumbnail ? "thumbnail" : ""}`}
      aria-label={thumbnail ? "Live planet preview" : "Interactive body planet"}
      aria-busy={!ready && !failed}
    >
      {!ready && !failed && (
        <div className="planet-loading" role="status">
          <span className="loading-orb" />
          <span>{thumbnail ? "" : "Growing your world…"}</span>
        </div>
      )}
      {failed && (
        <div className="planet-error" role="alert">
          <span>
            {thumbnail
              ? "Planet unavailable"
              : "Your planet could not be loaded."}
          </span>
          {!thumbnail && (
            <button
              className="button secondary"
              onClick={() => setRetry((x) => x + 1)}
            >
              <RotateCcw size={18} /> Try again
            </button>
          )}
        </div>
      )}
      <iframe
        ref={frame}
        className={ready && !failed ? "is-ready" : ""}
        title={
          thumbnail
            ? "Live planet preview"
            : "Interactive body planet — drag to rotate; use arrow keys and plus or minus to explore"
        }
        src={src}
        loading="eager"
        tabIndex={thumbnail ? -1 : 0}
      />
    </section>
  )
})
