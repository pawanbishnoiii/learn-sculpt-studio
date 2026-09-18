import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageSkeleton } from "@/components/ui/skeletons";
import { Timer as TimerIcon } from "lucide-react";
import {
  ChartDrawIn,
  CountUp,
  Reveal,
  StaggerGrid,
  useIdleGlow,
} from "@/components/motion/gsap-bits";
import { Mascot, mascotState } from "@/components/Mascot";
import { Icon3D } from "@/components/Icon3D";
import todayHeroArt from "@/assets/today-hero.png";
import { StreakFlame } from "@/components/StreakFlame";
import { ReadingHabitCard } from "@/components/ReadingHabitCard";
import { DailyPlanCard } from "@/components/DailyPlanCard";
import { fetchAttempts, subjectPerformance } from "@/lib/plan";
import { TodayStudyAnalytics } from "@/components/TodayStudyAnalytics";

import {
  DAYS,
  dailyMinutes,
  dayKey,
  endBreak,
  fetchBlocks,
  fetchBreaks,
  fetchMotivations,
  fetchOpenBreak,
  fetchRunningSession,
  fetchSessions,
  fetchSettings,
  fetchSubjects,
  fetchTargets,
  fetchXp,
  fmtHM,
  hourlyHeat,
  localTimeToIsoToday,
  minutesInRange,
  monthlyHistory,
  reorderBlocks,
  subjectProgress,
  updateSubject,
  startBreak,
  startOfToday,
  startOfWeek,
  startSession,
  stopSession,
  weeklyHistory,
} from "@/lib/study";
import type { Block, Target } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Today — Chronodeck Study OS" },
      {
        name: "description",
        content:
          "Live focus timer, weekly progress charts, calendar analytics, targets and AI coaching in one study dashboard.",
      },
      { property: "og:title", content: "Today — Chronodeck Study OS" },
      {
        property: "og:description",
        content:
          "Run the focus timer, log breaks, track hours against your daily and weekly targets.",
      },
    ],
  }),
  component: TodayPage,
});

const EIGHT_WEEKS = new Date(Date.now() - 8 * 7 * 864e5).toISOString();

function TodayPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [startOpen, setStartOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [scope, setScope] = useState<"day" | "week" | "month">("day");
  const [subjScope, setSubjScope] = useState<"1D" | "1W" | "1M">("1D");
  const [editSubject, setEditSubject] = useState<{
    id: string;
    name: string;
    hours: string;
  } | null>(null);

  const [form, setForm] = useState({
    subject_id: "",
    subject_name: "",
    topic: "",
    kind: "reading",
  });
  const [saveForm, setSaveForm] = useState({ topic: "", notes: "" });

  const running = useQuery({
    queryKey: ["running"],
    queryFn: fetchRunningSession,
    refetchInterval: 60_000,
  });
  const openBreak = useQuery({ queryKey: ["open-break"], queryFn: fetchOpenBreak });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const blocks = useQuery({ queryKey: ["blocks"], queryFn: fetchBlocks });
  const targets = useQuery({ queryKey: ["targets"], queryFn: fetchTargets });
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const xp = useQuery({ queryKey: ["xp"], queryFn: fetchXp });

  const motivations = useQuery({
    queryKey: ["motivations"],
    queryFn: fetchMotivations,
    staleTime: 60 * 60_000,
  });
  const breaks = useQuery({
    queryKey: ["breaks"],
    queryFn: () => fetchBreaks(startOfWeek().toISOString()),
  });
  const sessions = useQuery({
    queryKey: ["sessions", "8w"],
    queryFn: () => fetchSessions(EIGHT_WEEKS),
  });

  const all = sessions.data ?? [];
  const dailyGoal = settings.data?.daily_goal_hours ?? 4;
  const weeklyGoal = settings.data?.weekly_goal_hours ?? 26;

  // The clock only ticks while a session is actually live, so an idle home
  // screen costs zero re-renders per second on low-end phones.
  const liveSession = running.data;
  const liveBreakStart = openBreak.data?.started_at ?? null;
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    if (!liveSession) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [liveSession]);

  /** Focus seconds of the running session, derived from the server timestamps
   *  only — so a refresh always rebuilds exactly the same number. */
  const liveFocusSeconds = useMemo(() => {
    if (!liveSession) return 0;
    const elapsed = Math.max(
      0,
      Math.floor((nowTs - new Date(liveSession.started_at).getTime()) / 1000),
    );
    const activeBreak = liveBreakStart
      ? Math.max(0, Math.floor((nowTs - new Date(liveBreakStart).getTime()) / 1000))
      : 0;
    return Math.max(0, elapsed - (liveSession.break_minutes ?? 0) * 60 - activeBreak);
  }, [liveSession, liveBreakStart, nowTs]);

  const todayMin = minutesInRange(all, startOfToday()) + Math.floor(liveFocusSeconds / 60);
  const weekMin = minutesInRange(all, startOfWeek());
  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);
  const monthMin = minutesInRange(all, monthStart);

  const history = useMemo(() => weeklyHistory(all, weeklyGoal), [all, weeklyGoal]);
  const monthly = useMemo(() => monthlyHistory(all, weeklyGoal), [all, weeklyGoal]);
  const perDay = useMemo(() => dailyMinutes(all), [all]);
  const ctaRef = useIdleGlow<HTMLButtonElement>();
  const streakAlive =
    !xp.data?.last_streak_at ||
    Date.now() - new Date(xp.data.last_streak_at).getTime() <= 48 * 60 * 60 * 1000;
  const streak = streakAlive ? (xp.data?.streak ?? 0) : 0;
  const heroMood = mascotState({ goalHit: todayMin >= dailyGoal * 60, streak });

  const activeTargets = (targets.data ?? []).filter((t) => t.is_active);

  const quote = useMemo(() => {
    const qs = (motivations.data ?? []).filter((m) => m.kind === "quote");
    if (!qs.length) return null;
    return qs[new Date().getDate() % qs.length] ?? null;
  }, [motivations.data]);


  const hours = useMemo(() => hourlyHeat(all), [all]);
  const subjWindow = useMemo(() => {
    if (subjScope === "1D") return { since: startOfToday(), scale: 1 / 7, label: "today" };
    if (subjScope === "1W") return { since: startOfWeek(), scale: 1, label: "this week" };
    return { since: monthStart, scale: 4.345, label: "this month" };
  }, [subjScope, monthStart]);

  const progress = useMemo(
    () => subjectProgress(all, subjects.data ?? [], subjWindow.since, subjWindow.scale),
    [all, subjects.data, subjWindow],
  );

  const attempts = useQuery({ queryKey: ["attempts"], queryFn: () => fetchAttempts() });
  const perf = useMemo(
    () =>
      subjectPerformance(
        subjects.data ?? [],
        all,
        attempts.data ?? [],
        subjWindow.since,
        subjWindow.scale,
      ),
    [subjects.data, all, attempts.data, subjWindow],
  );



  const saveSubjectTarget = useMutation({
    mutationFn: async (v: { id: string; hours: number }) =>
      updateSubject(v.id, { weekly_target_hours: v.hours }),
    onSuccess: async () => {
      setEditSubject(null);
      await qc.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Target updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderBlocks(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const start = useMutation({
    mutationFn: async () => {
      const subj = (subjects.data ?? []).find((s) => s.id === form.subject_id);
      const now = new Date();
      const current = (blocks.data ?? []).find(
        (b) =>
          b.day_of_week === now.getDay() &&
          b.start_time <=
            `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}` &&
          b.end_time >=
            `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      );
      const plannedEnd = current ? localTimeToIsoToday(current.end_time) : null;
      await startSession({
        subject_id: subj?.id ?? null,
        subject_name: subj?.name ?? form.subject_name.trim() ?? null,
        topic: form.topic.trim() || null,
        kind: form.kind,
        planned_end_at: plannedEnd,
      });
    },
    onSuccess: async () => {
      setStartOpen(false);
      await qc.invalidateQueries({ queryKey: ["running"] });
      toast.success("Focus mode on");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pause = useMutation({
    mutationFn: (kind: string) => startBreak(running.data?.id ?? null, kind),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["open-break"] }),
  });

  const resume = useMutation({
    mutationFn: async () => {
      const b = openBreak.data;
      if (b) await endBreak(b.id, b.started_at);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["open-break"] });
      qc.invalidateQueries({ queryKey: ["breaks"] });
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const s = running.data;
      if (!s) return;
      const b = openBreak.data;
      if (b) await endBreak(b.id, b.started_at);
      await stopSession(s.id, s.started_at, {
        subject_id: s.subject_id,
        subject_name: s.subject_name,
        topic: saveForm.topic.trim() || s.topic || "",
        notes: saveForm.notes.trim(),
        kind: s.kind,
      });
    },
    onSuccess: async () => {
      setSaveOpen(false);
      setSaveForm({ topic: "", notes: "" });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["running"] }),
        qc.invalidateQueries({ queryKey: ["sessions", "8w"] }),
        qc.invalidateQueries({ queryKey: ["targets"] }),
        qc.invalidateQueries({ queryKey: ["open-break"] }),
        qc.invalidateQueries({ queryKey: ["breaks"] }),
      ]);
      toast.success("Session saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (sessions.isLoading && !sessions.data) return <PageSkeleton />;

  return (
    <>
      {running.data ? (
        <RunningTimerCard
          focusSeconds={liveFocusSeconds}
          subject={running.data.subject_name ?? "Study"}
          topic={running.data.topic}
          onBreak={!!openBreak.data}
          onOpen={() => navigate({ to: "/timer" })}
        />
      ) : null}

      <div className="app-page today-dashboard space-y-4 sm:space-y-6">
        {/* Focus card — pastel panel with goal, progress and one clear action */}
        <section className="surface-card today-hero overflow-hidden bg-[var(--lavender-soft)] p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <p className="section-label">Today</p>
              <h1 className="mt-2 text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1] font-extrabold tracking-tight">
                {todayMin > 0 ? `${fmtHM(todayMin)} focused today` : "Start your first session"}
              </h1>
              <p className="mt-2 text-[15px] leading-6 text-muted-foreground">
                Daily goal {fmtHM(dailyGoal * 60)} ·{" "}
                {Math.min(100, Math.round((todayMin / 60 / dailyGoal) * 100))}% complete
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-panel py-1 pr-3 pl-1.5 text-xs font-bold">
                  <StreakFlame days={streak} showCount={false} size={22} />
                  {streak === 1 ? "1 day streak" : `${streak} day streak`}
                </span>
                <span className="rounded-full bg-panel/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  {streak > 0
                    ? "48-hour streak window active"
                    : "Finish a session to start your streak"}
                </span>
              </div>

              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-panel">
                <div
                  className="h-full rounded-full bg-foreground transition-[width] duration-1000 ease-out"
                  style={{ width: `${Math.min(100, (todayMin / 60 / dailyGoal) * 100)}%` }}
                />
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  ref={ctaRef}
                  onClick={() => navigate({ to: running.data ? "/timer" : "/study" })}
                  className="inline-flex h-13 min-h-12 flex-1 items-center justify-center rounded-full bg-foreground px-6 text-[15px] font-bold text-background sm:flex-none sm:px-10"
                >
                  {running.data ? "Open running timer" : "Start study"}
                </button>
                <Mascot state={heroMood} size={48} className="shrink-0" />
              </div>
            </div>
            <div className="today-hero-motion pointer-events-none mx-auto w-36 shrink-0 select-none sm:w-48 lg:w-56">
              <img
                src={todayHeroArt}
                alt=""
                className="aspect-square h-full w-full object-contain float-soft"
              />
            </div>
          </div>
        </section>

        {/* Compact period summaries */}
        <section className="today-summary grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Today", minutes: todayMin, bg: "var(--lavender-soft)" },
            { label: "This week", minutes: weekMin, bg: "var(--blue-soft)" },
            { label: "This month", minutes: monthMin, bg: "var(--mint-soft)" },
          ].map((s) => (
            <div
              key={s.label}
              className="surface-card min-w-0 p-3 sm:p-5"
              style={{ background: s.bg }}
            >
              <p className="truncate text-base leading-none font-extrabold tabular-nums sm:text-xl">
                <CountUp value={Math.floor(s.minutes / 60)} decimals={0} suffix="h" />
                <span className="ml-1 text-xs opacity-70">
                  {String(Math.round(s.minutes % 60)).padStart(2, "0")}m
                </span>
              </p>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Compulsory reading — daily newspaper + monthly magazine */}
        <ReadingHabitCard />

        <DailyPlanCard
          sessions={all}
          onStart={(item) => navigate({ to: "/study", search: { plan: item.id } })}
        />

        {/* Analytics calendar */}
        <Reveal className="glass-panel today-analytics overflow-hidden p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon3D name="calendar" size={32} />
              <h2 className="text-base font-bold tracking-tight">Analytics</h2>
            </div>
            <div className="flex gap-1 rounded-xl bg-background p-1">
              {(["day", "week", "month"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`rounded-lg px-3 py-1 font-mono text-[10px] uppercase transition-all duration-300 ${
                    scope === s
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Live day analytics — real study output, no test-style metrics */}
          <TodayStudyAnalytics
            sessions={all}
            breaks={breaks.data ?? []}
            liveFocusMinutes={Math.floor(liveFocusSeconds / 60)}
            savedLayout={settings.data?.widget_layout}
          />

          <div className="mt-5">
            <ResponsiveContainer width="100%" height="100%">
              <ScopeChart
                scope={scope}
                sessions={all}
                dailyGoal={dailyGoal}
                weeklyGoal={weeklyGoal}
              />
            </ResponsiveContainer>
          </div>

          <MonthGrid perDay={perDay} dailyGoal={dailyGoal} />

          {/* Subject-wise performance against each subject's target */}
          <div className="mt-6">
            <p className="section-label">Subject performance · {subjWindow.label}</p>
            {perf.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Add subjects to see how each one is performing.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {perf.slice(0, 8).map((s) => (
                  <li key={s.id} className="grid gap-2 rounded-2xl bg-secondary/60 p-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold">{s.name}</span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                        {fmtHM(s.minutes)} / {fmtHM(s.targetMinutes)}
                      </span>
                    </div>
                    <span className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full transition-[width] duration-700 ease-out"
                        style={{
                          width: `${s.pct}%`,
                          background: s.color,
                        }}
                      />
                    </span>
                    <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                      <span>
                        <b className="block text-sm">
                          {s.topicsDone}/{s.topicsTotal}
                        </b>
                        topics
                      </span>
                      <span>
                        <b className="block text-sm">{s.attempted}</b>attempted
                      </span>
                      <span>
                        <b className="block text-sm text-[var(--success)]">{s.correct}</b>correct
                      </span>
                      <span>
                        <b className="block text-sm text-destructive">{s.incorrect}</b>incorrect
                      </span>
                    </div>
                    <p className="text-xs font-bold">Average accuracy {s.accuracy}%</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>

        {/* Hourly heatmap */}
        <Reveal className="glass-panel p-5">
          <div className="flex items-center gap-3">
            <Icon3D name="clock" size={32} />
            <h2 className="text-base font-bold tracking-tight">Hour by hour</h2>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground uppercase">
              today
            </span>
          </div>
          <StaggerGrid selector=".hour-cell">
            <HourGrid hours={hours} />
          </StaggerGrid>
          <div className="mt-3 flex items-center gap-4 font-mono text-[9px] text-muted-foreground uppercase">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-brand" /> studied
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-destructive/70" /> missed
            </span>
          </div>
        </Reveal>

        {/* Subject progress */}
        <Reveal className="glass-panel p-5">
          <div className="flex items-center gap-3">
            <Icon3D name="books" size={32} />
            <h2 className="text-base font-bold tracking-tight">Subject progress</h2>
            <div className="ml-auto flex gap-1 rounded-xl bg-background p-1">
              {(["1D", "1W", "1M"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setSubjScope(k)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-[10px] transition-all duration-300 ${
                    subjScope === k
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
            target {subjWindow.label}
          </p>
          {progress.length ? (
            <ul className="mt-4 space-y-3">
              {progress.map((p) => (
                <li key={p.name}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate font-medium">{p.name}</span>
                    <span className="shrink-0 font-mono text-muted-foreground">
                      {p.sessions} sess · {fmtHM(p.minutes)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background">
                    <div
                      className="gradient-bar h-full rounded-full transition-[width] duration-1000 ease-out"
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {p.targetHours > 0
                        ? `${p.pct}% of ${fmtHM(p.targetHours * 60)} · ${fmtHM(p.remainingHours * 60)} left`
                        : "no target set"}
                    </p>
                    {p.id ? (
                      <button
                        onClick={() =>
                          setEditSubject({
                            id: p.id!,
                            name: p.name,
                            hours: String(
                              (subjects.data ?? []).find((x) => x.id === p.id)
                                ?.weekly_target_hours ?? 0,
                            ),
                          })
                        }
                        className="font-mono text-[10px] text-brand uppercase"
                      >
                        edit
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Add subjects and finish a session to see per-subject progress.
            </p>
          )}
        </Reveal>

        {/* Day planner with drag & drop */}
        <DayPlanner
          blocks={blocks.data ?? []}
          targets={activeTargets}
          onReorder={(ids) => reorder.mutate(ids)}
        />

        {/* Weekly progress chart */}
        <section className="rounded-2xl border border-border bg-panel p-5">
          <h2 className="text-base font-bold tracking-tight">Weekly target progress</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Last 8 weeks vs your {weeklyGoal}h weekly goal
          </p>
          <ChartDrawIn className="mt-4 h-44" deps={[history]}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  cursor={{ fill: "var(--accent)" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="hours" fill="rgba(255,255,255,0.14)" radius={[6, 6, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="goal"
                  stroke="var(--accent-end)"
                  strokeWidth={2}
                  dot={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartDrawIn>
          <div className="mt-3 h-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <Area
                  type="monotone"
                  dataKey="pct"
                  stroke="var(--warm)"
                  fill="color-mix(in oklab, var(--warm) 25%, transparent)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">% of weekly goal completed</p>
        </section>

        {/* Targets */}
        <section className="rounded-2xl border border-border bg-panel p-5">
          <div className="flex items-center gap-3">
            <Icon3D name="target" size={32} />
            <h2 className="text-base font-bold tracking-tight">Targets</h2>
            <Link to="/targets" className="ml-auto font-mono text-[10px] text-brand uppercase">
              manage
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Ring label="Daily" done={todayMin / 60} goal={dailyGoal} />
            <Ring label="Weekly" done={weekMin / 60} goal={weeklyGoal} />
          </div>
          {activeTargets.length ? (
            <ul className="mt-4 space-y-2">
              {activeTargets.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t.title}</span>
                  <span className="font-mono">
                    {t.daily_hours}h/d · {t.weekly_hours}h/w
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              No targets yet — add one on the Targets page.
            </p>
          )}
        </section>

        {/* Breaks */}
        <section className="rounded-2xl border border-border bg-panel p-5">
          <div className="flex items-center gap-3">
            <Icon3D name="break" size={32} />
            <h2 className="text-base font-bold tracking-tight">Break log</h2>
          </div>
          {breaks.data?.length ? (
            <ul className="mt-3 space-y-2">
              {breaks.data.slice(0, 6).map((b) => (
                <li key={b.id} className="flex items-center justify-between text-xs">
                  <span className="capitalize">{b.kind}</span>
                  <span className="font-mono text-muted-foreground">
                    {new Date(b.started_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {b.duration_minutes ? ` · ${b.duration_minutes}m` : " · open"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Pause, sleep or free time logged during focus mode appears here.
            </p>
          )}
        </section>

        {/* Monthly progress */}
        <section className="rounded-2xl border border-border bg-panel p-5">
          <h2 className="text-base font-bold tracking-tight">Monthly progress</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Last 6 months of real sessions vs your pro-rated goal
          </p>
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="monthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  fill="url(#monthFill)"
                />
                <Line
                  type="monotone"
                  dataKey="goal"
                  stroke="var(--warm)"
                  dot={false}
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
            this month {monthly.at(-1)?.hours ?? 0}h · {monthly.at(-1)?.pct ?? 0}% of goal
          </p>
        </section>

        {/* Daily motivation */}
        {quote ? (
          <section className="rounded-2xl border border-border bg-panel p-5">
            <div className="flex items-center gap-3">
              <Icon3D name="trophy" size={32} />
              <h2 className="text-base font-bold tracking-tight">{quote.title}</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{quote.body}</p>
            {quote.author ? (
              <p className="mt-2 font-mono text-[10px] text-brand uppercase">— {quote.author}</p>
            ) : null}
          </section>
        ) : null}
      </div>

      {/* Start sheet */}
      {startOpen ? (
        <Sheet title="Start study" onClose={() => setStartOpen(false)}>
          <label className="block text-xs text-muted-foreground">Subject</label>
          <select
            value={form.subject_id}
            onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
            className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="">Custom subject…</option>
            {(subjects.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {!form.subject_id ? (
            <input
              value={form.subject_name}
              onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
              placeholder="e.g. Physics"
              className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
            />
          ) : null}

          <label className="mt-4 block text-xs text-muted-foreground">Topic</label>
          <input
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="Chapter / topic"
            className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />

          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { k: "reading", l: "Reading" },
              { k: "class", l: "Online class" },
            ].map((o) => (
              <button
                key={o.k}
                onClick={() => setForm({ ...form, kind: o.k })}
                className={`h-11 rounded-xl border text-sm ${
                  form.kind === o.k ? "border-brand bg-brand/10 text-brand" : "border-border"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>

          <button
            onClick={() => start.mutate()}
            disabled={start.isPending}
            className="mt-5 h-12 w-full rounded-2xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
          >
            {start.isPending ? "Starting…" : "Start timer"}
          </button>
        </Sheet>
      ) : null}

      {/* Save sheet */}
      {saveOpen ? (
        <Sheet title="Save session" onClose={() => setSaveOpen(false)}>
          <p className="text-xs text-muted-foreground">
            {running.data?.subject_name ?? "Study"} ·{" "}
            {running.data
              ? `${Math.round((Date.now() - new Date(running.data.started_at).getTime()) / 60000)} min`
              : ""}
          </p>
          <label className="mt-4 block text-xs text-muted-foreground">Topic covered</label>
          <input
            value={saveForm.topic}
            onChange={(e) => setSaveForm({ ...saveForm, topic: e.target.value })}
            className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />
          <label className="mt-4 block text-xs text-muted-foreground">Notes</label>
          <textarea
            value={saveForm.notes}
            onChange={(e) => setSaveForm({ ...saveForm, notes: e.target.value })}
            rows={3}
            className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm"
          />
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="mt-5 h-12 w-full rounded-2xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
          >
            {save.isPending ? "Saving…" : "Complete session"}
          </button>
          <button
            onClick={() => setSaveOpen(false)}
            className="mt-2 h-11 w-full rounded-2xl border border-border text-sm"
          >
            Back to timer
          </button>
        </Sheet>
      ) : null}

      {/* Edit subject target sheet */}
      {editSubject ? (
        <Sheet title={`Edit ${editSubject.name} target`} onClose={() => setEditSubject(null)}>
          <label className="block text-xs text-muted-foreground">Weekly target (hours)</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={editSubject.hours}
            onChange={(e) => setEditSubject({ ...editSubject, hours: e.target.value })}
            className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
          />
          <p className="mt-2 text-[10px] text-muted-foreground">
            This becomes the subject's weekly goal. Daily and monthly targets scale from it
            automatically.
          </p>
          <button
            onClick={() =>
              saveSubjectTarget.mutate({
                id: editSubject.id,
                hours: Number(editSubject.hours) || 0,
              })
            }
            disabled={saveSubjectTarget.isPending}
            className="mt-5 h-12 w-full rounded-2xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
          >
            {saveSubjectTarget.isPending ? "Saving…" : "Save target"}
          </button>
        </Sheet>
      ) : null}
    </>
  );
}

function BlockList({
  items,
  empty,
}: {
  items: Array<{ id: string; title: string; kind: string; start_time: string; end_time: string }>;
  empty: string;
}) {
  if (!items.length) return <p className="mt-2 text-xs text-muted-foreground">{empty}</p>;
  return (
    <ul className="mt-2 space-y-2">
      {items.map((b) => (
        <li
          key={b.id}
          className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs"
        >
          <span>
            {b.title}
            <span className="ml-2 text-muted-foreground capitalize">{b.kind}</span>
          </span>
          <span className="font-mono text-muted-foreground">
            {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Ring({ label, done, goal }: { label: string; done: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : 0;
  return (
    <div className="rounded-2xl border border-border p-4">
      <div
        className="mx-auto grid size-20 place-items-center rounded-full"
        style={{
          background: `conic-gradient(var(--brand) ${pct * 3.6}deg, var(--accent) 0deg)`,
        }}
      >
        <div className="grid size-16 place-items-center rounded-full bg-panel font-mono text-sm font-semibold">
          {pct}%
        </div>
      </div>
      <p className="mt-3 text-center text-[10px] tracking-widest text-muted-foreground uppercase">
        {label} · {fmtHM(done)}/{fmtHM(goal * 60)}
      </p>
    </div>
  );
}

function ScopeChart({
  scope,
  sessions,
  dailyGoal,
  weeklyGoal,
}: {
  scope: "day" | "week" | "month";
  sessions: { started_at: string; duration_minutes: number | null }[];
  dailyGoal: number;
  weeklyGoal: number;
}) {
  if (scope === "day") {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      h: String(i).padStart(2, "0") + ":00",
      m: 0,
    }));
    for (const s of sessions) {
      const d = new Date(s.started_at);
      if (dayKey(d) !== dayKey(new Date())) continue;
      const h = d.getHours();
      hours[h]!.m += s.duration_minutes ?? 0;
    }
    return (
      <BarChart data={hours}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="h"
          tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          interval={3}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Bar dataKey="m" fill="var(--brand)" radius={[4, 4, 0, 0]} />
      </BarChart>
    );
  }

  if (scope === "week") {
    const days = [];
    const start = startOfWeek();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push({
        label: DAYS[d.getDay()],
        h: (perDayFromSessions(sessions, d) / 60).toFixed(1),
        goal: dailyGoal,
      });
    }
    return (
      <BarChart data={days}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Bar dataKey="h" fill="var(--brand)" radius={[6, 6, 0, 0]} />
        <Line
          type="monotone"
          dataKey="goal"
          stroke="var(--warm)"
          dot={false}
          strokeDasharray="4 4"
        />
      </BarChart>
    );
  }

  // month
  const weeks = [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  for (let w = 0; w < 5; w++) {
    const ws = new Date(monthStart);
    ws.setDate(ws.getDate() + w * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    if (ws > monthEnd) break;
    let m = 0;
    for (const s of sessions) {
      const d = new Date(s.started_at);
      if (d >= ws && d <= we) m += s.duration_minutes ?? 0;
    }
    weeks.push({ label: `W${w + 1}`, h: (m / 60).toFixed(1), goal: weeklyGoal });
  }
  return (
    <AreaChart data={weeks}>
      <defs>
        <linearGradient id="monthFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.35} />
          <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} stroke="var(--border)" />
      <XAxis
        dataKey="label"
        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis hide />
      <Tooltip
        contentStyle={{
          background: "var(--popover)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          fontSize: 12,
        }}
      />
      <Area type="monotone" dataKey="h" stroke="var(--brand)" fill="url(#monthFill)" />
      <Line type="monotone" dataKey="goal" stroke="var(--warm)" dot={false} strokeDasharray="4 4" />
    </AreaChart>
  );
}

function perDayFromSessions(
  sessions: { started_at: string; duration_minutes: number | null }[],
  d: Date,
) {
  let m = 0;
  for (const s of sessions) {
    if (dayKey(new Date(s.started_at)) === dayKey(d)) m += s.duration_minutes ?? 0;
  }
  return m;
}

function MonthGrid({ perDay, dailyGoal }: { perDay: Record<string, number>; dailyGoal: number }) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => new Date(now.getFullYear(), now.getMonth(), i + 1)),
  ];
  return (
    <div className="mt-5">
      <div className="grid grid-cols-7 gap-1.5 font-mono text-[9px] text-muted-foreground">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-center">
            {d}
          </span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const mins = perDay[dayKey(d)] ?? 0;
          const isFuture = d > now;
          const isToday = dayKey(d) === dayKey(now);
          const hit = mins >= dailyGoal * 60;
          const partial = mins > 0 && !hit;
          const bg = isFuture
            ? "var(--accent)"
            : hit
              ? "color-mix(in oklab, var(--success) 65%, var(--accent))"
              : partial
                ? "color-mix(in oklab, var(--warning) 55%, var(--accent))"
                : "color-mix(in oklab, var(--destructive) 45%, var(--accent))";
          return (
            <div
              key={dayKey(d)}
              title={`${d.getDate()} · ${fmtHM(mins)}`}
              className={`grid aspect-square place-items-center rounded-md font-mono text-[9px] transition-colors ${
                isToday ? "outline-1 -outline-offset-1 outline-brand" : ""
              }`}
              style={{
                background: bg,
                color: hit || partial ? "var(--background)" : "var(--muted-foreground)",
              }}
            >
              {d.getDate()}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 font-mono text-[9px] text-muted-foreground uppercase">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--success)]" /> hit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--warning)]" /> partial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--destructive)]" /> missed
        </span>
      </div>
    </div>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end bg-foreground/25 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88svh] w-full animate-[slide-in-right_0.001s] overflow-y-auto rounded-t-3xl border-t border-border bg-panel p-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function HourGrid({ hours }: { hours: number[] }) {
  const nowHour = new Date().getHours();
  return (
    <div className="mt-4 grid grid-cols-8 gap-1.5 sm:grid-cols-12">
      {hours.map((mins, h) => {
        const future = h > nowHour;
        const bg = future
          ? "var(--accent)"
          : mins >= 20
            ? `color-mix(in oklab, var(--brand) ${Math.min(100, 40 + mins)}%, var(--accent))`
            : "color-mix(in oklab, var(--destructive) 45%, var(--accent))";
        return (
          <div
            key={h}
            title={`${String(h).padStart(2, "0")}:00 · ${mins}m`}
            className="grid aspect-square place-items-center rounded-md font-mono text-[9px] transition-colors"
            style={{ background: bg, color: "var(--foreground)" }}
          >
            {h}
          </div>
        );
      })}
    </div>
  );
}

function DayPlanner({
  blocks,
  targets,
  onReorder,
}: {
  blocks: Block[];
  targets: Target[];
  onReorder: (ids: string[]) => void;
}) {
  const [day, setDay] = useState(new Date().getDay());
  const [dragId, setDragId] = useState<string | null>(null);
  const items = blocks.filter((b) => b.day_of_week === day);

  function drop(overId: string) {
    if (!dragId || dragId === overId) return;
    const ids = items.map((b) => b.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(overId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ...ids.splice(from, 1));
    onReorder(ids);
    setDragId(null);
  }

  return (
    <section className="rounded-2xl border border-border bg-panel p-5">
      <div className="flex items-center gap-3">
        <Icon3D name="calendar" size={32} />
        <h2 className="text-base font-bold tracking-tight">Day calendar</h2>
        <Link to="/timetable" className="ml-auto font-mono text-[10px] text-brand uppercase">
          edit
        </Link>
      </div>

      <div className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`h-9 shrink-0 rounded-xl px-3 font-mono text-[11px] transition-colors ${
              day === d
                ? "bg-brand text-brand-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {DAYS[d]}
          </button>
        ))}
      </div>

      {items.length ? (
        <ul className="mt-4 space-y-2">
          {items.map((b) => (
            <li
              key={b.id}
              draggable
              onDragStart={() => setDragId(b.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(b.id)}
              className={`flex cursor-grab items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-xs transition-opacity active:cursor-grabbing ${
                dragId === b.id ? "opacity-50" : ""
              }`}
            >
              <span className="font-mono text-muted-foreground">⠿</span>
              <span className="min-w-0 flex-1 truncate">
                {b.title}
                <span className="ml-2 text-muted-foreground capitalize">{b.kind}</span>
              </span>
              <span className="shrink-0 font-mono text-muted-foreground">
                {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">No blocks for this day yet.</p>
      )}

      <p className="mt-4 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        Targets
      </p>
      {targets.length ? (
        <ul className="mt-2 space-y-1.5">
          {targets.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate">{t.title}</span>
              <span className="shrink-0 font-mono text-muted-foreground">
                {t.daily_hours}h today
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No active targets.</p>
      )}
    </section>
  );
}

/**
 * Live session banner on the home page — shows the running timer and takes the
 * student straight back to the dedicated timer page.
 */
function RunningTimerCard({
  focusSeconds,
  subject,
  topic,
  onBreak,
  onOpen,
}: {
  focusSeconds: number;
  subject: string;
  topic: string | null;
  onBreak: boolean;
  onOpen: () => void;
}) {
  const hh = String(Math.floor(focusSeconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((focusSeconds % 3600) / 60)).padStart(2, "0");
  const ss = String(focusSeconds % 60).padStart(2, "0");

  return (
    <div className="px-4 pt-4">
      <button
        onClick={onOpen}
        className="flex w-full items-center gap-4 rounded-[28px] bg-foreground p-4 text-left text-background active:scale-[0.99]"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-background/15">
          <TimerIcon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[10px] tracking-[0.3em] uppercase opacity-60">
            {onBreak ? "on break" : "session running"}
          </span>
          <span className="mt-0.5 block font-mono text-2xl font-semibold tabular-nums">
            {hh}:{mm}
            <span className="text-sm opacity-60">:{ss}</span>
          </span>
          <span className="block truncate text-xs opacity-70">
            {subject}
            {topic ? ` · ${topic}` : ""}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-background/15 px-3 py-1.5 text-[11px] font-bold">
          Open
        </span>
      </button>
    </div>
  );
}
