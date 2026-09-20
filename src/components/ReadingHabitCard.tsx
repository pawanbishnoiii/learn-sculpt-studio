import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Newspaper, Pause, Play, Settings2, Square, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_READING_GOALS,
  fetchReadingGoals,
  fetchReadingLogs,
  readingStatus,
  saveReadingGoals,
  undoReading,
} from "@/lib/study";
import { saveReadingLog } from "@/lib/offline-actions";

const STORAGE_KEY = "chronodeck:newspaper-timer";

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/**
 * Daily newspaper reading. There is no fixed length: the student presses start,
 * the timer runs, and every sitting is added to today's total. Reading can be
 * logged as many times a day as needed and keeps the streak alive.
 */
export function ReadingHabitCard() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [daily, setDaily] = useState("");

  const logs = useQuery({ queryKey: ["reading-logs"], queryFn: fetchReadingLogs });
  const goalsQ = useQuery({ queryKey: ["reading-goals"], queryFn: fetchReadingGoals });
  const goals = goalsQ.data ?? DEFAULT_READING_GOALS;
  const status = readingStatus(logs.data ?? [], goals);

  // ---- live timer (survives reloads) -------------------------------------
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const at = Number(raw);
      if (Number.isFinite(at) && at > 0) setStartedAt(at);
    }
  }, []);

  useEffect(() => {
    if (startedAt === null) {
      setElapsed(0);
      if (tick.current) clearInterval(tick.current);
      return;
    }
    const update = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    update();
    tick.current = setInterval(update, 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [startedAt]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["reading-logs"] });
    void qc.invalidateQueries({ queryKey: ["reading-goals"] });
    void qc.invalidateQueries({ queryKey: ["xp"] });
  };

  const addM = useMutation({
    mutationFn: (minutes: number) => saveReadingLog("newspaper", minutes),
    onSuccess: (r, minutes) => {
      refresh();
      toast.success(
        r.queued
          ? `${minutes} min offline save — reconnect par sync hoga`
          : `${minutes} min newspaper reading added`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const undoM = useMutation({
    mutationFn: () => undoReading("newspaper"),
    onSuccess: () => {
      refresh();
      toast.success("Today's reading cleared");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const goalM = useMutation({
    mutationFn: () =>
      saveReadingGoals({
        newspaper_daily_minutes: Math.max(
          1,
          Math.min(600, Number(daily) || goals.newspaper_daily_minutes),
        ),
        magazine_monthly_minutes: goals.magazine_monthly_minutes,
      }),
    onSuccess: () => {
      setEditing(false);
      refresh();
      toast.success("Daily reading goal updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const start = () => {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, String(now));
    setStartedAt(now);
  };

  const stop = (save: boolean) => {
    const minutes = Math.max(1, Math.round(elapsed / 60));
    localStorage.removeItem(STORAGE_KEY);
    setStartedAt(null);
    if (save && elapsed >= 30) addM.mutate(minutes);
    else if (save) toast.info("Too short to log — read for at least 30 seconds.");
  };

  const pct = status.newspaperPct;
  const hit = pct >= 100;

  return (
    <section className="rounded-[28px] border-2 border-foreground/10 bg-panel p-5 shadow-[0_18px_40px_-32px_rgb(0_0_0_/_0.45)]">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-[var(--pop-mustard,theme(colors.amber.200))] text-[var(--pop-ink)]">
          <Newspaper className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold tracking-tight">Newspaper reading</h2>
          <p className="text-[11px] text-muted-foreground">
            Start the timer any time — every sitting counts.
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <span className="rounded-full bg-primary/12 px-3 py-1 text-[11px] font-bold text-primary">
            {status.newspaperStreak}d streak
          </span>
          <button
            type="button"
            aria-label="Edit daily reading goal"
            onClick={() => {
              setDaily(String(goals.newspaper_daily_minutes));
              setEditing((v) => !v);
            }}
            className="grid size-8 place-items-center rounded-full border-2 border-border text-muted-foreground"
          >
            <Settings2 className="size-4" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {editing ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 grid gap-3 rounded-2xl border-2 border-border bg-background p-4">
              <label className="block text-[11px] font-bold text-muted-foreground">
                Daily reading goal (minutes)
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={daily}
                  onChange={(e) => setDaily(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border-2 border-border bg-panel px-3 text-sm font-semibold text-foreground"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="h-11 flex-1 rounded-full border-2 border-border text-xs font-bold"
                >
                  Cancel
                </button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  disabled={goalM.isPending}
                  onClick={() => goalM.mutate()}
                  className="h-11 flex-[2] rounded-full bg-foreground text-xs font-bold text-background disabled:opacity-60"
                >
                  {goalM.isPending ? "Saving…" : "Save goal"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* seven-day dots */}
      <div className="mt-4 flex items-center justify-between gap-1">
        {status.week.map((d) => (
          <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
            <motion.span
              layout
              title={`${d.minutes} min`}
              className={`grid size-8 place-items-center rounded-full border-2 text-[10px] font-bold ${
                d.done
                  ? "border-transparent bg-primary text-primary-foreground"
                  : d.today
                    ? "border-primary/60 text-primary"
                    : "border-border text-muted-foreground"
              }`}
            >
              {d.done ? <Check className="size-4" /> : d.label}
            </motion.span>
            <span className="text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
              {d.today ? "today" : d.label}
            </span>
          </div>
        ))}
      </div>

      {/* today's total + live timer */}
      <div
        className={`mt-4 rounded-2xl border-2 px-4 py-4 transition-colors ${
          hit ? "border-transparent bg-primary/12" : "border-border bg-secondary/40"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Today</span>
            <span className="num block text-[11px] text-muted-foreground">
              {status.newspaperTodayMinutes} / {goals.newspaper_daily_minutes} min
              {status.newspaperToday ? " · goal reached" : ""}
            </span>
          </span>
          <span className="num shrink-0 text-2xl font-extrabold tabular-nums">
            {startedAt !== null ? mmss(elapsed) : `${status.newspaperTodayMinutes}m`}
          </span>
        </div>

        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-background">
          <motion.span
            className="block h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {startedAt === null ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={start}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-xs font-bold text-background"
            >
              <Play className="size-4" /> Start reading
            </motion.button>
          ) : (
            <>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                disabled={addM.isPending}
                onClick={() => stop(true)}
                className="inline-flex h-11 flex-[2] items-center justify-center gap-2 rounded-full bg-foreground px-4 text-xs font-bold text-background disabled:opacity-60"
              >
                <Square className="size-4" /> Finish &amp; log
              </motion.button>
              <button
                type="button"
                onClick={() => stop(false)}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border-2 border-border px-4 text-xs font-bold"
              >
                <Pause className="size-4" /> Discard
              </button>
            </>
          )}
          {status.newspaperTodayMinutes > 0 ? (
            <button
              type="button"
              disabled={undoM.isPending}
              onClick={() => undoM.mutate()}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-destructive disabled:opacity-60"
            >
              <Undo2 className="size-3.5" /> Clear today
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
