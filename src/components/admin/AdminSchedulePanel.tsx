import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/admin/AdminSections";
import {
  DAYS,
  createBlock,
  createSubject,
  deleteBlock,
  deleteSubject,
  fetchBlocks,
  fetchSubjects,
  updateBlock,
  updateSubject,
  type Block,
  type Subject,
} from "@/lib/study";

const KINDS = ["class", "study", "revision", "break", "other"] as const;

function minutesOf(t: string) {
  const [h = "0", m = "0"] = t.split(":");
  return Number(h) * 60 + Number(m);
}

function fmtRange(b: Block) {
  return `${b.start_time.slice(0, 5)}–${b.end_time.slice(0, 5)}`;
}

/** Admin: manage subjects, add timetable blocks and preview day / week / month. */
export function AdminSchedulePanel() {
  const qc = useQueryClient();
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const blocks = useQuery({ queryKey: ["blocks"], queryFn: fetchBlocks });

  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [day, setDay] = useState(new Date().getDay());
  const [editBlock, setEditBlock] = useState<Block | null>(null);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [newSubject, setNewSubject] = useState({ name: "", color: "#A78BFA", weekly_target_hours: 6 });
  const [draft, setDraft] = useState({
    title: "",
    kind: "class",
    day_of_week: new Date().getDay(),
    start_time: "09:00",
    end_time: "10:00",
    location: "",
    subject_id: "",
  });

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["blocks"] }),
      qc.invalidateQueries({ queryKey: ["subjects"] }),
    ]);
  };

  const addBlock = useMutation({
    mutationFn: async () =>
      createBlock({
        title: draft.title.trim(),
        kind: draft.kind,
        day_of_week: draft.day_of_week,
        start_time: draft.start_time,
        end_time: draft.end_time,
        location: draft.location.trim() || null,
        subject_id: draft.subject_id || null,
      }),
    onSuccess: async () => {
      setDraft({ ...draft, title: "", location: "" });
      await refresh();
      toast.success("Timetable block added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveBlock = useMutation({
    mutationFn: async (b: Block) =>
      updateBlock(b.id, {
        title: b.title,
        kind: b.kind,
        day_of_week: b.day_of_week,
        start_time: b.start_time,
        end_time: b.end_time,
        location: b.location,
      }),
    onSuccess: async () => {
      setEditBlock(null);
      await refresh();
      toast.success("Block updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeBlock = useMutation({
    mutationFn: deleteBlock,
    onSuccess: async () => {
      await refresh();
      toast.success("Block deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addSubject = useMutation({
    mutationFn: async () =>
      createSubject({
        name: newSubject.name.trim(),
        color: newSubject.color,
        weekly_target_hours: Number(newSubject.weekly_target_hours) || 0,
      }),
    onSuccess: async () => {
      setNewSubject({ name: "", color: "#A78BFA", weekly_target_hours: 6 });
      await refresh();
      toast.success("Subject added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveSubject = useMutation({
    mutationFn: async (s: Subject) =>
      updateSubject(s.id, {
        name: s.name,
        color: s.color,
        weekly_target_hours: Number(s.weekly_target_hours) || 0,
      }),
    onSuccess: async () => {
      setEditSubject(null);
      await refresh();
      toast.success("Subject updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSubject = useMutation({
    mutationFn: deleteSubject,
    onSuccess: async () => {
      await refresh();
      toast.success("Subject deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = useMemo(
    () => [...(blocks.data ?? [])].sort((a, b) => a.day_of_week - b.day_of_week || minutesOf(a.start_time) - minutesOf(b.start_time)),
    [blocks.data],
  );

  const byDay = useMemo(() => {
    const map: Record<number, Block[]> = {};
    for (const b of list) (map[b.day_of_week] ??= []).push(b);
    return map;
  }, [list]);

  const colorOf = (b: Block) =>
    subjects.data?.find((s) => s.id === b.subject_id)?.color ?? "var(--brand, #A78BFA)";

  const weeklyMinutes = list.reduce((n, b) => n + Math.max(0, minutesOf(b.end_time) - minutesOf(b.start_time)), 0);

  return (
    <div className="space-y-5">
      {/* ---- add block ---- */}
      <section className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
        <h2 className="text-base font-bold tracking-tight">Add timetable block</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Blocks feed the student timetable and the day / week / month schedule below.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Title (e.g. Physics lecture)"
            className="input"
          />
          <select
            value={draft.subject_id}
            onChange={(e) => setDraft({ ...draft, subject_id: e.target.value })}
            className="input"
          >
            <option value="">No subject</option>
            {(subjects.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className="input">
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            value={draft.day_of_week}
            onChange={(e) => setDraft({ ...draft, day_of_week: Number(e.target.value) })}
            className="input"
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={draft.start_time}
              onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
              className="input"
            />
            <input
              type="time"
              value={draft.end_time}
              onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
              className="input"
            />
          </div>
          <input
            value={draft.location}
            onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            placeholder="Location / link"
            className="input"
          />
        </div>

        <button
          onClick={() => addBlock.mutate()}
          disabled={!draft.title.trim() || addBlock.isPending}
          className="mt-4 h-12 rounded-full bg-brand px-6 text-sm font-bold text-brand-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {addBlock.isPending ? "Adding…" : "Add block"}
        </button>
      </section>

      {/* ---- schedule views ---- */}
      <section className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight">Schedule</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {list.length} blocks · {Math.round((weeklyMinutes / 60) * 10) / 10}h planned per week
            </p>
          </div>
          <div className="flex rounded-full border border-border bg-background p-1">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`h-8 rounded-full px-4 text-xs font-semibold capitalize transition-colors ${
                  view === v ? "bg-brand text-brand-foreground" : "text-muted-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {view === "day" ? (
          <div className="mt-4">
            <div className="flex gap-1 overflow-x-auto pb-2">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => setDay(i)}
                  className={`h-9 shrink-0 rounded-full px-4 text-xs font-semibold transition-colors ${
                    day === i ? "bg-foreground text-background" : "border border-border text-muted-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <ul className="mt-3 space-y-2">
              {(byDay[day] ?? []).map((b) => (
                <motion.li
                  key={b.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3"
                >
                  <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: colorOf(b) }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{b.title}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {fmtRange(b)} · {b.kind}
                      {b.location ? ` · ${b.location}` : ""}
                    </p>
                  </div>
                  <BlockActions onEdit={() => setEditBlock(b)} onDelete={() => removeBlock.mutate(b.id)} />
                </motion.li>
              ))}
              {(byDay[day] ?? []).length === 0 ? (
                <li className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Nothing scheduled on {DAYS[day]}.
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {view === "week" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DAYS.map((d, i) => (
              <div key={d} className="rounded-2xl border border-border bg-background p-3">
                <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{d}</p>
                <ul className="mt-2 space-y-1.5">
                  {(byDay[i] ?? []).map((b) => (
                    <li
                      key={b.id}
                      className="rounded-xl px-2.5 py-2 text-[11px] leading-tight"
                      style={{ background: `color-mix(in oklab, ${colorOf(b)} 18%, transparent)` }}
                    >
                      <button onClick={() => setEditBlock(b)} className="block w-full text-left">
                        <span className="block truncate font-semibold">{b.title}</span>
                        <span className="font-mono text-[10px] opacity-70">{fmtRange(b)}</span>
                      </button>
                    </li>
                  ))}
                  {(byDay[i] ?? []).length === 0 ? (
                    <li className="text-[11px] text-muted-foreground">—</li>
                  ) : null}
                </ul>
              </div>
            ))}
          </div>
        ) : null}

        {view === "month" ? <MonthGrid byDay={byDay} colorOf={colorOf} /> : null}
      </section>

      {/* ---- subjects ---- */}
      <section className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
        <h2 className="text-base font-bold tracking-tight">Subjects</h2>
        <ul className="mt-3 space-y-2">
          {(subjects.data ?? []).map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-3 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="truncate text-sm">{s.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">{s.weekly_target_hours}h/wk</span>
                <BlockActions
                  onEdit={() => setEditSubject(s)}
                  onDelete={() => {
                    if (confirm(`Delete ${s.name}?`)) removeSubject.mutate(s.id);
                  }}
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <input
            value={newSubject.name}
            onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
            placeholder="New subject"
            className="input"
          />
          <input
            type="number"
            min={0}
            value={newSubject.weekly_target_hours}
            onChange={(e) => setNewSubject({ ...newSubject, weekly_target_hours: Number(e.target.value) })}
            className="input sm:w-24"
          />
          <input
            type="color"
            value={newSubject.color}
            onChange={(e) => setNewSubject({ ...newSubject, color: e.target.value })}
            className="h-11 w-full rounded-xl border border-border bg-background sm:w-14"
          />
          <button
            onClick={() => addSubject.mutate()}
            disabled={!newSubject.name.trim() || addSubject.isPending}
            className="h-11 rounded-full bg-brand px-5 text-xs font-bold text-brand-foreground disabled:opacity-60"
          >
            Add
          </button>
        </div>
      </section>

      {editBlock ? (
        <Sheet title="Edit block" onClose={() => setEditBlock(null)}>
          <label className="mt-4 block text-xs text-muted-foreground">Title</label>
          <input
            value={editBlock.title}
            onChange={(e) => setEditBlock({ ...editBlock, title: e.target.value })}
            className="input mt-1"
          />
          <label className="mt-4 block text-xs text-muted-foreground">Day</label>
          <select
            value={editBlock.day_of_week}
            onChange={(e) => setEditBlock({ ...editBlock, day_of_week: Number(e.target.value) })}
            className="input mt-1"
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-muted-foreground">Start</label>
              <input
                type="time"
                value={editBlock.start_time.slice(0, 5)}
                onChange={(e) => setEditBlock({ ...editBlock, start_time: e.target.value })}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground">End</label>
              <input
                type="time"
                value={editBlock.end_time.slice(0, 5)}
                onChange={(e) => setEditBlock({ ...editBlock, end_time: e.target.value })}
                className="input mt-1"
              />
            </div>
          </div>
          <label className="mt-4 block text-xs text-muted-foreground">Location / link</label>
          <input
            value={editBlock.location ?? ""}
            onChange={(e) => setEditBlock({ ...editBlock, location: e.target.value })}
            className="input mt-1"
          />
          <button
            onClick={() => saveBlock.mutate(editBlock)}
            disabled={saveBlock.isPending}
            className="mt-5 h-12 w-full rounded-full bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
          >
            {saveBlock.isPending ? "Saving…" : "Save block"}
          </button>
        </Sheet>
      ) : null}

      {editSubject ? (
        <Sheet title="Edit subject" onClose={() => setEditSubject(null)}>
          <label className="mt-4 block text-xs text-muted-foreground">Name</label>
          <input
            value={editSubject.name}
            onChange={(e) => setEditSubject({ ...editSubject, name: e.target.value })}
            className="input mt-1"
          />
          <label className="mt-4 block text-xs text-muted-foreground">Weekly target (hours)</label>
          <input
            type="number"
            min={0}
            value={editSubject.weekly_target_hours}
            onChange={(e) => setEditSubject({ ...editSubject, weekly_target_hours: Number(e.target.value) })}
            className="input mt-1"
          />
          <label className="mt-4 block text-xs text-muted-foreground">Colour</label>
          <input
            type="color"
            value={editSubject.color}
            onChange={(e) => setEditSubject({ ...editSubject, color: e.target.value })}
            className="mt-1 h-11 w-full rounded-xl border border-border bg-background"
          />
          <button
            onClick={() => saveSubject.mutate(editSubject)}
            disabled={saveSubject.isPending}
            className="mt-5 h-12 w-full rounded-full bg-brand text-sm font-semibold text-brand-foreground disabled:opacity-60"
          >
            {saveSubject.isPending ? "Saving…" : "Save subject"}
          </button>
        </Sheet>
      ) : null}
    </div>
  );
}

function BlockActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 gap-2">
      <button
        onClick={onEdit}
        className="h-8 rounded-full border border-brand/40 px-3 text-[10px] font-bold text-brand uppercase"
      >
        Edit
      </button>
      <button
        onClick={onDelete}
        className="h-8 rounded-full border border-border px-3 text-[10px] text-muted-foreground uppercase"
      >
        Del
      </button>
    </div>
  );
}

/** Month view: every date of the current month with its recurring weekday blocks. */
function MonthGrid({
  byDay,
  colorOf,
}: {
  byDay: Record<number, Block[]>;
  colorOf: (b: Block) => string;
}) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const lead = first.getDay();
  const cells: Array<number | null> = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-muted-foreground">
        {first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </p>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
        {DAYS.map((d) => (
          <span key={d} className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
            {d}
          </span>
        ))}
        {cells.map((date, i) => {
          if (date === null) return <span key={`x${i}`} />;
          const dow = new Date(now.getFullYear(), now.getMonth(), date).getDay();
          const items = byDay[dow] ?? [];
          const isToday = date === now.getDate();
          return (
            <div
              key={date}
              className={`min-h-16 rounded-xl border p-1 text-left ${
                isToday ? "border-brand bg-brand/5" : "border-border bg-background"
              }`}
            >
              <span className="font-mono text-[10px] text-muted-foreground">{date}</span>
              <div className="mt-0.5 flex flex-wrap gap-0.5">
                {items.slice(0, 4).map((b) => (
                  <span
                    key={b.id}
                    title={`${b.title} ${fmtRange(b)}`}
                    className="size-1.5 rounded-full"
                    style={{ background: colorOf(b) }}
                  />
                ))}
                {items.length > 4 ? (
                  <span className="text-[9px] text-muted-foreground">+{items.length - 4}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
