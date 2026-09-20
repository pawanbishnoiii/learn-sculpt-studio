import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Icon3D } from "@/components/Icon3D";
import historyArt from "@/assets/owl-sleepy.png";
import { ListSkeleton } from "@/components/ui/skeletons";
import {
  createManualBreak,
  deleteBreak,
  deleteSession,
  fetchAppSettings,
  fetchBreaks,
  fetchSessions,
  fetchSettings,
  fetchSubjects,
  fetchTargets,
  startOfWeek,
  updateBreak,
  updateSession,
  type Break,
  type Session,
  type Subject,
  fmtHM,
} from "@/lib/study";
import { saveStudyLog } from "@/lib/offline-actions";

export const Route = createFileRoute("/_authenticated/history")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "History — Chronodeck Study OS" },
      {
        name: "description",
        content:
          "Every study session, topic, note and break you logged, grouped day by day — with edit and delete.",
      },
      { property: "og:title", content: "History — Chronodeck Study OS" },
      {
        property: "og:description",
        content: "Browse, edit and delete your full study session and break history.",
      },
    ],
  }),
  component: HistoryPage,
});

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function time(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type Tab = "all" | "reading" | "class" | "break";

function HistoryPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Tab>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [editBreak, setEditBreak] = useState<Break | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const sessions = useQuery({ queryKey: ["sessions", "all"], queryFn: () => fetchSessions() });
  const breaks = useQuery({ queryKey: ["breaks", "all"], queryFn: () => fetchBreaks() });
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const targets = useQuery({ queryKey: ["targets"], queryFn: fetchTargets });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const appSettings = useQuery({ queryKey: ["app-settings"], queryFn: fetchAppSettings });

  const dailyGoalMin = (settings.data?.daily_goal_hours ?? 4) * 60;

  /** minutes logged per subject in the current week (for subject-target %) */
  const weekBySubject = useMemo(() => {
    const from = startOfWeek();
    const map: Record<string, number> = {};
    for (const s of sessions.data ?? []) {
      if (!s.duration_minutes || new Date(s.started_at) < from) continue;
      const key = s.subject_id ?? s.subject_name ?? "unknown";
      map[key] = (map[key] ?? 0) + s.duration_minutes;
    }
    return map;
  }, [sessions.data]);

  function targetInfo(s: Session) {
    const dayPct =
      dailyGoalMin > 0 ? Math.round(((s.duration_minutes ?? 0) / dailyGoalMin) * 100) : 0;
    const t = (targets.data ?? []).find(
      (x) => x.is_active && (x.subject_id ? x.subject_id === s.subject_id : false),
    );
    const done = weekBySubject[s.subject_id ?? s.subject_name ?? "unknown"] ?? 0;
    const subjectPct = t?.weekly_hours ? Math.round((done / 60 / t.weekly_hours) * 100) : null;
    return { dayPct, subjectPct, targetHours: t?.weekly_hours ?? null };
  }

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["sessions"] }),
      qc.invalidateQueries({ queryKey: ["breaks"] }),
    ]);
  };

  const saveSession = useMutation({
    mutationFn: async (s: Session) =>
      updateSession(s.id, {
        subject_name: s.subject_name,
        topic: s.topic,
        notes: s.notes,
        kind: s.kind,
        duration_minutes: s.duration_minutes,
      }),
    onSuccess: async () => {
      setEditSession(null);
      await invalidate();
      toast.success("Session updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSession = useMutation({
    mutationFn: deleteSession,
    onSuccess: async () => {
      await invalidate();
      toast.success("Session deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveBreak = useMutation({
    mutationFn: async (b: Break) =>
      updateBreak(b.id, { kind: b.kind, note: b.note, duration_minutes: b.duration_minutes }),
    onSuccess: async () => {
      setEditBreak(null);
      await invalidate();
      toast.success("Break updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeBreak = useMutation({
    mutationFn: deleteBreak,
    onSuccess: async () => {
      await invalidate();
      toast.success("Break deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const manualLog = useMutation({
    mutationFn: async (input: {
      kind: "session" | "break";
      subject_id: string;
      subject_name: string;
      topic: string;
      notes: string;
      break_kind: string;
      started_at: string;
      ended_at: string;
    }) => {
      if (input.kind === "break") {
        await createManualBreak({
          kind: input.break_kind,
          note: input.notes.trim() || null,
          started_at: input.started_at,
          ended_at: input.ended_at,
        });
      } else {
        const subj = (subjects.data ?? []).find((s) => s.id === input.subject_id);
        await saveStudyLog({
          subject_id: subj?.id ?? null,
          subject_name: subj?.name ?? (input.subject_name.trim() || "Study"),
          topic: input.topic.trim() || null,
          notes: input.notes.trim() || null,
          kind: input.break_kind,
          started_at: input.started_at,
          ended_at: input.ended_at,
        });
      }
    },
    onSuccess: async () => {
      setManualOpen(false);
      await invalidate();
      toast.success("Entry logged");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(
    () =>
      (sessions.data ?? []).filter(
        (s) => !s.is_running && (filter === "all" || (filter !== "break" && s.kind === filter)),
      ),
    [sessions.data, filter],
  );

  const breakRows = useMemo(
    () => (breaks.data ?? []).filter(() => filter === "all" || filter === "break"),
    [breaks.data, filter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { sessions: Session[]; breaks: Break[] }>();
    const get = (k: string) => map.get(k) ?? { sessions: [], breaks: [] };
    for (const s of rows) {
      const k = dayKey(s.started_at);
      const cur = get(k);
      map.set(k, { ...cur, sessions: [...cur.sessions, s] });
    }
    for (const b of breakRows) {
      const k = dayKey(b.started_at);
      const cur = get(k);
      map.set(k, { ...cur, breaks: [...cur.breaks, b] });
    }
    return [...map.entries()];
  }, [rows, breakRows]);

  const totalMinutes = rows.reduce((a, s) => a + (s.duration_minutes ?? 0), 0);
  const breakMinutes = (breaks.data ?? []).reduce((a, b) => a + (b.duration_minutes ?? 0), 0);

  return (
    <>
      <div className="space-y-6 px-4 py-6 sm:px-5">
        <header className="analytics-widget analytics-lavender grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.3em] text-foreground/60 uppercase">Archive</p>
            <h1 className="font-heading clay-gradient-text truncate text-3xl font-extrabold tracking-tight">
              History
            </h1>
            <p className="mt-1 text-xs text-foreground/70">
              Tap a row for full detail, edit or delete.
            </p>
          </div>
          <img
            src={historyArt}
            alt=""
            className="float-soft size-20 shrink-0 object-contain drop-shadow-lg"
            loading="lazy"
          />
        </header>

        <section className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { l: "Sessions", v: String(rows.length), tone: "analytics-sky" },
            { l: "Study", v: fmtHM(totalMinutes), tone: "analytics-mint" },
            { l: "Breaks", v: fmtHM(breakMinutes), tone: "analytics-peach" },
          ].map((s) => (
            <div key={s.l} className={`analytics-widget ${s.tone} p-3 sm:p-4`}>
              <p className="num text-lg leading-none font-extrabold">{s.v}</p>
              <p className="mt-1 text-[10px] tracking-wide text-foreground/65 uppercase">
                {s.l}
              </p>
            </div>
          ))}
        </section>

        <div className="flex items-center gap-1.5">
          {(["all", "reading", "class", "break"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`h-10 flex-1 rounded-xl border text-[11px] font-medium capitalize transition-colors ${
                filter === k
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border text-muted-foreground"
              }`}
            >
              {k}
            </button>
          ))}
          {appSettings.data?.manual_log_enabled ? (
            <button
              onClick={() => setManualOpen(true)}
              className="h-10 shrink-0 rounded-xl bg-brand px-3 text-[11px] font-semibold text-brand-foreground"
            >
              + Log
            </button>
          ) : null}
        </div>

        {sessions.isLoading ? (
          <ListSkeleton rows={5} withBar />
        ) : grouped.length === 0 ? (
          <div className="glass-panel p-6 text-center">
            <Icon3D name="clock" size={44} className="mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">
              No sessions yet. Start the timer and your history will build itself.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(([day, items]) => (
              <section key={day}>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-base font-bold tracking-tight">{day}</h2>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {fmtHM(items.sessions.reduce((a, s) => a + (s.duration_minutes ?? 0), 0))}
                  </span>
                </div>

                <ul className="mt-2 space-y-2">
                  {items.sessions.map((s) => {
                    const open = openId === s.id;
                    return (
                      <li key={s.id} className="glass-panel p-4">
                        <button
                          onClick={() => setOpenId(open ? null : s.id)}
                          className="flex w-full items-start justify-between gap-3 text-left"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {s.subject_name ?? "Study"}
                            </p>
                            {s.topic ? (
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {s.topic}
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 font-mono text-xs text-brand">
                            {s.duration_minutes ?? 0}m
                          </span>
                        </button>

                        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                          <span className="rounded-md border border-border px-1.5 py-0.5">
                            {s.kind}
                          </span>
                          <span>{time(s.started_at)}</span>
                          {s.ended_at ? <span>→ {time(s.ended_at)}</span> : null}
                          {s.auto_closed ? (
                            <span className="text-amber-400">auto-closed</span>
                          ) : null}
                        </div>

                        {open ? (
                          <div className="mt-3 space-y-3 border-t border-border pt-3">
                            <dl className="grid grid-cols-2 gap-2 text-[11px]">
                              <Detail
                                label="Started"
                                value={new Date(s.started_at).toLocaleString()}
                              />
                              <Detail
                                label="Ended"
                                value={s.ended_at ? new Date(s.ended_at).toLocaleString() : "—"}
                              />
                              <Detail label="Type" value={s.kind} />
                              <Detail label="Break" value={`${s.break_minutes ?? 0}m`} />
                            </dl>
                            <TargetMeter {...targetInfo(s)} />
                            {s.notes ? (
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {s.notes}
                              </p>
                            ) : null}
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditSession(s)}
                                className="h-9 flex-1 rounded-xl border border-brand/40 text-[11px] font-semibold text-brand uppercase"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Delete this session?")) removeSession.mutate(s.id);
                                }}
                                className="h-9 flex-1 rounded-xl border border-destructive/40 text-[11px] font-semibold text-destructive uppercase"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}

                  {items.breaks.map((b) => (
                    <li
                      key={b.id}
                      className="rounded-2xl border border-dashed border-border bg-panel/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium capitalize">{b.kind} break</p>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {time(b.started_at)}
                            {b.ended_at ? ` → ${time(b.ended_at)}` : " · running"}
                          </p>
                          {b.note ? (
                            <p className="mt-1 text-xs text-muted-foreground">{b.note}</p>
                          ) : null}
                        </div>
                        <span className="shrink-0 font-mono text-xs text-amber-400">
                          {b.duration_minutes ?? 0}m
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => setEditBreak(b)}
                          className="h-8 flex-1 rounded-lg border border-border text-[10px] uppercase"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this break?")) removeBreak.mutate(b.id);
                          }}
                          className="h-8 flex-1 rounded-lg border border-destructive/40 text-[10px] text-destructive uppercase"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {editSession ? (
        <Sheet title="Edit session" onClose={() => setEditSession(null)}>
          <Field label="Subject">
            <input
              value={editSession.subject_name ?? ""}
              onChange={(e) => setEditSession({ ...editSession, subject_name: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Topic">
            <input
              value={editSession.topic ?? ""}
              onChange={(e) => setEditSession({ ...editSession, topic: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Type">
            <div className="grid grid-cols-2 gap-2">
              {["reading", "class"].map((k) => (
                <button
                  key={k}
                  onClick={() => setEditSession({ ...editSession, kind: k })}
                  className={`h-11 rounded-xl border text-sm capitalize ${
                    editSession.kind === k ? "border-brand bg-brand/10 text-brand" : "border-border"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Duration (minutes)">
            <input
              type="number"
              min={1}
              value={editSession.duration_minutes ?? 0}
              onChange={(e) =>
                setEditSession({ ...editSession, duration_minutes: Number(e.target.value) })
              }
              className="input"
            />
          </Field>
          <Field label="Notes">
            <textarea
              rows={3}
              value={editSession.notes ?? ""}
              onChange={(e) => setEditSession({ ...editSession, notes: e.target.value })}
              className="input h-auto py-2"
            />
          </Field>
          <button
            onClick={() => saveSession.mutate(editSession)}
            disabled={saveSession.isPending}
            className="mt-5 btn-pop w-full  disabled:opacity-60"
          >
            {saveSession.isPending ? "Saving…" : "Save changes"}
          </button>
        </Sheet>
      ) : null}

      {editBreak ? (
        <Sheet title="Edit break" onClose={() => setEditBreak(null)}>
          <Field label="Kind">
            <div className="grid grid-cols-4 gap-2">
              {["pause", "sleep", "free", "meal"].map((k) => (
                <button
                  key={k}
                  onClick={() => setEditBreak({ ...editBreak, kind: k })}
                  className={`h-11 rounded-xl border text-xs capitalize ${
                    editBreak.kind === k ? "border-brand bg-brand/10 text-brand" : "border-border"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Duration (minutes)">
            <input
              type="number"
              min={1}
              value={editBreak.duration_minutes ?? 0}
              onChange={(e) =>
                setEditBreak({ ...editBreak, duration_minutes: Number(e.target.value) })
              }
              className="input"
            />
          </Field>
          <Field label="Note">
            <input
              value={editBreak.note ?? ""}
              onChange={(e) => setEditBreak({ ...editBreak, note: e.target.value })}
              className="input"
            />
          </Field>
          <button
            onClick={() => saveBreak.mutate(editBreak)}
            disabled={saveBreak.isPending}
            className="mt-5 btn-pop w-full  disabled:opacity-60"
          >
            {saveBreak.isPending ? "Saving…" : "Save changes"}
          </button>
        </Sheet>
      ) : null}

      {manualOpen ? (
        <ManualEntrySheet
          subjects={subjects.data ?? []}
          onClose={() => setManualOpen(false)}
          onSubmit={(v) => manualLog.mutate(v)}
          pending={manualLog.isPending}
        />
      ) : null}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border px-2.5 py-2">
      <dt className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-[11px]">{value}</dd>
    </div>
  );
}

function ManualEntrySheet({
  subjects,
  onClose,
  onSubmit,
  pending,
}: {
  subjects: Subject[];
  onClose: () => void;
  onSubmit: (v: {
    kind: "session" | "break";
    subject_id: string;
    subject_name: string;
    topic: string;
    notes: string;
    break_kind: string;
    started_at: string;
    ended_at: string;
  }) => void;
  pending: boolean;
}) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600_000);
  const toLocal = (d: Date) => {
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  };
  const [kind, setKind] = useState<"session" | "break">("session");
  const [sessionKind, setSessionKind] = useState("reading");
  const [breakKind, setBreakKind] = useState("pause");
  const [subjectId, setSubjectId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [start, setStart] = useState(toLocal(oneHourAgo));
  const [end, setEnd] = useState(toLocal(now));

  const fromIso = (v: string) => new Date(v).toISOString();

  return (
    <Sheet title="Log entry manually" onClose={onClose}>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setKind("session")}
          className={`h-11 rounded-xl border text-sm ${
            kind === "session" ? "border-brand bg-brand/10 text-brand" : "border-border"
          }`}
        >
          Study session
        </button>
        <button
          onClick={() => setKind("break")}
          className={`h-11 rounded-xl border text-sm ${
            kind === "break" ? "border-brand bg-brand/10 text-brand" : "border-border"
          }`}
        >
          Break
        </button>
      </div>

      {kind === "session" ? (
        <>
          <Field label="Category">
            <div className="grid grid-cols-2 gap-2">
              {["reading", "class", "revision", "practice"].map((k) => (
                <button
                  key={k}
                  onClick={() => setSessionKind(k)}
                  className={`h-11 rounded-xl border text-xs capitalize ${
                    sessionKind === k ? "border-brand bg-brand/10 text-brand" : "border-border"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Subject">
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="input"
            >
              <option value="">Custom subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          {!subjectId ? (
            <Field label="Subject name">
              <input
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Physics"
                className="input"
              />
            </Field>
          ) : null}
          <Field label="Topic">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Chapter / topic"
              className="input"
            />
          </Field>
          <Field label="Notes">
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input h-auto py-2"
            />
          </Field>
        </>
      ) : (
        <>
          <Field label="Break type">
            <div className="grid grid-cols-4 gap-2">
              {["pause", "sleep", "free", "meal"].map((k) => (
                <button
                  key={k}
                  onClick={() => setBreakKind(k)}
                  className={`h-11 rounded-xl border text-xs capitalize ${
                    breakKind === k ? "border-brand bg-brand/10 text-brand" : "border-border"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Note">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className="input"
            />
          </Field>
        </>
      )}

      <Field label="Start">
        <input
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="input"
        />
      </Field>
      <Field label="End">
        <input
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="input"
        />
      </Field>

      <button
        onClick={() =>
          onSubmit({
            kind,
            subject_id: subjectId,
            subject_name: subjectName,
            topic,
            notes,
            break_kind: kind === "break" ? breakKind : sessionKind,
            started_at: fromIso(start),
            ended_at: fromIso(end),
          })
        }
        disabled={pending || new Date(end) <= new Date(start)}
        className="mt-5 btn-pop w-full  disabled:opacity-60"
      >
        {pending ? "Saving…" : "Log entry"}
      </button>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <label className="block text-xs text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
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
        className="max-h-[88svh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-panel p-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function TargetMeter({
  dayPct,
  subjectPct,
  targetHours,
}: {
  dayPct: number;
  subjectPct: number | null;
  targetHours: number | null;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-background/60 p-3">
      <Meter label="Of daily goal" pct={dayPct} note={`${dayPct}%`} />
      {subjectPct !== null ? (
        <Meter
          label="Subject weekly target"
          pct={subjectPct}
          note={`${subjectPct}% of ${targetHours}h`}
        />
      ) : (
        <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
          no weekly target for this subject
        </p>
      )}
    </div>
  );
}

function Meter({ label, pct, note }: { label: string; pct: number; note: string }) {
  const hit = pct >= 100;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] tracking-wide text-muted-foreground uppercase">
        <span>{label}</span>
        <span className={`font-mono ${hit ? "text-brand" : ""}`}>{note}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all duration-700 ${hit ? "bg-brand" : "bg-warm"}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}
