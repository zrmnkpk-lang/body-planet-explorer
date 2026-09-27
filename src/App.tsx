import { useEffect, useState } from "react";
import voidRunnerCharacter from "@/imports/image.png";
const heroBlackHole = "/assets/illustrations/portal-black-hole.webp";
const bodyAnalysisCharacter = "/assets/illustrations/body-composition-scan.webp";
import { Button, IconButton, InputField, ThemeProvider } from "@figma/astraui";
import PlanetView from "@/PlanetView";
import {
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Clock3,
  Droplets,
  Dumbbell,
  Flame,
  Home,
  Orbit,
  Rocket,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";

const planetEras = [
  { level: 1, title: "沧海纪", description: "深海洋流与海底火山脊正在苏醒。", image: "/assets/card-backgrounds/l1-ocean.webp" },
  { level: 2, title: "露陆纪", description: "火山群岛浮出海面，熔岩海岸开始塑形。", image: "/assets/card-backgrounds/l2-islands.webp" },
  { level: 3, title: "山脉纪", description: "赤色大陆升起，雪山与冰川湖逐渐成形。", image: "/assets/card-backgrounds/l3-mountains.webp" },
  { level: 4, title: "江河纪", description: "翠绿河谷蜿蜒，瀑布与梯田滋养新土地。", image: "/assets/card-backgrounds/l4-riverlands.webp" },
  { level: 5, title: "丰壤纪", description: "雪山、森林、草原、荒漠与海岸共同繁盛。", image: "/assets/card-backgrounds/l5-terrain.webp" },
] as const;

function VoidRunnerIllustration() {
  return (
    <svg
      viewBox="0 0 100 180"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      aria-hidden="true"
    >
      {/* === Stars === */}
      {[
        [12, 8, 1, 0.8], [48, 4, 0.7, 0.6], [82, 10, 1.2, 0.7],
        [28, 20, 0.8, 0.5], [90, 32, 0.6, 0.8], [6, 44, 1, 0.5],
        [94, 60, 0.7, 0.7], [18, 130, 0.8, 0.4], [85, 142, 1, 0.6],
        [72, 162, 0.6, 0.5], [35, 157, 0.8, 0.4], [60, 10, 0.6, 0.9],
        [15, 78, 0.5, 0.6], [92, 118, 0.7, 0.5], [55, 50, 0.9, 0.4],
        [8, 102, 0.5, 0.6], [76, 88, 0.7, 0.3], [42, 140, 0.6, 0.5],
      ].map(([cx, cy, r, op], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="white" opacity={op} />
      ))}

      {/* === Saturn-like planet (upper right) === */}
      {/* Ring shadow (behind planet) */}
      <ellipse cx="80" cy="26" rx="34" ry="9" fill="none" stroke="var(--warning)" strokeWidth="2.5" opacity="0.5" />
      {/* Planet body */}
      <circle cx="80" cy="26" r="20" fill="var(--brand-primary)" />
      <circle cx="80" cy="26" r="20" fill="none" stroke="#1a1a2e" strokeWidth="1.5" />
      {/* Surface bands */}
      <ellipse cx="80" cy="23" rx="15" ry="4" fill="rgba(255,255,255,0.06)" />
      <ellipse cx="80" cy="30" rx="11" ry="3" fill="rgba(255,255,255,0.04)" />
      {/* Planet highlight */}
      <circle cx="74" cy="20" r="5" fill="rgba(255,255,255,0.14)" />
      {/* Ring in front (arc) */}
      <path d="M46,26 Q80,18 114,26" stroke="var(--warning)" strokeWidth="2.5" fill="none" opacity="0.85" strokeLinecap="round" />

      {/* === Floating dumbbell (top-left, tilted) === */}
      <g transform="rotate(-22,26,26) translate(6,18)">
        <rect x="0"  y="1"  width="9"  height="14" rx="2.5" fill="var(--warning)" stroke="#1a1a2e" strokeWidth="1.5" />
        <rect x="8"  y="4"  width="22" height="7"  rx="3"   fill="#9a9aaa"        stroke="#1a1a2e" strokeWidth="1.5" />
        <rect x="29" y="1"  width="9"  height="14" rx="2.5" fill="var(--warning)" stroke="#1a1a2e" strokeWidth="1.5" />
      </g>
      {/* Dumbbell sparkles */}
      <circle cx="10" cy="42" r="2"   fill="var(--warning)" opacity="0.7" />
      <circle cx="36" cy="14" r="1.5" fill="var(--success)"  opacity="0.8" />
      <circle cx="4"  cy="30" r="1"   fill="white"           opacity="0.6" />

      {/* === Portal glow at astronaut feet === */}
      <ellipse cx="50" cy="168" rx="26" ry="7"  fill="var(--success)" opacity="0.18" />
      <ellipse cx="50" cy="167" rx="16" ry="4"  fill="var(--success)" opacity="0.35" />
      {/* Glow rays */}
      <line x1="26" y1="167" x2="16" y2="174" stroke="var(--success)" strokeWidth="1" opacity="0.4" />
      <line x1="74" y1="167" x2="84" y2="174" stroke="var(--success)" strokeWidth="1" opacity="0.4" />

      {/* === Boots === */}
      <ellipse cx="40" cy="163" rx="13" ry="5.5" fill="#c8c8d4" stroke="#1a1a2e" strokeWidth="1.5" />
      <ellipse cx="60" cy="163" rx="13" ry="5.5" fill="#c8c8d4" stroke="#1a1a2e" strokeWidth="1.5" />

      {/* === Legs === */}
      <rect x="33" y="130" width="14" height="34" rx="6" fill="#e4e4ec" stroke="#1a1a2e" strokeWidth="1.5" />
      <rect x="53" y="130" width="14" height="34" rx="6" fill="#e4e4ec" stroke="#1a1a2e" strokeWidth="1.5" />
      {/* Leg stripe detail */}
      <rect x="38" y="130" width="4" height="34" rx="2" fill="var(--success)" opacity="0.3" />
      <rect x="58" y="130" width="4" height="34" rx="2" fill="var(--success)" opacity="0.3" />

      {/* === Suit body === */}
      {/* Body outline (behind fill, for thick border) */}
      <rect x="28" y="88" width="44" height="44" rx="12" fill="#1a1a2e" />
      {/* Body fill */}
      <rect x="30" y="90" width="40" height="42" rx="10" fill="#f0f0f4" />
      {/* Suit centre stripe */}
      <rect x="44" y="90" width="12" height="42" fill="var(--success)" opacity="0.22" />
      {/* Chest emblem */}
      <circle cx="50" cy="108" r="8" fill="var(--brand-primary)" stroke="#1a1a2e" strokeWidth="1" />
      <text x="50" y="112" textAnchor="middle" fontSize="7" fontWeight="900" fill="white" fontFamily="sans-serif">VR</text>
      {/* Suit detail lines */}
      <line x1="36" y1="96"  x2="36" y2="106" stroke="#1a1a2e" strokeWidth="1" opacity="0.2" />
      <line x1="64" y1="96"  x2="64" y2="106" stroke="#1a1a2e" strokeWidth="1" opacity="0.2" />

      {/* === Left arm — bicep curl (raised) === */}
      {/* Outline (thick dark, drawn first) */}
      <path d="M30,102 Q10,92 12,76" stroke="#1a1a2e" strokeWidth="16" fill="none" strokeLinecap="round" />
      {/* Fill (white suit colour) */}
      <path d="M30,102 Q10,92 12,76" stroke="#f0f0f4" strokeWidth="12" fill="none" strokeLinecap="round" />
      {/* Glove */}
      <circle cx="12" cy="72" r="10" fill="#c8c8d4" stroke="#1a1a2e" strokeWidth="1.5" />
      {/* Mini dumbbell in glove */}
      <g transform="translate(-2, 58)">
        <rect x="0"  y="4" width="6"  height="9" rx="1.5" fill="var(--warning)" stroke="#1a1a2e" strokeWidth="1" />
        <rect x="5"  y="6" width="14" height="5" rx="1.5" fill="#888"           stroke="#1a1a2e" strokeWidth="1" />
        <rect x="18" y="4" width="6"  height="9" rx="1.5" fill="var(--warning)" stroke="#1a1a2e" strokeWidth="1" />
      </g>

      {/* === Right arm — relaxed, slightly extended === */}
      <path d="M70,102 Q88,96 90,112" stroke="#1a1a2e" strokeWidth="16" fill="none" strokeLinecap="round" />
      <path d="M70,102 Q88,96 90,112" stroke="#f0f0f4" strokeWidth="12" fill="none" strokeLinecap="round" />
      {/* Right glove */}
      <circle cx="90" cy="116" r="10" fill="#c8c8d4" stroke="#1a1a2e" strokeWidth="1.5" />
      {/* Thumbs-up gesture hint */}
      <rect x="86" y="108" width="5" height="7" rx="2" fill="#c8c8d4" stroke="#1a1a2e" strokeWidth="1" />

      {/* === Neck connector === */}
      <rect x="44" y="82" width="12" height="10" rx="3" fill="#d0d0dc" stroke="#1a1a2e" strokeWidth="1" />

      {/* === Helmet === */}
      {/* Helmet outline */}
      <ellipse cx="50" cy="70" rx="22" ry="20" fill="#1a1a2e" />
      {/* Helmet fill */}
      <ellipse cx="50" cy="70" rx="20" ry="18" fill="#e0e0e8" />
      {/* Visor background */}
      <ellipse cx="50" cy="71" rx="14" ry="12" fill="#18204a" />
      {/* Visor inner glow (space reflection) */}
      <ellipse cx="50" cy="71" rx="14" ry="12" fill="none" stroke="var(--brand-primary)" strokeWidth="1" opacity="0.6" />
      {/* Stars reflected in visor */}
      <circle cx="44" cy="66" r="0.8" fill="white" opacity="0.7" />
      <circle cx="56" cy="68" r="0.6" fill="white" opacity="0.5" />
      <circle cx="48" cy="75" r="0.7" fill="white" opacity="0.6" />
      {/* Visor glass shine */}
      <path d="M40,62 Q50,57 60,62" stroke="rgba(255,255,255,0.45)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="56" cy="65" r="3" fill="rgba(255,255,255,0.12)" />
      {/* Helmet top highlight arc */}
      <path d="M34,66 Q50,51 66,66" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none" />

      {/* === Antenna === */}
      <line x1="50" y1="52" x2="50" y2="42" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="40" r="4"   fill="var(--success)" stroke="#1a1a2e" strokeWidth="1.5" />
      {/* Antenna pulse ring */}
      <circle cx="50" cy="40" r="7" fill="var(--success)" className="antenna-pulse" />

      {/* === Floating protein shaker (right side) === */}
      <g transform="translate(78, 68) rotate(15)">
        <rect x="0"  y="0"  width="13" height="24" rx="4"   fill="#f0f0f4" stroke="#1a1a2e" strokeWidth="1.5" />
        <rect x="2"  y="-6" width="9"  height="8"  rx="2"   fill="var(--success)" stroke="#1a1a2e" strokeWidth="1.5" />
        <rect x="2"  y="8"  width="9"  height="8"  rx="1"   fill="var(--success)" opacity="0.3" />
        <text x="6.5" y="21" textAnchor="middle" fontSize="4" fontWeight="900" fill="var(--success)" fontFamily="sans-serif">PF</text>
      </g>

      {/* === Energy sparkles scattered === */}
      {[
        [22, 58, 2.5, "var(--success)", 0.5],
        [79, 52, 2, "var(--warning)", 0.6],
        [7,  88, 1.8, "var(--success)", 0.4],
        [93, 80, 1.5, "var(--warning)", 0.5],
      ].map(([cx, cy, r, fill, op], i) => (
        <circle key={i} cx={cx as number} cy={cy as number} r={r as number} fill={fill as string} opacity={op as number} />
      ))}
    </svg>
  );
}

const workouts = [
  { title: "造山力量", kind: "力量训练 · 板块隆起", minutes: "45 分钟", energy: "310 kcal", tone: "plasma", icon: Dumbbell, completed: true },
  { title: "季风有氧", kind: "有氧训练 · 河流加速", minutes: "30 分钟", energy: "420 kcal", tone: "portal", icon: Orbit, completed: true },
  { title: "晨雾恢复", kind: "拉伸恢复 · 星空澄澈", minutes: "20 分钟", energy: "160 kcal", tone: "warning", icon: Zap, completed: false },
];

const dailyTasks = [
  { title: "完成一场传送训练", description: "选择任意训练并完成 20 分钟以上。", reward: 120, icon: Orbit },
  { title: "修复地球重力", description: "累计走满 6,000 步，稳定本维度。", reward: 80, icon: Target },
  { title: "补充量子燃料", description: "记录一杯水，防止意识上传中断。", reward: 40, icon: Zap },
];

const nav = [
  { id: "home", label: "星球", icon: Home },
  { id: "workouts", label: "训练", icon: Dumbbell },
  { id: "portal", label: "生态", icon: Orbit },
  { id: "stats", label: "数据", icon: ChartNoAxesCombined },
  { id: "profile", label: "我的", icon: UserRound },
] as const;

type Screen = (typeof nav)[number]["id"];


function PortalMark({ small = false }: { small?: boolean }) {
  return (
    <div className={small ? "portal-mark portal-mark-small" : "portal-mark"} aria-hidden="true">
      {/* Astra UI has no image primitive and this scaffold has no ImageWithFallback wrapper, so the existing decorative Vite asset is rendered directly inside the portal mark. */}
      <img className="hero-black-hole" src={heroBlackHole} alt="" />
      <span className="portal-particle-orbit portal-orbit-outer"><span className="portal-spark portal-spark-outer" /></span>
      <span className="portal-particle-orbit portal-orbit-middle"><span className="portal-spark portal-spark-middle" /></span>
      <span className="portal-particle-orbit portal-orbit-inner"><span className="portal-spark portal-spark-inner" /></span>
    </div>
  );
}

function PlanetSnapshot() {
  return (
    /* The home card uses the same high-detail renderer as the ecology page. */
    <div className="hero-planet-snapshot" aria-hidden="true">
      <iframe
        title="旋转身体星球缩略预览"
        src="/planet.html?mode=app&snapshot=1"
        loading="eager"
      />
    </div>
  );
}

const backdropStars = [
  { x: "52%", y: "4%", size: "2px" },
  { x: "90%", y: "5%", size: "2px" },
  { x: "3%", y: "33%", size: "2px" },
  { x: "97%", y: "34%", size: "1px" },
  { x: "4%", y: "63%", size: "2px" },
  { x: "96%", y: "64%", size: "1px" },
] as const;

function PlanetBackdrop() {
  const [loaded, setLoaded] = useState(false);
  const [starMotion] = useState(() => backdropStars.map((star) => ({
    ...star,
    delay: `-${(Math.random() * 4.8).toFixed(2)}s`,
    duration: `${(3 + Math.random() * 3).toFixed(2)}s`,
    alpha: Number((0.48 + Math.random() * 0.32).toFixed(2)),
  })));

  return (
    <div className="planet-backdrop" aria-hidden="true">
      {/* The blurred silhouette keeps the deep-space layer calm while the latest renderer loads. */}
      <div className={`planet-backdrop-skeleton ${loaded ? "is-hidden" : ""}`} />
      <div className="space-stars">
        {starMotion.map((star, index) => (
          <span
            key={index}
            className="backdrop-star"
            style={{
              "--star-x": star.x,
              "--star-y": star.y,
              "--star-size": star.size,
              "--star-delay": star.delay,
              "--star-duration": star.duration,
              "--star-alpha": star.alpha,
            } as React.CSSProperties}
          />
        ))}
      </div>
      <iframe
        className={loaded ? "is-loaded" : ""}
        title=""
        src="/planet.html?mode=app&backdrop=1"
        loading="eager"
        onLoad={() => window.setTimeout(() => setLoaded(true), 650)}
      />
    </div>
  );
}

function SectionIntro({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="screen-intro">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <p className="screen-title">{title}</p>
      </div>
      {action}
    </div>
  );
}

function FitnessApp() {
  const [activeTab, setActiveTab] = useState<Screen>("home");
  const [activeWorkout, setActiveWorkout] = useState(1);
  const [trainingPhase, setTrainingPhase] = useState<"select" | "active" | "summary">("select");
  const [goalEnabled, setGoalEnabled] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<number[]>([0]);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [weeklyDone, setWeeklyDone] = useState<number[]>([0, 1, 2, 3]);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [entrySaved, setEntrySaved] = useState(false);
  const [bodyMetrics, setBodyMetrics] = useState({ muscle: "42.6", water: "61.2", bone: "3.2", fat: "18.4" });
  const [planetEra, setPlanetEra] = useState(0);
  const [swipeStart, setSwipeStart] = useState<number | null>(null);
  const xp = 680 + completedTasks.reduce((total, taskIndex) => total + dailyTasks[taskIndex].reward, 0);
  const xpProgress = Math.min(100, Math.round((xp / 1000) * 100));
  const nextDay = [0, 1, 2, 3, 4, 5, 6].find(i => !weeklyDone.includes(i)) ?? -1;
  const currentEra = planetEras[planetEra];
  const switchEra = (direction: 1 | -1) => setPlanetEra((current) => (current + direction + planetEras.length) % planetEras.length);

  useEffect(() => {
    [planetEra - 1, planetEra, planetEra + 1]
      .filter((index) => index >= 0 && index < planetEras.length)
      .forEach((index) => {
        const image = new Image();
        image.decoding = "async";
        image.src = planetEras[index].image;
        image.decode?.().catch(() => {});
      });
  }, [planetEra]);

  const startWorkout = (index: number) => {
    setActiveWorkout(index);
    setTrainingPhase("active");
  };

  const openTraining = () => {
    setTrainingPhase("select");
    setActiveTab("workouts");
  };

  const renderWorkoutRows = () => (
    <div className="workout-stack">
      {workouts.map((workout, index) => {
        const Icon = workout.icon;
        const selected = activeWorkout === index;
        return (
          /* Astra ItemCard is video-specific, so this selectable training row uses kit tokens and a native card surface. */
          <button
            type="button"
            className={`workout-card tone-${workout.tone} ${selected ? "workout-selected" : ""}`}
            key={workout.title}
            onClick={() => startWorkout(index)}
            aria-pressed={selected}
          >
            <span className="workout-icon"><Icon size={24} /></span>
            <span className="workout-content">
              <span className="workout-title">{workout.title}</span>
              <span className="workout-meta">{workout.kind} · {workout.minutes} · {workout.energy}</span>
            </span>
            <span className="workout-action">{workout.completed ? <Check size={16} /> : <CirclePlay size={16} />}</span>
          </button>
        );
      })}
    </div>
  );

  const homeView = (
    <div className="view-stack home-view">
      {/* Astra has no compact mobile hero panel; this is a kit-token composition for the portal illustration. */}
      <section
        className="hero-panel"
        style={{ "--hero-landscape": `url(${currentEra.image})` } as React.CSSProperties}
        onTouchStart={(event) => setSwipeStart(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (swipeStart === null) return;
          const swipeDistance = event.changedTouches[0].clientX - swipeStart;
          if (Math.abs(swipeDistance) > 40) switchEra(swipeDistance > 0 ? -1 : 1);
          setSwipeStart(null);
        }}
      >
        <div className="hero-copy">
          <div className="speech-tag"><Flame size={16} /> 连击第 12 天</div>
          <p className="morning-title">你的身体星球</p>
          <p className="hero-title">{currentEra.title} · L{currentEra.level}</p>
          <p className="body-copy">{currentEra.description}</p>
          <Button variant="primary" size="small" iconStart={<CirclePlay size={16} />} onClick={openTraining}>
            开始今天的训练
          </Button>
        </div>
        <div className="hero-art">
          <PlanetSnapshot />
          <div className="orbit-chip"><Sparkles size={16} /> 阶段 {planetEra + 1}/5</div>
          <div className="hero-sticker">L{currentEra.level}<br />ERA</div>
        </div>
        {/* Astra UI has no carousel control; this compact control rail pairs verified IconButtons with token-based stage progress. */}
        <div className="era-controls" aria-label="切换生态阶段">
          <IconButton aria-label="上一阶段" icon={<ChevronLeft size={16} />} variant="neutral" size="small" onClick={() => switchEra(-1)} />
          <span className="era-progress" aria-label={`当前为第 ${planetEra + 1} 个生态阶段`}>{planetEras.map((era) => <i key={era.level} className={era.level === currentEra.level ? "era-progress-dot era-progress-dot-active" : "era-progress-dot"} />)}</span>
          <IconButton aria-label="下一阶段" icon={<ChevronRight size={16} />} variant="neutral" size="small" onClick={() => switchEra(1)} />
        </div>
      </section>

      {/* Astra has no poster component; this cover is a game-style campaign surface using only kit tokens. */}
      <section className="cover-poster module-surface" aria-label="守护者今日叙事">
        <div className="poster-art">
          {/* Astra UI has no image primitive and this scaffold has no ImageWithFallback wrapper, so this semantic content image uses the imported Vite asset directly. */}
          <img className="poster-image" src={voidRunnerCharacter} alt="坐在办公椅上欢呼的蓝色卡通角色" />
        </div>
        <div className="poster-copy"><p className="eyebrow">OTTO · 星域观察员</p><p className="poster-title">星核<br />来信</p><p className="body-copy">“河流今天流得不错。别让它白流。”</p></div>
        <span className="poster-reward"><Sparkles size={16} /> 换个说法</span>
      </section>

      <section className="xp-panel module-surface" aria-label="经验值进度">
        <div className="section-heading"><div><p className="section-title">Level 08 · 肌肉学徒</p><p className="body-copy muted-copy">{xp} / 1,000 XP · 下一等级解锁“传送弹跳”</p></div><span className="xp-orb">08</span></div>
        <div className="xp-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={xpProgress}><span style={{ width: `${xpProgress}%` }} /></div>
      </section>

      <section className="daily-quests module-surface" aria-labelledby="daily-quests-heading">
        <div className="section-heading compact-heading"><div><p id="daily-quests-heading" className="section-title">每日任务</p><p className="body-copy muted-copy">完成后获得经验值与连击燃料。</p></div><span className="metric-badge"><Zap size={16} /> {completedTasks.length}/3</span></div>
        <div className="quest-stack">{dailyTasks.map((task, index) => { const Icon = task.icon; const complete = completedTasks.includes(index); return (
          /* Astra has no quest-list item; this gamified row is a token-based composition with a kit Button action. */
          <article key={task.title} className={`quest-card ${complete ? "quest-complete" : ""}`}>
            <span className="quest-icon"><Icon size={24} /></span><div className="quest-copy"><p>{task.title}</p><span>+{task.reward} XP · {complete ? "已完成" : "待执行"}</span></div>
            <Button variant={complete ? "neutral" : "primary"} size="small" onClick={() => setSelectedTask(selectedTask === index ? null : index)}>{complete ? "查看" : "详情"}</Button>
            {selectedTask === index && <div className="quest-detail"><p>{task.description}</p><Button variant={complete ? "neutral" : "primary"} size="small" iconStart={complete ? <Check size={16} /> : <CirclePlay size={16} />} onClick={() => setCompletedTasks((items) => complete ? items.filter((item) => item !== index) : [...items, index])}>{complete ? "撤销完成" : "标记完成"}</Button></div>}
          </article>
        ); })}</div>
      </section>

      <section className="progress-section module-surface" aria-labelledby="progress-heading">
        <div className="section-heading">
          <div>
            <p id="progress-heading" className="section-title">本周物质形态</p>
            <p className="body-copy muted-copy">{weeklyDone.length >= 5 ? "目标已达成！宇宙已经在颤抖。" : `还差 ${5 - weeklyDone.length} 次训练，宇宙就会害怕你。`}</p>
          </div>
          <span className="metric-badge"><Flame size={16} /> {weeklyDone.length} / 5</span>
        </div>
        <div className="weekly-orbit" aria-label={`本周训练进度 ${Math.round(weeklyDone.length / 5 * 100)}%`}>
          {["一", "二", "三", "四", "五", "六", "日"].map((day, index) => {
            const done = weeklyDone.includes(index);
            return (
              <button
                type="button"
                key={day}
                className={`day-orb ${done ? "day-orb-done" : index === nextDay ? "day-orb-next" : ""}`}
                onClick={() => setWeeklyDone(prev => done ? prev.filter(d => d !== index) : [...prev, index])}
                aria-pressed={done}
                aria-label={`${day}曜`}
              >
                {done ? <Check size={16} /> : day}
              </button>
            );
          })}
        </div>
      </section>

      <section className="workout-section module-surface" aria-labelledby="workouts-heading">
        <div className="section-heading compact-heading">
          <p id="workouts-heading" className="section-title">跨维度菜单</p>
          <Button variant="subtle" size="small" onClick={() => setActiveTab("workouts")}>全部训练</Button>
        </div>
        {renderWorkoutRows()}
      </section>

      {/* Astra has no comic callout component; this motivational bubble is custom but uses only Astra tokens. */}
      <aside className="rick-callout"><Activity size={24} /><p>“肌肉酸痛只是平行宇宙里的你在鼓掌。”</p><span>— 某个拒绝休息日的科学家</span></aside>
    </div>
  );

  const workoutsView = trainingPhase === "summary" ? (
    <div className="view-stack screen-view">
      <SectionIntro eyebrow="ECOLOGICAL EVENT READY" title="训练结算" />
      <section className="session-panel module-surface">
        <span className="session-icon"><Check size={24} /></span>
        <div><p className="section-title">{workouts[activeWorkout].title} 完成</p><p className="body-copy muted-copy">{workouts[activeWorkout].minutes} · +46 XP · 星球正在生成新事件。</p></div>
      </section>
      <section className="event-preview module-surface"><PortalMark /><div><p className="section-title">一场{activeWorkout === 0 ? "造山运动" : activeWorkout === 1 ? "季风过境" : "晨雾降临"}正在发生</p><p className="body-copy muted-copy">你的训练正在改变星球生态。</p></div></section>
      <Button variant="primary" iconStart={<Sparkles size={16} />} onClick={() => { setTrainingPhase("select"); setActiveTab("portal"); }}>去星球看看</Button>
      <Button variant="subtle" size="small" onClick={() => setTrainingPhase("select")}>返回模式选择</Button>
    </div>
  ) : (
    <div className="view-stack screen-view">
      <SectionIntro eyebrow={trainingPhase === "active" ? "TRAINING IN PROGRESS" : "CHOOSE TODAY'S EFFECT"} title={trainingPhase === "active" ? "正在改变星球" : "选择训练模式"} action={<span className="metric-badge"><Clock3 size={16} /> {trainingPhase === "active" ? "12:48" : "3 种模式"}</span>} />
      {/* Astra ItemCard is video-only; this selected session summary uses kit tokens as a mobile dashboard card. */}
      <section className="session-panel module-surface">
        <span className="session-icon"><Dumbbell size={24} /></span>
        <div><p className="section-title">{workouts[activeWorkout].title}</p><p className="body-copy muted-copy">{trainingPhase === "active" ? "本阶段已完成 2/4 组，星核正在升温。" : workouts[activeWorkout].kind}</p></div>
        <Button variant="primary" size="small" iconStart={trainingPhase === "active" ? <Check size={16} /> : <CirclePlay size={16} />} onClick={() => trainingPhase === "active" ? setTrainingPhase("summary") : startWorkout(activeWorkout)}>{trainingPhase === "active" ? "完成训练" : "开始"}</Button>
      </section>
      <section className="queue-module module-surface"><div className="section-heading compact-heading"><p className="section-title">训练模式</p><span className="body-copy muted-copy">选择会改变的生态</span></div>{renderWorkoutRows()}</section>
    </div>
  );

  const portalView = (
    <div className="view-stack screen-view" style={{ paddingTop: "var(--space-sm, 4px)", gap: "var(--space-sm, 6px)" }}>
      <SectionIntro eyebrow="PLANET ECOLOGY · L1" title="养星球" action={<span className="metric-badge"><Sparkles size={14} /> 身体成分映射</span>} />
      <PlanetView bodyMetrics={bodyMetrics} />
      {/* Keep the map focused on terrain; body composition is explained in the report below it. */}
      <section className="planet-metric-panel module-surface" aria-labelledby="planet-metric-heading">
        <div className="section-heading compact-heading">
          <div>
            <p id="planet-metric-heading" className="section-title">地形比例</p>
            <p className="body-copy muted-copy">身体成分会改变星球四个区域的分布。</p>
          </div>
          <span className="metric-badge"><Activity size={14} /> 实时映射</span>
        </div>
        <div className="planet-metric-list">
          {[
            { key: "muscle", title: "造山带", label: "骨骼肌含量", value: bodyMetrics.muscle, unit: "kg", ratio: Math.min(100, (Number.parseFloat(bodyMetrics.muscle) / 60) * 100), note: "肌肉含量越高，山脉起伏越明显。" },
            { key: "water", title: "深蓝寰海", label: "体内水分", value: bodyMetrics.water, unit: "%", ratio: Math.min(100, Number.parseFloat(bodyMetrics.water)), note: "水分状态决定海域的深度与连通性。" },
            { key: "bone", title: "极地要塞", label: "骨量", value: bodyMetrics.bone, unit: "kg", ratio: Math.min(100, (Number.parseFloat(bodyMetrics.bone) / 5) * 100), note: "骨量越稳定，极地冰盖越完整。" },
            { key: "fat", title: "季风大陆", label: "呼吸状况", value: "稳定", unit: "", ratio: Math.max(18, Math.min(100, 100 - Number.parseFloat(bodyMetrics.fat) * 2)), note: `气流负荷稳定 · 体脂 ${bodyMetrics.fat}%` },
          ].map((metric) => (
            <div className={`planet-metric-row metric-${metric.key}`} key={metric.key}>
              <span className="planet-metric-icon" aria-hidden="true"><span /></span>
              <div className="planet-metric-copy">
                <div className="planet-metric-heading"><b>{metric.title}</b><small>{metric.label}</small></div>
                <div className="planet-metric-track" aria-label={`${metric.title}${metric.label}占比 ${Math.round(metric.ratio)}%`}><span style={{ "--metric-ratio": `${metric.ratio}%` } as React.CSSProperties} /></div>
                <p>{metric.note}</p>
              </div>
              <strong>{metric.value}<small>{metric.unit}</small></strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const statsView = (
    <div className="view-stack screen-view">
      <section className="body-analysis-panel module-surface" aria-label="身体物质构成分析">
        <div className="analysis-panel-heading"><p className="eyebrow">MATTER ANALYSIS · C-137</p><p className="screen-title">物质扫描</p></div>
        <div className="analysis-panel-action"><IconButton aria-label="查看本月数据" icon={<CalendarDays size={16} />} variant="neutral" size="small" /></div>
        {/* Astra UI has no image primitive and this scaffold has no ImageWithFallback wrapper, so this analysis artwork uses the imported Vite asset directly. */}
        <img className="body-analysis-image" src={bodyAnalysisCharacter} alt="展示肌肉与骨骼结构的角色分析图" />
        <div className="analysis-callout callout-score callout-left"><p className="analysis-callout-label">综合评分</p><div className="analysis-score-value"><b>87.3</b><span>/100</span></div><small>超越 83% 生命体</small></div>
        <div className="analysis-callout callout-muscle callout-right"><p className="analysis-callout-label">肌肉构成</p><b>42%</b><small>骨骼肌量 {bodyMetrics.muscle} kg</small></div>
        <div className="analysis-callout callout-fat callout-left"><p className="analysis-callout-label">脂肪构成</p><b>18%</b><small>体脂率 {bodyMetrics.fat}%</small></div>
        <div className="analysis-callout callout-water callout-right"><p className="analysis-callout-label">水分构成</p><b>38%</b><small>含水总量 {bodyMetrics.water}%</small></div>
        <div className="analysis-callout callout-bone callout-left"><p className="analysis-callout-label">骨骼构成</p><b>2%</b><small>骨量 {bodyMetrics.bone} kg</small></div>
        <div className="analysis-achievement-badge" aria-label="物质稳定者：连续12天维持物质指数80分以上"><ShieldCheck size={34} /><span>物质稳定者</span></div>
      </section>

      <section className="matter-params-module module-surface" aria-labelledby="matter-params-heading">
        <div className="section-heading compact-heading">
          <p id="matter-params-heading" className="section-title">体成分四件套</p>
          <Button variant="subtle" size="small" iconStart={<Zap size={14} />} onClick={() => setManualEntryOpen(!manualEntryOpen)}>{manualEntryOpen ? "收起" : "录入"}</Button>
        </div>
        {manualEntryOpen && <div className="manual-entry-form">
          <InputField label="骨骼肌量（kg）" value={bodyMetrics.muscle} onChange={(muscle) => setBodyMetrics({ ...bodyMetrics, muscle })} />
          <InputField label="体内水分（%）" value={bodyMetrics.water} onChange={(water) => setBodyMetrics({ ...bodyMetrics, water })} />
          <InputField label="骨量（kg）" value={bodyMetrics.bone} onChange={(bone) => setBodyMetrics({ ...bodyMetrics, bone })} />
          <InputField label="体脂率（%）" value={bodyMetrics.fat} onChange={(fat) => setBodyMetrics({ ...bodyMetrics, fat })} />
          <Button variant="primary" size="small" onClick={() => { setEntrySaved(true); setManualEntryOpen(false); }}>保存并触发地质活动</Button>
        </div>}
        {entrySaved && <p className="entry-saved"><Check size={14} /> 数据已保存，星球地貌正在重组。</p>}
        <div className="matter-grid">
          {[
            { icon: Zap, label: "骨骼肌量", value: bodyMetrics.muscle, unit: "kg", tone: "success" },
            { icon: Droplets, label: "体内水分", value: bodyMetrics.water, unit: "%", tone: "brand" },
            { icon: Activity, label: "骨量", value: bodyMetrics.bone, unit: "kg", tone: "neutral" },
            { icon: Flame, label: "体脂率", value: bodyMetrics.fat, unit: "%", tone: "warning" },
          ].map((cell) => {
            const Icon = cell.icon;
            return (
              /* Astra has no body-metric tile; this gamified stat cell is a kit-token composition. */
              <article key={cell.label} className={`matter-cell tone-${cell.tone}`}>
                <span className="matter-cell-icon"><Icon size={18} /></span>
                <div className="matter-cell-value-row">
                  <span className="matter-cell-value">{cell.value}</span>
                  {cell.unit && <span className="matter-cell-unit">{cell.unit}</span>}
                </div>
                <p className="matter-cell-label">{cell.label}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Wave trend chart */}
      <section className="chart-panel module-surface" aria-labelledby="matter-wave-heading">
        <div className="section-heading compact-heading">
          <p id="matter-wave-heading" className="section-title">生态趋势</p>
          <span className="metric-badge"><Flame size={16} /> 本月 +18%</span>
        </div>
        <div className="bar-chart" aria-label="近十二个月星核能量趋势">
          {[38, 46, 42, 58, 55, 64, 61, 76, 72, 88, 81, 86].map((height, index) => (
            <span key={index} className={index === 9 ? "bar bar-active" : "bar"} style={{ "--bar-height": `${height}%` } as React.CSSProperties}><i /></span>
          ))}
        </div>
        <div className="chart-labels">{["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"].map((month) => <span key={month}>{month}</span>)}</div>
      </section>

    </div>
  );

  const profileView = (
    <div className="view-stack screen-view">
      <SectionIntro eyebrow="EARTH IDENTITY" title="我的舱室" action={<IconButton aria-label="打开设置" icon={<Settings2 size={16} />} variant="neutral" size="small" />} />
      <section className="profile-panel module-surface"><span className="profile-avatar"><UserRound size={32} /></span><div><p className="section-title">Morty Smith</p><p className="body-copy muted-copy">Level 08 · Dimension C-137</p></div><span className="metric-badge"><Trophy size={16} /> 680 XP</span></section>
      <section className="setting-list module-surface">
        <div className="setting-row"><span><b>每日传送提醒</b><small>18:30 · 今日已开启</small></span><Button variant={goalEnabled ? "primary" : "neutral"} size="small" onClick={() => setGoalEnabled(!goalEnabled)}>{goalEnabled ? "开启" : "关闭"}</Button></div>
        <div className="setting-row"><span><b>本周任务</b><small>再完成 1 次训练即可解锁徽章</small></span><ChevronRight size={16} /></div>
      </section>
      <Button variant="neutral" iconStart={<Rocket size={16} />} onClick={() => setActiveTab("portal")}>查看星球生态</Button>
    </div>
  );

  const views: Record<Screen, React.ReactNode> = { home: homeView, workouts: workoutsView, portal: portalView, stats: statsView, profile: profileView };

  return (
    <main className="app-cosmos">
      <section className="phone-shell dark" aria-label="Portal Dash 健身应用">
        {activeTab !== "portal" && <PlanetBackdrop />}
        <div className="phone-topline"><div><p className="eyebrow">C-137 · TRAINING BAY</p><p className="topline-label">PORTAL FITNESS</p></div><IconButton aria-label="查看奖励" icon={<Trophy size={16} />} variant="neutral" size="small" /></div>
        <div className="view-scroll" key={activeTab}>
          {views[activeTab]}
        </div>
        {/* Astra navigation is a desktop sidebar, not an app-tab bar; this mobile-only navigation uses verified Lucide icons. */}
        <nav className="mobile-nav" aria-label="主导航">
          {nav.map((item) => {
            const Icon = item.icon;
            const selected = activeTab === item.id;
            return <button type="button" key={item.id} className={`mobile-nav-item ${selected ? "mobile-nav-active" : ""} ${item.id === "portal" ? "portal-tab" : ""}`} onClick={() => setActiveTab(item.id)} aria-current={selected ? "page" : undefined}>{item.id === "portal" ? <PortalMark small /> : <Icon size={24} />}<span>{item.label}</span>{item.id === "workouts" && <i className="notice-dot" />}</button>;
          })}
        </nav>
      </section>
    </main>
  );
}

export default function App() { return <ThemeProvider><FitnessApp /></ThemeProvider>; }
