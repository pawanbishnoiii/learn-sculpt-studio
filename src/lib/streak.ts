import { dailyMinutes, type Session } from "@/lib/study";

function key(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Even with no goal set, three focused hours keeps the flame alive. */
const MIN_STREAK_MINUTES = 180;

/** A half-goal day keeps the flame smouldering instead of resetting to zero. */
const SAVE_RATIO = 0.5;

export type StreakInfo = {
  /** Consecutive qualifying days ending today (or yesterday if today is unfinished). */
  current: number;
  /** Longest run ever recorded in the loaded history. */
  best: number;
  /** Minutes studied today. */
  todayMinutes: number;
  /** Goal in minutes used for the streak test. */
  goalMinutes: number;
  /** Today already counts towards the streak. */
  todayDone: boolean;
  /** Half the goal is done — one more push locks the day in. */
  halfway: boolean;
  /** Streak alive but today still unfinished and the day is running out. */
  atRisk: boolean;
  /** Minutes still needed today. */
  remaining: number;
  /** Last 7 days (oldest → today) with their state, for the dot row. */
  week: { key: string; label: string; minutes: number; done: boolean; partial: boolean; today: boolean }[];
  /** Next milestone (7 / 14 / 30 / 60 / 100 …) and progress towards it. */
  milestone: number;
  milestonePct: number;
  shieldActive: boolean;
  shieldDaysLeft: number;
  weightedProgress: number;
};

const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];
const LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function goalFor(dailyGoalHours: number) {
  return dailyGoalHours > 0 ? Math.round(dailyGoalHours * 60) : MIN_STREAK_MINUTES;
}

/**
 * Consecutive days (ending today or yesterday) where the daily goal was hit.
 * Kept for callers that only need the number.
 */
export function dailyHitStreak(sessions: Session[], dailyGoalHours: number) {
  return studyStreak(sessions, dailyGoalHours).current;
}

/**
 * Full streak model: current run, personal best, today's state and the
 * seven-day dot row. Presentation-only — reads sessions already in the cache.
 */
export function studyStreak(sessions: Session[], dailyGoalHours: number): StreakInfo {
  const perDay = dailyMinutes(sessions);
  const progressByDay: Record<string, number> = {};
  for (const session of sessions) {
    if (session.is_running || !session.duration_minutes) continue;
    const rate = session.kind === "revision" ? 25 : session.kind === "class" ? 15 : 20;
    const day = key(new Date(session.started_at));
    progressByDay[day] = Math.min(100, (progressByDay[day] ?? 0) + (session.duration_minutes / 60) * rate);
  }
  const goal = goalFor(dailyGoalHours);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMinutes = perDay[key(today)] ?? 0;
  const weightedProgress = Math.min(100, Math.round(progressByDay[key(today)] ?? 0));
  const todayDone = weightedProgress >= 100;

  // Current run — today counts when finished, otherwise start at yesterday.
  const cursor = new Date(today);
  if (!todayDone) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  let shieldDays = 0;
  let shieldWeek = "";
  while (current < 400) {
    const day = key(cursor);
    const done = (progressByDay[day] ?? 0) >= 100;
    const weekStart = new Date(cursor);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekKey = key(weekStart);
    if (done) {
      current += 1;
      shieldDays = 0;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (shieldDays < 3 && (!shieldWeek || shieldWeek === weekKey)) {
      shieldDays += 1;
      shieldWeek = weekKey;
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }

  // Personal best across everything we loaded.
  const days = Object.keys(perDay).sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    if ((progressByDay[d] ?? 0) < 100) {
      run = 0;
      prev = Date.parse(d);
      continue;
    }
    const ts = Date.parse(d);
    run = prev !== null && ts - prev === 864e5 ? run + 1 : 1;
    prev = ts;
    if (run > best) best = run;
  }
  best = Math.max(best, current);

  const week: StreakInfo["week"] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const minutes = perDay[key(d)] ?? 0;
    week.push({
      key: key(d),
      label: LABELS[d.getDay()] ?? "",
      minutes,
      done: (progressByDay[key(d)] ?? 0) >= 100,
      partial: (progressByDay[key(d)] ?? 0) > 0 && (progressByDay[key(d)] ?? 0) < 100,
      today: i === 0,
    });
  }

  const milestone = MILESTONES.find((m) => m > current) ?? current + 100;
  const hour = new Date().getHours();

  return {
    current,
    best,
    todayMinutes,
    goalMinutes: goal,
    todayDone,
    halfway: !todayDone && todayMinutes >= goal * SAVE_RATIO,
    atRisk: current > 0 && !todayDone && hour >= 18,
    remaining: Math.max(0, goal - todayMinutes),
    week,
    milestone,
    milestonePct: milestone > 0 ? Math.min(100, Math.round((current / milestone) * 100)) : 0,
    shieldActive: shieldDays > 0,
    shieldDaysLeft: Math.max(0, 3 - shieldDays),
    weightedProgress,
  };
}
