import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Download, Eye, FileText, FolderOpen, Trash2, Upload } from "lucide-react";
import {
  deleteNote,
  fetchNotes,
  groupByChapter,
  mediaKind,
  noteUrl,
  swapNotePositions,
  uploadNote,
  type ChapterNote,
} from "@/lib/notes";
import { fetchSubjects } from "@/lib/study";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/study-ui";
import { ListSkeleton } from "@/components/ui/skeletons";

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand/60";

const kb = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

type MediaFilter = "all" | "pdf" | "image" | "video" | "document";

/** Upload, order, preview and download study media that belongs to a chapter. */
export function ChapterNotesPanel() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subjectId, setSubjectId] = useState("");
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [preview, setPreview] = useState<{ note: ChapterNote; url: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ done: 0, total: 0 });

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
      setUploadStatus({ done: 0, total: files.length });
      const current = (notes.data ?? []).filter(
        (n) => (n.subject_id ?? "") === subjectId && (n.chapter_name ?? "") === chapter,
      );
      let count = current.length;
      let uploaded = 0;
      const failed: string[] = [];
      for (const file of Array.from(files)) {
        try {
          await uploadNote({ file, subject_id: subjectId || null, chapter_name: chapter || null, topic: topic.trim() || null, existingCount: count });
          count += 1;
          uploaded += 1;
        } catch (error) {
          failed.push(`${file.name} — ${error instanceof Error ? error.message : "upload failed"}`);
        } finally {
          setUploadStatus((value) => ({ ...value, done: value.done + 1 }));
        }
      }
      return { uploaded, failed };
    },
    onSuccess: ({ uploaded, failed }) => {
      void refresh();
      if (uploaded) toast.success(`${uploaded} file upload ho gayi`);
      if (failed.length) toast.error(`${failed.length} file upload nahi hui`, { description: failed.join("\n") });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (note: ChapterNote) => deleteNote(note),
    onSuccess: () => {
      void refresh();
      toast.success("File hata di");
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
          <h2 className="text-base font-extrabold tracking-tight">Study media library</h2>
          <p className="text-[11px] text-muted-foreground">
            Subject aur chapter ke andar PDF, image, video aur documents series wise rakho.
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
          Chapter / folder
          {/* Free text with suggestions: users without saved chapters can still upload. */}
          <input
            className={`mt-1 ${inputCls}`}
            list="chapter-suggestions"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            placeholder="General"
          />
          <datalist id="chapter-suggestions">
            {chapters.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
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
        accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) upload.mutate(e.target.files);
          e.target.value = "";
        }}
      />
      <div
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); if (chapter && event.dataTransfer.files.length) upload.mutate(event.dataTransfer.files); }}
        className={`mt-4 grid min-h-36 place-items-center rounded-2xl border border-dashed p-5 text-center transition ${dragging ? "border-blue bg-blue-soft" : "border-border bg-secondary/35"}`}
      >
        <div><FolderOpen className="mx-auto size-8 text-blue" /><p className="mt-2 text-sm font-extrabold">Drop chapter files here</p><p className="mt-1 text-[11px] text-muted-foreground">PDF, images, videos and office files · up to 50 MB each</p>
          <Button className="mt-3 gap-2" disabled={upload.isPending || !chapter} onClick={() => fileRef.current?.click()}><Upload className="size-4" />{upload.isPending ? `${uploadStatus.done}/${uploadStatus.total} uploaded` : "Choose files"}</Button>
        </div>
      </div>
      {!chapter ? (
        <p className="mt-2 text-[11px] text-muted-foreground">Pehle chapter select karo, phir upload karo.</p>
      ) : null}

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filter media">
        {(["all", "pdf", "image", "video", "document"] as const).map((kind) => (
          <Button key={kind} type="button" size="sm" variant={filter === kind ? "default" : "outline"} onClick={() => setFilter(kind)} className="shrink-0 capitalize">
            {kind}
          </Button>
        ))}
      </div>

      {notes.isLoading ? (
        <div className="mt-5"><ListSkeleton rows={3} /></div>
      ) : groups.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">Abhi koi file nahi. Upar se pehli file upload karo.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {groups.map((group) => (
            <div key={group.key} className="rounded-2xl border border-border bg-panel p-3">
              <p className="text-sm font-extrabold">{group.chapter_name ?? "General"}</p>
              <p className="text-[11px] font-semibold text-muted-foreground">
                {subjectName(group.subject_id)} · {group.notes.length} files
              </p>
              <ul className="mt-3 space-y-2">
                {group.notes.filter((note) => filter === "all" || mediaKind(note.mime_type, note.title) === filter).map((note, index, visible) => (
                  <li
                    key={note.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-xl border border-border bg-background p-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span className="num grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{note.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {note.topic ? `${note.topic} · ` : ""}{mediaKind(note.mime_type, note.title)} · {kb(note.file_size)}
                      </span>
                    </span>
                    <div className="col-span-2 flex flex-wrap justify-end gap-1 sm:col-span-1 sm:flex-nowrap">
                    <IconBtn
                      label="Move up"
                      disabled={index === 0 || move.isPending}
                      onClick={() => {
                         const prev = visible[index - 1];
                        if (prev) move.mutate({ a: note, b: prev });
                      }}
                    >
                      <ArrowUp className="size-4" />
                    </IconBtn>
                    <IconBtn
                      label="Move down"
                       disabled={index === visible.length - 1 || move.isPending}
                      onClick={() => {
                         const next = visible[index + 1];
                        if (next) move.mutate({ a: note, b: next });
                      }}
                    >
                      <ArrowDown className="size-4" />
                    </IconBtn>
                    <IconBtn label="Preview file" onClick={() => void open(note, false)}>
                      <Eye className="size-4" />
                    </IconBtn>
                    <IconBtn label="Download file" onClick={() => void open(note, true)}>
                      <Download className="size-4" />
                    </IconBtn>
                    <IconBtn label="Delete file" danger onClick={() => { if (window.confirm(`Delete ${note.title}?`)) remove.mutate(note); }}>
                      <Trash2 className="size-4" />
                    </IconBtn></div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {preview ? (
        <ResponsiveSheet open title={preview.note.title} onClose={() => setPreview(null)}>
          <MediaPreview note={preview.note} url={preview.url} />
        </ResponsiveSheet>
      ) : null}
    </section>
  );
}

function MediaPreview({ note, url }: { note: ChapterNote; url: string }) {
  const kind = mediaKind(note.mime_type, note.title);
  if (kind === "image") return <img src={url} alt={note.title} className="max-h-[70vh] w-full rounded-xl object-contain" />;
  if (kind === "video") return <video src={url} controls playsInline className="max-h-[70vh] w-full rounded-xl bg-foreground" />;
  if (kind === "pdf") return <object data={url} type="application/pdf" className="h-[70vh] w-full rounded-xl border border-border"><a href={url} target="_blank" rel="noreferrer">Open PDF</a></object>;
  return (
    <div className="grid min-h-64 place-items-center rounded-xl border border-border bg-secondary/40 p-6 text-center">
      <div><FileText className="mx-auto size-10 text-muted-foreground" /><p className="mt-3 text-sm font-bold">Preview is not available for this format.</p><Button asChild className="mt-4"><a href={url} target="_blank" rel="noreferrer"><Download className="size-4" /> Download file</a></Button></div>
    </div>
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
    <Button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      variant="outline"
      size="icon"
      className={`size-9 min-h-9 shrink-0 text-muted-foreground ${
        danger ? "hover:text-destructive" : "hover:text-foreground"
      }`}
    >
      {children}
    </Button>
  );
}
