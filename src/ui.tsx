import { useEffect, useRef, type ReactNode } from "react"
import { X } from "lucide-react"
import { METRICS, type BodyMetrics, type Metric } from "./model"
export function MetricGrid({ body, selected, onSelect }: { body: BodyMetrics | null; selected?: Metric | null; onSelect?: (metric: Metric) => void }) {
  return <div className="metric-grid">{METRICS.map(m => {
    const value = body ? `${body[m.key].toFixed(1)}${m.unit === "kg" ? " kg" : "%"}` : "—"
    return onSelect ? <button key={m.key} className={`metric ${selected === m.key ? "selected" : ""}`} aria-pressed={selected === m.key} onClick={() => onSelect(m.key)}><span>{m.label}</span><strong>{value}</strong></button> : <div key={m.key} className="metric"><span>{m.label}</span><strong>{value}</strong></div>
  })}</div>
}
export const art = (name: string) => `/assets/companions/${name}.png`
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
