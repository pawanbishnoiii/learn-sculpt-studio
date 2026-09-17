import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  fetchSubjects,
  fetchTargets,
  createTarget,
  toggleTarget,
  deleteTarget,
  fetchSessions,
  fetchSettings,
  fmtHM,
  minutesInRange,
  startOfWeek,
  targetProgress,
} from "@/lib/study";
import { ProgressRing } from "@/components/motion/gsap-bits";
import { SubjectsManager } from "@/components/SubjectsManager";
import { EmptyState, PageHeader, ResponsiveSheet } from "@/components/study-ui";
import { Button } from "@/components/ui/button";
import emptyCalendar from "@/assets/chronodeck-empty-calendar.png";
import { fetchSubjectTargets } from "@/lib/plan";

const EIGHT_WEEKS = new Date(Date.now() - 8 * 7 * 864e5).toISOString();

export const Route = createFileRoute("/_authenticated/targets")({
  head: () => ({
    meta: [
      { title: "Targets — Chronodeck Study OS" },
      {
        name: "description",
        content: "Set daily and weekly study targets so the AI coach can measure your progress.",
      },
      { property: "og:title", content: "Targets — Chronodeck Study OS" },
      {
        property: "og:description",
        content: "Daily and weekly study goals with AI-tracked progress.",
      },
    ],
  }),
  component: TargetsPage,
});

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand/60";

function TargetsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const targets = useQuery({ queryKey: ["targets"], queryFn: fetchTargets });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const sessions = useQuery({ queryKey: ["sessions", "8w"], queryFn: () => fetchSessions(EIGHT_WEEKS) });
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const subjectTargets = useQuery({ queryKey: ["subject-targets"], queryFn: fetchSubjectTargets });

  const weeklyGoal = settings.data?.weekly_goal_hours ?? 26;
  const weekMin = minutesInRange(sessions.data ?? [], startOfWeek());
  const weekPct = weeklyGoal > 0 ? Math.min(100, Math.round((weekMin / (weeklyGoal * 60)) * 100)) : 0;

  const createM = useMutation({
    mutationFn: createTarget,
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries();
      toast.success("Target added.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleM = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => toggleTarget(id, is_active),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteM = useMutation({
    mutationFn: deleteTarget,
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Target deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="app-page">
      <PageHeader eyebrow="Goals" title="Targets that stay realistic" description="Compare planned study time with real sessions and keep your syllabus visible." action={<Button onClick={() => setOpen(true)}>New target</Button>} />

        <section className="mt-6 grid gap-4 rounded-[32px] bg-lavender-soft p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:p-7">
          <ProgressRing
            pct={weekPct}
            label="This week"
            sub={`${fmtHM(weekMin)} / ${fmtHM(weeklyGoal * 60)}`}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-panel p-4"><p className="text-xs text-muted-foreground">Actual this week</p><p className="mt-1 text-xl font-extrabold">{fmtHM(weekMin)}</p></div><div className="rounded-2xl bg-panel p-4"><p className="text-xs text-muted-foreground">Weekly goal</p><p className="mt-1 text-xl font-extrabold">{fmtHM(weeklyGoal * 60)}</p></div><div className="col-span-2 rounded-2xl bg-dark-card p-4 text-white sm:col-span-1"><p className="text-xs text-white/60">Remaining</p><p className="mt-1 text-xl font-extrabold">{fmtHM(Math.max(0, weeklyGoal * 60 - weekMin))}</p></div></div>
      </section>

      <section className="surface-card mt-6 p-5 sm:p-6">
        <h2 className="text-xl font-bold">Subjects and chapters</h2>
        <p className="mt-1 text-sm text-muted-foreground">Study time and chapter completion are tracked separately.</p>
        <div className="mt-5">
        <SubjectsManager />
        </div>
      </section>

      <section className="surface-card mt-6 p-5 sm:p-6">
        <div><p className="section-label">Automatic syllabus goals</p><h2 className="mt-1 text-xl font-bold">Daily · weekly · monthly</h2><p className="mt-1 text-sm text-muted-foreground">Generated from each subject's study hours and syllabus size.</p></div>
        {subjectTargets.isLoading ? <p className="mt-5 text-sm text-muted-foreground">Calculating balanced targets…</p> : subjectTargets.data?.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">{subjectTargets.data.map((target) => { const subject = (subjects.data ?? []).find((row) => row.id === target.subject_id); return <article key={target.id} className="rounded-2xl border border-border bg-secondary/60 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-bold">{subject?.name ?? "Subject"}</h3>{target.auto_created ? <span className="rounded-full bg-mint px-2 py-1 text-[10px] font-bold text-ink">AUTO</span> : null}</div><div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-panel p-2"><b className="block text-base">{target.daily_minutes}m</b>daily</div><div className="rounded-xl bg-panel p-2"><b className="block text-base">{target.weekly_topics}</b>topics/week</div><div className="rounded-xl bg-panel p-2"><b className="block text-base">{target.monthly_chapters}</b>chapters/month</div></div><p className="mt-3 text-xs text-muted-foreground">Practice: {target.daily_questions}/day · {target.weekly_questions}/week · {target.monthly_questions}/month</p></article>; })}</div> : <p className="mt-5 text-sm text-muted-foreground">Add a subject to generate its goals.</p>}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {(targets.data ?? []).length === 0 && (
          <div className="surface-card md:col-span-2"><EmptyState image={emptyCalendar} title="No targets yet" description="Add a realistic daily or weekly goal to compare against your study sessions." action={<Button onClick={() => setOpen(true)}>Create target</Button>} /></div>
        )}
        {(targets.data ?? []).map((t) => (
          <article key={t.id} className={`surface-card p-5 ${t.is_active ? "bg-blue-soft" : "opacity-70"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${t.is_active ? "bg-brand" : "bg-muted-foreground"}`}
                  />
                  <h3 className={`text-sm font-semibold ${t.is_active ? "" : "text-muted-foreground"}`}>
                    {t.title}
                  </h3>
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {t.daily_hours}h daily · {t.weekly_hours}h weekly
                  {t.deadline ? ` · due ${new Date(t.deadline).toLocaleDateString()}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => toggleM.mutate({ id: t.id, is_active: !t.is_active })}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {t.is_active ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => deleteM.mutate(t.id)}
                  className="text-[10px] text-muted-foreground hover:text-destructive"
                >
                  Delete
                </button>
              </div>
            </div>

            <TargetProgressBars target={t} sessions={sessions.data ?? []} />
          </article>
        ))}
      </section>

      <ResponsiveSheet open={open} onClose={() => setOpen(false)} title="New target" description="Set a measurable time goal without implying syllabus mastery.">
        <AddTargetForm
          subjects={subjects.data ?? []}
          busy={createM.isPending}
          onClose={() => setOpen(false)}
          onAdd={(v) => createM.mutate(v)}
        />
      </ResponsiveSheet>
    </div>
  );
}

/** Live daily/weekly completion for one target, computed from real sessions. */
function TargetProgressBars({
  target,
  sessions,
}: {
  target: Parameters<typeof targetProgress>[0];
  sessions: Parameters<typeof targetProgress>[1];
}) {
  const p = targetProgress(target, sessions);
  const rows = [
    { label: "Today", pct: p.dailyPct, done: p.todayMinutes, goal: target.daily_hours * 60 },
    { label: "Week", pct: p.weeklyPct, done: p.weekMinutes, goal: target.weekly_hours * 60 },
  ];
  return (
    <div className="mt-3 space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-2">
          <span className="text-[10px] tracking-wide text-muted-foreground uppercase">{r.label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-muted">
            <span
              className="gradient-bar block h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${r.pct}%` }}
            />
          </span>
          <span className="num shrink-0 text-[10px] text-muted-foreground">
            {fmtHM(r.done)} / {fmtHM(r.goal)}
          </span>
        </div>
      ))}
    </div>
  );
}

function AddTargetForm({
  subjects,
  busy,
  onClose,
  onAdd,
}: {
  subjects: { id: string; name: string }[];
  busy: boolean;
  onClose: () => void;
  onAdd: (v: {
    title: string;
    subject_id: string | null;
    daily_hours: number;
    weekly_hours: number;
    deadline: string | null;
  }) => void;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [custom, setCustom] = useState("");
  const [daily, setDaily] = useState("1");
  const [weekly, setWeekly] = useState("7");
  const [deadline, setDeadline] = useState("");
  const title = subjectId ? subjects.find((s) => s.id === subjectId)?.name : custom;
  const dailyNumber = Number(daily);
  const weeklyNumber = Number(weekly);
  const validation = !Number.isFinite(dailyNumber) || dailyNumber < 0 || dailyNumber > 24
    ? "Daily hours must be between 0 and 24."
    : !Number.isFinite(weeklyNumber) || weeklyNumber < 0 || weeklyNumber > 168
      ? "Weekly hours must be between 0 and 168."
      : !title?.trim() ? "Choose a subject or enter a target title." : null;
  return (
    <div className="space-y-3">
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
            <option value="">Custom title</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {!subjectId && (
            <input
              className={inputCls}
              placeholder="target title"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-mono text-[10px] text-muted-foreground uppercase">
                Daily hours
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={daily}
                onChange={(e) => setDaily(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] text-muted-foreground uppercase">
                Weekly hours
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={weekly}
                onChange={(e) => setWeekly(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] text-muted-foreground uppercase">
              Deadline (optional)
            </label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-2 pt-1">
            {validation ? <p role="alert" className="col-span-2 text-xs text-destructive">{validation}</p> : null}
            <button onClick={onClose} className="h-11 flex-1 rounded-xl border border-border text-sm">
              Cancel
            </button>
            <button
              disabled={busy || Boolean(validation)}
              onClick={() =>
                onAdd({
                  title: title || custom || "Study goal",
                  subject_id: subjectId || null,
                  daily_hours: Number(daily) || 0,
                  weekly_hours: Number(weekly) || 0,
                  deadline: deadline || null,
                })
              }
              className="h-11 flex-[2] rounded-xl bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
            >
              Save target
            </button>
          </div>
    </div>
  );
}
