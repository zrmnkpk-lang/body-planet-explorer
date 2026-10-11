import { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  Dumbbell,
  Droplet,
  Footprints,
  Globe2,
  History,
  House,
  Info,
  MessageCircle,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Send,
  Square,
  X,
} from "lucide-react"
import PlanetView from "./PlanetView.tsx"
import {
  activeConversation,
  completeSet,
  elapsed,
  endRest,
  EXERCISES,
  id,
  METRICS,
  pauseSession,
  remaining,
  restoreError,
  resumeSession,
  saveWorkout,
  snapshot,
  startSession,
  today,
  update,
  useAppState,
  validateCandidate,
  type Candidate,
  type Exercise,
  type Metric,
  type Tab,
} from "./model"
import { art, Button, fmt, IconButton, MetricGrid } from "./ui"
import Modals, { type Overlay } from "./Modals"
type View = "main" | "plan" | "workout" | "history" | "updates" | "summary" | "conversations"
const tabs = [
  { id: "home", label: "Home", icon: House },
  { id: "train", label: "Train", icon: Dumbbell },
  { id: "body", label: "Body Planet", icon: Globe2 },
  { id: "coach", label: "AI Coach", icon: MessageCircle },
] as const
export default function App() {
  const state = useAppState()
  const hash = location.hash.slice(1).split("/")[0]
  const [tab, setTab] = useState<Tab>(
    tabs.some((t) => t.id === hash) ? hash as Tab : "home",
  )
  const [view, setView] = useState<View>("main")
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [metric, setMetric] = useState<Metric | null>(null)
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState<string | null>(restoreError)
  const [notice, setNotice] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const [keyboard, setKeyboard] = useState(false)
  const [exercise, setExercise] = useState<Exercise>(EXERCISES[0])
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [coachStatus, setCoachStatus] =
    useState<"idle" | "generating" | "unavailable" | "failed">("idle")
  const [providerReady, setProviderReady] = useState<boolean | null>(null)
  const abort = useRef<AbortController | null>(null)
  const planet = useRef<{ command: (action: string, metric?: Metric) => void }>(
    null,
  )
  const content = useRef<HTMLDivElement>(null)
  const chat = activeConversation(state)
  const session = state.session
  const reduceMotion = state.settings.reduceMotion
  const totalSets = session?.exercises.reduce((sum, e) => sum + e.sets, 0) ?? 0
  const complete =
    !!session && session.completedSets === totalSets && totalSets > 0
  function action(fn: () => void) {
    setError(null)
    try {
      fn()
      return true
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Try again.",
      )
      return false
    }
  }
  function navigate(next: Tab, nextView: View = "main") {
    setOverlay(null)
    setError(null)
    setTab(next)
    setView(nextView)
    history.pushState(
      { tab: next, view: nextView },
      "",
      `#${next}${nextView === "main" ? "" : `/${nextView}`}`,
    )
    content.current?.scrollTo(0, 0)
  }
  function closeOverlay() {
    setOverlay(null)
    setError(null)
  }
  function open(next: Overlay) {
    setError(null)
    setOverlay(next)
  }
  function coachEntry(source: Tab) {
    action(() =>
      update((s) => {
        activeConversation(s).source = source
      }),
    )
    navigate("coach")
  }
  function newConversation() {
    abort.current?.abort()
    action(() =>
      update((s) => {
        const c = id()
        s.conversations.unshift({
          id: c,
          title: "New conversation",
          date: today(),
          messages: [],
          draft: "",
          source: null,
        })
        s.conversationId = c
      }),
    )
    setCoachStatus("idle")
    navigate("coach")
  }
  function beginWorkout(source: "planned" | "free") {
    if (session && !session.saved) {
      navigate("train", "workout")
      setNotice("Your current workout is ready to resume.")
      return
    }
    if (action(() => startSession(source))) navigate("train", "workout")
  }
  function finishWorkout() {
    if (action(saveWorkout)) {
      closeOverlay()
      navigate("train", "summary")
    }
  }
  useEffect(() => {
    history.replaceState({ tab, view: "main" }, "", `#${tab}`)
    const pop = (e: PopStateEvent) => {
      setOverlay(null)
      const h = location.hash.slice(1).split("/")
      setTab(e.state?.tab ?? (tabs.some((t) => t.id === h[0]) ? h[0] : "home"))
      setView(e.state?.view ?? "main")
    }
    window.addEventListener("popstate", pop)
    return () => window.removeEventListener("popstate", pop)
  }, [])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (session?.phase === "rest" && remaining(session, now) <= 0)
      action(endRest)
  }, [now, session])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4500)
    return () => clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    const viewport = window.visualViewport
    const resize = () =>
      setKeyboard(!!viewport && window.innerHeight - viewport.height > 140)
    viewport?.addEventListener("resize", resize)
    return () => viewport?.removeEventListener("resize", resize)
  }, [])
  useEffect(() => {
    let alive = true
    fetch("/api/coach/status")
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((v) => {
        if (alive) setProviderReady(v.available === true)
      })
      .catch(() => {
        if (alive) setProviderReady(false)
      })
    return () => {
      alive = false
      abort.current?.abort()
    }
  }, [])
  useEffect(() => {
    if (tab === "coach")
      content.current?.scrollTo({
        top: content.current.scrollHeight,
        behavior: reduceMotion ? "instant" : "smooth",
      })
  }, [chat.messages.length, coachStatus, tab, reduceMotion])
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion)
  }, [reduceMotion])
  async function sendMessage(retryText?: string) {
    if (coachStatus === "generating") return
    const text = retryText ?? chat.draft.trim()
    if (!text || text.length > 4000) return
    const conversationId = chat.id
    const before = snapshot()
    const version = before.plan?.version ?? 0
    const date = today()
    if (
      !action(() =>
        update((s) => {
          const c = s.conversations.find((c) => c.id === conversationId)!
          if (!retryText)
            c.messages.push({ id: id(), role: "user", content: text })
          c.draft = ""
          if (c.title === "New conversation") c.title = text.slice(0, 42)
        }),
      )
    )
      return
    if (!providerReady) {
      setCoachStatus("unavailable")
      return
    }
    const controller = new AbortController()
    abort.current = controller
    setCoachStatus("generating")
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: snapshot()
            .conversations.find((c) => c.id === conversationId)!
            .messages.slice(-20)
            .map(({ role, content }) => ({ role, content })),
          context: {
            source: chat.source,
            body: before.body,
            plan: before.plan,
            activeWorkout: before.session
              ? { source: before.session.source, phase: before.session.phase }
              : null,
          },
          exerciseIds: EXERCISES.map((e) => e.id),
        }),
      })
      if (!response.ok) {
        if (response.status === 503) {
          setProviderReady(false)
          setCoachStatus("unavailable")
          return
        }
        throw new Error(
          "The coach could not reply. Your question is saved; try again.",
        )
      }
      const reply = await response.json()
      if (typeof reply.content !== "string" || !reply.content.trim())
        throw new Error("The coach returned an empty response. Try again.")
      const proposal = validateCandidate(reply.plan, version, date)
      if (reply.plan && !proposal)
        throw new Error(
          "The suggested workout could not be validated. Ask the coach to try again.",
        )
      update((s) => {
        s.conversations
          .find((c) => c.id === conversationId)!
          .messages.push({
            id: id(),
            role: "assistant",
            content: reply.content.slice(0, 16000),
            candidate: proposal,
          })
      })
      setCoachStatus("idle")
    } catch (e) {
      if (controller.signal.aborted) {
        action(() =>
          update((s) => {
            s.conversations
              .find((c) => c.id === conversationId)!
              .messages.push({
                id: id(),
                role: "assistant",
                content: "Response stopped.",
                state: "stopped",
              })
          }),
        )
        setCoachStatus("idle")
      } else {
        setError(
          e instanceof Error
            ? e.message
            : "The coach could not reply. Try again.",
        )
        setCoachStatus("failed")
      }
    } finally {
      if (abort.current === controller) abort.current = null
    }
  }
  function selectMetric(value: Metric) {
    const next = metric === value ? null : value
    setMetric(next)
    setFocused(false)
    planet.current?.command(next ? "select" : "reset", next ?? undefined)
  }
  const title =
    view === "plan"
      ? "Your workout"
      : view === "workout"
        ? session?.source === "free"
          ? "Free workout"
          : "Strength training"
        : view === "summary"
          ? "Workout summary"
          : view === "history"
            ? "Training history"
            : view === "updates"
              ? "Updates"
              : view === "conversations"
                ? "Conversations"
                : tabs.find((t) => t.id === tab)!.label
  return (
    <div className={`app-shell ${keyboard ? "keyboard-open" : ""}`}>
      <div className="safe-top" aria-hidden="true">
        <span>PORTAL FITNESS</span>
        <span>
          {new Date(now).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: false,
          })}
        </span>
      </div>
      {tab === "home" && view === "main" ? (
        <header className="home-header">
          <IconButton label="Open account" onClick={() => open("account")}>
            <img className="avatar" src={art("alex-account")} alt="" />
          </IconButton>
          <div>
            <h1>Hey, {state.profile.name}</h1>
            <p>Let’s keep going today.</p>
          </div>
          <IconButton
            label="Updates"
            onClick={() => navigate("home", "updates")}
          >
            <Bell size={18} />
          </IconButton>
        </header>
      ) : (
        <header className="page-header">
          {view !== "main" && (
            <IconButton label="Go back" onClick={() => navigate(tab)}>
              <ArrowLeft size={22} />
            </IconButton>
          )}
          <div>
            <h1>{title}</h1>
            {view === "main" && (
              <p>
                {tab === "train"
                  ? "Your plan for today"
                  : tab === "body"
                    ? "Your progress shapes your world."
                    : "Here for your next step."}
              </p>
            )}
          </div>
        </header>
      )}
      <main
        ref={content}
        className={`page-content ${tab === "home" ? "home-content" : ""} ${
          tab === "body" ? "body-content" : ""
        }`}
      >
        {error && !overlay && (
          <p className="error" role="alert">
            {error}
            <button className="text-button" onClick={() => setError(null)}>
              Dismiss
            </button>
          </p>
        )}
        {view === "history" && (
          <>
            <p className="muted">
              Your saved workouts, including any sample records.
            </p>
            {state.records.length ? (
              state.records.map((r) => (
                <article className="card" key={r.id}>
                  <div className="row spread">
                    <h2>
                      {r.completed ? "Workout completed" : "Partial workout"}
                    </h2>
                    <span className="badge">
                      {r.sample ? "Sample" : `+${r.xp} XP`}
                    </span>
                  </div>
                  <p>
                    {r.date} · {Math.floor(r.seconds / 60)} min · {r.exercises}{" "}
                    exercises
                  </p>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <History />
                <h2>Your first workout starts here</h2>
                <p>Finish a workout to build your history.</p>
                <Button onClick={() => navigate("train")}>Go to Train</Button>
              </div>
            )}
          </>
        )}
        {view === "updates" && (
          <div className="empty-state">
            <Bell />
            <h2>You’re all caught up</h2>
            <p>Your reminders will appear here.</p>
            <Button secondary onClick={() => navigate("home")}>
              Back to Home
            </Button>
          </div>
        )}
        {tab === "home" && view === "main" && (
          <div className="home-cards">
            <section className="card planet-summary">
              <div className="planet-copy">
                <button className="title-link" onClick={() => navigate("body")}>
                  <h2>My Planet</h2>
                  <ChevronRight size={18} />
                </button>
                <p>LV.5 · Riverlands Era</p>
                <progress
                  value={state.xp % 800}
                  max={800}
                  aria-label="Planet experience"
                />
                <span>{state.xp % 800} / 800 XP</span>
              </div>
              <div className="planet-thumb">
                <PlanetView
                  bodyMetrics={state.body}
                  thumbnail
                  reduceMotion={reduceMotion}
                />
                <button
                  className="thumb-link"
                  aria-label="Explore Body Planet"
                  onClick={() => navigate("body")}
                />
              </div>
            </section>
            <section className="card today-card">
              <div>
                <h2>Today’s plan</h2>
                <p>
                  {state.plan
                    ? `3 tasks · ${state.plan.completed ? 2 : 1} completed`
                    : "Make a plan for today"}
                </p>
                <Button
                  onClick={() =>
                    state.plan ? open("today-plan") : navigate("train")
                  }
                >
                  {state.plan ? "View plan" : "Start training"}
                </Button>
              </div>
              <img
                src={art("maya-sport")}
                alt="Maya, your training companion"
              />
            </section>
            <section className="card week-card">
              <div className="row spread">
                <h2>History</h2>
                <button
                  className="text-button"
                  onClick={() => navigate("home", "history")}
                >
                  View history
                </button>
              </div>
              <p>
                This week ·{" "}
                {
                  new Set(
                    state.records
                      .filter((r) => {
                        const d = new Date(`${r.date}T12:00:00`)
                        const monday = new Date()
                        monday.setHours(0, 0, 0, 0)
                        monday.setDate(
                          monday.getDate() - ((monday.getDay() + 6) % 7),
                        )
                        return r.completed && d >= monday
                      })
                      .map((r) => r.date),
                  ).size
                }{" "}
                / 5
              </p>
              <div className="week-days">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                  (label, index) => {
                    const d = new Date()
                    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + index)
                    const checked = state.records.some(
                      (r) =>
                        r.completed && r.date === d.toLocaleDateString("en-CA"),
                    )
                    return (
                      <button
                        key={label}
                        aria-label={`${label}: ${
                          checked ? "completed" : "no workout"
                        }`}
                        onClick={() => navigate("home", "history")}
                      >
                        {checked ? (
                          <Check className="accent" size={22} />
                        ) : (
                          <Square size={20} />
                        )}
                        <span>{label}</span>
                      </button>
                    )
                  },
                )}
              </div>
            </section>
            <section className="card body-summary">
              <button className="title-link" onClick={() => navigate("body")}>
                <h2>Body overview</h2>
                <ChevronRight size={20} />
              </button>
              <MetricGrid body={state.body} />
            </section>
          </div>
        )}
        {tab === "train" && view === "main" && (
          <>
            {session && !session.saved ? (
              <section className="card">
                <span className="badge">Workout in progress</span>
                <h2>
                  {session.source === "free"
                    ? "Free workout"
                    : "Strength training"}
                </h2>
                <p>
                  {session.completedSets} / {totalSets} sets ·{" "}
                  {fmt(elapsed(session, now))}
                </p>
                <Button onClick={() => navigate("train", "workout")}>
                  Resume workout
                </Button>
              </section>
            ) : state.plan && !state.plan.completed ? (
              <section className="card planned-card">
                <div className="planned-copy">
                  <h2>Strength training</h2>
                  <p>
                    {state.plan.duration} min · {state.plan.exercises.length}{" "}
                    exercises
                  </p>
                  <span className="badge">Planned</span>
                </div>
                <img
                  src={art("maya-sport")}
                  alt="Maya, your training companion"
                />
                <p className="small">Warm-up · Strength · Cool-down</p>
                <Button onClick={() => navigate("train", "plan")}>
                  View workout
                </Button>
              </section>
            ) : (
              <section className="card">
                <Dumbbell className="accent" size={30} />
                <h2>
                  {state.plan?.completed
                    ? "Today’s workout is done"
                    : "Make your next move"}
                </h2>
                <p>
                  {state.plan?.completed
                    ? "Your progress is saved. Ready for something more?"
                    : "Start a free workout and add the exercises you want."}
                </p>
                <Button onClick={() => beginWorkout("free")}>
                  Start a free workout
                </Button>
              </section>
            )}
            {state.plan &&
              !state.plan.completed &&
              (!session || session.saved) && (
                <Button secondary onClick={() => beginWorkout("free")}>
                  Start a free workout
                </Button>
              )}
            {!state.plan && (
              <Button secondary onClick={() => open("edit-plan")}>
                Create today’s plan
              </Button>
            )}
            <h2>Today’s other goals</h2>
            <button className="card goal-row" onClick={() => open("edit-plan")}>
              <Footprints size={24} />
              <div>
                <strong>Walking</strong>
                <p>
                  {(state.plan?.steps ?? 8000).toLocaleString()} steps · Planned
                </p>
              </div>
              <ChevronRight size={18} />
            </button>
            <button className="card goal-row" onClick={() => open("edit-plan")}>
              <Droplet size={24} />
              <div>
                <strong>Hydration</strong>
                <p>
                  {(state.plan?.water ?? 2000).toLocaleString()} ml ·{" "}
                  {state.plan ? "Completed" : "Not recorded"}
                </p>
              </div>
              <ChevronRight size={18} />
            </button>
          </>
        )}
        {tab === "train" && view === "plan" && (
          <>
            <div className="card">
              <h2>Strength training</h2>
              <p>
                {state.plan?.duration ?? 20} min ·{" "}
                {state.plan?.exercises.length ?? 0} exercises
              </p>
              <span className="badge">Today’s plan</span>
            </div>
            {state.plan?.exercises.map((e, index) => (
              <button
                className="card exercise-row"
                key={`${e.id}-${index}`}
                onClick={() => {
                  setExercise(e)
                  open("exercise")
                }}
              >
                <span className="exercise-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2>{e.name}</h2>
                  <p>
                    {e.category} · {e.sets} sets · {e.reps}
                  </p>
                </div>
                <ChevronRight size={18} />
              </button>
            ))}
            <Button
              disabled={!state.plan || state.plan.completed}
              onClick={() => beginWorkout("planned")}
            >
              Start training
            </Button>
            <Button secondary onClick={() => open("edit-plan")}>
              Edit today’s plan
            </Button>
          </>
        )}
        {tab === "train" &&
          view === "workout" &&
          (session ? (
            <>
              <div className="row spread">
                <span className="badge">
                  {session.phase === "paused"
                    ? "Paused"
                    : session.phase === "rest"
                      ? "Rest"
                      : session.phase === "finished"
                        ? "Complete"
                        : "In progress"}
                </span>
                <span className="small">
                  {fmt(elapsed(session, now))} elapsed
                </span>
              </div>
              {!session.exercises.length ? (
                <div className="empty-state">
                  <Dumbbell size={40} />
                  <h2>Your workout, your way</h2>
                  <p>Add your first exercise to begin.</p>
                  <Button onClick={() => open("add-exercise")}>
                    <Plus size={18} /> Add exercises
                  </Button>
                </div>
              ) : (
                <>
                  <progress
                    className="session-progress"
                    value={session.completedSets}
                    max={totalSets}
                    aria-label="Completed sets"
                  />
                  <div className="card session-card">
                    <p>
                      {session.phase === "rest"
                        ? "Up next"
                        : `Exercise ${session.index + 1} of ${session.exercises.length}`}
                    </p>
                    <h2>{session.exercises[session.index].name}</h2>
                    <p>
                      Set {session.set} /{" "}
                      {session.exercises[session.index].sets} ·{" "}
                      {session.exercises[session.index].reps}
                    </p>
                    <div
                      className="timer"
                      role="timer"
                      aria-label="Time remaining"
                    >
                      {fmt(remaining(session, now))}
                    </div>
                    <p className="small">
                      {session.phase === "rest"
                        ? "Take a breath. You’re doing well."
                        : session.phase === "finished"
                          ? "All sets completed. Save your workout below."
                          : "Move with control, at your own pace."}
                    </p>
                    {session.phase === "rest" ? (
                      <Button onClick={() => action(endRest)}>Skip rest</Button>
                    ) : session.phase === "paused" ? (
                      <Button onClick={() => action(resumeSession)}>
                        <Play size={18} /> Resume
                      </Button>
                    ) : session.phase === "finished" ? (
                      <Button onClick={finishWorkout}>Save workout</Button>
                    ) : (
                      <Button onClick={() => action(completeSet)}>
                        <Check size={18} /> Complete set
                      </Button>
                    )}
                    <button
                      className="text-button"
                      onClick={() => {
                        setExercise(session.exercises[session.index])
                        open("exercise")
                      }}
                    >
                      Exercise instructions
                    </button>
                  </div>
                  {session.phase !== "finished" && (
                    <div className="two-actions">
                      <Button
                        secondary
                        onClick={() =>
                          session.phase === "paused"
                            ? action(resumeSession)
                            : action(pauseSession)
                        }
                      >
                        {session.phase === "paused" ? (
                          <Play size={18} />
                        ) : (
                          <Pause size={18} />
                        )}
                        {session.phase === "paused" ? "Resume" : "Pause"}
                      </Button>
                      <Button secondary onClick={() => open("add-exercise")}>
                        <Plus size={18} /> Add exercise
                      </Button>
                    </div>
                  )}
                  <h2>Your exercises</h2>
                  {session.exercises.map((e, index) => (
                    <div
                      className={`card exercise-row ${
                        index === session.index ? "current" : ""
                      }`}
                      key={`${e.id}-${index}`}
                    >
                      <span className="exercise-number">
                        {index < session.index ? (
                          <Check size={20} />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div>
                        <strong>{e.name}</strong>
                        <p>
                          {e.sets} sets · {e.reps}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {session.phase !== "finished" && (
                <Button
                  secondary
                  onClick={() =>
                    open(session.completedSets ? "finish" : "discard")
                  }
                >
                  Finish workout
                </Button>
              )}
            </>
          ) : (
            <div className="empty-state">
              <h2>No active workout</h2>
              <Button onClick={() => navigate("train")}>Back to Train</Button>
            </div>
          ))}
        {tab === "train" && view === "summary" && session && (
          <>
            <div className="card summary-card">
              <div className="summary-check">
                <Check size={32} />
              </div>
              <h2>
                {complete ? "You showed up. Well done." : "Every step counts."}
              </h2>
              <p>{complete ? "Workout completed" : "Partial workout saved"}</p>
              <div className="summary-metrics">
                <div>
                  <strong>
                    {Math.floor(session.elapsed / 60)}
                    <small> min</small>
                  </strong>
                  <span>Time trained</span>
                </div>
                <div>
                  <strong>{session.completedSets}</strong>
                  <span>Sets completed</span>
                </div>
                <div>
                  <strong>+{complete ? 20 : 0}</strong>
                  <span>Planet XP</span>
                </div>
              </div>
            </div>
            <Button onClick={() => navigate("home")}>Back to Home</Button>
            <Button secondary onClick={() => navigate("train", "history")}>
              View history
            </Button>
          </>
        )}
        {tab === "body" && view === "main" && (
          <>
            <div className="body-planet-stage">
              <PlanetView
                ref={planet}
                bodyMetrics={state.body}
                reduceMotion={reduceMotion}
                onRegion={(next) => {
                  setMetric(next)
                  setFocused(false)
                }}
              />
              <div className="planet-controls">
                <IconButton
                  label="Zoom in"
                  onClick={() => planet.current?.command("zoom-in")}
                >
                  <Plus size={20} />
                </IconButton>
                <IconButton
                  label="Zoom out"
                  onClick={() => planet.current?.command("zoom-out")}
                >
                  <Minus size={20} />
                </IconButton>
                <IconButton
                  label="Reset planet view"
                  onClick={() => {
                    setMetric(null)
                    setFocused(false)
                    planet.current?.command("reset")
                  }}
                >
                  <RotateCcw size={20} />
                </IconButton>
              </div>
              <p className="small center">Drag to rotate · Pinch to zoom</p>
            </div>
            {metric && (
              <section className="card region-card">
                <div className="row spread">
                  <h2>{METRICS.find((m) => m.key === metric)!.region}</h2>
                  <IconButton
                    label="Close region details"
                    onClick={() => {
                      setMetric(null)
                      setFocused(false)
                      planet.current?.command("reset")
                    }}
                  >
                    <X size={18} />
                  </IconButton>
                </div>
                <p>{METRICS.find((m) => m.key === metric)!.description}</p>
                <Button
                  secondary
                  onClick={() => {
                    planet.current?.command(
                      focused ? "select" : "focus",
                      metric,
                    )
                    setFocused(!focused)
                  }}
                >
                  {focused ? "Return to overview" : "Explore this region"}
                </Button>
              </section>
            )}
            <section className="card body-analysis">
              <h2>Body overview</h2>
              <div className="analysis-row">
                <img
                  src={art("maya-body-analysis")}
                  alt="Maya with an illustrated half-body anatomy view"
                />
                <MetricGrid body={state.body} selected={metric} onSelect={selectMetric} />
              </div>
              {!state.body && (
                <p className="small">Add measurements to shape your planet.</p>
              )}
            </section>
            <Button onClick={() => open("edit-body")}>Update body data</Button>
          </>
        )}
        {tab === "coach" && view === "main" && (
          <>
            {!chat.messages.length ? (
              <>
                <section className="card coach-welcome">
                  <MessageCircle className="accent" size={32} />
                  <h2>Your fitness companion</h2>
                  <p>
                    Plan your next workout, understand your progress, or find a
                    manageable next step.
                  </p>
                </section>
                <h2>Start a conversation</h2>
                {[
                  "Help me plan today’s workout",
                  "Explain my body measurements",
                  "I only have 15 minutes",
                ].map((text) => (
                  <Button
                    secondary
                    key={text}
                    onClick={() =>
                      action(() =>
                        update((s) => {
                          activeConversation(s).draft = text
                        }),
                      )
                    }
                  >
                    {text}
                  </Button>
                ))}
                <button
                  className="card goal-row"
                  onClick={() => navigate("coach", "conversations")}
                >
                  <History size={22} />
                  <strong>Conversation history</strong>
                  <ChevronRight size={18} />
                </button>
              </>
            ) : (
              <>
                <div className="row spread">
                  <button className="text-button" onClick={newConversation}>
                    <Plus size={16} /> New chat
                  </button>
                  <button
                    className="text-button"
                    onClick={() => navigate("coach", "conversations")}
                  >
                    <History size={16} /> History
                  </button>
                </div>
                {chat.messages.map((m) => (
                  <article key={m.id} className={`message ${m.role}`}>
                    <span className="message-author">
                      {m.role === "user" ? "You" : "AI Coach"}
                    </span>
                    <p>{m.content}</p>
                    {m.candidate && (
                      <div className="plan-suggestion">
                        <h2>Suggested workout</h2>
                        <p>
                          {m.candidate.duration} min ·{" "}
                          {m.candidate.exerciseIds.length} exercises
                        </p>
                        <Button
                          onClick={() => {
                            setCandidate(m.candidate!)
                            open("review")
                          }}
                        >
                          Review changes
                        </Button>
                      </div>
                    )}
                  </article>
                ))}
              </>
            )}
            {chat.source && (
              <div className="context-chip">
                <Info size={16} /> Context from{" "}
                {tabs.find((t) => t.id === chat.source)?.label}
                <IconButton
                  label="Clear conversation context"
                  onClick={() =>
                    action(() =>
                      update((s) => {
                        activeConversation(s).source = null
                      }),
                    )
                  }
                >
                  <X size={16} />
                </IconButton>
              </div>
            )}
            {coachStatus === "generating" && (
              <div className="card" role="status">
                <p>AI Coach is thinking…</p>
                <Button secondary onClick={() => abort.current?.abort()}>
                  Stop response
                </Button>
              </div>
            )}
            {coachStatus === "unavailable" && (
              <div className="card" role="status">
                <h2>Coach isn’t connected yet</h2>
                <p>
                  Your question is saved. Once the coaching service is
                  connected, you can continue here.
                </p>
                <Button
                  secondary
                  onClick={() => {
                    setCoachStatus("idle")
                    action(() =>
                      update((s) => {
                        activeConversation(s).draft =
                          [...activeConversation(s).messages]
                            .reverse()
                            .find((m) => m.role === "user")?.content ?? ""
                      }),
                    )
                  }}
                >
                  Keep question as draft
                </Button>
              </div>
            )}
            {coachStatus === "failed" && (
              <Button
                secondary
                onClick={() => {
                  const text = [...chat.messages]
                    .reverse()
                    .find((m) => m.role === "user")?.content
                  if (text) void sendMessage(text)
                }}
              >
                Retry response
              </Button>
            )}
          </>
        )}
        {tab === "coach" && view === "conversations" && (
          <>
            <Button secondary onClick={newConversation}>
              <Plus size={18} /> New conversation
            </Button>
            {state.conversations.map((c) => (
              <button
                className="card goal-row"
                key={c.id}
                onClick={() => {
                  abort.current?.abort()
                  action(() =>
                    update((s) => {
                      s.conversationId = c.id
                    }),
                  )
                  setCoachStatus("idle")
                  navigate("coach")
                }}
              >
                <MessageCircle size={20} />
                <div>
                  <strong>{c.title}</strong>
                  <p>
                    {c.date} · {c.messages.length} messages
                  </p>
                </div>
                <ChevronRight size={18} />
              </button>
            ))}
          </>
        )}
      </main>
      <footer className="app-footer">
        {tab === "coach" && view === "main" ? (
          <form
            className="coach-composer"
            onSubmit={(e) => {
              e.preventDefault()
              void sendMessage()
            }}
          >
            <label className="sr-only" htmlFor="coach-input">
              Ask AI Coach
            </label>
            <textarea
              id="coach-input"
              rows={1}
              placeholder="Ask AI Coach…"
              maxLength={4000}
              value={chat.draft}
              onChange={(e) =>
                action(() =>
                  update((s) => {
                    activeConversation(s).draft = e.target.value
                  }),
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault()
                  void sendMessage()
                }
              }}
            />
            <button
              className="send-button"
              type="submit"
              aria-label="Send message"
              disabled={!chat.draft.trim() || coachStatus === "generating"}
            >
              <Send size={22} />
            </button>
          </form>
        ) : (
          tab !== "coach" && (
            <button className="ai-quick" onClick={() => coachEntry(tab)}>
              <MessageCircle size={24} />
              <span>Ask AI Coach…</span>
              <ArrowRight size={22} />
            </button>
          )
        )}
        {!keyboard && (
          <nav className="bottom-nav" aria-label="Main navigation">
            {tabs.map((t) => (
              <button
                key={t.id}
                aria-current={tab === t.id ? "page" : undefined}
                onClick={() => navigate(t.id)}
              >
                <t.icon size={24} strokeWidth={1.7} />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        )}
      </footer>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      {overlay && (
        <Modals
          key={overlay}
          overlay={overlay}
          setOverlay={open}
          close={closeOverlay}
          state={state}
          error={error}
          setError={setError}
          action={action}
          notify={setNotice}
          navigate={navigate}
          exercise={exercise}
          candidate={candidate}
          setCandidate={setCandidate}
          finishWorkout={finishWorkout}
        />
      )}
    </div>
  )
}
