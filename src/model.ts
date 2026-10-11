import { useSyncExternalStore } from "react"

export type Tab = "home" | "train" | "body" | "coach"
export type Metric = "muscle" | "water" | "bone" | "fat"
export type BodyMetrics = Record<Metric, number>
export type Exercise = {
  id: string
  name: string
  category: string
  sets: number
  reps: string
  seconds: number
  instruction: string
}
export type Plan = {
  id: string
  date: string
  version: number
  duration: number
  steps: number
  water: number
  exercises: Exercise[]
  completed: boolean
}
export type Session = {
  id: string
  source: "free" | "planned"
  planId?: string
  planVersion?: number
  date: string
  exercises: Exercise[]
  index: number
  set: number
  completedSets: number
  phase: "active" | "rest" | "paused" | "finished"
  resumePhase: "active" | "rest"
  phaseStarted: number
  remaining: number
  elapsed: number
  startedAt: number | null
  saved: boolean
}
export type RecordEntry = {
  id: string
  date: string
  seconds: number
  exercises: number
  completed: boolean
  xp: number
  sample?: boolean
}
export type Candidate = {
  duration: number
  exerciseIds: string[]
  baseVersion: number
  date: string
}
export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  state?: "failed" | "stopped"
  candidate?: Candidate
}
export type Conversation = {
  id: string
  title: string
  date: string
  messages: Message[]
  draft: string
  source: Tab | null
}
export type AppState = {
  schema: 1
  profile: {
    name: string
    email: string
  }
  settings: { reduceMotion: boolean }
  body: BodyMetrics | null
  bodyUpdated: string | null
  plan: Plan | null
  session: Session | null
  records: RecordEntry[]
  xp: number
  conversations: Conversation[]
  conversationId: string
  notifications: string[]
}

export const STORAGE_KEY = "portal-fitness:v1"
export const EXERCISES: Exercise[] = [
  {
    id: "arm-circles",
    name: "Arm circles",
    category: "Warm-up",
    sets: 1,
    reps: "3 min",
    seconds: 180,
    instruction:
      "Stand tall. Start with small circles and gradually widen them. Keep shoulders relaxed.",
  },
  {
    id: "squat",
    name: "Bodyweight squat",
    category: "Strength",
    sets: 3,
    reps: "12 reps",
    seconds: 90,
    instruction:
      "Feet shoulder-width apart. Sit your hips back, keep your chest lifted, and drive through your feet.",
  },
  {
    id: "push-up",
    name: "Push-up",
    category: "Strength",
    sets: 3,
    reps: "8 reps",
    seconds: 90,
    instruction:
      "Keep a straight line from head to heels. Lower with control. Use an incline or knees if needed.",
  },
  {
    id: "plank",
    name: "Plank",
    category: "Strength",
    sets: 2,
    reps: "45 sec",
    seconds: 45,
    instruction:
      "Elbows under shoulders. Brace your torso and breathe steadily. Keep hips level.",
  },
  {
    id: "stretch",
    name: "Full-body stretch",
    category: "Cool-down",
    sets: 1,
    reps: "3 min",
    seconds: 180,
    instruction:
      "Slow your breathing. Ease into gentle stretches without bouncing or forcing range.",
  },
  {
    id: "reverse-lunge",
    name: "Reverse lunge",
    category: "Strength",
    sets: 3,
    reps: "10 each side",
    seconds: 90,
    instruction:
      "Step backward, lower both knees comfortably, then push through the front foot to stand.",
  },
  {
    id: "dead-bug",
    name: "Dead bug",
    category: "Strength",
    sets: 3,
    reps: "10 each side",
    seconds: 90,
    instruction:
      "Lie on your back and brace your torso. Slowly extend opposite arm and leg, then switch.",
  },
  {
    id: "jumping-jack",
    name: "Jumping jack",
    category: "Cardio",
    sets: 3,
    reps: "45 sec",
    seconds: 45,
    instruction:
      "Land softly. Step out one foot at a time for a low-impact option.",
  },
]
export const METRICS: {
  key: Metric
  label: string
  unit: string
  region: string
  description: string
}[] = [
  {
    key: "muscle",
    label: "Muscle",
    unit: "kg",
    region: "Mountain ranges",
    description: "Muscle changes the height of the mountain ridges.",
  },
  {
    key: "water",
    label: "Water",
    unit: "%",
    region: "Rivers & lakes",
    description:
      "Water changes the width of the river valleys and their channels.",
  },
  {
    key: "bone",
    label: "Bone",
    unit: "kg",
    region: "Polar ice",
    description: "Bone changes the relief of the polar ice plateau.",
  },
  {
    key: "fat",
    label: "Body fat",
    unit: "%",
    region: "Climate & forest",
    description: "Body fat changes the moisture and vegetation of your world.",
  },
]
export const id = () => crypto.randomUUID()
export const today = () =>
  new Date()
    .toLocaleDateString("en-CA")
    .replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$1-$2")
export const DEFAULT_BODY: BodyMetrics = {
  muscle: 32.8,
  water: 58.3,
  bone: 3.1,
  fat: 18.7,
}
export function planExercises(
  duration: number,
  exerciseIds = ["arm-circles", "squat", "push-up", "plank", "stretch"],
) {
  const items = exerciseIds
    .map((value) => EXERCISES.find((e) => e.id === value))
    .filter((e): e is Exercise => !!e)
    .map((e) => ({ ...e }))
  const total = items.reduce(
    (sum, e) => sum + e.sets * e.seconds + (e.sets - 1) * 30,
    0,
  )
  return items.map((e) => ({
    ...e,
    seconds: Math.max(
      10,
      Math.round(
        ((duration * 60 - items.reduce((s, x) => s + (x.sets - 1) * 30, 0)) *
          e.seconds) /
          Math.max(1, total - items.reduce((s, x) => s + (x.sets - 1) * 30, 0)),
      ),
    ),
  }))
}
function seed(): AppState {
  const conversationId = id()
  const monday = new Date()
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const records = [0, 1, 2]
    .filter((d) => d <= (new Date().getDay() + 6) % 7)
    .map((d) => {
      const date = new Date(monday)
      date.setDate(date.getDate() + d)
      return {
        id: `sample-${d}`,
        date: date.toLocaleDateString("en-CA"),
        seconds: 1200,
        exercises: 5,
        completed: true,
        xp: 0,
        sample: true,
      }
    })
  return {
    schema: 1,
    profile: { name: "Alex", email: "alex@example.com" },
    settings: { reduceMotion: false },
    body: DEFAULT_BODY,
    bodyUpdated: null,
    plan: {
      id: id(),
      date: today(),
      version: 1,
      duration: 20,
      steps: 8000,
      water: 2000,
      exercises: planExercises(20),
      completed: false,
    },
    session: null,
    records,
    xp: 320,
    conversations: [
      {
        id: conversationId,
        title: "New conversation",
        date: today(),
        messages: [],
        draft: "",
        source: null,
      },
    ],
    conversationId,
    notifications: [],
  }
}
export function bodyErrors(values: Record<Metric, unknown>) {
  const errors: Partial<Record<Metric, string>> = {}
  for (const { key, unit } of METRICS) {
    const value = Number(values[key])
    if (
      String(values[key]).trim() === "" ||
      !Number.isFinite(value) ||
      (unit === "%" ? value < 0 || value > 100 : value <= 0 || value > 500)
    )
      errors[key] =
        unit === "%"
          ? "Enter a number between 0 and 100."
          : "Enter a number greater than 0 and no more than 500."
  }
  return errors
}
export let restoreError: string | null = null
function restore(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed()
    const saved = JSON.parse(raw) as AppState
    if (
      saved.schema !== 1 ||
      !saved.profile?.name ||
      !saved.settings ||
      !Array.isArray(saved.records) ||
      !Array.isArray(saved.conversations) ||
      !saved.conversations.length ||
      !Number.isFinite(saved.xp) ||
      (saved.body && Object.keys(bodyErrors(saved.body)).length)
    )
      throw new Error("Invalid saved data")
    if (!saved.conversations.some((c) => c.id === saved.conversationId))
      saved.conversationId = saved.conversations[0].id
    if (saved.plan?.date !== today()) saved.plan = null
    return saved
  } catch {
    restoreError =
      "Saved data could not be read. A fresh sample profile is shown; your previous data has not been overwritten."
    return seed()
  }
}
let state = restore()
const subscribers = new Set<() => void>()
export const snapshot = () => state
export function update(change: (draft: AppState) => void) {
  const next = structuredClone(state)
  change(next)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    throw new Error(
      "Changes could not be saved on this device. Free up browser storage and try again.",
    )
  }
  state = next
  subscribers.forEach((fn) => fn())
}
export function useAppState() {
  return useSyncExternalStore(
    (fn) => {
      subscribers.add(fn)
      return () => {
        subscribers.delete(fn)
      }
    },
    snapshot,
    snapshot,
  )
}
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY && event.newValue) {
    state = restore()
    subscribers.forEach((fn) => fn())
  }
})
export const activeConversation = (s: AppState) =>
  s.conversations.find((c) => c.id === s.conversationId)!
export function elapsed(session: Session, now = Date.now()) {
  return (
    session.elapsed +
    (session.startedAt ? Math.max(0, (now - session.startedAt) / 1000) : 0)
  )
}
export function remaining(session: Session, now = Date.now()) {
  return Math.max(
    0,
    session.remaining -
      (session.phase === "active" || session.phase === "rest"
        ? (now - session.phaseStarted) / 1000
        : 0),
  )
}
export function startSession(source: Session["source"]) {
  update((s) => {
    if (s.session && !s.session.saved)
      throw new Error("Resume or finish your current workout first.")
    const plan = source === "planned" ? s.plan : null
    if (
      source === "planned" &&
      (!plan || plan.date !== today() || plan.completed)
    )
      throw new Error(
        "This plan is no longer available. Review today’s plan again.",
      )
    const exercises = plan ? structuredClone(plan.exercises) : []
    s.session = {
      id: id(),
      source,
      planId: plan?.id,
      planVersion: plan?.version,
      date: today(),
      exercises,
      index: 0,
      set: 1,
      completedSets: 0,
      phase: exercises.length ? "active" : "paused",
      resumePhase: "active",
      phaseStarted: Date.now(),
      remaining: exercises[0]?.seconds ?? 0,
      elapsed: 0,
      startedAt: exercises.length ? Date.now() : null,
      saved: false,
    }
  })
}
export function pauseSession() {
  update((s) => {
    const x = s.session!
    if (x.phase !== "active" && x.phase !== "rest") return
    x.remaining = remaining(x)
    x.elapsed = elapsed(x)
    x.startedAt = null
    x.resumePhase = x.phase
    x.phase = "paused"
  })
}
export function resumeSession() {
  update((s) => {
    const x = s.session!
    if (!x.exercises.length || x.phase !== "paused") return
    x.phase = x.resumePhase
    x.phaseStarted = Date.now()
    x.startedAt = Date.now()
  })
}
export function completeSet() {
  update((s) => {
    const x = s.session!
    if (x.phase !== "active") return
    x.completedSets++
    const exercise = x.exercises[x.index]
    if (x.set < exercise.sets) {
      x.set++
      x.phase = "rest"
      x.remaining = 30
    } else if (x.index < x.exercises.length - 1) {
      x.index++
      x.set = 1
      x.phase = "rest"
      x.remaining = 30
    } else {
      x.elapsed = elapsed(x)
      x.startedAt = null
      x.phase = "finished"
      x.remaining = 0
    }
    x.phaseStarted = Date.now()
  })
}
export function endRest() {
  update((s) => {
    const x = s.session!
    if (x.phase !== "rest") return
    x.phase = "active"
    x.phaseStarted = Date.now()
    x.remaining = x.exercises[x.index].seconds
  })
}
export function appendExercises(exerciseIds: string[]) {
  update((s) => {
    const x = s.session!
    if (x.saved || x.phase === "finished")
      throw new Error("This workout has ended.")
    const empty = !x.exercises.length
    x.exercises.push(
      ...exerciseIds
        .map((value) => EXERCISES.find((e) => e.id === value))
        .filter((e): e is Exercise => !!e)
        .map((e) => ({ ...e })),
    )
    if (empty && x.exercises.length) {
      x.phase = "active"
      x.phaseStarted = Date.now()
      x.startedAt = Date.now()
      x.remaining = x.exercises[0].seconds
    }
  })
}
export function saveWorkout() {
  update((s) => {
    const x = s.session!
    if (x.saved || s.records.some((r) => r.id === x.id)) return
    if (!x.completedSets)
      throw new Error("Complete at least one set before saving a workout.")
    const complete =
      x.completedSets === x.exercises.reduce((sum, e) => sum + e.sets, 0)
    x.elapsed = elapsed(x)
    x.startedAt = null
    x.phase = "finished"
    x.saved = true
    const xp = complete ? 20 : 0
    s.records.unshift({
      id: x.id,
      date: x.date,
      seconds: Math.round(x.elapsed),
      exercises: x.exercises.length,
      completed: complete,
      xp,
    })
    s.xp += xp
    if (
      complete &&
      s.plan &&
      s.plan.id === x.planId &&
      s.plan.version === x.planVersion
    )
      s.plan.completed = true
  })
}
export function savePlan(
  duration: number,
  steps: number,
  water: number,
  expected: number | null,
  date: string,
  exerciseIds?: string[],
) {
  update((s) => {
    if (date !== today())
      throw new Error(
        "The day has changed. Open today’s plan and review your changes again.",
      )
    if ((s.plan?.version ?? null) !== expected)
      throw new Error(
        "Your plan changed while you were editing. Review the latest version before saving.",
      )
    if (
      !Number.isInteger(duration) ||
      duration < 5 ||
      duration > 180 ||
      !Number.isInteger(steps) ||
      steps < 1000 ||
      steps > 100000 ||
      !Number.isInteger(water) ||
      water < 250 ||
      water > 10000
    )
      throw new Error(
        "Check your goals: 5–180 minutes, 1,000–100,000 steps and 250–10,000 ml.",
      )
    const exercises = planExercises(
      duration,
      exerciseIds ?? s.plan?.exercises.map((e) => e.id),
    )
    if (!exercises.length) throw new Error("Choose at least one exercise.")
    s.plan = {
      id: s.plan?.id ?? id(),
      date,
      version: (expected ?? 0) + 1,
      duration,
      steps,
      water,
      exercises,
      completed: false,
    }
  })
}
export function validateCandidate(
  value: unknown,
  baseVersion: number,
  date: string,
): Candidate | undefined {
  if (!value || typeof value !== "object") return
  const p = value as {
    duration?: number
    exerciseIds?: string[]
  }
  if (
    !Number.isInteger(p.duration) ||
    p.duration! < 5 ||
    p.duration! > 180 ||
    !Array.isArray(p.exerciseIds) ||
    !p.exerciseIds.length ||
    p.exerciseIds.length > 12 ||
    p.exerciseIds.some((v) => !EXERCISES.some((e) => e.id === v)) ||
    new Set(p.exerciseIds).size !== p.exerciseIds.length
  )
    return
  return {
    duration: p.duration!,
    exerciseIds: p.exerciseIds,
    baseVersion,
    date,
  }
}
