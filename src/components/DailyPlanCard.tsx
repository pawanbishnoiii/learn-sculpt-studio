import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CalendarDays, Check, Loader2, Play, RefreshCw, SkipForward, X } from "lucide-react";
import {
  PLAN_VISIBLE_LIMIT,
  fetchPlan,
  generatePlan,
  localDateKey,
  planItemMinutes,
  planItemStatus,
  setPlanItemDone,
  setPlanItemState,
  visiblePlanItems,
  type PlanItemState,
  type PlanStatus,
  type PlanItem,
} from "@/lib/plan";
import { fmtHM, startOfToday, type Session } from "@/lib/study";
import { ActivityArtwork } from "@/components/study-ui";
import { RivePlayer } from "@/components/ui/rive-player";
import loadingRive from "@/assets/loading-snake.riv.asset.json";

const STATUS_STYLE: Record<PlanStatus, { label: string; cls: string }> = {
  complete: { label: "Complete", cls: "bg-[var(--mint-soft)] text-emerald-800" },
  progress: { label: "In progress", cls: "bg-[var(--mustard-soft,#fdf1d6)] text-amber-900" },
  pending: { label: "Pending", cls: "bg-muted text-muted-foreground" },
};

const KIND_ART: Record<string, "reading" | "class" | "revision" | "practice"> = {
  reading: "reading",
  revision: "revision",
  notes_revision: "revision",
  class: "class",
  live: "class",
  practice: "practice",
  test: "practice",
};

const KIND_LABEL: Record<string, string> = { notes_revision: "class notes revision" };

/**
 * Today's automatic study plan. If the syllabus produced no plan for today yet,
 * one is generated from subjects, chapters and due revisions on first view.
 */
export function DailyPlanCard({ sessions, title = "Your plan", onStart }: { sessions: Session[]; title?: string; onStart?: (item: PlanItem) => void }) {
  const qc = useQueryClient();
  const planDate = localDateKey();
  const since = useMemo(() => startOfToday(), []);

  const plan = useQuery({ queryKey: ["plan", planDate], queryFn: () => fetchPlan(planDate) });

  const regenerate = useMutation({
    mutationFn: () => generatePlan(planDate),
    onSuccess: (rows) => {
      qc.setQueryData(["plan", planDate], rows);
      if (rows.length === 0)
        toast.info("Add subjects and chapters so a plan can be built for you.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => setPlanItemDone(v.id, v.done),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan", planDate] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // Skip / cancel: the database refills the board with the next best task.
  const setState = useMutation({
    mutationFn: (v: { id: string; status: PlanItemState }) => setPlanItemState(v.id, v.status),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["plan", planDate] });
      toast.success(v.status === "skipped" ? "Task skipped — next one added" : "Task cancelled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-build today's plan exactly once when the day starts empty.
  useEffect(() => {
    if (plan.isSuccess && (plan.data?.length ?? 0) === 0 && regenerate.isIdle)
      regenerate.mutate();
  }, [plan.isSuccess, plan.data, regenerate]);

  const all = plan.data ?? [];
  const items = visiblePlanItems(all);
  const queued = all.filter((i) => i.status === "pending" && !i.completed_at).length;
  const rows = items.map((item) => {
    const minutes = planItemMinutes(item, sessions, since);
    return { item, minutes, status: planItemStatus(item, minutes) };
  });
  const doneCount = rows.filter((r) => r.status === "complete").length;
  const plannedMinutes = items.reduce((a, i) => a + i.target_minutes, 0);
  const busy = setState.isPending;

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-[var(--lavender-soft)]">
          <CalendarDays className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <p className="text-xs font-semibold text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}{" "}
            · {doneCount}/{items.length} done · {fmtHM(plannedMinutes)} planned
            {queued > PLAN_VISIBLE_LIMIT ? ` · ${queued - PLAN_VISIBLE_LIMIT} queued` : ""}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-3 text-xs font-bold disabled:opacity-60"
          >
            {regenerate.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-4" aria-hidden="true" />
            )}
            Regenerate
          </button>
          <Link to="/timetable" className="text-sm font-semibold text-brand">
            Timetable
          </Link>
        </div>
      </div>

      {plan.isLoading ? (
        <div className="mt-5 flex items-center gap-4 rounded-2xl bg-secondary p-3"><RivePlayer src={loadingRive.url} className="size-20 shrink-0" /><p className="text-sm font-semibold text-muted-foreground">Building today's syllabus plan…</p></div>
      ) : rows.length === 0 ? (
        <div className="mt-5 flex items-center gap-4 rounded-2xl bg-secondary p-3"><RivePlayer src={loadingRive.url} className="size-20 shrink-0" /><p className="text-sm text-muted-foreground">No plan yet. Add subjects with chapters and press Regenerate.</p></div>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map(({ item, minutes, status }) => {
            const style = STATUS_STYLE[status];
            const pct = item.target_minutes
              ? Math.min(100, Math.round((minutes / item.target_minutes) * 100))
              : 0;
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border bg-panel p-3"
              >
                <ActivityArtwork
                  kind={KIND_ART[item.session_kind] ?? "reading"}
                  className="size-11 shrink-0"
                />
                <div className="min-w-[8rem] flex-1 basis-40">
                  <p className="truncate text-sm font-bold">
                    {item.chapter_name ?? item.subject_name ?? "Focus block"}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground capitalize">
                    {item.subject_name ? `${item.subject_name} · ` : ""}
                    {KIND_LABEL[item.session_kind] ?? item.session_kind} · min {fmtHM(item.target_minutes)}
                    {minutes > 0 ? ` · ${fmtHM(minutes)} done` : ""}
                  </p>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-brand transition-[width] duration-700"
                      style={{ width: `${status === "complete" ? 100 : pct}%` }}
                    />
                  </span>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${style.cls}`}>
                    {style.label}
                  </span>
                  {onStart && status !== "complete" ? (
                    <button
                      type="button"
                      onClick={() => onStart(item)}
                      aria-label={`Start ${item.chapter_name ?? item.subject_name ?? "plan item"}`}
                      className="grid size-9 place-items-center rounded-full bg-foreground text-background"
                    >
                      <Play className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                  {status !== "complete" ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setState.mutate({ id: item.id, status: "skipped" })}
                        aria-label="Skip this task for today"
                        title="Skip"
                        className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground disabled:opacity-50"
                      >
                        <SkipForward className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setState.mutate({ id: item.id, status: "cancelled" })}
                        aria-label="Cancel this task"
                        title="Cancel"
                        className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground disabled:opacity-50"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </>
                  ) : null}
                  <button
                    onClick={() => toggle.mutate({ id: item.id, done: !item.completed_at })}
                    aria-label={item.completed_at ? "Mark as pending" : "Mark as complete"}
                    className={`grid size-9 place-items-center rounded-full border transition ${
                      item.completed_at
                        ? "border-transparent bg-foreground text-background"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    <Check className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
