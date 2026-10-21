import { useEffect, useRef, type ReactNode, type ImgHTMLAttributes } from "react"
import imageAssets from "./image-assets.json"
import { MessageCircleMore, X } from "lucide-react"
import { METRICS, type BodyMetrics, type Metric } from "./model"
export function MetricIcon({ metric }: { metric: Metric }) {
  return <span aria-hidden="true" className={`metric-art metric-art-${metric}`} />
}
export function CoachMark({ large = false }: { large?: boolean }) {
  return (
    <span aria-hidden="true" className={`coach-mark ${large ? "large" : ""}`}>
      <MessageCircleMore size={large ? 52 : 28} strokeWidth={1.9} />
    </span>
  )
}
export function ExerciseArt({ exerciseId, large = false }: {
  exerciseId: string
  large?: boolean
}) {
  const frames = [
    "arm-circles", "squat", "push-up", "plank", "stretch",
    "reverse-lunge", "dead-bug", "jumping-jack",
  ]
  const found = frames.indexOf(exerciseId)
  const index = found < 0 ? 8 : found
  return (
    <span
      aria-hidden="true"
      className={`exercise-art ${large ? "large" : ""} ${exerciseId === "dead-bug" ? "wide-pose" : ""}`}
      style={{ backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%` }}
    />
  )
}
export function MetricGrid({ body, selected, onSelect }: {
  body: BodyMetrics | null
  selected?: Metric | null
  onSelect?: (metric: Metric) => void
}) {
  return (
    <div className="metric-grid">
      {METRICS.map(m => {
        const value = body ? `${body[m.key].toFixed(1)}${m.unit === "kg" ? " kg" : "%"}` : "—"
        const contents = (
          <>
            <MetricIcon metric={m.key} />
            <span className="metric-copy">
              <span>{m.label}</span>
              <strong>
                {body ? body[m.key].toFixed(1) : "—"}
                {body && <small> {m.unit}</small>}
              </strong>
            </span>
          </>
        )
        return onSelect ? (
          <button
            key={m.key}
            aria-label={`${m.label} ${value}`}
            className={`metric ${selected === m.key ? "selected" : ""}`}
            aria-pressed={selected === m.key}
            onClick={() => onSelect(m.key)}
          >
            {contents}
          </button>
        ) : <div key={m.key} className="metric">{contents}</div>
      })}
    </div>
  )
}
type ArtworkName = "alex-account" | "maya-sport" | "maya-body-analysis"
/** Display-sized, transparent artwork; the browser selects a suitable density. */
export function Artwork({ name, sizes, loading = "lazy", ...props }: Omit<
  ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"
> & { name: ArtworkName }) {
  const variants = imageAssets[name]
  return (
    <img
      {...props}
      src={variants[0].src}
      srcSet={variants.map(v => `${v.src} ${v.width}w`).join(", ")}
      sizes={sizes ?? "160px"}
      width={variants[0].width}
      height={variants[0].height}
      loading={loading}
      decoding="async"
    />
  )
}
export const fmt = (seconds: number) =>
  `${Math.floor(Math.max(0, seconds) / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(Math.max(0, seconds) % 60)
    .toString()
    .padStart(2, "0")}`
export function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = "button",
}: {
  children: ReactNode
  onClick?: () => void
  secondary?: boolean
  disabled?: boolean
  type?: "button" | "submit"
}) {
  return (
    <button
      type={type}
      className={`button ${secondary ? "secondary" : "primary"}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
export function IconButton({
  label,
  children,
  onClick,
}: {
  label: string
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
export function Dialog({
  children,
  title,
  onClose,
  drawer = false,
}: {
  children: ReactNode
  title: string
  onClose: () => void
  drawer?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  const opener = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const d = ref.current!
    if (!opener.current)
      opener.current = (document.activeElement as HTMLElement)
    d.showModal()
    const cancel = (e: Event) => {
      e.preventDefault()
      close.current()
    }
    d.addEventListener("cancel", cancel)
    return () => {
      d.removeEventListener("cancel", cancel)
      d.close()
      requestAnimationFrame(() =>
        opener.current?.focus({ preventScroll: true }),
      )
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={drawer ? "dialog drawer" : "dialog sheet"}
      aria-labelledby="dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="dialog-inner">
        <header className="dialog-header">
          <h2 id="dialog-title">{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </header>
        {children}
      </div>
    </dialog>
  )
}
