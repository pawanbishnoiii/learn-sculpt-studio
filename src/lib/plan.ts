import { supabase } from "@/integrations/supabase/client";
import type { Session, Subject } from "@/lib/study";

/** How many plan tasks are shown on the board at once. */
export const PLAN_VISIBLE_LIMIT = 8;

/** One row of the automatic daily study plan. */
export type PlanItem = {
  id: string;
  plan_date: string;
  subject_id: string | null;
  chapter_name: string | null;
  session_kind: string;
  target_minutes: number;
  priority: number;
  source: string;
  pinned: boolean;
  completed_at: string | null;
  chapter_id: string | null;
  subtopic_id: string | null;
  subject_name: string | null;
  review_stage: number | null;
  next_review_at: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  status: PlanItemState;
  rank_score: number;
  class_id: string | null;
};

export type PlanItemState = "pending" | "skipped" | "cancelled";
export type PlanStatus = "complete" | "progress" | "pending";

/** Local (not UTC) yyyy-mm-dd, so plans line up with the student's day. */
export function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const PLAN_COLUMNS =
  "id, plan_date, subject_id, chapter_id, subtopic_id, subject_name, chapter_name, session_kind, target_minutes, priority, source, pinned, completed_at, review_stage, next_review_at, scheduled_start, scheduled_end, status, rank_score, class_id";

export async function fetchPlan(planDate = localDateKey()): Promise<PlanItem[]> {
  const { data, error } = await supabase
    .from("daily_study_plan_items")
    .select(PLAN_COLUMNS)
    .eq("plan_date", planDate)
    .order("priority", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PlanItem[];
}

/**
 * Importance ranking: overdue revisions first, then class notes, then new
 * reading. Completed rows sink to the bottom so the board self-adjusts.
 */
export function rankPlanItems(items: PlanItem[]): PlanItem[] {
  const kindWeight: Record<string, number> = {
    revision: 300,
    notes_revision: 250,
    practice: 180,
    test: 180,
    class: 150,
    live: 150,
    reading: 120,
  };
  const score = (i: PlanItem) => {
    if (i.completed_at) return -1000;
    let s = Number(i.rank_score ?? 0) + (kindWeight[i.session_kind] ?? 100);
    if (i.pinned) s += 2000;
    if (i.next_review_at) {
      const overdueHours = (Date.now() - new Date(i.next_review_at).getTime()) / 3_600_000;
      if (overdueHours > 0) s += Math.min(600, overdueHours * 2);
    }
    s += (i.review_stage ?? 0) * 15;
    return s;
  };
  return [...items].sort((a, b) => score(b) - score(a));
}

/** The active board: never more than {@link PLAN_VISIBLE_LIMIT} live tasks. */
export function visiblePlanItems(items: PlanItem[]): PlanItem[] {
  const live = items.filter((i) => i.status === "pending" || i.completed_at);
  return rankPlanItems(live).slice(0, PLAN_VISIBLE_LIMIT);
}

/** Ask the database to (re)build the plan for a date and return the new rows. */
export async function generatePlan(planDate = localDateKey()): Promise<PlanItem[]> {
  const { error } = await supabase.rpc("refresh_my_study_plan", { p_plan_date: planDate });
  if (error) throw error;
  return fetchPlan(planDate);
}

export async function setPlanItemDone(id: string, done: boolean) {
  const { error } = await supabase
    .from("daily_study_plan_items")
    .update({ completed_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Skip or cancel a task. The database marks it and immediately tops the board
 * back up with the next most important task.
 */
export async function setPlanItemState(id: string, status: PlanItemState) {
  const { error } = await supabase.rpc("set_plan_item_status", {
    _item_id: id,
    _status: status,
  });
  if (error) throw error;
}

export async function schedulePlan(planDate = localDateKey()) {
  const { error } = await supabase.rpc("schedule_my_daily_plan", { p_plan_date: planDate });
  if (error) throw error;
  return fetchPlan(planDate);
}

export type SubjectTarget = {
  id: string;
  subject_id: string;
  daily_minutes: number;
  weekly_minutes: number;
  monthly_minutes: number;
  daily_topics: number;
  weekly_topics: number;
  monthly_topics: number;
  daily_chapters: number;
  weekly_chapters: number;
  monthly_chapters: number;
  daily_questions: number;
  weekly_questions: number;
  monthly_questions: number;
  auto_created: boolean;
};

export async function fetchSubjectTargets(): Promise<SubjectTarget[]> {
  const { error: ensureError } = await supabase.rpc("ensure_my_subject_targets");
  if (ensureError) throw ensureError;
  const { data, error } = await supabase
    .from("subject_targets")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SubjectTarget[];
}

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

/** Minutes already logged today for a plan row, matched by subject + chapter. */
export function planItemMinutes(item: PlanItem, sessions: Session[], since: Date) {
  return sessions
    .filter((s) => {
      if (!s.is_running && !s.ended_at) return false;
      if (new Date(s.started_at) < since) return false;
      if (item.subject_id && s.subject_id !== item.subject_id) return false;
      const sessionKind = s.kind === "live" ? "class" : s.kind === "test" ? "practice" : s.kind;
      const itemKind = item.session_kind === "live" ? "class" : item.session_kind === "test" ? "practice" : item.session_kind;
      if (sessionKind !== itemKind) return false;
      if (item.chapter_name) {
        const target = norm(item.chapter_name);
        if (norm(s.chapter) !== target && norm(s.topic) !== target) return false;
      }
      return true;
    })
    .reduce((a, s) => {
      if (!s.is_running) return a + (s.duration_minutes ?? 0);
      return a + Math.max(0, Math.floor((Date.now() - new Date(s.started_at).getTime()) / 60_000) - (s.break_minutes ?? 0));
    }, 0);
}

export type ChapterPace = {
  chapters_tracked: number;
  chapters_completed: number;
  avg_chapter_minutes: number;
  avg_reading_minutes: number;
  avg_revision_minutes: number;
};

export async function fetchChapterPace(): Promise<ChapterPace> {
  const { data, error } = await supabase.rpc("chapter_pace");
  if (error) throw error;
  const row = data?.[0];
  return {
    chapters_tracked: row?.chapters_tracked ?? 0,
    chapters_completed: row?.chapters_completed ?? 0,
    avg_chapter_minutes: Number(row?.avg_chapter_minutes ?? 0),
    avg_reading_minutes: Number(row?.avg_reading_minutes ?? 0),
    avg_revision_minutes: Number(row?.avg_revision_minutes ?? 0),
  };
}

export function planItemStatus(item: PlanItem, minutes: number): PlanStatus {
  if (item.completed_at || (item.target_minutes > 0 && minutes >= item.target_minutes))
    return "complete";
  return minutes > 0 ? "progress" : "pending";
}

/** A recorded practice/test attempt, used for topic-wise accuracy. */
export type TestAttempt = {
  id: string;
  subject_id: string | null;
  chapter_id: string | null;
  scope: string;
  questions_total: number;
  questions_attempted: number;
  questions_correct: number;
  score: number | null;
  taken_at: string;
};

export async function fetchAttempts(sinceIso?: string): Promise<TestAttempt[]> {
  let q = supabase
    .from("test_attempts")
    .select(
      "id, subject_id, chapter_id, scope, questions_total, questions_attempted, questions_correct, score, taken_at",
    )
    .order("taken_at", { ascending: false });
  if (sinceIso) q = q.gte("taken_at", sinceIso);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TestAttempt[];
}

export type SubjectPerformance = {
  id: string;
  name: string;
  color: string;
  minutes: number;
  targetMinutes: number;
  pct: number;
  topicsTotal: number;
  topicsDone: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
};

/**
 * Real subject-wise performance: minutes vs target, chapters completed and
 * question accuracy from recorded attempts.
 */
export function subjectPerformance(
  subjects: Subject[],
  sessions: Session[],
  attempts: TestAttempt[],
  since: Date,
  targetScale = 1,
): SubjectPerformance[] {
  const done = new Map<string, Set<string>>();
  const mins = new Map<string, number>();

  for (const s of sessions) {
    if (s.is_running || !s.subject_id) continue;
    if (new Date(s.started_at) >= since)
      mins.set(s.subject_id, (mins.get(s.subject_id) ?? 0) + (s.duration_minutes ?? 0));
    const chapter = norm(s.chapter) || norm(s.topic);
    if (!chapter) continue;
    const set = done.get(s.subject_id) ?? new Set<string>();
    set.add(chapter);
    done.set(s.subject_id, set);
  }

  return subjects
    .map((subject) => {
      const rows = attempts.filter((a) => a.subject_id === subject.id);
      const attempted = rows.reduce((a, r) => a + (r.questions_attempted ?? 0), 0);
      const correct = rows.reduce((a, r) => a + (r.questions_correct ?? 0), 0);
      const minutes = mins.get(subject.id) ?? 0;
      const targetMinutes = Math.round(subject.weekly_target_hours * 60 * targetScale);
      const chapters = subject.chapters ?? [];
      const doneSet = done.get(subject.id) ?? new Set<string>();
      return {
        id: subject.id,
        name: subject.name,
        color: subject.color,
        minutes,
        targetMinutes,
        pct: targetMinutes > 0 ? Math.min(100, Math.round((minutes / targetMinutes) * 100)) : 0,
        topicsTotal: chapters.length,
        topicsDone: chapters.filter((c) => doneSet.has(norm(c))).length,
        attempted,
        correct,
        incorrect: Math.max(0, attempted - correct),
        accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}
