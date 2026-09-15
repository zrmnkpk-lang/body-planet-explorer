import { useMemo, useState } from "react";
import {
  Activity,
  Bike,
  CalendarRange,
  Check,
  ChevronRight,
  Dumbbell,
  Footprints,
  Globe2,
  History,
  LibraryBig,
  Mountain,
  Pencil,
  Play,
  Plus,
  Save,
  Search,
  Star,
  Timer,
  Trash2,
  Waves,
  X,
} from "lucide-react";
import {
  CATEGORY_META,
  EQUIPMENT_OPTIONS,
  EXERCISES,
  getExercise,
  searchExercises,
  type Exercise,
  type ExerciseCategory,
} from "./exerciseLibrary";

type AppTab = "train" | "plans" | "library" | "history";

interface WorkoutSet {
  id: string;
  weight: number;
  reps: number;
  rpe: number;
  completed: boolean;
}

interface SessionItem {
  id: string;
  exerciseId: string;
  sets: WorkoutSet[];
  distanceKm: number;
  durationMinutes: number;
  laps: number;
  stroke: string;
  notes: string;
}

interface WorkoutSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  notes: string;
  planId?: string;
  items: SessionItem[];
  credits?: number;
  createdAt?: string;
}

interface WorkoutPlan {
  id: string;
  name: string;
  frequency: number;
  exerciseIds: string[];
  updatedAt: string;
}

const QUICK_STARTS = [
  { exerciseId: "running-01", label: "跑步", icon: Footprints },
  { exerciseId: "cardio-01", label: "骑行", icon: Bike },
  { exerciseId: "swimming-01", label: "游泳", icon: Waves },
  { exerciseId: "outdoor-06", label: "登山", icon: Mountain },
];

const DEFAULT_PLAN: WorkoutPlan = {
  id: "starter-full-body",
  name: "新手全身力量",
  frequency: 3,
  exerciseIds: [
    "barbell-compound-01",
    "barbell-compound-05",
    "machine-cable-08",
    "dumbbell-lower-03",
    "bodyweight-20",
  ],
  updatedAt: new Date(0).toISOString(),
};

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function currentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });

  const update = (next: T | ((current: T) => T)) => {
    setValue((current) => {
      const resolved =
        typeof next === "function"
          ? (next as (current: T) => T)(current)
          : next;
      window.localStorage.setItem(key, JSON.stringify(resolved));
      return resolved;
    });
  };

  return [value, update] as const;
}

function emptySet(): WorkoutSet {
  return {
    id: uid("set"),
    weight: 0,
    reps: 10,
    rpe: 7,
    completed: false,
  };
}

function itemFor(exerciseId: string): SessionItem {
  const exercise = getExercise(exerciseId);
  return {
    id: uid("item"),
    exerciseId,
    sets: exercise?.tracking === "sets" ? [emptySet(), emptySet(), emptySet()] : [],
    distanceKm: 0,
    durationMinutes: 30,
    laps: 0,
    stroke: "自由泳",
    notes: "",
  };
}

function emptySession(title = "自由训练"): WorkoutSession {
  return {
    id: uid("session"),
    title,
    date: today(),
    startTime: currentTime(),
    durationMinutes: 45,
    notes: "",
    items: [],
  };
}

function calculateCredits(session: WorkoutSession): number {
  const effort = session.items.reduce((sum, item) => {
    const exercise = getExercise(item.exerciseId);
    if (!exercise) return sum;
    if (exercise.tracking === "sets") {
      return sum + item.sets.filter((set) => set.completed).length * 12;
    }
    if (exercise.tracking === "swim") {
      return sum + item.durationMinutes * 0.8 + item.distanceKm * 18;
    }
    if (exercise.tracking === "distance") {
      return sum + item.durationMinutes * 0.65 + item.distanceKm * 6;
    }
    return sum + item.durationMinutes * 0.8;
  }, 0);
  return Math.min(120, Math.max(20, Math.round(effort || session.durationMinutes)));
}

function sessionSummary(session: WorkoutSession): string {
  const strengthSets = session.items.reduce(
    (count, item) => count + item.sets.filter((set) => set.completed).length,
    0,
  );
  const distance = session.items.reduce((sum, item) => sum + item.distanceKm, 0);
  const pieces = [`${session.durationMinutes} 分钟`];
  if (strengthSets) pieces.push(`${strengthSets} 组`);
  if (distance) pieces.push(`${distance.toFixed(1)} km`);
  return pieces.join(" · ");
}

function ExerciseIcon({ exercise }: { exercise: Exercise }) {
  const Icon =
    exercise.category === "strength"
      ? Dumbbell
      : exercise.category === "running"
        ? Footprints
        : exercise.category === "swimming"
          ? Waves
          : exercise.category === "outdoor"
            ? Mountain
            : Activity;
  return <Icon size={18} aria-hidden="true" />;
}

function ExercisePicker({
  onClose,
  onSelect,
  favorites,
  toggleFavorite,
}: {
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ExerciseCategory | "all">("all");
  const [equipment, setEquipment] = useState<string | "all">("all");
  const results = useMemo(
    () => searchExercises(query, category, equipment),
    [query, category, equipment],
  );

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="picker-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="选择训练动作"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sheet-header">
          <div>
            <p className="eyebrow">EXERCISE ATLAS</p>
            <h2>选择训练动作</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>

        <label className="search-field">
          <Search size={18} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索动作、肌群、器械或别名"
          />
        </label>

        <div className="chip-row category-row">
          <button
            className={category === "all" ? "chip active" : "chip"}
            onClick={() => setCategory("all")}
          >
            全部 {EXERCISES.length}
          </button>
          {(Object.entries(CATEGORY_META) as [ExerciseCategory, (typeof CATEGORY_META)[ExerciseCategory]][]).map(
            ([key, meta]) => (
              <button
                key={key}
                className={category === key ? "chip active" : "chip"}
                onClick={() => setCategory(key)}
              >
                {meta.label}
              </button>
            ),
          )}
        </div>

        <label className="select-field compact-select">
          <span>器械</span>
          <select value={equipment} onChange={(event) => setEquipment(event.target.value)}>
            <option value="all">全部器械</option>
            {EQUIPMENT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="picker-results">
          {results.map((exercise) => (
            <div className="exercise-row" key={exercise.id}>
              <button
                className="favorite-button"
                onClick={() => toggleFavorite(exercise.id)}
                aria-label={favorites.includes(exercise.id) ? "取消收藏" : "收藏动作"}
              >
                <Star
                  size={17}
                  fill={favorites.includes(exercise.id) ? "currentColor" : "none"}
                />
              </button>
              <button className="exercise-main" onClick={() => onSelect(exercise)}>
                <span
                  className="exercise-icon"
                  style={{ color: CATEGORY_META[exercise.category].color }}
                >
                  <ExerciseIcon exercise={exercise} />
                </span>
                <span>
                  <strong>{exercise.name}</strong>
                  <small>
                    {exercise.group} · {exercise.equipment}
                  </small>
                </span>
                <Plus size={18} />
              </button>
            </div>
          ))}
          {!results.length && <div className="empty-state">没有找到匹配动作</div>}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<AppTab>("train");
  const [sessions, setSessions] = useStoredState<WorkoutSession[]>(
    "portal-workout-sessions-v1",
    [],
  );
  const [plans, setPlans] = useStoredState<WorkoutPlan[]>("portal-workout-plans-v1", [
    DEFAULT_PLAN,
  ]);
  const [favorites, setFavorites] = useStoredState<string[]>(
    "portal-exercise-favorites-v1",
    [],
  );
  const [activeSession, setActiveSession] = useStoredState<WorkoutSession | null>(
    "portal-active-session-v1",
    null,
  );
  const [pickerMode, setPickerMode] = useState<"session" | "plan" | null>(null);
  const [draftPlan, setDraftPlan] = useState<WorkoutPlan | null>(null);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryCategory, setLibraryCategory] = useState<ExerciseCategory | "all">("all");
  const [notice, setNotice] = useState<string | null>(null);

  const weekCredits = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return sessions
      .filter((session) => new Date(session.createdAt ?? session.date).getTime() >= cutoff)
      .reduce((sum, session) => sum + (session.credits ?? 0), 0);
  }, [sessions]);
  const creditTarget = 320;
  const progress = Math.min(100, Math.round((weekCredits / creditTarget) * 100));

  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const startQuick = (exerciseId?: string, title = "自由训练") => {
    const session = emptySession(title);
    if (exerciseId) session.items = [itemFor(exerciseId)];
    setActiveSession(session);
    setTab("train");
  };

  const startPlan = (plan: WorkoutPlan) => {
    const session = emptySession(plan.name);
    session.planId = plan.id;
    session.items = plan.exerciseIds.map(itemFor);
    setActiveSession(session);
    setTab("train");
  };

  const patchSession = (patch: Partial<WorkoutSession>) => {
    setActiveSession((current) => (current ? { ...current, ...patch } : current));
  };

  const patchItem = (itemId: string, patch: Partial<SessionItem>) => {
    setActiveSession((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.id === itemId ? { ...item, ...patch } : item,
            ),
          }
        : current,
    );
  };

  const saveSession = () => {
    if (!activeSession || !activeSession.items.length) return;
    const completed: WorkoutSession = {
      ...activeSession,
      credits: calculateCredits(activeSession),
      createdAt: new Date().toISOString(),
    };
    setSessions((current) => [completed, ...current]);
    setActiveSession(null);
    setNotice(`训练已保存，星球获得 ${completed.credits} Credit`);
    setTab("history");
    window.setTimeout(() => setNotice(null), 3200);
  };

  const savePlan = () => {
    if (!draftPlan || !draftPlan.name.trim() || !draftPlan.exerciseIds.length) return;
    const next = { ...draftPlan, name: draftPlan.name.trim(), updatedAt: new Date().toISOString() };
    setPlans((current) => {
      const exists = current.some((plan) => plan.id === next.id);
      return exists
        ? current.map((plan) => (plan.id === next.id ? next : plan))
        : [next, ...current];
    });
    setDraftPlan(null);
    setNotice("训练方案已保存");
    window.setTimeout(() => setNotice(null), 2400);
  };

  const addPickedExercise = (exercise: Exercise) => {
    if (pickerMode === "session") {
      setActiveSession((current) =>
        current ? { ...current, items: [...current.items, itemFor(exercise.id)] } : current,
      );
    }
    if (pickerMode === "plan" && draftPlan) {
      if (!draftPlan.exerciseIds.includes(exercise.id)) {
        setDraftPlan({
          ...draftPlan,
          exerciseIds: [...draftPlan.exerciseIds, exercise.id],
        });
      }
    }
    setPickerMode(null);
  };

  const libraryResults = useMemo(
    () => searchExercises(libraryQuery, libraryCategory, "all"),
    [libraryQuery, libraryCategory],
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" onClick={() => setTab("train")}>
          <span className="brand-orbit"><Globe2 size={23} /></span>
          <span><strong>PORTAL</strong><small>FITNESS LOG</small></span>
        </button>
        <div className="header-credit">
          <span>{weekCredits}</span>
          <small>/ {creditTarget} CREDIT</small>
        </div>
      </header>

      <main>
        {tab === "train" && !activeSession && (
          <section className="page page-train">
            <div className="planet-progress-card">
              <div className="planet-copy">
                <p className="eyebrow">WEEKLY TERRAFORM</p>
                <h1>本周地貌进度</h1>
                <p>
                  {weekCredits >= creditTarget
                    ? "能量已经充满，可以准备下一次星球演化。"
                    : `还差 ${creditTarget - weekCredits} Credit，继续为造山带注入能量。`}
                </p>
                <div className="progress-track" aria-label={`进度 ${progress}%`}>
                  <span style={{ width: `${progress}%` }} />
                </div>
                <strong className="progress-label">{progress}%</strong>
              </div>
              <div className="planet-visual" aria-hidden="true">
                <div className="planet-sphere" />
              </div>
            </div>

            <div className="section-heading">
              <div>
                <p className="eyebrow">QUICK START</p>
                <h2>开始训练</h2>
              </div>
              <button className="text-button" onClick={() => startQuick()}>
                自由记录 <ChevronRight size={16} />
              </button>
            </div>

            <div className="quick-grid">
              {QUICK_STARTS.map(({ exerciseId, label, icon: Icon }) => (
                <button key={exerciseId} className="quick-card" onClick={() => startQuick(exerciseId, label)}>
                  <span><Icon size={22} /></span>
                  <strong>{label}</strong>
                  <small>快速记录</small>
                </button>
              ))}
            </div>

            <div className="section-heading plan-heading">
              <div>
                <p className="eyebrow">TODAY'S PLAN</p>
                <h2>训练方案</h2>
              </div>
              <button className="text-button" onClick={() => setTab("plans")}>
                全部方案 <ChevronRight size={16} />
              </button>
            </div>
            <div className="plan-preview-list">
              {plans.slice(0, 2).map((plan) => (
                <article className="plan-preview" key={plan.id}>
                  <div className="plan-mark"><Dumbbell size={20} /></div>
                  <div>
                    <h3>{plan.name}</h3>
                    <p>{plan.exerciseIds.length} 个动作 · 每周 {plan.frequency} 次</p>
                  </div>
                  <button className="play-button" onClick={() => startPlan(plan)} aria-label={`开始${plan.name}`}>
                    <Play size={18} fill="currentColor" />
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "train" && activeSession && (
          <section className="page session-page">
            <div className="session-topbar">
              <button className="icon-button" onClick={() => setActiveSession(null)} aria-label="退出训练">
                <X size={20} />
              </button>
              <div>
                <p className="eyebrow">WORKOUT LOG</p>
                <input
                  className="title-input"
                  value={activeSession.title}
                  onChange={(event) => patchSession({ title: event.target.value })}
                  aria-label="训练名称"
                />
              </div>
              <button className="primary-button small" onClick={saveSession} disabled={!activeSession.items.length}>
                <Save size={17} /> 保存
              </button>
            </div>

            <div className="session-meta form-card">
              <label><span>日期</span><input type="date" value={activeSession.date} onChange={(event) => patchSession({ date: event.target.value })} /></label>
              <label><span>开始</span><input type="time" value={activeSession.startTime} onChange={(event) => patchSession({ startTime: event.target.value })} /></label>
              <label><span>总时长</span><div className="unit-input"><input type="number" min="1" value={activeSession.durationMinutes} onChange={(event) => patchSession({ durationMinutes: Number(event.target.value) })} /><small>分钟</small></div></label>
            </div>

            <div className="session-items">
              {activeSession.items.map((item, itemIndex) => {
                const exercise = getExercise(item.exerciseId);
                if (!exercise) return null;
                return (
                  <article className="exercise-card" key={item.id}>
                    <header>
                      <span className="exercise-number">{String(itemIndex + 1).padStart(2, "0")}</span>
                      <div>
                        <h3>{exercise.name}</h3>
                        <p>{exercise.group} · {exercise.equipment}</p>
                      </div>
                      <button
                        className="icon-button subtle"
                        onClick={() => patchSession({ items: activeSession.items.filter((current) => current.id !== item.id) })}
                        aria-label="删除动作"
                      >
                        <Trash2 size={17} />
                      </button>
                    </header>

                    {exercise.tracking === "sets" && (
                      <div className="sets-table">
                        <div className="sets-head"><span>组</span><span>重量 kg</span><span>次数</span><span>RPE</span><span>完成</span></div>
                        {item.sets.map((set, setIndex) => (
                          <div className="set-row" key={set.id}>
                            <span>{setIndex + 1}</span>
                            <input type="number" min="0" step="0.5" value={set.weight} onChange={(event) => patchItem(item.id, { sets: item.sets.map((current) => current.id === set.id ? { ...current, weight: Number(event.target.value) } : current) })} />
                            <input type="number" min="0" value={set.reps} onChange={(event) => patchItem(item.id, { sets: item.sets.map((current) => current.id === set.id ? { ...current, reps: Number(event.target.value) } : current) })} />
                            <input type="number" min="1" max="10" value={set.rpe} onChange={(event) => patchItem(item.id, { sets: item.sets.map((current) => current.id === set.id ? { ...current, rpe: Number(event.target.value) } : current) })} />
                            <button className={set.completed ? "set-check completed" : "set-check"} onClick={() => patchItem(item.id, { sets: item.sets.map((current) => current.id === set.id ? { ...current, completed: !current.completed } : current) })} aria-label="切换完成状态"><Check size={16} /></button>
                          </div>
                        ))}
                        <button className="add-line-button" onClick={() => patchItem(item.id, { sets: [...item.sets, emptySet()] })}><Plus size={15} /> 增加一组</button>
                      </div>
                    )}

                    {exercise.tracking === "distance" && (
                      <div className="metric-grid">
                        <label><span>距离</span><div className="unit-input"><input type="number" min="0" step="0.1" value={item.distanceKm} onChange={(event) => patchItem(item.id, { distanceKm: Number(event.target.value) })} /><small>km</small></div></label>
                        <label><span>时长</span><div className="unit-input"><input type="number" min="0" value={item.durationMinutes} onChange={(event) => patchItem(item.id, { durationMinutes: Number(event.target.value) })} /><small>分钟</small></div></label>
                        <div className="computed-metric"><span>平均配速</span><strong>{item.distanceKm > 0 ? `${Math.floor(item.durationMinutes / item.distanceKm)}'${String(Math.round(((item.durationMinutes / item.distanceKm) % 1) * 60)).padStart(2, "0")}\"` : "--"}</strong><small>/ km</small></div>
                      </div>
                    )}

                    {exercise.tracking === "swim" && (
                      <div className="metric-grid swim-grid">
                        <label><span>距离</span><div className="unit-input"><input type="number" min="0" step="0.05" value={item.distanceKm} onChange={(event) => patchItem(item.id, { distanceKm: Number(event.target.value) })} /><small>km</small></div></label>
                        <label><span>趟数</span><input type="number" min="0" value={item.laps} onChange={(event) => patchItem(item.id, { laps: Number(event.target.value) })} /></label>
                        <label><span>泳姿</span><select value={item.stroke} onChange={(event) => patchItem(item.id, { stroke: event.target.value })}><option>自由泳</option><option>蛙泳</option><option>仰泳</option><option>蝶泳</option><option>混合泳</option></select></label>
                        <label><span>时长</span><div className="unit-input"><input type="number" min="0" value={item.durationMinutes} onChange={(event) => patchItem(item.id, { durationMinutes: Number(event.target.value) })} /><small>分钟</small></div></label>
                      </div>
                    )}

                    {exercise.tracking === "duration" && (
                      <div className="metric-grid duration-grid">
                        <label><span>时长</span><div className="unit-input"><input type="number" min="0" value={item.durationMinutes} onChange={(event) => patchItem(item.id, { durationMinutes: Number(event.target.value) })} /><small>分钟</small></div></label>
                        <label className="wide"><span>动作备注</span><input value={item.notes} onChange={(event) => patchItem(item.id, { notes: event.target.value })} placeholder="强度、课程或动作说明" /></label>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <button className="add-exercise-button" onClick={() => setPickerMode("session")}><Plus size={20} /> 添加训练动作</button>
            <label className="notes-field"><span>训练备注</span><textarea value={activeSession.notes} onChange={(event) => patchSession({ notes: event.target.value })} placeholder="今天的状态、疼痛、难度或其他记录" /></label>
          </section>
        )}

        {tab === "plans" && (
          <section className="page">
            <div className="page-title-row">
              <div><p className="eyebrow">PROGRAM BUILDER</p><h1>训练方案</h1><p>组合常用动作，快速开始一场结构化训练。</p></div>
              {!draftPlan && <button className="primary-button" onClick={() => setDraftPlan({ id: uid("plan"), name: "", frequency: 3, exerciseIds: [], updatedAt: new Date().toISOString() })}><Plus size={18} /> 新建方案</button>}
            </div>

            {draftPlan && (
              <section className="plan-editor form-card">
                <header><div><p className="eyebrow">EDIT PROGRAM</p><h2>{plans.some((plan) => plan.id === draftPlan.id) ? "编辑方案" : "新建方案"}</h2></div><button className="icon-button" onClick={() => setDraftPlan(null)}><X size={20} /></button></header>
                <div className="plan-fields">
                  <label><span>方案名称</span><input value={draftPlan.name} onChange={(event) => setDraftPlan({ ...draftPlan, name: event.target.value })} placeholder="例如：周一上肢力量" /></label>
                  <label><span>每周频次</span><select value={draftPlan.frequency} onChange={(event) => setDraftPlan({ ...draftPlan, frequency: Number(event.target.value) })}>{[1,2,3,4,5,6,7].map((value) => <option key={value} value={value}>{value} 次</option>)}</select></label>
                </div>
                <div className="draft-exercises">
                  {draftPlan.exerciseIds.map((id, index) => {
                    const exercise = getExercise(id);
                    return exercise ? <div className="draft-row" key={id}><span>{index + 1}</span><ExerciseIcon exercise={exercise} /><div><strong>{exercise.name}</strong><small>{exercise.group}</small></div><button className="icon-button subtle" onClick={() => setDraftPlan({ ...draftPlan, exerciseIds: draftPlan.exerciseIds.filter((current) => current !== id) })}><X size={16} /></button></div> : null;
                  })}
                  {!draftPlan.exerciseIds.length && <div className="empty-state compact">还没有动作，从动作库中添加</div>}
                </div>
                <div className="editor-actions"><button className="secondary-button" onClick={() => setPickerMode("plan")}><Plus size={17} /> 添加动作</button><button className="primary-button" onClick={savePlan} disabled={!draftPlan.name.trim() || !draftPlan.exerciseIds.length}><Save size={17} /> 保存方案</button></div>
              </section>
            )}

            <div className="plan-grid">
              {plans.map((plan) => (
                <article className="plan-card" key={plan.id}>
                  <header><span className="plan-mark"><CalendarRange size={20} /></span><div><h3>{plan.name}</h3><p>每周 {plan.frequency} 次 · {plan.exerciseIds.length} 个动作</p></div></header>
                  <div className="plan-exercise-tags">{plan.exerciseIds.slice(0, 5).map((id) => <span key={id}>{getExercise(id)?.name}</span>)}{plan.exerciseIds.length > 5 && <span>+{plan.exerciseIds.length - 5}</span>}</div>
                  <footer><button className="secondary-button" onClick={() => setDraftPlan({ ...plan })}><Pencil size={16} /> 编辑</button><button className="icon-button danger" onClick={() => setPlans((current) => current.filter((item) => item.id !== plan.id))} aria-label="删除方案"><Trash2 size={17} /></button><button className="primary-button" onClick={() => startPlan(plan)}><Play size={16} fill="currentColor" /> 开始</button></footer>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "library" && (
          <section className="page library-page">
            <div className="page-title-row"><div><p className="eyebrow">EXERCISE ATLAS</p><h1>动作库</h1><p>{EXERCISES.length} 个动作，覆盖力量、跑步、游泳、户外与恢复训练。</p></div></div>
            <label className="search-field library-search"><Search size={18} /><input value={libraryQuery} onChange={(event) => setLibraryQuery(event.target.value)} placeholder="搜索动作、肌群、器械或英文别名" /></label>
            <div className="chip-row"> <button className={libraryCategory === "all" ? "chip active" : "chip"} onClick={() => setLibraryCategory("all")}>全部</button>{(Object.entries(CATEGORY_META) as [ExerciseCategory, (typeof CATEGORY_META)[ExerciseCategory]][]).map(([key, meta]) => <button key={key} className={libraryCategory === key ? "chip active" : "chip"} onClick={() => setLibraryCategory(key)}>{meta.label}</button>)}</div>
            <div className="library-list">
              {libraryResults.map((exercise) => (
                <article className="library-card" key={exercise.id}>
                  <span className="exercise-icon large" style={{ color: CATEGORY_META[exercise.category].color }}><ExerciseIcon exercise={exercise} /></span>
                  <div><h3>{exercise.name}</h3><p>{exercise.group} · {exercise.equipment}</p><div className="muscle-tags">{exercise.muscles.map((muscle) => <span key={muscle}>{muscle}</span>)}</div></div>
                  <button className="favorite-button" onClick={() => toggleFavorite(exercise.id)} aria-label="收藏动作"><Star size={18} fill={favorites.includes(exercise.id) ? "currentColor" : "none"} /></button>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "history" && (
          <section className="page history-page">
            <div className="page-title-row"><div><p className="eyebrow">MISSION ARCHIVE</p><h1>训练记录</h1><p>训练会转换为本周期的地貌 Credit。</p></div><button className="primary-button" onClick={() => startQuick()}><Plus size={18} /> 记录训练</button></div>
            <div className="summary-grid">
              <div><span>最近 7 天</span><strong>{sessions.filter((session) => new Date(session.createdAt ?? session.date).getTime() >= Date.now() - 7 * 86400000).length}</strong><small>次训练</small></div>
              <div><span>本周能量</span><strong>{weekCredits}</strong><small>Credit</small></div>
              <div><span>累计训练</span><strong>{sessions.length}</strong><small>次</small></div>
            </div>
            <div className="history-list">
              {sessions.map((session) => (
                <article className="history-card" key={session.id}>
                  <div className="history-date"><strong>{session.date.slice(8, 10)}</strong><small>{session.date.slice(5, 7)}月</small></div>
                  <div className="history-main"><h3>{session.title}</h3><p>{sessionSummary(session)}</p><div className="history-exercises">{session.items.slice(0, 4).map((item) => <span key={item.id}>{getExercise(item.exerciseId)?.name}</span>)}</div></div>
                  <div className="history-credit"><strong>+{session.credits}</strong><small>CREDIT</small></div>
                  <button className="icon-button subtle" onClick={() => setSessions((current) => current.filter((item) => item.id !== session.id))} aria-label="删除记录"><Trash2 size={17} /></button>
                </article>
              ))}
              {!sessions.length && <div className="empty-state history-empty"><Timer size={28} /><h3>还没有训练记录</h3><p>完成第一次训练，为你的星球注入能量。</p><button className="primary-button" onClick={() => startQuick()}>开始记录</button></div>}
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="主导航">
        {[
          { key: "train" as const, label: "训练", icon: Dumbbell },
          { key: "plans" as const, label: "方案", icon: CalendarRange },
          { key: "library" as const, label: "动作库", icon: LibraryBig },
          { key: "history" as const, label: "记录", icon: History },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}><Icon size={20} /><span>{label}</span></button>
        ))}
      </nav>

      {pickerMode && <ExercisePicker onClose={() => setPickerMode(null)} onSelect={addPickedExercise} favorites={favorites} toggleFavorite={toggleFavorite} />}
      {notice && <div className="toast"><Check size={17} /> {notice}</div>}
    </div>
  );
}

