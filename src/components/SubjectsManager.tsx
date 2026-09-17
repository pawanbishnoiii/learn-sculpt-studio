import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Check, ChevronDown, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  createSubject,
  deleteSubject,
  fetchSubjects,
  setSubjectChapters,
  type Subject,
} from "@/lib/study";

export const SUBJECT_COLORS = ["#8B5CF6", "#FACC15", "#A3E635", "#F472B6", "#38BDF8", "#FB923C"];

type CatalogEntry = {
  id: string;
  name: string;
  stream: string;
  color: string;
  chapters: string[];
};

async function fetchSubjectCatalog(): Promise<CatalogEntry[]> {
  const { data, error } = await supabase
    .from("subject_catalog")
    .select("id,name,stream,color,chapters")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    stream: row.stream,
    color: row.color,
    chapters: Array.isArray(row.chapters) ? (row.chapters as string[]) : [],
  }));
}

/**
 * Single place where a user creates and manages their own subjects and the
 * chapters inside them. Suggestions come from the shared subject library so
 * nobody has to type every subject (and its chapters) from scratch.
 */
export function SubjectsManager({
  selectedId,
  onSelect,
  title = "Manage subjects",
  subtitle = "Subjects aur unke chapters — poori app inhi ko use karti hai.",
}: {
  selectedId?: string;
  onSelect?: (s: Subject) => void;
  title?: string;
  subtitle?: string;
}) {
  const qc = useQueryClient();
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const catalog = useQuery({ queryKey: ["subject-catalog"], queryFn: fetchSubjectCatalog, staleTime: 30 * 60_000 });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0]!);
  const [weekly, setWeekly] = useState("5");
  const [picked, setPicked] = useState<CatalogEntry | null>(null);
  const [newChapters, setNewChapters] = useState<string[]>([]);
  const [chapterDraft, setChapterDraft] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const list = subjects.data ?? [];
  const taken = useMemo(() => new Set(list.map((s) => s.name.trim().toLowerCase())), [list]);

  const suggestions = useMemo(() => {
    const all = (catalog.data ?? []).filter((c) => !taken.has(c.name.trim().toLowerCase()));
    const q = name.trim().toLowerCase();
    if (!q) return all.slice(0, 8);
    return all.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [catalog.data, name, taken]);

  const addM = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Subject ka naam likho");
      return createSubject({
        name: name.trim(),
        color,
        weekly_target_hours: Number(weekly) || 0,
        chapters: newChapters,
      });
    },
    onSuccess: () => {
      setName("");
      setWeekly("5");
      setPicked(null);
      setNewChapters([]);
      setChapterDraft("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Subject added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Subject removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const chaptersM = useMutation({
    mutationFn: ({ id, chapters }: { id: string; chapters: string[] }) => setSubjectChapters(id, chapters),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function choose(entry: CatalogEntry) {
    setName(entry.name);
    setColor(entry.color);
    setPicked(entry);
    setNewChapters(entry.chapters.slice(0, 60));
  }

  function pushDraft() {
    const v = chapterDraft.trim();
    if (!v) return;
    setNewChapters((c) => (c.some((x) => x.toLowerCase() === v.toLowerCase()) ? c : [...c, v]));
    setChapterDraft("");
  }

  return (
    <section className="rounded-[28px] border border-border bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-extrabold tracking-tight">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background"
        >
          <Plus className="size-4" />
          Add subject
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3 rounded-2xl border border-border bg-background p-4">
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setPicked(null);
                }}
                placeholder="Subject name (e.g. Physics)"
                className="h-12 w-full rounded-xl border border-border bg-panel px-4 text-sm font-medium outline-none focus:border-brand/60"
              />

              {suggestions.length > 0 ? (
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                    <Sparkles className="size-3" />
                    Suggestions
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <motion.button
                        key={s.id}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => choose(s)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                          picked?.id === s.id
                            ? "border-transparent bg-foreground text-background"
                            : "border-border bg-panel hover:border-brand/50"
                        }`}
                      >
                        <span className="size-2 rounded-full" style={{ background: s.color }} />
                        {s.name}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Chapters for the new subject */}
              <div className="rounded-2xl border border-border bg-panel p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  <BookOpen className="size-3" />
                  Chapters · {newChapters.length}
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    value={chapterDraft}
                    onChange={(e) => setChapterDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        pushDraft();
                      }
                    }}
                    placeholder="Chapter ka naam likho"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand/60"
                  />
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={pushDraft}
                    className="h-11 shrink-0 rounded-xl bg-foreground px-4 text-xs font-bold text-background"
                  >
                    Add
                  </motion.button>
                </div>
                {newChapters.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {newChapters.map((c) => (
                      <span
                        key={c}
                        className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium"
                      >
                        {c}
                        <button
                          type="button"
                          aria-label={`Remove ${c}`}
                          onClick={() => setNewChapters((l) => l.filter((x) => x !== c))}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Suggestion choose karo ya khud chapters add karo.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Colour ${c}`}
                    onClick={() => setColor(c)}
                    style={{ background: c }}
                    className={`grid size-8 place-items-center rounded-full transition-transform ${
                      color === c ? "scale-110 ring-2 ring-foreground/60" : ""
                    }`}
                  >
                    {color === c ? <Check className="size-4 text-white" /> : null}
                  </button>
                ))}
              </div>
              <label className="block text-xs font-medium text-muted-foreground">
                Weekly target · {weekly}h
              </label>
              <input
                type="range"
                min={0}
                max={30}
                step={0.5}
                value={weekly}
                onChange={(e) => setWeekly(e.target.value)}
                className="w-full accent-[var(--brand)]"
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                disabled={addM.isPending}
                onClick={() => addM.mutate()}
                className="h-12 w-full rounded-full bg-brand text-sm font-bold text-brand-foreground disabled:opacity-60"
              >
                {addM.isPending ? "Saving…" : "Save subject"}
              </motion.button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-4 space-y-2">
        {list.length === 0 ? (
          <p className="text-xs text-muted-foreground">Abhi koi subject nahi — pehla subject add karo.</p>
        ) : null}
        {list.map((s) => {
          const active = selectedId === s.id;
          const isOpen = expanded === s.id;
          return (
            <div
              key={s.id}
              className={`rounded-2xl border transition ${
                active ? "border-brand/60 bg-brand/5" : "border-border bg-background"
              }`}
            >
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => onSelect?.(s)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="truncate text-sm font-bold">{s.name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{s.weekly_target_hours}h</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] font-bold text-muted-foreground"
                >
                  {s.chapters.length} chapters
                  <ChevronDown className={`size-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${s.name}`}
                  onClick={() => delM.mutate(s.id)}
                  className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <ChapterEditor
                      subject={s}
                      busy={chaptersM.isPending}
                      onSave={(chapters) => chaptersM.mutate({ id: s.id, chapters })}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Add / remove chapters of one existing subject. */
function ChapterEditor({
  subject,
  busy,
  onSave,
}: {
  subject: Subject;
  busy: boolean;
  onSave: (chapters: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (!v) return;
    if (subject.chapters.some((c) => c.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    onSave([...subject.chapters, v]);
    setDraft("");
  }

  return (
    <div className="border-t border-border px-3 pt-3 pb-3">
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={`Add chapter to ${subject.name}`}
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-panel px-3 text-sm outline-none focus:border-brand/60"
        />
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          disabled={busy}
          onClick={add}
          className="h-11 shrink-0 rounded-xl bg-foreground px-4 text-xs font-bold text-background disabled:opacity-60"
        >
          Add
        </motion.button>
      </div>
      {subject.chapters.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">Koi chapter nahi — pehla chapter add karo.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {subject.chapters.map((c) => (
            <span
              key={c}
              className="flex items-center gap-1 rounded-full border border-border bg-panel px-2.5 py-1 text-[11px] font-medium"
            >
              {c}
              <button
                type="button"
                aria-label={`Remove ${c}`}
                disabled={busy}
                onClick={() => onSave(subject.chapters.filter((x) => x !== c))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
