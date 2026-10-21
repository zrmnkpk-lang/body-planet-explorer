import { useRef, useState } from "react"
import {
  AudioLines,
  Check,
  ChevronRight,
  Crown,
  Dumbbell,
  Droplet,
  Footprints,
  Minus,
  Plus,
  Search,
  Settings,
} from "lucide-react"
import {
  appendExercises,
  bodyErrors,
  EXERCISES,
  METRICS,
  savePlan,
  today,
  update,
  type AppState,
  type BodyMetrics,
  type Candidate,
  type Exercise,
  type Metric,
  type Tab,
} from "./model"
import { Artwork, Button, Dialog, ExerciseArt, IconButton, MetricIcon } from "./ui"
export type Overlay = "account" | "account-info" | "account-edit" | "settings" | "membership" | "today-plan" | "edit-plan" | "edit-body" | "add-exercise" | "exercise" | "finish" | "discard" | "review" | null
type Props = {
  overlay: NonNullable<Overlay>
  setOverlay: (next: Overlay) => void
  close: () => void
  state: AppState
  error: string | null
  setError: (value: string | null) => void
  action: (fn: () => void) => boolean
  notify: (value: string) => void
  navigate: (
    tab: Tab,
    view?: "main" | "plan" | "workout" | "history" | "updates" | "summary" | "conversations",
  ) => void
  exercise: Exercise
  candidate: Candidate | null
  setCandidate: (value: Candidate) => void
  finishWorkout: () => void
}
export default function Modals({
  overlay,
  setOverlay,
  close,
  state,
  error,
  setError,
  action,
  notify,
  navigate,
  exercise,
  candidate,
  setCandidate,
  finishWorkout,
}: Props) {
  const [bodyDraft, setBodyDraft] = useState(
    Object.fromEntries(
      METRICS.map((m) => [m.key, state.body ? String(state.body[m.key]) : ""]),
    ) as Record<Metric, string>,
  )
  const [errors, setErrors] = useState<Partial<Record<Metric, string>>>({})
  const [account, setAccount] = useState(state.profile)
  const [plan, setPlan] = useState({
    duration: state.plan?.duration ?? 20,
    steps: state.plan?.steps ?? 8000,
    water: state.plan?.water ?? 2000,
    version: (state.plan?.version ?? null) as number | null,
    date: today(),
  })
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const saving = useRef(false)
  const total =
    state.session?.exercises.reduce((sum, e) => sum + e.sets, 0) ?? 0
  const complete = state.session?.completedSets === total && total > 0
  const title = {
    account: "Account",
    "account-info": "Account information",
    "account-edit": "Edit account",
    settings: "Settings",
    membership: "Portal Plus",
    "today-plan": "Today’s plan",
    "edit-plan": "Edit plan",
    "edit-body": "Update body data",
    "add-exercise": "Add exercises",
    exercise: exercise.name,
    finish: "Finish workout?",
    discard: "Leave this workout?",
    review: "Review plan changes",
  }[overlay]
  return (
    <Dialog
      title={title}
      onClose={close}
      drawer={
        overlay.startsWith("account") ||
        overlay === "settings" ||
        overlay === "membership"
      }
    >
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {overlay === "account" && (
        <>
          <button className="card account-profile-card" onClick={() => setOverlay("account-info")} aria-label="Account information">
            <Artwork name="alex-account" sizes="58px" alt="Your profile avatar" />
            <div><h3>{state.profile.name}</h3><p>Account information</p></div>
            <ChevronRight size={18} />
          </button>
          <section className="card membership-entry">
            <div className="row spread"><Crown size={30} /><h3>Membership</h3><span className="badge">Free account</span></div>
            <p>Explore membership options.</p>
            <Button onClick={() => setOverlay("membership")}><span className="sr-only">Portal Plus Explore membership: </span>Upgrade membership <ChevronRight size={20} /></Button>
          </section>
          <button
            className="card account-row"
            onClick={() => setOverlay("settings")}
          >
            <Settings size={28} />
            <span>Settings</span>
            <ChevronRight size={18} />
          </button>
          <div className="drawer-bottom">
            <p>Portal Fitness · V1</p>
            <span>Your progress lives on this device.</span>
          </div>
        </>
      )}
      {overlay === "account-info" && (
        <>
          <div className="card">
            <span className="small">Display name</span>
            <h3>{state.profile.name}</h3>
            <span className="small">Email</span>
            <p>{state.profile.email}</p>
          </div>
          <Button onClick={() => setOverlay("account-edit")}>
            Edit account
          </Button>
          <Button secondary onClick={() => setOverlay("account")}>
            Back to account
          </Button>
        </>
      )}
      {overlay === "account-edit" && (
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault()
            if (
              !account.name.trim() ||
              account.name.length > 40 ||
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)
            ) {
              setError("Enter a display name and valid email address.")
              return
            }
            if (
              action(() =>
                update((s) => {
                  s.profile = {
                    name: account.name.trim(),
                    email: account.email.trim(),
                  }
                }),
              )
            ) {
              setOverlay("account-info")
              notify("Account saved on this device.")
            }
          }}
        >
          <label>
            Display name
            <input
              autoComplete="nickname"
              maxLength={40}
              value={account.name}
              onChange={(e) => setAccount({ ...account, name: e.target.value })}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={account.email}
              onChange={(e) =>
                setAccount({ ...account, email: e.target.value })
              }
            />
          </label>
          <p className="small">
            This is your local profile. Cloud account sign-in is not connected
            yet.
          </p>
          <Button type="submit">Save changes</Button>
          <Button secondary onClick={() => setOverlay("account-info")}>
            Cancel
          </Button>
        </form>
      )}
      {overlay === "settings" && (
        <>
          <label className="card setting-row">
            <div>
              <h3>Reduce motion</h3>
              <p>Use fewer animations while exploring.</p>
            </div>
            <input
              type="checkbox"
              checked={state.settings.reduceMotion}
              onChange={(e) =>
                action(() =>
                  update((s) => {
                    s.settings.reduceMotion = e.target.checked
                  }),
                )
              }
            />
          </label>
          <div className="card">
            <h3>Data & privacy</h3>
            <p>
              Your profile, measurements, chats and workouts are saved locally
              in this browser.
            </p>
            <p className="small">
              The starting profile and three history entries are samples. New
              records are marked separately.
            </p>
          </div>
          <Button secondary onClick={() => setOverlay("membership")}>
            Membership
          </Button>
          <Button secondary onClick={() => setOverlay("account")}>
            Back to account
          </Button>
        </>
      )}
      {overlay === "membership" && (
        <>
          <div className="card membership-card">
            <Crown size={36} className="accent" />
            <h3>A little more possibility</h3>
            <p>
              Portal Plus membership options will appear here when they are
              available.
            </p>
            <span className="badge">Plans unavailable</span>
          </div>
          <p className="small">Pricing and checkout are not available yet.</p>
          <Button secondary onClick={() => setOverlay("account")}>
            Back to account
          </Button>
        </>
      )}
      {overlay === "today-plan" && (
        <>
          <div className="row spread">
            <p>{state.plan?.completed ? 2 : 1} / 3 completed</p>
            <button
              className="text-button"
              onClick={() => setOverlay("edit-plan")}
            >
              Edit
            </button>
          </div>
          <section className="card">
            <div className="goal-row">
              <Dumbbell className="accent" />
              <div>
                <h3>Strength training</h3>
                <p>
                  {state.plan?.duration} min ·{" "}
                  {state.plan?.completed ? "Completed" : "Planned"}
                </p>
              </div>
            </div>
            <div className="plan-blocks">
              <div>
                <span>Warm-up</span>
                <strong>
                  {Math.round((state.plan?.duration ?? 20) * 0.15)} min
                </strong>
              </div>
              <div>
                <span>Strength</span>
                <strong>
                  {(state.plan?.duration ?? 20) -
                    2 * Math.round((state.plan?.duration ?? 20) * 0.15)}{" "}
                  min
                </strong>
              </div>
              <div>
                <span>Cool-down</span>
                <strong>
                  {Math.round((state.plan?.duration ?? 20) * 0.15)} min
                </strong>
              </div>
            </div>
            <Button
              disabled={state.plan?.completed}
              onClick={() => navigate("train", "plan")}
            >
              View workout
            </Button>
          </section>
          <div className="card goal-row">
            <Footprints className="accent" />
            <div>
              <h3>Walking</h3>
              <p>{state.plan?.steps.toLocaleString()} steps · Planned</p>
            </div>
          </div>
          <div className="card goal-row">
            <Droplet className="data-color" />
            <div>
              <h3>Hydration</h3>
              <p>{state.plan?.water.toLocaleString()} ml · Completed</p>
            </div>
            <Check className="accent" />
          </div>
        </>
      )}
      {overlay === "edit-plan" && (
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault()
            if (saving.current) return
            saving.current = true
            const ok = action(() =>
              savePlan(
                plan.duration,
                plan.steps,
                plan.water,
                plan.version,
                plan.date,
              ),
            )
            saving.current = false
            if (ok) {
              close()
              notify("Today’s plan updated.")
            }
          }}
        >
          <p className="muted">Set your goals for today.</p>
          {[
            {
              key: "duration",
              label: "Training duration",
              unit: "min",
              step: 5,
              min: 5,
              max: 180,
            },
            {
              key: "steps",
              label: "Daily steps",
              unit: "steps",
              step: 1000,
              min: 1000,
              max: 100000,
            },
            {
              key: "water",
              label: "Water goal",
              unit: "ml",
              step: 250,
              min: 250,
              max: 10000,
            },
          ].map((item) => (
            <div className="card" key={item.key}>
              <div className="goal-field-heading">
                {item.key === "water" ? <MetricIcon metric="water" /> : item.key === "steps" ? <Footprints className="accent" size={30} /> : <AudioLines className="accent" size={30} strokeWidth={3} />}
                <div><label htmlFor={`goal-${item.key}`}>{item.label}</label><p>{item.key === "duration" ? "Warm-up + training + cool-down" : item.key === "steps" ? "Target number of steps" : "Target daily water intake"}</p></div>
              </div>
              <div className="stepper">
                <IconButton
                  label={`Decrease ${item.label.toLowerCase()}`}
                  onClick={() =>
                    setPlan((p) => ({
                      ...p,
                      [item.key]: Math.max(
                        item.min,
                        p[(item.key as "duration" | "steps" | "water")] -
                          item.step,
                      ),
                    }))
                  }
                >
                  <Minus size={20} />
                </IconButton>
                <input
                  id={`goal-${item.key}`}
                  type="number"
                  min={item.min}
                  max={item.max}
                  step={item.step}
                  value={plan[(item.key as "duration" | "steps" | "water")]}
                  onChange={(e) =>
                    setPlan({ ...plan, [item.key]: Number(e.target.value) })
                  }
                />
                <span>{item.unit}</span>
                <IconButton
                  label={`Increase ${item.label.toLowerCase()}`}
                  onClick={() =>
                    setPlan((p) => ({
                      ...p,
                      [item.key]: Math.min(
                        item.max,
                        p[(item.key as "duration" | "steps" | "water")] +
                          item.step,
                      ),
                    }))
                  }
                >
                  <Plus size={20} />
                </IconButton>
              </div>
            </div>
          ))}
          <p className="small">
            Changes apply to today. An active workout keeps its original
            exercises.
          </p>
          <div className="two-actions">
            <Button secondary onClick={close}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
          {error?.includes("changed") && (
            <Button
              secondary
              onClick={() => {
                setPlan({
                  duration: state.plan?.duration ?? 20,
                  steps: state.plan?.steps ?? 8000,
                  water: state.plan?.water ?? 2000,
                  version: state.plan?.version ?? null,
                  date: today(),
                })
                setError(null)
              }}
            >
              Reload latest plan
            </Button>
          )}
        </form>
      )}
      {overlay === "edit-body" && (
        <form
          className="form-stack body-edit-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            const invalid = bodyErrors(bodyDraft)
            setErrors(invalid)
            if (Object.keys(invalid).length) {
              document
                .getElementById(`body-${Object.keys(invalid)[0]}`)
                ?.focus()
              return
            }
            const next = Object.fromEntries(
              METRICS.map((m) => [m.key, Number(bodyDraft[m.key])]),
            ) as BodyMetrics
            if (
              action(() =>
                update((s) => {
                  s.body = next
                  s.bodyUpdated = new Date().toISOString()
                }),
              )
            ) {
              close()
              notify("Body data saved. Your planet is updating.")
            }
          }}
        >
          <p className="muted">Edit your saved measurements.</p>
          {METRICS.map((m) => (
            <label key={m.key}>
              <span className="body-field-label"><MetricIcon metric={m.key} />{m.label}</span>
              <div className={`input-unit ${errors[m.key] ? "invalid" : ""}`}>
                <input
                  id={`body-${m.key}`}
                  aria-label={m.label}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={bodyDraft[m.key]}
                  aria-invalid={!!errors[m.key]}
                  aria-describedby={
                    errors[m.key] ? `error-${m.key}` : undefined
                  }
                  onChange={(e) =>
                    setBodyDraft({ ...bodyDraft, [m.key]: e.target.value })
                  }
                />
                <span>{m.unit}</span>
              </div>
              {errors[m.key] && (
                <span id={`error-${m.key}`} className="field-error">
                  {errors[m.key]}
                </span>
              )}
            </label>
          ))}
          <p className="small">
            Changes apply after saving.
          </p>
          <div className="two-actions">
            <Button secondary onClick={close}>
              Cancel
            </Button>
            <Button type="submit">Save body data</Button>
          </div>
        </form>
      )}
      {overlay === "add-exercise" && (
        <>
          <div className="search-field">
            <Search size={18} />
            <input
              aria-label="Search exercises"
              placeholder="Search exercises"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="exercise-picker">
            {EXERCISES.filter((e) =>
              e.name.toLowerCase().includes(search.toLowerCase()),
            ).map((e) => (
              <label className="card pick-row" key={e.id}>
                <ExerciseArt exerciseId={e.id} />
                <input
                  type="checkbox"
                  checked={selected.includes(e.id)}
                  onChange={(event) =>
                    setSelected(
                      event.target.checked
                        ? [...selected, e.id]
                        : selected.filter((value) => value !== e.id),
                    )
                  }
                />
                <div>
                  <strong>{e.name}</strong>
                  <p>
                    {e.category} · {e.sets} sets · {e.reps}
                  </p>
                </div>
              </label>
            ))}
            {!EXERCISES.some((e) =>
              e.name.toLowerCase().includes(search.toLowerCase()),
            ) && <p>No exercises found. Try a different name.</p>}
          </div>
          <Button
            disabled={!selected.length}
            onClick={() => {
              if (action(() => appendExercises(selected))) close()
            }}
          >
            Add {selected.length || ""}{" "}
            {selected.length === 1 ? "exercise" : "exercises"}
          </Button>
          <Button secondary onClick={close}>
            Cancel
          </Button>
        </>
      )}
      {overlay === "exercise" && (
        <>
          <div className="exercise-detail-art"><ExerciseArt exerciseId={exercise.id} large /></div>
          <span className="badge">{exercise.category}</span>
          <p>{exercise.instruction}</p>
          <div className="card">
            <h3>
              {exercise.sets} sets · {exercise.reps}
            </h3>
            <p>Rest between sets. Choose a comfortable range and pace.</p>
          </div>
          <Button secondary onClick={close}>
            Back to workout
          </Button>
        </>
      )}
      {overlay === "finish" && (
        <>
          <p>
            You’ve completed {state.session?.completedSets} of {total} sets.
          </p>
          <p className="muted">
            {complete
              ? "Save your completed workout and update your history."
              : "Save this as a partial workout, or keep going."}
          </p>
          <Button onClick={finishWorkout}>
            {complete ? "Save workout" : "Save partial workout"}
          </Button>
          <Button secondary onClick={close}>
            Keep training
          </Button>
        </>
      )}
      {overlay === "discard" && (
        <>
          <p>
            No sets have been completed. This workout won’t add a history
            record.
          </p>
          <Button
            onClick={() => {
              if (
                action(() =>
                  update((s) => {
                    s.session = null
                  }),
                )
              )
                navigate("train")
            }}
          >
            Discard workout
          </Button>
          <Button secondary onClick={close}>
            Keep training
          </Button>
        </>
      )}
      {overlay === "review" && candidate && (
        <>
          <p>Review the change before updating today’s plan.</p>
          <div className="card">
            <div className="row spread">
              <span>Training duration</span>
              <strong>
                {state.plan?.duration ?? 0} → {candidate.duration} min
              </strong>
            </div>
            <h3>Exercises</h3>
            {candidate.exerciseIds.map((value) => (
              <p key={value}>{EXERCISES.find((e) => e.id === value)?.name}</p>
            ))}
          </div>
          <p className="small">
            Daily steps and water goals stay the same. Your active workout keeps
            its original plan.
          </p>
          <Button
            onClick={() => {
              if (
                action(() =>
                  savePlan(
                    candidate.duration,
                    state.plan?.steps ?? 8000,
                    state.plan?.water ?? 2000,
                    candidate.baseVersion || null,
                    candidate.date,
                    candidate.exerciseIds,
                  ),
                )
              ) {
                close()
                notify("Today’s plan updated by AI Coach.")
              }
            }}
          >
            Save to today’s plan
          </Button>
          {error?.includes("changed") && (
            <Button
              secondary
              onClick={() => {
                setCandidate({
                  ...candidate,
                  baseVersion: state.plan?.version ?? 0,
                  date: today(),
                })
                setError(null)
              }}
            >
              Review against latest plan
            </Button>
          )}
          <Button secondary onClick={close}>
            Cancel
          </Button>
        </>
      )}
    </Dialog>
  )
}
