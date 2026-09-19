import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, GraduationCap, Plus, RotateCcw, Trash2, Video } from "lucide-react";
import {
  createClass,
  deleteClass,
  fetchClassRevisions,
  fetchClasses,
  logNotesRevision,
  setClassCompleted,
  type ClassNoteRevision,
} from "@/lib/classes";
import { fetchSubjects } from "@/lib/study";
import { EmptyState, PageHeader, ResponsiveSheet } from "@/components/study-ui";
import { ChapterNotesPanel } from "@/components/ChapterNotesPanel";
import { Button } from "@/components/ui/button";
import emptyCalendar from "@/assets/chronodeck-empty-calendar.png";

export const Route = createFileRoute("/_authenticated/classes")({
  head: () => ({
    meta: [
      { title: "Online classes — Chronodeck Study OS" },
      {
        name: "description",
        content:
          "Manage your online classes by subject and chapter, and revise the notes you made on a spaced schedule.",
      },
      { property: "og:title", content: "Online classes — Chronodeck Study OS" },
      {
        property: "og:description",
        content: "Track completed classes and revise class notes on a spaced schedule.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClassesPage,
});

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand/60";

const dueLabel = (iso: string) => {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `in ${days}d`;
};

function ClassesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subject_id: "",
    chapter_name: "",
    mode: "recorded",
    url: "",
    duration: "60",
    completed: true,
  });

  const classes = useQuery({ queryKey: ["classes"], queryFn: fetchClasses });
  const revisions = useQuery({ queryKey: ["class-revisions"], queryFn: fetchClassRevisions });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });

  const chaptersForSubject = useMemo(() => {
    const s = (subjects.data ?? []).find((x) => x.id === form.subject_id);
    return s?.chapters ?? [];
  }, [subjects.data, form.subject_id]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["classes"] });
    void qc.invalidateQueries({ queryKey: ["class-revisions"] });
    void qc.invalidateQueries({ queryKey: ["plan"] });
  };

  const add = useMutation({
    mutationFn: () =>
      createClass({
        title: form.title.trim(),
        subject_id: form.subject_id || null,
        chapter_name: form.chapter_name.trim() || null,
        mode: form.mode,
        url: form.url.trim() || null,
        duration_minutes: Number(form.duration) || null,
        status: form.completed ? "completed" : "scheduled",
      }),
    onSuccess: () => {
      setOpen(false);
      setForm({ ...form, title: "", chapter_name: "", url: "" });
      refresh();
      toast.success(
        form.completed
          ? "Class saved — notes revisions scheduled"
          : "Class saved",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => setClassCompleted(v.id, v.done),
    onSuccess: (_d, v) => {
      refresh();
      toast.success(v.done ? "Marked complete — notes revisions scheduled" : "Moved back to scheduled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => {
      refresh();
      toast.success("Class removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revise = useMutation({
    mutationFn: (row: ClassNoteRevision) => logNotesRevision(row, 15),
    onSuccess: () => {
      refresh();
      toast.success("Revision logged — next pass scheduled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = classes.data ?? [];
  const due = (revisions.data ?? []).filter((r) => r.revisions_done < r.target_revisions);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-28 pt-4 sm:px-6">
      <PageHeader
        title="Online classes"
        description="Mark a class complete and its notes go into the revision ladder."
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="size-4" /> Add class
          </Button>
        }
      />

      {/* Notes revision queue */}
      <section className="surface-card p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-[var(--lavender-soft)]">
            <RotateCcw className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-extrabold tracking-tight">Class notes revision</h2>
            <p className="text-[11px] text-muted-foreground">
              Each set of notes gets 4–8 spaced passes. Due ones also appear in your daily plan.
            </p>
          </div>
        </div>

        {due.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No notes queued yet. Mark a class complete to start its revision schedule.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {due.map((r) => {
              const overdue = new Date(r.next_review_at).getTime() <= Date.now();
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-panel p-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {r.chapter_name ?? r.title}
                    </span>
                    <span className="block text-[11px] font-semibold text-muted-foreground">
                      pass {r.revisions_done + 1} of {r.target_revisions} ·{" "}
                      <span className={overdue ? "text-destructive" : ""}>
                        {dueLabel(r.next_review_at)}
                      </span>
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant={overdue ? "default" : "outline"}
                    disabled={revise.isPending}
                    onClick={() => revise.mutate(r)}
                  >
                    Revised
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Class list */}
      <section className="surface-card p-5">
        <h2 className="text-base font-extrabold tracking-tight">Your classes</h2>
        {classes.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            image={emptyCalendar}
            title="No classes yet"
            description="Add the classes you have already attended and pick the chapter they covered."
          />
        ) : (
          <ul className="mt-4 space-y-2.5">
            {rows.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-panel p-3"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--sky-soft,#e4efff)]">
                  {c.mode === "live" ? (
                    <Video className="size-5" aria-hidden="true" />
                  ) : (
                    <GraduationCap className="size-5" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{c.title}</span>
                  <span className="block truncate text-[11px] font-semibold text-muted-foreground">
                    {c.chapter_name ? `${c.chapter_name} · ` : ""}
                    {c.mode}
                    {c.duration_minutes ? ` · ${c.duration_minutes}m` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={c.status === "completed" ? "Mark as not completed" : "Mark as completed"}
                  onClick={() => complete.mutate({ id: c.id, done: c.status !== "completed" })}
                  className={`grid size-9 shrink-0 place-items-center rounded-full border transition ${
                    c.status === "completed"
                      ? "border-transparent bg-foreground text-background"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Delete class"
                  onClick={() => remove.mutate(c.id)}
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Chapter PDFs — upload, order, preview and download notes per chapter */}
      <ChapterNotesPanel />

      {open ? (
        <ResponsiveSheet open title="Add online class" onClose={() => setOpen(false)}>
          <div className="grid gap-3">
            <label className="block text-xs font-bold text-muted-foreground">
              Class title
              <input
                className={`mt-1 ${inputCls}`}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Polity — Fundamental Rights lecture"
              />
            </label>
            <label className="block text-xs font-bold text-muted-foreground">
              Subject
              <select
                className={`mt-1 ${inputCls}`}
                value={form.subject_id}
                onChange={(e) => setForm({ ...form, subject_id: e.target.value, chapter_name: "" })}
              >
                <option value="">No subject</option>
                {(subjects.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold text-muted-foreground">
              Chapter covered
              <select
                className={`mt-1 ${inputCls}`}
                value={form.chapter_name}
                onChange={(e) => setForm({ ...form, chapter_name: e.target.value })}
              >
                <option value="">Choose a chapter</option>
                {chaptersForSubject.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-muted-foreground">
                Mode
                <select
                  className={`mt-1 ${inputCls}`}
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value })}
                >
                  <option value="recorded">Recorded</option>
                  <option value="live">Live</option>
                </select>
              </label>
              <label className="block text-xs font-bold text-muted-foreground">
                Minutes
                <input
                  type="number"
                  min={1}
                  className={`mt-1 ${inputCls}`}
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                />
              </label>
            </div>
            <label className="block text-xs font-bold text-muted-foreground">
              Link (optional)
              <input
                className={`mt-1 ${inputCls}`}
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-bold">
              <input
                type="checkbox"
                checked={form.completed}
                onChange={(e) => setForm({ ...form, completed: e.target.checked })}
                className="size-4"
              />
              Already completed — start notes revisions
            </label>
            <Button
              disabled={add.isPending || !form.title.trim()}
              onClick={() => add.mutate()}
              className="mt-1 h-12"
            >
              {add.isPending ? "Saving…" : "Save class"}
            </Button>
          </div>
        </ResponsiveSheet>
      ) : null}
    </div>
  );
}
