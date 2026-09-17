import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Clock3, History, Search, Settings2 } from "lucide-react";
import {
  currentBlock,
  fetchBlocks,
  fetchRunningSession,
  fetchSessions,
  fetchSubjects,
  fmtHM,
  localTimeToIsoToday,
  relativeTime,
  startSession,
  startOfToday,
} from "@/lib/study";
import { SubjectsManager } from "@/components/SubjectsManager";
import { ActivityArtwork, PageHeader, ResponsiveSheet, type ActivityKind } from "@/components/study-ui";
import { Button } from "@/components/ui/button";
import { DailyPlanCard } from "@/components/DailyPlanCard";
import { fetchChapterPace, fetchPlan, fetchSubjectTargets, localDateKey, type PlanItem } from "@/lib/plan";
import learningPath from "@/assets/chronodeck-learning-path.png";

const SESSION_KINDS = [
  { k: "reading", l: "Reading", d: "Books, notes and articles", tint: "bg-yellow" },
  { k: "revision", l: "Revision", d: "Recall and review", tint: "bg-lavender" },
  { k: "class", l: "Online class", d: "Live or recorded lessons", tint: "bg-blue" },
  { k: "practice", l: "Test / Practice", d: "Problems and papers", tint: "bg-mint" },
] as const;


export const Route = createFileRoute("/_authenticated/study")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { block?: string | undefined; plan?: string | undefined; date?: string | undefined } => ({
    block: typeof search["block"] === "string" ? search["block"] : undefined,
    plan: typeof search["plan"] === "string" ? search["plan"] : undefined,
    date: typeof search["date"] === "string" ? search["date"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Study Mode — Chronodeck" },
      {
        name: "description",
        content: "Pick a subject, choose a category and launch the distraction-free focus timer.",
      },
      { property: "og:title", content: "Study Mode — Chronodeck" },
      {
        property: "og:description",
        content: "Set up your study session and start the clean full-screen focus timer.",
      },
    ],
  }),
  component: StudySetupPage,
});

function StudySetupPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/study" });
  const [form, setForm] = useState({
    subject_id: "",
    subject_name: "",
    topic: "",
    chapter: "",
    kind: "reading",
    planned_end_at: "",
  });
  const [subjectSheet, setSubjectSheet] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");

  const running = useQuery({ queryKey: ["running"], queryFn: fetchRunningSession });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const blocks = useQuery({ queryKey: ["blocks"], queryFn: fetchBlocks });
  const recent = useQuery({
    queryKey: ["sessions", "study-recent"],
    queryFn: () => fetchSessions(new Date(startOfToday().getTime() - 13 * 864e5).toISOString()),
  });
  const activePlanDate = search.date ?? localDateKey();
  const plan = useQuery({ queryKey: ["plan", activePlanDate], queryFn: () => fetchPlan(activePlanDate) });
  const subjectTargets = useQuery({ queryKey: ["subject-targets"], queryFn: fetchSubjectTargets });
  const pace = useQuery({ queryKey: ["chapter-pace"], queryFn: fetchChapterPace });
  const activeSubject = (subjects.data ?? []).find((s) => s.id === form.subject_id);


  // The timer lives on its own page — a live session always belongs there.
  useEffect(() => {
    if (running.data) navigate({ to: "/timer" });
  }, [running.data, navigate]);

  /** Auto-fill subject + kind from the timetable block covering now, or the one picked by URL. */
  useEffect(() => {
    if (running.data || form.subject_id || form.subject_name || !blocks.data) return;
    const selected = search.block ? blocks.data.find((b) => b.id === search.block) : null;
    const b = selected || currentBlock(blocks.data);
    if (b) {
      setForm((f) => ({
        ...f,
        subject_id: b.subject_id ?? "",
        subject_name: b.subject_id ? "" : b.title,
        kind: b.kind === "class" ? "class" : "reading",
        topic: f.topic || b.title,
        planned_end_at: b.end_time,
      }));
    }
  }, [blocks.data, running.data, form.subject_id, form.subject_name, search.block]);

  const choosePlanItem = (item: PlanItem) => {
    const end = new Date(Date.now() + item.target_minutes * 60_000);
    setForm((current) => ({ ...current, subject_id: item.subject_id ?? "", subject_name: item.subject_name ?? "", chapter: item.chapter_name ?? "", topic: item.chapter_name ?? item.subject_name ?? "", kind: item.session_kind, planned_end_at: item.scheduled_end?.slice(0, 5) ?? end.toTimeString().slice(0, 5) }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!search.plan || !plan.data) return;
    const item = plan.data.find((row) => row.id === search.plan);
    if (item) choosePlanItem(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.plan, plan.data]);

  const start = useMutation({
    mutationFn: async () => {
      const subj = (subjects.data ?? []).find((s) => s.id === form.subject_id);
      const plannedEnd = form.planned_end_at ? localTimeToIsoToday(form.planned_end_at) : null;
      return startSession({
        subject_id: subj?.id ?? null,
        subject_name: subj?.name ?? (form.subject_name.trim() || "Study"),
        topic: form.topic.trim() || null,
        chapter: form.chapter.trim() || null,
        kind: form.kind,
        planned_end_at: plannedEnd,
      });
    },
    onSuccess: (session) => {
      // Seed the cache before navigating so the timer page opens with the live
      // session already in hand instead of bouncing back here.
      qc.setQueryData(["running"], session);
      void qc.invalidateQueries({ queryKey: ["sessions", "8w"] });
      void qc.invalidateQueries({ queryKey: ["sessions", "study-recent"] });
      toast.success("Study mode on");

      navigate({ to: "/timer" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visibleSubjects = (subjects.data ?? []).filter((subject) =>
    subject.name.toLowerCase().includes(subjectSearch.toLowerCase()),
  );

  return (
    <div className="app-page text-foreground">
      <motion.div
        initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full"
      >
        <section className="relative overflow-hidden rounded-[36px] bg-blue-soft p-6 sm:p-8">
          <div className="relative z-10 max-w-2xl">
            <PageHeader eyebrow="Study launcher" title="What are we focusing on?" description="Choose an activity, then connect it to the right subject and chapter." />
          </div>
          <img src={learningPath} alt="Student building a learning path with books" width={1200} height={1200} className="absolute -right-8 -bottom-24 hidden size-72 object-contain md:block" />
        </section>

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid min-w-0 gap-6">
            <section className="surface-card p-5 sm:p-6">
              <h2 className="text-xl font-bold">1. Choose an activity</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {SESSION_KINDS.map((o) => {
                  const on = form.kind === o.k;
                  return (
                    <motion.button key={o.k} type="button" whileTap={{ scale: 0.98 }} onClick={() => setForm({ ...form, kind: o.k })} aria-pressed={on} className={`min-w-0 overflow-hidden rounded-[24px] border-2 p-3 text-left transition ${on ? "border-foreground shadow-md" : "border-transparent bg-secondary hover:border-border"}`}>
                      <ActivityArtwork kind={o.k as ActivityKind} className={`h-24 rounded-[18px] ${o.tint}`} />
                      <span className="mt-3 block text-sm font-bold">{o.l}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{o.d}</span>
                    </motion.button>
                  );
                })}
              </div>
            </section>

            <section className="surface-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-xl font-bold">2. Pick a subject</h2><p className="mt-1 text-sm text-muted-foreground">Your saved subjects and syllabus stay connected.</p></div>
                <Button variant="outline" size="sm" onClick={() => setSubjectSheet(true)}>Manage subjects</Button>
              </div>
              <label className="relative mt-4 block">
                <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                <span className="sr-only">Search subjects</span>
                <input value={subjectSearch} onChange={(e) => setSubjectSearch(e.target.value)} placeholder="Search subjects" className="field-control pl-11" />
              </label>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.isLoading ? (
              <div className="contents">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-24 animate-pulse rounded-[22px] bg-muted" />
                ))}
              </div>
            ) : null}
            {!subjects.isLoading && (subjects.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects yet. Add one to connect your session to the syllabus.</p>
            ) : null}
            {visibleSubjects.map((x) => {
              const on = form.subject_id === x.id;
              return (
                <motion.button
                  key={x.id}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    setForm({ ...form, subject_id: x.id, subject_name: x.name, chapter: "" })
                  }
                  aria-pressed={on}
                  className={`flex min-h-24 items-center gap-3 rounded-[22px] border-2 p-4 text-left transition ${
                    on
                      ? "border-foreground bg-lavender-soft text-foreground"
                      : "border-border bg-panel text-foreground hover:bg-secondary"
                  }`}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-lg font-extrabold" style={{ background: x.color }}>{x.name.slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-bold">{x.name}</span><span className="mt-1 block text-xs text-muted-foreground">{x.chapters.length} chapters</span></span>
                  {on ? <Check className="ml-auto size-5 shrink-0" /> : null}
                </motion.button>
              );
            })}
              </div>

          {activeSubject ? (
            <div className="mt-4">
              <h3 className="text-sm font-bold">Chapter <span className="font-normal text-muted-foreground">(optional)</span></h3>
              {activeSubject.chapters.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Is subject me chapters nahi — “+ Add subject” se chapters add karo.
                </p>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {activeSubject.chapters.map((c) => {
                    const on = form.chapter === c;
                    return (
                      <motion.button
                        key={c}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setForm({ ...form, chapter: on ? "" : c, topic: form.topic || c })}
                        aria-pressed={on}
                        className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 text-left text-sm font-semibold transition ${
                          on
                            ? "border-transparent bg-foreground text-background"
                            : "border-border bg-secondary/50 text-muted-foreground"
                        }`}
                      >
                        {on ? <Check className="size-3.5" /> : null}
                        {c}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
            </section>

            <section className="surface-card p-5 sm:p-6">
              <div className="flex items-center gap-2"><Settings2 className="size-5" /><h2 className="text-xl font-bold">3. Session details</h2></div>
              <label className="mt-4 block text-sm font-semibold" htmlFor="study-topic">Topic or notes</label>
              <input id="study-topic"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="Topic / notes"
            className="field-control mt-2"
          />
              <label className="mt-4 block text-sm font-semibold" htmlFor="study-end">Planned end <span className="font-normal text-muted-foreground">(optional)</span></label>
              <input id="study-end" type="time" value={form.planned_end_at} onChange={(e) => setForm({ ...form, planned_end_at: e.target.value })} className="field-control mt-2 max-w-xs" />
            </section>
          </div>

          <aside className="sticky top-24 rounded-[30px] bg-dark-card p-6 text-white shadow-xl">
            <p className="text-xs font-bold text-white/60">Session summary</p>
            <h2 className="mt-3 text-2xl font-extrabold">{activeSubject?.name || form.subject_name || "Open study"}</h2>
            <p className="mt-1 text-sm text-white/65">{form.chapter || form.topic || "Whole subject session"}</p>
            <dl className="mt-6 grid gap-3 text-sm">
              <div className="flex justify-between gap-3 border-b border-white/10 pb-3"><dt className="text-white/60">Activity</dt><dd className="font-semibold">{SESSION_KINDS.find((x) => x.k === form.kind)?.l}</dd></div>
              <div className="flex justify-between gap-3 border-b border-white/10 pb-3"><dt className="text-white/60">Planned end</dt><dd className="font-semibold">{form.planned_end_at || "Open-ended"}</dd></div>
            </dl>
            <Button onClick={() => start.mutate()} disabled={start.isPending} className="mt-6 w-full bg-white text-foreground hover:bg-white/90"><Clock3 />{start.isPending ? "Starting…" : "Start session"}</Button>
            <button onClick={() => navigate({ to: "/today" })} className="mt-3 min-h-11 w-full text-sm font-semibold text-white/60 hover:text-white">Back to home</button>
          </aside>
        </div>

        <div className="mt-6"><DailyPlanCard sessions={recent.data ?? []} title="Today's plan" onStart={choosePlanItem} /></div>

        <section className="surface-card mt-6 overflow-hidden p-5 sm:p-6">
          <p className="section-label">Your natural pace</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-lavender-soft p-4 sm:col-span-2"><p className="text-3xl font-extrabold">{fmtHM(pace.data?.avg_chapter_minutes ?? 0)}</p><p className="mt-1 text-sm font-semibold">average to finish a chapter</p><p className="mt-2 text-xs text-muted-foreground">Reading, revisions, classes and practice together. Your plan duration is a minimum focus target, not a fixed chapter limit.</p></div>
            <div className="rounded-2xl bg-yellow p-4"><p className="text-2xl font-extrabold">{fmtHM(pace.data?.avg_reading_minutes ?? 0)}</p><p className="mt-1 text-xs font-semibold">average reading sitting</p></div>
            <div className="rounded-2xl bg-mint p-4"><p className="text-2xl font-extrabold">{fmtHM(pace.data?.avg_revision_minutes ?? 0)}</p><p className="mt-1 text-xs font-semibold">average revision sitting</p></div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Based on {pace.data?.chapters_completed ?? 0} completed of {pace.data?.chapters_tracked ?? 0} tracked chapters.</p>
        </section>

        {subjectTargets.data?.length ? <section className="surface-card mt-6 p-5 sm:p-6"><h2 className="text-xl font-bold">Subject targets</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{subjectTargets.data.map((target) => { const subject = (subjects.data ?? []).find((row) => row.id === target.subject_id); return <div key={target.id} className="rounded-2xl bg-secondary p-4"><p className="font-bold">{subject?.name ?? "Subject"}</p><p className="mt-1 text-xs text-muted-foreground">{fmtHM(target.daily_minutes)} daily · {target.weekly_topics} topics/week · {target.weekly_questions} questions/week</p></div>; })}</div></section> : null}

        {/* Session history — what got recorded from this page */}
        <div className="surface-card mt-6 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-2xl bg-primary/12 text-primary">
              <History className="size-4.5" />
            </span>
            <h2 className="text-base font-extrabold tracking-tight">Session history</h2>
            <span className="ml-auto text-[11px] font-semibold text-muted-foreground">last 14 days</span>
          </div>

          {recent.isLoading ? (
            <div className="mt-4 grid gap-2">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-14 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : (recent.data ?? []).length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Abhi koi session nahi — upar se ek session start karo.
            </p>
          ) : (
            <ul className="mt-4 grid gap-2">
               {(recent.data ?? []).slice(0, 6).map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-2xl border-2 border-border bg-secondary/40 px-3.5 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {s.subject_name || "Study"}
                      {s.chapter ? <span className="text-muted-foreground"> · {s.chapter}</span> : null}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {s.kind} · {relativeTime(s.started_at)}
                      {s.topic ? ` · ${s.topic}` : ""}
                    </span>
                  </span>
                  <span className="num shrink-0 rounded-full bg-background px-3 py-1 text-[11px] font-bold">
                    {s.is_running ? "live" : fmtHM(s.duration_minutes ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>


      <ResponsiveSheet open={subjectSheet} onClose={() => setSubjectSheet(false)} title="Manage subjects" description="Add subjects and keep chapter lists up to date.">
              <SubjectsManager
                selectedId={form.subject_id}
                onSelect={(s) => {
                  setForm((f) => ({ ...f, subject_id: s.id, subject_name: s.name }));
                  setSubjectSheet(false);
                }}
              />
              <Button type="button" variant="outline" onClick={() => setSubjectSheet(false)} className="mt-4 w-full">Done</Button>
      </ResponsiveSheet>
    </div>
  );
}
