import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Download, Eye, FileText, Trash2, Upload } from "lucide-react";
import {
  deleteNote,
  fetchNotes,
  groupByChapter,
  noteUrl,
  swapNotePositions,
  uploadNote,
  type ChapterNote,
} from "@/lib/notes";
import { fetchSubjects } from "@/lib/study";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/study-ui";

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand/60";

const kb = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Upload, order, preview and download the PDFs that belong to a chapter. */
export function ChapterNotesPanel() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subjectId, setSubjectId] = useState("");
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [preview, setPreview] = useState<{ note: ChapterNote; url: string } | null>(null);

  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const notes = useQuery({ queryKey: ["chapter-notes"], queryFn: fetchNotes });

  const chapters = useMemo(
    () => (subjects.data ?? []).find((s) => s.id === subjectId)?.chapters ?? [],
    [subjects.data, subjectId],
  );
  const groups = useMemo(() => groupByChapter(notes.data ?? []), [notes.data]);
  const subjectName = (id: string | null) => (subjects.data ?? []).find((s) => s.id === id)?.name ?? "No subject";
  const refresh = () => qc.invalidateQueries({ queryKey: ["chapter-notes"] });

  const upload = useMutation({
    mutationFn: async (files: FileList) => {
      const current = (notes.data ?? []).filter(
        (n) => (n.subject_id ?? "") === subjectId && (n.chapter_name ?? "") === chapter,
      );
      let count = current.length;
      for (const file of Array.from(files)) {
        await uploadNote({
          file,
          subject_id: subjectId || null,
          chapter_name: chapter || null,
          topic: topic.trim() || null,
          existingCount: count,
        });
        count += 1;
      }
      return files.length;
    },
    onSuccess: (n) => {
      void refresh();
      toast.success(`${n} PDF upload ho gayi`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (note: ChapterNote) => deleteNote(note),
    onSuccess: () => {
      void refresh();
      toast.success("PDF hata di");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: (v: { a: ChapterNote; b: ChapterNote }) => swapNotePositions(v.a, v.b),
    onSuccess: () => void refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const open = async (note: ChapterNote, download: boolean) => {
    try {
      const url = await noteUrl(note.storage_path);
      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = note.title;
        a.click();
        return;
      }
      setPreview({ note, url });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <section className="surface-card p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-[var(--mint-soft,#dff5ea)]">
          <FileText className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-extrabold tracking-tight">Chapter PDFs</h2>
          <p className="text-[11px] text-muted-foreground">
            Subject aur chapter chuno, ek topic me kitni bhi PDF upload karo — series wise.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-bold text-muted-foreground">
          Subject
          <select
            className={`mt-1 ${inputCls}`}
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setChapter("");
            }}
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
          Chapter
          <select className={`mt-1 ${inputCls}`} value={chapter} onChange={(e) => setChapter(e.target.value)}>
            <option value="">Choose a chapter</option>
            {chapters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-muted-foreground">
          Topic (optional)
          <input
            className={`mt-1 ${inputCls}`}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Fundamental Rights"
          />
        </label>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) upload.mutate(e.target.files);
          e.target.value = "";
        }}
      />
      <Button
        className="mt-3 gap-2"
        disabled={upload.isPending || !chapter}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="size-4" />
        {upload.isPending ? "Uploading…" : "Upload PDFs"}
      </Button>
      {!chapter ? (
        <p className="mt-2 text-[11px] text-muted-foreground">Pehle chapter select karo, phir upload karo.</p>
      ) : null}

      {notes.isLoading ? (
        <p className="mt-5 text-sm text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">Abhi koi PDF nahi. Upar se pehli PDF upload karo.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {groups.map((group) => (
            <div key={group.key} className="rounded-2xl border border-border bg-panel p-3">
              <p className="text-sm font-extrabold">{group.chapter_name ?? "General"}</p>
              <p className="text-[11px] font-semibold text-muted-foreground">
                {subjectName(group.subject_id)} · {group.notes.length} PDF
              </p>
              <ul className="mt-3 space-y-2">
                {group.notes.map((note, index) => (
                  <li
                    key={note.id}
                    className="flex items-center gap-2 rounded-xl border border-border bg-background p-2.5"
                  >
                    <span className="num grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{note.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {note.topic ? `${note.topic} · ` : ""}
                        {kb(note.file_size)}
                      </span>
                    </span>
                    <IconBtn
                      label="Move up"
                      disabled={index === 0 || move.isPending}
                      onClick={() => {
                        const prev = group.notes[index - 1];
                        if (prev) move.mutate({ a: note, b: prev });
                      }}
                    >
                      <ArrowUp className="size-4" />
                    </IconBtn>
                    <IconBtn
                      label="Move down"
                      disabled={index === group.notes.length - 1 || move.isPending}
                      onClick={() => {
                        const next = group.notes[index + 1];
                        if (next) move.mutate({ a: note, b: next });
                      }}
                    >
                      <ArrowDown className="size-4" />
                    </IconBtn>
                    <IconBtn label="Preview PDF" onClick={() => void open(note, false)}>
                      <Eye className="size-4" />
                    </IconBtn>
                    <IconBtn label="Download PDF" onClick={() => void open(note, true)}>
                      <Download className="size-4" />
                    </IconBtn>
                    <IconBtn label="Delete PDF" danger onClick={() => remove.mutate(note)}>
                      <Trash2 className="size-4" />
                    </IconBtn>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {preview ? (
        <ResponsiveSheet open title={preview.note.title} onClose={() => setPreview(null)}>
          <object data={preview.url} type="application/pdf" className="h-[70vh] w-full rounded-xl border border-border">
            <a href={preview.url} target="_blank" rel="noreferrer" className="text-sm font-bold underline">
              Open PDF in a new tab
            </a>
          </object>
        </ResponsiveSheet>
      ) : null}
    </section>
  );
}

function IconBtn({
  label,
  children,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition disabled:opacity-40 ${
        danger ? "hover:text-destructive" : "hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
