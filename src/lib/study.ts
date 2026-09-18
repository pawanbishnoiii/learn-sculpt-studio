import { supabase } from "@/integrations/supabase/client";

export type Subject = {
  id: string;
  name: string;
  color: string;
  weekly_target_hours: number;
  /** Chapter names the student added for this subject. */
  chapters: string[];
};

export type Session = {
  id: string;
  subject_id: string | null;
  subject_name: string | null;
  topic: string | null;
  chapter?: string | null;
  notes: string | null;
  kind: string;
  started_at: string;
  ended_at: string | null;
  planned_end_at: string | null;
  duration_minutes: number | null;
  is_running: boolean;
  auto_closed: boolean;
  break_minutes?: number | null;
};

export type Block = {
  id: string;
  subject_id: string | null;
  title: string;
  kind: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string | null;
  sort_order?: number;
};

export type Target = {
  id: string;
  subject_id: string | null;
  title: string;
  daily_hours: number;
  weekly_hours: number;
  deadline: string | null;
  is_active: boolean;
  /** Chapters of the linked subject this target covers. */
  chapters?: string[];
};

/** Daily newspaper + monthly magazine reading — compulsory habits. */
export type ReadingKind = "newspaper" | "magazine";

export type ReadingLog = {
  id: string;
  kind: ReadingKind;
  log_date: string;
  minutes: number;
  note: string | null;
};

export type Settings = {
  user_id: string;
  auto_stop_hours: number;
  daily_goal_hours: number;
  weekly_goal_hours: number;
  ai_tone: string;
  ai_autopilot: boolean;
  week_starts_monday: boolean;
  widget_layout: unknown;
};

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // monday-first
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function fmtDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

export function localTimeToIsoToday(time: string) {
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h ?? 0, m ?? 0);
  return d.toISOString();
}

export function fmtHours(minutes: number) {
  return (minutes / 60).toFixed(1);
}

/** Always human hour:minute — e.g. 2h 05m, 45m. Never a decimal hour. */
export function fmtHM(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}


async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

function boundedHours(value: number, max: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw new Error(`${label} must be a finite number between 0 and ${max} hours.`);
  }
}

export async function fetchSubjects(): Promise<Subject[]> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("subjects")
    .select("id,name,color,weekly_target_hours,chapters")
    .eq("user_id", user_id)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    weekly_target_hours: row.weekly_target_hours,
    chapters: Array.isArray(row.chapters) ? (row.chapters as string[]) : [],
  }));
}

/** Chapter names are trimmed, de-duplicated (case-insensitive) and capped. */
export function normaliseChapters(list: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const name = raw.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name.slice(0, 120));
    if (out.length >= 200) break;
  }
  return out;
}

export async function createSubject(input: {
  name: string;
  color: string;
  weekly_target_hours: number;
  chapters?: string[];
}) {
  boundedHours(input.weekly_target_hours, 168, "Weekly subject goal");
  const user_id = await uid();
  const { error } = await supabase.from("subjects").insert({
    name: input.name,
    color: input.color,
    weekly_target_hours: input.weekly_target_hours,
    chapters: normaliseChapters(input.chapters ?? []),
    user_id,
  } as any);
  if (error) throw error;
}

/** Replace the chapter list of one subject. */
export async function setSubjectChapters(id: string, chapters: string[]) {
  const { error } = await supabase
    .from("subjects")
    .update({ chapters: normaliseChapters(chapters) } as any)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSubject(id: string) {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchRunningSession(): Promise<Session | null> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", user_id)
    .eq("is_running", true)
    .maybeSingle();
  if (error) throw error;
  return (data as Session) ?? null;
}

export async function fetchSessions(sinceIso?: string): Promise<Session[]> {
  const user_id = await uid();
  let q = supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", user_id)
    .order("started_at", { ascending: false })
    .limit(200);
  if (sinceIso) q = q.gte("started_at", sinceIso);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Session[];
}

export async function startSession(input: {
  subject_id: string | null;
  subject_name: string | null;
  topic: string | null;
  chapter?: string | null;
  kind: string;
  planned_end_at?: string | null;
}): Promise<Session> {
  const user_id = await uid();
  // Return the inserted row so the caller can seed the ["running"] cache
  // immediately — otherwise the timer page can briefly see "no session" and
  // bounce straight back to the setup screen.
  const { data, error } = await supabase
    .from("study_sessions")
    .insert({
      ...input,
      user_id,
      is_running: true,
      started_at: new Date().toISOString(),
    } as any)
    .select("*")
    .single();
  if (error) throw error;
  return data as Session;
}

export async function stopSession(
  id: string,
  startedAt: string,
  patch: { subject_id: string | null; subject_name: string | null; topic: string; notes: string; kind: string },
) {
  const ended = new Date();
  const wallMinutes = Math.max(
    1,
    Math.round((ended.getTime() - new Date(startedAt).getTime()) / 60000),
  );
  // Break rows are stored separately and no migration in this repository
  // accumulates them into study_sessions.duration_minutes.
  const { data: breakRows, error: breakError } = await supabase
    .from("session_breaks")
    .select("duration_minutes")
    .eq("session_id", id);
  if (breakError) throw breakError;
  const breakMinutes = (breakRows ?? []).reduce((sum, row) => sum + (row.duration_minutes ?? 0), 0);
  const minutes = Math.max(1, wallMinutes - breakMinutes);
  const { error } = await supabase
    .from("study_sessions")
    .update({
      ...patch,
      is_running: false,
      ended_at: ended.toISOString(),
      duration_minutes: minutes,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function discardSession(id: string) {
  const { error } = await supabase.from("study_sessions").delete().eq("id", id);
  if (error) throw error;
}

/** Manually log a finished reading / class session with explicit start + exit time. */
export async function createManualSession(input: {
  subject_id: string | null;
  subject_name: string | null;
  topic: string | null;
  notes: string | null;
  kind: string;
  started_at: string;
  ended_at: string;
}) {
  const user_id = await uid();
  const minutes = Math.max(
    1,
    Math.round((new Date(input.ended_at).getTime() - new Date(input.started_at).getTime()) / 60000),
  );
  const { error } = await supabase.from("study_sessions").insert({
    ...input,
    user_id,
    is_running: false,
    duration_minutes: minutes,
  } as any);
  if (error) throw error;
}

/** Manually log a finished break with explicit start + exit time. */
export async function createManualBreak(input: {
  kind: string;
  note: string | null;
  started_at: string;
  ended_at: string;
}) {
  const user_id = await uid();
  const minutes = Math.max(
    1,
    Math.round((new Date(input.ended_at).getTime() - new Date(input.started_at).getTime()) / 60000),
  );
  const { error } = await supabase
    .from("session_breaks")
    .insert({ ...input, user_id, session_id: null, duration_minutes: minutes } as any);
  if (error) throw error;
}


export async function fetchBlocks(): Promise<Block[]> {
  const { data, error } = await supabase
    .from("timetable_blocks")
    .select("*")
    .order("day_of_week")
    .order("sort_order")
    .order("start_time");
  if (error) throw error;
  return (data ?? []) as Block[];
}

/** Returns the timetable block covering the current moment, if any. */
export function currentBlock(blocks: Block[]) {
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);
  return blocks.find(
    (b) => b.day_of_week === now.getDay() && b.start_time.slice(0, 5) <= hhmm && hhmm < b.end_time.slice(0, 5),
  );
}

export async function createBlock(input: Omit<Block, "id">) {
  const user_id = await uid();
  const { error } = await supabase.from("timetable_blocks").insert({ ...input, user_id });
  if (error) throw error;
}

export async function deleteBlock(id: string) {
  const { error } = await supabase.from("timetable_blocks").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchTargets(): Promise<Target[]> {
  const { data, error } = await supabase
    .from("targets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Target[];
}

export async function createTarget(input: {
  title: string;
  subject_id: string | null;
  daily_hours: number;
  weekly_hours: number;
  deadline: string | null;
  chapters?: string[];
}) {
  boundedHours(input.daily_hours, 24, "Daily goal");
  boundedHours(input.weekly_hours, 168, "Weekly goal");
  const user_id = await uid();
  const { error } = await supabase.from("targets").insert({
    ...input,
    chapters: normaliseChapters(input.chapters ?? []),
    user_id,
  } as any);
  if (error) throw error;
}

export async function updateTarget(
  id: string,
  patch: Partial<Pick<Target, "title" | "daily_hours" | "weekly_hours" | "deadline" | "subject_id" | "chapters">>,
) {
  if (patch.daily_hours !== undefined) boundedHours(patch.daily_hours, 24, "Daily goal");
  if (patch.weekly_hours !== undefined) boundedHours(patch.weekly_hours, 168, "Weekly goal");
  const { error } = await supabase.from("targets").update(patch).eq("id", id);
  if (error) throw error;
}

export async function toggleTarget(id: string, is_active: boolean) {
  const { error } = await supabase.from("targets").update({ is_active }).eq("id", id);
  if (error) throw error;
}

export async function deleteTarget(id: string) {
  const { error } = await supabase.from("targets").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchSettings(): Promise<Settings> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user_id)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as Settings;
  const { data: created, error: insErr } = await supabase
    .from("user_settings")
    .insert({ user_id })
    .select("*")
    .single();
  if (insErr) throw insErr;
  return created as Settings;
}

export async function saveSettings(patch: Partial<Settings>) {
  if (patch.daily_goal_hours !== undefined) boundedHours(patch.daily_goal_hours, 24, "Daily goal");
  if (patch.weekly_goal_hours !== undefined) boundedHours(patch.weekly_goal_hours, 168, "Weekly goal");
  const user_id = await uid();
  const { error } = await supabase
    .from("user_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", user_id);
  if (error) throw error;
}

export async function fetchProfile() {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_url,timezone")
    .eq("id", user_id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(patch: { display_name?: string; timezone?: string }) {
  const user_id = await uid();
  const { error } = await supabase.from("profiles").upsert({ id: user_id, ...patch });
  if (error) throw error;
}

/** minutes grouped per weekday index (0=Sun) for the current week */
export function weeklyLoad(sessions: Session[]) {
  const start = startOfWeek();
  const buckets = new Array(7).fill(0) as number[];
  for (const s of sessions) {
    if (s.is_running || !s.duration_minutes) continue;
    const d = new Date(s.started_at);
    if (d < start) continue;
    buckets[d.getDay()] = (buckets[d.getDay()] ?? 0) + s.duration_minutes;
  }
  return buckets;
}

export function minutesInRange(sessions: Session[], since: Date, kind?: string) {
  return sessions.reduce((acc, s) => {
    if (s.is_running || !s.duration_minutes) return acc;
    if (kind && s.kind !== kind) return acc;
    return new Date(s.started_at) >= since ? acc + s.duration_minutes : acc;
  }, 0);
}

/* ---------------- breaks ---------------- */

export type Break = {
  id: string;
  session_id: string | null;
  kind: string;
  note: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
};

export const BREAK_KINDS = ["pause", "sleep", "free", "meal"] as const;

export async function startBreak(session_id: string | null, kind: string, note?: string) {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("session_breaks")
    .insert({ user_id, session_id, kind, note: note ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data as Break;
}

export async function endBreak(id: string, startedAt: string) {
  const minutes = Math.max(
    1,
    Math.round((Date.now() - new Date(startedAt).getTime()) / 60000),
  );
  const { error } = await supabase
    .from("session_breaks")
    .update({ ended_at: new Date().toISOString(), duration_minutes: minutes })
    .eq("id", id);
  if (error) throw error;
  return minutes;
}

export async function fetchBreaks(sinceIso?: string): Promise<Break[]> {
  let q = supabase
    .from("session_breaks")
    .select("id,session_id,kind,note,started_at,ended_at,duration_minutes")
    .order("started_at", { ascending: false })
    .limit(100);
  if (sinceIso) q = q.gte("started_at", sinceIso);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Break[];
}

export async function fetchOpenBreak(): Promise<Break | null> {
  const { data, error } = await supabase
    .from("session_breaks")
    .select("id,session_id,kind,note,started_at,ended_at,duration_minutes")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Break) ?? null;
}

/* ---------------- motivation library ---------------- */

export type Motivation = {
  id: string;
  kind: string;
  title: string;
  body: string;
  author: string | null;
  month: number | null;
};

export async function fetchMotivations(): Promise<Motivation[]> {
  const { data, error } = await supabase
    .from("motivations")
    .select("id,kind,title,body,author,month");
  if (error) throw error;
  return (data ?? []) as Motivation[];
}

/* ---------------- analytics ---------------- */

/** minutes per calendar day, keyed by YYYY-MM-DD */
export function dailyMinutes(sessions: Session[]) {
  const map: Record<string, number> = {};
  for (const s of sessions) {
    if (!s.duration_minutes) continue;
    const d = new Date(s.started_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    map[key] = (map[key] ?? 0) + s.duration_minutes;
  }
  return map;
}

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** last N weeks of study hours vs the weekly goal */
export function weeklyHistory(sessions: Session[], goalHours: number, weeks = 8) {
  const thisWeek = startOfWeek();
  const out: Array<{ label: string; hours: number; goal: number; pct: number }> = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const from = new Date(thisWeek);
    from.setDate(from.getDate() - i * 7);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    let minutes = 0;
    for (const s of sessions) {
      if (!s.duration_minutes) continue;
      const d = new Date(s.started_at);
      if (d >= from && d < to) minutes += s.duration_minutes;
    }
    const hours = +(minutes / 60).toFixed(1);
    out.push({
      label: `${from.getDate()}/${from.getMonth() + 1}`,
      hours,
      goal: goalHours,
      pct: goalHours > 0 ? Math.round((hours / goalHours) * 100) : 0,
    });
  }
  return out;
}

/* ---------------- profile & onboarding ---------------- */

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
  age: number | null;
  phone: string | null;
  avg_study_hours: number;
  onboarded: boolean;
  email?: string | null;
  last_seen_at?: string | null;
  sign_in_count?: number;
  onboarded_at?: string | null;
};


export async function fetchMyProfile(): Promise<Profile | null> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user_id)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

/** Copies Google/OAuth identity data into the profile row if it is missing. */
export async function syncIdentityToProfile() {
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  const patch: Partial<Profile> & { id: string } = { id: u.id };
  const existing = await fetchMyProfile();
  if (!existing?.avatar_url && (meta["avatar_url"] || meta["picture"]))
    patch.avatar_url = (meta["avatar_url"] ?? meta["picture"]) || null;
  if (!existing?.display_name && (meta["full_name"] || meta["name"]))
    patch.display_name = (meta["full_name"] ?? meta["name"]) || null;
  if (!existing?.first_name && meta["given_name"]) patch.first_name = meta["given_name"] || null;
  if (!existing?.last_name && meta["family_name"]) patch.last_name = meta["family_name"] || null;
  if (u.email && existing?.email !== u.email) patch.email = u.email;
  patch.last_seen_at = new Date().toISOString();
  const { data: saved, error } = await supabase
    .from("profiles")
    .upsert(patch, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return saved as Profile;
}

export async function saveOnboarding(input: {
  first_name: string;
  last_name: string;
  gender: string;
  age: number;
  phone: string;
  avg_study_hours: number;
  subjects?: Array<{ name: string; color: string; weekly_target_hours: number }>;
}) {
  const user_id = await uid();
  const { subjects, ...profile } = input;
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user_id,
        ...profile,
        display_name: `${input.first_name} ${input.last_name}`.trim(),
        onboarded: true,
        onboarded_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  if (error) throw error;

  const rows = (subjects ?? [])
    .filter((s) => s.name.trim())
    .map((s) => ({
      user_id,
      name: s.name.trim(),
      color: s.color,
      weekly_target_hours: Number(s.weekly_target_hours) || 0,
    }));
  if (rows.length) {
    const { error: subErr } = await supabase.from("subjects").insert(rows);
    if (subErr) throw subErr;
  }
}


export async function isAdmin() {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user_id)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return !!data;
}

/* ---------------- timetable ordering ---------------- */

export async function reorderBlocks(ids: string[]) {
  await Promise.all(
    ids.map((id, i) => supabase.from("timetable_blocks").update({ sort_order: i }).eq("id", id)),
  );
}

/* ---------------- hourly analytics ---------------- */

/** minutes studied per hour (0-23) for one calendar day */
export function hourlyHeat(sessions: Session[], date = new Date()) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const hours = new Array(24).fill(0) as number[];
  for (const s of sessions) {
    const startMs = new Date(s.started_at).getTime();
    const endMs = s.ended_at
      ? new Date(s.ended_at).getTime()
      : startMs + (s.duration_minutes ?? 0) * 60000;
    for (let h = 0; h < 24; h++) {
      const cellStart = dayStart.getTime() + h * 3600_000;
      const cellEnd = cellStart + 3600_000;
      const overlap = Math.min(endMs, cellEnd) - Math.max(startMs, cellStart);
      if (overlap > 0) hours[h] = (hours[h] ?? 0) + Math.round(overlap / 60000);
    }
  }
  return hours;
}

export type SubjectProgress = {
  id: string | null;
  name: string;
  color: string;
  sessions: number;
  minutes: number;
  targetHours: number;
  pct: number;
  remainingHours: number;
};

/** per-subject session count + weekly target progress */
export function subjectProgress(
  sessions: Session[],
  subjects: Subject[],
  since = startOfWeek(),
  /** weekly target is scaled to the selected scope: 1/7 for a day, 1 for a week, ~4.345 for a month */
  targetScale = 1,
): SubjectProgress[] {
  const map = new Map<string, SubjectProgress>();
  for (const s of subjects) {
    map.set(s.id, {
      id: s.id,
      name: s.name,
      color: s.color,
      sessions: 0,
      minutes: 0,
      targetHours: +(((s.weekly_target_hours ?? 0) * targetScale).toFixed(2)),
      pct: 0,
      remainingHours: +(((s.weekly_target_hours ?? 0) * targetScale).toFixed(2)),
    });
  }
  for (const s of sessions) {
    if (s.is_running || !s.duration_minutes) continue;
    if (new Date(s.started_at) < since) continue;
    const key = s.subject_id ?? `name:${s.subject_name ?? "Other"}`;
    let row = map.get(key);
    if (!row) {
      row = {
        id: s.subject_id,
        name: s.subject_name ?? "Other",
        color: "#8b8b8b",
        sessions: 0,
        minutes: 0,
        targetHours: 0,
        pct: 0,
        remainingHours: 0,
      };
      map.set(key, row);
    }
    row.sessions += 1;
    row.minutes += s.duration_minutes;
  }
  return [...map.values()]
    .map((r) => {
      const done = r.minutes / 60;
      const pct = r.targetHours > 0 ? Math.min(100, Math.round((done / r.targetHours) * 100)) : 0;
      return { ...r, pct, remainingHours: Math.max(0, r.targetHours - done) };
    })
    .sort((a, b) => b.minutes - a.minutes);
}

/* ---------------- editing helpers (admin / history) ---------------- */

export async function updateSubject(
  id: string,
  patch: Partial<Pick<Subject, "name" | "color" | "weekly_target_hours">>,
) {
  if (patch.weekly_target_hours !== undefined) boundedHours(patch.weekly_target_hours, 168, "Weekly subject goal");
  const { error } = await supabase.from("subjects").update(patch).eq("id", id);
  if (error) throw error;
}

export async function updateBlock(
  id: string,
  patch: Partial<Pick<Block, "title" | "kind" | "day_of_week" | "start_time" | "end_time" | "location" | "subject_id">>,
) {
  const { error } = await supabase.from("timetable_blocks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function updateSession(
  id: string,
  patch: Partial<Pick<Session, "subject_name" | "topic" | "notes" | "kind" | "duration_minutes">>,
) {
  const { error } = await supabase.from("study_sessions").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteSession(id: string) {
  const { error } = await supabase.from("study_sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function updateBreak(
  id: string,
  patch: Partial<Pick<Break, "kind" | "note" | "duration_minutes">>,
) {
  const { error } = await supabase.from("session_breaks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteBreak(id: string) {
  const { error } = await supabase.from("session_breaks").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- site settings (admin) ---------------- */

export type AppSettings = {
  site_name: string;
  tagline: string;
  support_email: string | null;
  banner_text: string | null;
  ai_enabled: boolean;
  manual_log_enabled: boolean;
  landing_enabled: boolean;
  maintenance_note: string | null;
  signup_enabled: boolean;
  google_auth_enabled: boolean;
  one_tap_enabled: boolean;
  email_auth_enabled: boolean;
  onboarding_require_subjects: boolean;
  default_daily_goal_hours: number;
  default_weekly_goal_hours: number;
  announcement_level: string;
  accent_color: string;
  favicon_url: string | null;
  logo_url: string | null;
};

const APP_SETTINGS_COLS =
  "site_name,tagline,support_email,banner_text,ai_enabled,manual_log_enabled,landing_enabled,maintenance_note,signup_enabled,google_auth_enabled,one_tap_enabled,email_auth_enabled,onboarding_require_subjects,default_daily_goal_hours,default_weekly_goal_hours,announcement_level,accent_color,favicon_url,logo_url";

export async function fetchAppSettings(): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select(APP_SETTINGS_COLS)
    .maybeSingle();
  if (error) throw error;
  return (data as AppSettings) ?? null;
}


export async function updateAppSettings(patch: Partial<AppSettings>) {
  const { error } = await supabase.from("app_settings").update(patch).eq("id", true);
  if (error) throw error;
}

/** last N months of study hours vs a monthly goal derived from the weekly goal */
export function monthlyHistory(sessions: Session[], weeklyGoalHours: number, months = 6) {
  const now = new Date();
  const out: Array<{ label: string; hours: number; goal: number; pct: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    let minutes = 0;
    for (const s of sessions) {
      if (!s.duration_minutes) continue;
      const d = new Date(s.started_at);
      if (d >= from && d < to) minutes += s.duration_minutes;
    }
    const daysInMonth = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
    const goal = +((weeklyGoalHours / 7) * daysInMonth).toFixed(1);
    const hours = +(minutes / 60).toFixed(1);
    out.push({
      label: from.toLocaleDateString(undefined, { month: "short" }),
      hours,
      goal,
      pct: goal > 0 ? Math.round((hours / goal) * 100) : 0,
    });
  }
  return out;
}

/* ---------------- usage telemetry + admin insights ---------------- */

export async function touchLastSeen() {
  const { error } = await supabase.rpc("touch_last_seen");
  if (error) throw error;
}

export async function logEvent(event: string, path?: string, metadata: Record<string, unknown> = {}) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;
  await supabase.from("app_events").insert({
    user_id: user.id,
    event,
    path: path ?? null,
    metadata: metadata as never,
  });
}

export type AdminOverview = {
  total_users: number;
  onboarded_users: number;
  active_today: number;
  active_week: number;
  sessions_today: number;
  minutes_today: number;
  minutes_week: number;
  total_subjects: number;
  events_today: number;
};

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const { data, error } = await supabase.rpc("admin_overview");
  if (error) throw error;
  return data as unknown as AdminOverview;
}

export type AdminUser = {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  onboarded: boolean;
  last_seen_at: string | null;
  created_at: string;
  total_minutes: number;
  session_count: number;
};

export async function fetchAdminUsers(limit = 100): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc("admin_users", { _limit: limit });
  if (error) throw error;
  return (data ?? []) as unknown as AdminUser[];
}

/** "2m ago", "5h ago", "3d ago" — for admin last-seen columns */
export function relativeTime(iso: string | null | undefined) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export type UserXp = { total_xp: number; level: number; streak: number; best_streak: number; last_streak_at: string | null };

/** Level + XP + streak for the signed-in user (dashboard header chips). */
export async function fetchXp(): Promise<UserXp> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { total_xp: 0, level: 1, streak: 0, best_streak: 0, last_streak_at: null };
  const { data, error } = await supabase
    .from("user_xp")
    .select("total_xp, level, streak, best_streak, last_streak_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return {
    total_xp: data?.total_xp ?? 0,
    level: data?.level ?? 1,
    streak: data?.streak ?? 0,
    best_streak: data?.best_streak ?? 0,
    last_streak_at: data?.last_streak_at ?? null,
  };
}


/* ---------------- target progress ---------------- */

export type TargetProgress = {
  todayMinutes: number;
  weekMinutes: number;
  dailyPct: number;
  weeklyPct: number;
};

/**
 * Real progress for one target, derived from completed sessions. A target that
 * names a subject only counts sessions for that subject; otherwise all study
 * time counts.
 */
export function targetProgress(target: Target, sessions: Session[]): TargetProgress {
  const dayStart = startOfToday();
  const weekStart = startOfWeek();
  let todayMinutes = 0;
  let weekMinutes = 0;
  for (const s of sessions) {
    if (s.is_running || !s.duration_minutes) continue;
    if (target.subject_id && s.subject_id !== target.subject_id) continue;
    const at = new Date(s.started_at);
    if (at >= weekStart) weekMinutes += s.duration_minutes;
    if (at >= dayStart) todayMinutes += s.duration_minutes;
  }
  const dailyPct =
    target.daily_hours > 0 ? Math.min(100, Math.round((todayMinutes / (target.daily_hours * 60)) * 100)) : 0;
  const weeklyPct =
    target.weekly_hours > 0 ? Math.min(100, Math.round((weekMinutes / (target.weekly_hours * 60)) * 100)) : 0;
  return { todayMinutes, weekMinutes, dailyPct, weeklyPct };
}

/* ---------------- admin: push + notifications ---------------- */

export type PushStats = {
  devices: number;
  subscribers: number;
  total_users: number;
  web: number;
  android: number;
  sent_today: number;
};

export async function fetchPushStats(): Promise<PushStats> {
  const { data, error } = await supabase.rpc("admin_push_stats");
  if (error) throw error;
  return data as unknown as PushStats;
}

export type PushSubscriber = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  platforms: string | null;
  devices: number;
  last_seen_at: string | null;
};

export async function fetchPushSubscribers(limit = 200): Promise<PushSubscriber[]> {
  const { data, error } = await supabase.rpc("admin_push_subscribers", { _limit: limit });
  if (error) throw error;
  return (data ?? []) as unknown as PushSubscriber[];
}

export type NotificationSend = {
  title: string;
  body: string | null;
  kind: string | null;
  image_url: string | null;
  action_path: string | null;
  audience: string | null;
  recipients: number;
  read_count: number;
  sent_at: string;
};

export async function fetchNotificationHistory(limit = 50): Promise<NotificationSend[]> {
  const { data, error } = await supabase.rpc("admin_notification_history", { _limit: limit });
  if (error) throw error;
  return (data ?? []) as unknown as NotificationSend[];
}

export async function setUserRole(userId: string, role: "admin" | "moderator" | "user") {
  const { error } = await supabase.rpc("admin_set_role", { _user_id: userId, _role: role });
  if (error) throw error;
}

/**
 * Uploads a brand image (logo, favicon, notification banner) to the private
 * `brand` bucket and returns a long-lived signed URL.
 */
export async function uploadBrandImage(file: File, folder: "banners" | "logo" | "favicon") {
  return uploadBrandImageWithProgress(file, folder);
}

const BRAND_SIGN_TTL = 60 * 60 * 24 * 3650;

function brandPath(file: File, folder: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  return `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

/**
 * Uploads via XHR (instead of supabase-js) so the caller can render a real
 * byte-level progress bar; supabase-js gives no upload progress events.
 */
export async function uploadBrandImageWithProgress(
  file: File,
  folder: "banners" | "logo" | "favicon",
  onProgress?: (percent: number) => void,
) {
  const path = brandPath(file, folder);
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const apikey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!url || !token) {
    // Fall back to the plain SDK path (no progress) if we cannot reach REST.
    const { error } = await supabase.storage.from("brand").upload(path, file, {
      cacheControl: "31536000",
    });
    if (error) throw error;
  } else {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${url}/storage/v1/object/brand/${path}`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("apikey", apikey ?? "");
      xhr.setRequestHeader("x-upsert", "false");
      xhr.setRequestHeader("cache-control", "31536000");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`Upload failed (${xhr.status})`));
      xhr.onerror = () => reject(new Error("Upload failed — network issue"));
      xhr.send(file);
    });
  }

  onProgress?.(100);
  const { data, error: signError } = await supabase.storage
    .from("brand")
    .createSignedUrl(path, BRAND_SIGN_TTL);
  if (signError) throw signError;
  return data.signedUrl;
}

export type BrandImage = { path: string; name: string; url: string; created_at: string | null };

/** Lists previously uploaded images in a brand folder, newest first. */
export async function listBrandImages(
  folder: "banners" | "logo" | "favicon",
  limit = 60,
): Promise<BrandImage[]> {
  const { data, error } = await supabase.storage.from("brand").list(folder, {
    limit,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw error;
  const files = (data ?? []).filter((f) => f.id);
  if (files.length === 0) return [];
  const paths = files.map((f) => `${folder}/${f.name}`);
  const { data: signed, error: signError } = await supabase.storage
    .from("brand")
    .createSignedUrls(paths, BRAND_SIGN_TTL);
  if (signError) throw signError;
  return files.map((f, i) => ({
    path: paths[i]!,
    name: f.name,
    url: signed?.[i]?.signedUrl ?? "",
    created_at: (f.created_at as string | null) ?? null,
  }));
}

/** Removes an image from the brand bucket (admin only, enforced by storage RLS). */
export async function deleteBrandImage(path: string) {
  const { error } = await supabase.storage.from("brand").remove([path]);
  if (error) throw error;
}


/* ---------------- in-app notification inbox ---------------- */

export type InboxItem = {
  id: string;
  title: string;
  body: string | null;
  kind: string | null;
  image_url: string | null;
  action_path: string | null;
  read: boolean | null;
  created_at: string | null;
};

/** Notifications addressed to the signed-in user, newest first. */
export async function fetchInbox(limit = 40): Promise<InboxItem[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("id,title,body,kind,image_url,action_path,read,created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as InboxItem[];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", uid)
    .or("read.is.null,read.eq.false");
  if (error) throw error;
}

/* ---------------- admin: scheduled broadcasts ---------------- */

export type ScheduledNotification = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  action_path: string | null;
  audience: string;
  send_at: string;
  status: string;
  error: string | null;
};

export async function fetchScheduledNotifications(): Promise<ScheduledNotification[]> {
  const { data, error } = await supabase
    .from("scheduled_notifications")
    .select("id,title,body,image_url,action_path,audience,send_at,status,error")
    .order("send_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ScheduledNotification[];
}

export async function scheduleNotification(input: {
  title: string;
  body: string;
  audience: string;
  sendAt: string;
  actionPath?: string;
  imageUrl?: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("scheduled_notifications").insert({
    title: input.title,
    body: input.body,
    audience: input.audience,
    send_at: new Date(input.sendAt).toISOString(),
    action_path: input.actionPath || null,
    image_url: input.imageUrl || null,
    created_by: auth.user?.id ?? null,
  });
  if (error) throw error;
}

export async function cancelScheduledNotification(id: string) {
  const { error } = await supabase.from("scheduled_notifications").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- compulsory reading (daily paper + monthly magazine) ---------------- */

export const READING_TASKS: {
  kind: ReadingKind;
  label: string;
  emoji: string;
  hint: string;
  minutes: number;
  /** Quick-add chips, like chapters inside a subject. */
  steps: number[];
}[] = [
  {
    kind: "newspaper",
    label: "Daily newspaper",
    emoji: "\u{1F4F0}",
    hint: "Roz current affairs",
    minutes: 15,
    steps: [5, 10, 15, 30],
  },
  {
    kind: "magazine",
    label: "Monthly magazine",
    emoji: "\u{1F4DA}",
    hint: "Mahine me ek magazine",
    minutes: 45,
    steps: [15, 30, 45],
  },
];

/** Reading behaves like a subject: it has its own daily / monthly target. */
export type ReadingGoals = {
  newspaper_daily_minutes: number;
  magazine_monthly_minutes: number;
};

export const DEFAULT_READING_GOALS: ReadingGoals = {
  newspaper_daily_minutes: 15,
  magazine_monthly_minutes: 45,
};

function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function fetchReadingGoals(): Promise<ReadingGoals> {
  const user_id = await uid();
  const { data, error } = await supabase
    .from("reading_goals")
    .select("newspaper_daily_minutes,magazine_monthly_minutes")
    .eq("user_id", user_id)
    .maybeSingle();
  if (error) throw error;
  return (data as ReadingGoals) ?? DEFAULT_READING_GOALS;
}

export async function saveReadingGoals(patch: Partial<ReadingGoals>) {
  const user_id = await uid();
  const { error } = await supabase
    .from("reading_goals")
    .upsert({ user_id, ...DEFAULT_READING_GOALS, ...patch } as any, { onConflict: "user_id" });
  if (error) throw error;
}

/** Reading entries for the last ~90 days. */
export async function fetchReadingLogs(): Promise<ReadingLog[]> {
  const user_id = await uid();
  const since = isoDate(new Date(Date.now() - 90 * 864e5));
  const { data, error } = await supabase
    .from("reading_logs")
    .select("id,kind,log_date,minutes,note")
    .eq("user_id", user_id)
    .gte("log_date", since)
    .order("log_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReadingLog[];
}

/**
 * Add reading minutes for today. The day is decided in the database from the
 * student's own timezone, so entries stop jumping to the next day before
 * their local midnight.
 */
export async function logReading(kind: ReadingKind, minutes = 15) {
  const { error } = await (supabase.rpc as any)("log_reading", { _kind: kind, _minutes: minutes });
  if (error) throw error;
}

export async function undoReading(kind: ReadingKind) {
  const { error } = await (supabase.rpc as any)("undo_reading", { _kind: kind });
  if (error) throw error;
}

export type ReadingStatus = {
  newspaperToday: boolean;
  newspaperTodayMinutes: number;
  newspaperPct: number;
  newspaperStreak: number;
  magazineThisMonth: boolean;
  magazineMinutes: number;
  magazinePct: number;
  weekMinutes: number;
  /** Last 7 days newspaper dots, oldest → today. */
  week: { key: string; label: string; done: boolean; today: boolean; minutes: number }[];
};

const READ_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/** Derived state for the compulsory reading card — presentation only. */
export function readingStatus(logs: ReadingLog[], goals: ReadingGoals = DEFAULT_READING_GOALS): ReadingStatus {
  const paper = new Map<string, number>();
  for (const l of logs) {
    if (l.kind !== "newspaper") continue;
    const k = l.log_date.slice(0, 10);
    paper.set(k, (paper.get(k) ?? 0) + (l.minutes ?? 0));
  }
  const today = isoDate();
  const month = today.slice(0, 7);
  const magazines = logs.filter((l) => l.kind === "magazine" && l.log_date.startsWith(month));

  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = isoDate(d);
    if (paper.has(k)) streak++;
    else if (i > 0) break;
  }

  const week: ReadingStatus["week"] = [];
  let weekMinutes = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = isoDate(d);
    const minutes = paper.get(k) ?? 0;
    weekMinutes += minutes;
    week.push({ key: k, label: READ_LABELS[d.getDay()] ?? "", done: minutes > 0, today: i === 0, minutes });
  }

  const todayMinutes = paper.get(today) ?? 0;
  const magazineMinutes = magazines.reduce((s, l) => s + (l.minutes ?? 0), 0);
  const dailyGoal = Math.max(1, goals.newspaper_daily_minutes);
  const monthlyGoal = Math.max(1, goals.magazine_monthly_minutes);

  return {
    newspaperToday: todayMinutes > 0,
    newspaperTodayMinutes: todayMinutes,
    newspaperPct: Math.min(100, Math.round((todayMinutes / dailyGoal) * 100)),
    newspaperStreak: streak,
    magazineThisMonth: magazineMinutes > 0,
    magazineMinutes,
    magazinePct: Math.min(100, Math.round((magazineMinutes / monthlyGoal) * 100)),
    weekMinutes,
    week,
  };
}

/* ---------------- smart auto schedule ---------------- */

/**
 * Turns the last two weeks of real study time into daily + weekly targets for
 * every subject the student has. Runs in the database so the maths always sees
 * complete history.
 */
export async function autoScheduleTargets(): Promise<number> {
  const { data, error } = await (supabase.rpc as any)("auto_schedule_targets");
  if (error) throw error;
  return Number(data ?? 0);
}

/* ---------------- analytics ---------------- */

export type AnalyticsFilter = "all" | "reading" | "class" | "other";

export const ANALYTICS_FILTERS: { k: AnalyticsFilter; l: string }[] = [
  { k: "all", l: "Everything" },
  { k: "reading", l: "Reading only" },
  { k: "class", l: "Class only" },
  { k: "other", l: "Other" },
];

export function matchesFilter(kind: string, filter: AnalyticsFilter) {
  if (filter === "all") return true;
  if (filter === "reading") return kind === "reading" || kind === "revision";
  if (filter === "class") return kind === "class";
  return kind !== "reading" && kind !== "revision" && kind !== "class";
}

export type ChartPoint = { label: string; value: number };

/** Minutes per local day for the last `days` days, oldest → today. */
export function dailyTrend(sessions: Session[], days = 14, filter: AnalyticsFilter = "all"): ChartPoint[] {
  const buckets = new Map<string, number>();
  for (const s of sessions) {
    if (s.is_running || !s.duration_minutes) continue;
    if (!matchesFilter(s.kind, filter)) continue;
    const k = isoDate(new Date(s.started_at));
    buckets.set(k, (buckets.get(k) ?? 0) + s.duration_minutes);
  }
  const out: ChartPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = isoDate(d);
    out.push({ label: String(d.getDate()), value: buckets.get(k) ?? 0 });
  }
  return out;
}

/** Minutes per week for the last `weeks` weeks (monday-first), oldest → now. */
export function weeklyTrend(sessions: Session[], weeks = 8, filter: AnalyticsFilter = "all"): ChartPoint[] {
  const out: ChartPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const from = startOfWeek(new Date(Date.now() - i * 7 * 864e5));
    const to = new Date(from.getTime() + 7 * 864e5);
    let value = 0;
    for (const s of sessions) {
      if (s.is_running || !s.duration_minutes) continue;
      if (!matchesFilter(s.kind, filter)) continue;
      const d = new Date(s.started_at);
      if (d >= from && d < to) value += s.duration_minutes;
    }
    out.push({ label: i === 0 ? "This wk" : `${from.getDate()}/${from.getMonth() + 1}`, value });
  }
  return out;
}

/** Minutes per calendar month for the last `months` months, oldest → now. */
export function monthlyTrend(sessions: Session[], months = 6, filter: AnalyticsFilter = "all"): ChartPoint[] {
  const buckets = new Map<string, number>();
  for (const s of sessions) {
    if (s.is_running || !s.duration_minutes) continue;
    if (!matchesFilter(s.kind, filter)) continue;
    const k = isoDate(new Date(s.started_at)).slice(0, 7);
    buckets.set(k, (buckets.get(k) ?? 0) + s.duration_minutes);
  }
  const out: ChartPoint[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({
      label: d.toLocaleDateString(undefined, { month: "short" }),
      value: buckets.get(k) ?? 0,
    });
  }
  return out;
}

/** Minutes per category for the given window. */
export function categorySplit(sessions: Session[], since: Date): ChartPoint[] {
  const map = new Map<string, number>();
  for (const s of sessions) {
    if (s.is_running || !s.duration_minutes) continue;
    if (new Date(s.started_at) < since) continue;
    map.set(s.kind, (map.get(s.kind) ?? 0) + s.duration_minutes);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}
