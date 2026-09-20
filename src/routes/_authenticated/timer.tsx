import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Coffee, Maximize2, Minimize2, Pause, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { notifySelf } from "@/lib/notifications.functions";
import {
  endBreak,
  fetchOpenBreak,
  fetchRunningSession,
  startBreak,
  stopSession,
  type Session,
} from "@/lib/study";
import { SlidingNumber } from "@/components/ui/sliding-number";

const SNAPSHOT_KEY = "chronodeck.running-session";

/** Last known live session, so opening the timer paints instantly. */
function readSnapshot(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s?.is_running ? s : null;
  } catch {
    return null;
  }
}

const MAX_SESSION_SECONDS = 8 * 3600;

const BREAK_KINDS = [
  { k: "pause", l: "Short break", emoji: "\u{2615}", seconds: 5 * 60 },
  { k: "sleep", l: "Power nap", emoji: "\u{1F634}", seconds: 20 * 60 },
  { k: "free", l: "Free time", emoji: "\u{1F3AE}", seconds: 10 * 60 },
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

export const Route = createFileRoute("/_authenticated/timer")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Focus Timer — Bnoy Study" },
      {
        name: "description",
        content: "A clean, distraction-free focus timer with break logging and one-tap session saving.",
      },
      { property: "og:title", content: "Focus Timer — Bnoy Study" },
      { property: "og:description", content: "Clean full-screen study timer that keeps running in the background." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TimerPage,
});

function TimerPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [stopOpen, setStopOpen] = useState(false);
  const [saveForm, setSaveForm] = useState({ topic: "", notes: "" });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const autoResumedBreak = useRef<string | null>(null);

  const running = useQuery({ queryKey: ["running"], queryFn: fetchRunningSession, refetchInterval: 60_000 });
  const openBreak = useQuery({ queryKey: ["open-break"], queryFn: fetchOpenBreak });

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  void tick;

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // No live session → back to the setup page. Only act on a settled fetch:
  // acting while the query is still in flight bounced the page in a loop.
  useEffect(() => {
    if (running.isFetched && !running.isFetching && !running.data) {
      navigate({ to: "/study", search: { block: undefined, plan: undefined, date: undefined }, replace: true });
    }
  }, [running.isFetched, running.isFetching, running.data, navigate]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* unsupported */
    }
  }

  const pause = useMutation({
    mutationFn: (kind: string) => startBreak(running.data?.id ?? null, kind),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["open-break"] }),
    onError: (e: Error) => toast.error(e.message),
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

  const notifySelfFn = useServerFn(notifySelf);

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
      const minutes = Math.max(1, Math.round((Date.now() - new Date(s.started_at).getTime()) / 60000));
      try {
        await notifySelfFn({
          data: {
            title: "Session complete",
            body: `${s.subject_name ?? "Study"} · ${minutes} min logged. Nice work!`,
            actionPath: "/history",
          },
        });
      } catch {
        /* best effort */
      }
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["running"] }),
        qc.refetchQueries({ queryKey: ["sessions", "8w"], type: "all" }),
        qc.invalidateQueries({ queryKey: ["targets"] }),
        qc.refetchQueries({ queryKey: ["plan"], type: "all" }),
        qc.invalidateQueries({ queryKey: ["chapter-state"] }),
        qc.invalidateQueries({ queryKey: ["chapter-pace"] }),
        qc.invalidateQueries({ queryKey: ["attempts"] }),
        qc.invalidateQueries({ queryKey: ["open-break"] }),
        qc.invalidateQueries({ queryKey: ["breaks"] }),
      ]);
      toast.success("Session saved");
      navigate({ to: "/today" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = running.data;
  const elapsed = s ? Math.max(0, Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000)) : 0;

  const onBreak = !!openBreak.data;
  const currentBreak = BREAK_KINDS.find((b) => b.k === openBreak.data?.kind);
  const activeBreakSeconds = openBreak.data
    ? Math.max(0, Math.floor((Date.now() - new Date(openBreak.data.started_at).getTime()) / 1000))
    : 0;
  const breakRemaining = currentBreak ? Math.max(0, currentBreak.seconds - activeBreakSeconds) : 0;
  // Logged breaks plus the break currently in progress never count as focus.
  const breakSeconds = (s?.break_minutes ?? 0) * 60 + activeBreakSeconds;
  const focusSeconds = Math.max(0, elapsed - breakSeconds);

  const autoStopped = useRef(false);
  useEffect(() => {
    if (!s || autoStopped.current) return;
    if (elapsed >= MAX_SESSION_SECONDS) {
      autoStopped.current = true;
      toast.message("8 hour limit reached — session saved automatically");
      save.mutate();
    }
  }, [s, elapsed, save]);

  // Break over → resume focus automatically (also after an app restart).
  useEffect(() => {
    const b = openBreak.data;
    if (!b || !currentBreak || breakRemaining > 0 || autoResumedBreak.current === b.id) return;
    autoResumedBreak.current = b.id;
    resume.mutate();
    toast.success(`${currentBreak.l} complete — focus resumed`);
  }, [openBreak.data, currentBreak, breakRemaining, resume]);

  // Never render a blank screen while the running session is being fetched.
  if (!s) {
    return (
      <div className="fixed inset-0 z-[70] grid place-items-center bg-foreground text-background">
        <div className="flex flex-col items-center gap-3">
          <span className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="font-mono text-[10px] tracking-[0.35em] text-white/40 uppercase">loading timer</p>
        </div>
      </div>
    );
  }


  return (
    <div className={`fixed inset-0 z-[70] flex flex-col text-white transition-colors duration-300 ${onBreak ? "bg-[#151d30]" : "bg-[#0b1020]"}`}>
      {/* Top bar — leave the timer, it keeps running */}
      <div className="flex shrink-0 items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          onClick={() => navigate({ to: "/today" })}
          className="flex h-10 items-center gap-1 rounded-full border border-white/12 pr-4 pl-2.5 text-xs font-medium text-white/70 active:scale-95"
        >
          <ChevronLeft className="size-4" /> Home
        </button>
        <button
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
          className="grid size-10 place-items-center rounded-full border border-white/12 text-white/70 active:scale-95"
        >
          {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
      </div>

      {/* Timer — always centred, never pushed by the controls */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
        <p className={`rounded-full border px-3 py-1.5 font-mono text-[10px] font-semibold tracking-[0.25em] uppercase ${onBreak ? "border-amber-300/30 bg-amber-300/10 text-amber-200" : "border-indigo-300/20 bg-indigo-300/10 text-indigo-200"}`}>
          {onBreak ? `Paused · ${currentBreak?.l ?? "Break"} · ${pad(Math.floor(breakRemaining / 60))}:${pad(breakRemaining % 60)}` : "Focus in progress"}
        </p>

        <div
          className={`mt-5 flex items-baseline font-mono leading-none tabular-nums transition-opacity duration-500 ${
            onBreak ? "opacity-35" : "opacity-100"
          }`}
        >
          <span className="text-[22vw] leading-none font-light tracking-tight sm:text-[8rem]">
            <SlidingNumber value={Math.floor(focusSeconds / 3600)} padStart />
          </span>
          <span className="px-1.5 text-[14vw] leading-none font-light text-white/25 sm:text-[5rem]">:</span>
          <span className="text-[22vw] leading-none font-light tracking-tight sm:text-[8rem]">
            <SlidingNumber value={Math.floor((focusSeconds % 3600) / 60)} padStart />
          </span>
        </div>
        <span className="mt-1 flex items-center font-mono text-xs tracking-[0.35em] text-white/25">
          <SlidingNumber value={focusSeconds % 60} padStart />s
        </span>

        <p className="mt-8 text-base font-semibold text-white/90">{s.subject_name ?? "Study"}</p>
        {s.topic ? <p className="mt-1.5 max-w-sm truncate text-sm text-white/50">{s.topic}</p> : null}
      </div>

      {/* Controls — fixed to the bottom, aligned in one grid, never overflowing */}
      <div className="shrink-0 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-sm">
          {onBreak ? (
            <button
              onClick={() => resume.mutate()}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-[#0b1020] shadow-xl active:scale-[0.98]"
            >
              <Play className="size-4 fill-current" /> Resume focus
            </button>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => pause.mutate("pause")}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-[#0b1020] shadow-xl active:scale-[0.98]"
              >
                <Pause className="size-4 fill-current" /> Pause
              </button>
              <div className="grid grid-cols-2 gap-2">
              {BREAK_KINDS.slice(1).map((b) => (
                <button
                  key={b.k}
                  onClick={() => pause.mutate(b.k)}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] text-white/65 active:scale-[0.97]"
                >
                  <Coffee className="size-4" />
                  <span className="text-[10px] leading-none font-medium">{b.l}</span>
                </button>
              ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setSaveForm({ topic: s.topic ?? "", notes: "" });
              setStopOpen(true);
            }}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-transparent text-sm font-semibold text-white/65 active:scale-[0.98]"
          >
            <Square className="size-3.5 fill-current" /> Finish session
          </button>
        </div>
      </div>

      {/* Stop sheet — scrolls inside itself so it can never overflow the screen */}
      <AnimatePresence>
        {stopOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-end bg-black/70 backdrop-blur-sm"
            onClick={() => setStopOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[80vh] w-full overflow-y-auto rounded-t-[32px] border-t border-white/10 bg-[#0b0b0c] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/15" />
              <h2 className="text-base font-bold">Save this session</h2>
              <p className="mt-1 text-xs text-white/45">
                {s.subject_name ?? "Study"} · {Math.round(focusSeconds / 60)} min focus
                {breakSeconds ? ` · ${Math.round(breakSeconds / 60)} min break` : ""}
              </p>
              <input
                value={saveForm.topic}
                onChange={(e) => setSaveForm({ ...saveForm, topic: e.target.value })}
                placeholder="Topic covered"
                className="mt-4 h-12 w-full rounded-2xl border border-white/12 bg-white/5 px-4 text-sm text-white placeholder:text-white/30"
              />
              <textarea
                value={saveForm.notes}
                onChange={(e) => setSaveForm({ ...saveForm, notes: e.target.value })}
                rows={3}
                placeholder="Notes (optional)"
                className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 p-4 text-sm text-white placeholder:text-white/30"
              />
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="mt-4 h-14 w-full rounded-2xl bg-white text-sm font-bold text-black disabled:opacity-60"
              >
                {save.isPending ? "Saving…" : "Save & finish"}
              </button>
              <button
                onClick={() => setStopOpen(false)}
                className="mt-2 h-12 w-full rounded-2xl border border-white/12 text-sm font-medium text-white/70"
              >
                Keep studying
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
