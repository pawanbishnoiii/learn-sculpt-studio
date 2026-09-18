import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ------------------------------------------------------------------ *
 * Shared admin guard: verified through the caller's own session
 * (RLS-scoped), privileged reads then use the admin client.
 * ------------------------------------------------------------------ */

type AdminContext = { supabase: SupabaseClient; userId: string };

async function requireAdmin(context: AdminContext) {
  const { data: admin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!admin) throw new Error("Forbidden");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const dayStartIso = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
};

/** Tables exported / imported for one account (every one has a user_id column). */
const EXPORT_TABLES = [
  "user_settings",
  "user_xp",
  "subjects",
  "subject_targets",
  "chapter_learning_state",
  "study_sessions",
  "session_breaks",
  "session_outcomes",
  "targets",
  "timetable_blocks",
  "reading_goals",
  "reading_logs",
  "online_classes",
  "daily_study_plan_items",
  "test_attempts",
  "notifications",
  "device_tokens",
  "ai_messages",
  "app_events",
] as const;

/* ------------------------------------------------------------------ *
 * Overview
 * ------------------------------------------------------------------ */

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

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const since = dayStartIso();
    const week = new Date(Date.now() - 7 * 864e5).toISOString();

    const [profiles, sessions, subjects, events] = await Promise.all([
      db.from("profiles").select("id,onboarded,last_seen_at"),
      db
        .from("study_sessions")
        .select("started_at,duration_minutes,is_running")
        .gte("started_at", week),
      db.from("subjects").select("id", { count: "exact", head: true }),
      db.from("app_events").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);

    const rows = profiles.data ?? [];
    const sRows = (sessions.data ?? []).filter((s) => !s.is_running);
    const todayRows = sRows.filter((s) => s.started_at >= since);

    return {
      total_users: rows.length,
      onboarded_users: rows.filter((r) => r.onboarded).length,
      active_today: rows.filter((r) => r.last_seen_at && r.last_seen_at >= since).length,
      active_week: rows.filter((r) => r.last_seen_at && r.last_seen_at >= week).length,
      sessions_today: todayRows.length,
      minutes_today: todayRows.reduce((a, s) => a + (s.duration_minutes ?? 0), 0),
      minutes_week: sRows.reduce((a, s) => a + (s.duration_minutes ?? 0), 0),
      total_subjects: subjects.count ?? 0,
      events_today: events.count ?? 0,
    } satisfies AdminOverview;
  });

/* ------------------------------------------------------------------ *
 * Users
 * ------------------------------------------------------------------ */

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

export const adminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ limit: z.number().int().min(1).max(500) }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);

    const [{ data: profiles }, { data: sessions }] = await Promise.all([
      db.from("profiles").select("*").order("created_at", { ascending: true }).limit(data.limit),
      db.from("study_sessions").select("user_id,duration_minutes,is_running"),
    ]);

    const stats = new Map<string, { minutes: number; count: number }>();
    for (const s of sessions ?? []) {
      if (s.is_running) continue;
      const row = stats.get(s.user_id) ?? { minutes: 0, count: 0 };
      row.minutes += s.duration_minutes ?? 0;
      row.count += 1;
      stats.set(s.user_id, row);
    }

    return (profiles ?? []).map<AdminUser>((p) => ({
      id: p.id,
      display_name: p.display_name ?? null,
      email: p.email ?? null,
      avatar_url: p.avatar_url ?? null,
      onboarded: !!p.onboarded,
      last_seen_at: p.last_seen_at ?? null,
      created_at: p.created_at,
      total_minutes: stats.get(p.id)?.minutes ?? 0,
      session_count: stats.get(p.id)?.count ?? 0,
    }));
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({ userId: z.string().uuid(), role: z.enum(["admin", "moderator", "user"]) })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    await db.from("user_roles").delete().eq("user_id", data.userId);
    if (data.role !== "user") {
      const { error } = await db
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * Push + notification history
 * ------------------------------------------------------------------ */

export type PushStats = {
  devices: number;
  subscribers: number;
  total_users: number;
  web: number;
  android: number;
  sent_today: number;
};

export const pushStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const since = dayStartIso();

    const [tokens, profiles, notifications] = await Promise.all([
      db.from("device_tokens").select("user_id,platform"),
      db.from("profiles").select("id", { count: "exact", head: true }),
      db.from("notifications").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);

    const rows = tokens.data ?? [];
    const platform = (p: string | null | undefined) =>
      p === "android" ? "android" : p === "web" ? "web" : "other";

    return {
      devices: rows.length,
      subscribers: new Set(rows.map((r) => r.user_id)).size,
      total_users: profiles.count ?? 0,
      web: rows.filter((r) => platform(r.platform) === "web").length,
      android: rows.filter((r) => platform(r.platform) === "android").length,
      sent_today: notifications.count ?? 0,
    } satisfies PushStats;
  });

export type PushSubscriber = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  platforms: string | null;
  devices: number;
  last_seen_at: string | null;
};

export const pushSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ limit: z.number().int().min(1).max(500) }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);

    const [{ data: tokens }, { data: profiles }] = await Promise.all([
      db.from("device_tokens").select("user_id,platform"),
      db.from("profiles").select("id,display_name,email,avatar_url,last_seen_at"),
    ]);

    const byUser = new Map<string, Set<string>>();
    for (const t of tokens ?? []) {
      const set = byUser.get(t.user_id) ?? new Set<string>();
      set.add(t.platform === "android" ? "android" : "web");
      byUser.set(t.user_id, set);
    }

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return [...byUser.entries()]
      .map<PushSubscriber>(([userId, platforms]) => {
        const p = profileMap.get(userId);
        return {
          user_id: userId,
          display_name: p?.display_name ?? null,
          email: p?.email ?? null,
          avatar_url: p?.avatar_url ?? null,
          platforms: [...platforms].join(", "),
          devices: platforms.size,
          last_seen_at: p?.last_seen_at ?? null,
        };
      })
      .sort((a, b) => b.devices - a.devices)
      .slice(0, data.limit);
  });

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

export const notificationHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ limit: z.number().int().min(1).max(200) }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { data: rows } = await db
      .from("notifications")
      .select("title,body,kind,image_url,action_path,audience,read,created_at")
      .order("created_at", { ascending: false })
      .limit(2000);

    // One broadcast fans out to many rows; group them back into single sends.
    const groups = new Map<string, NotificationSend & { recipients: number; read_count: number }>();
    for (const r of rows ?? []) {
      const minute = r.created_at.slice(0, 16);
      const key = `${minute}|${r.audience ?? "all"}|${r.title}`;
      const existing = groups.get(key);
      if (existing) {
        existing.recipients += 1;
        if (r.read) existing.read_count += 1;
        continue;
      }
      groups.set(key, {
        title: r.title,
        body: r.body ?? null,
        kind: r.kind ?? null,
        image_url: r.image_url ?? null,
        action_path: r.action_path ?? null,
        audience: r.audience ?? null,
        recipients: 1,
        read_count: r.read ? 1 : 0,
        sent_at: r.created_at,
      });
      if (groups.size >= data.limit) break;
    }
    return [...groups.values()].slice(0, data.limit);
  });

/* ------------------------------------------------------------------ *
 * Email settings (single-row config)
 * ------------------------------------------------------------------ */

export type EmailSettingsRow = {
  provider: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password: string | null;
  from_email: string | null;
  from_name: string | null;
};

export const getEmailSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const { data, error } = await db.from("email_settings").select("*").eq("id", true).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as EmailSettingsRow | null) ?? null;
  });

export const updateEmailSettingsRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        provider: z.enum(["lovable", "smtp"]).optional(),
        smtp_host: z.string().max(300).nullable().optional(),
        smtp_port: z.number().int().min(1).max(65535).nullable().optional(),
        smtp_user: z.string().max(300).nullable().optional(),
        smtp_password: z.string().max(300).nullable().optional(),
        from_email: z.string().max(300).nullable().optional(),
        from_name: z.string().max(200).nullable().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { error } = await db.from("email_settings").update(data).eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * Per-account export / detail / import
 * ------------------------------------------------------------------ */

export const exportUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ userId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { data: profile } = await db.from("profiles").select("*").eq("id", data.userId).maybeSingle();

    const result: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user_id: data.userId,
      profile: profile ?? null,
    };

    for (const table of EXPORT_TABLES) {
      const { data: rows } = await db.from(table).select("*").eq("user_id", data.userId);
      result[table] = rows ?? [];
    }
    return result;
  });

export const userDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ userId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);

    const [profile, sessions, subjects, targets, breaks, readings, roles] = await Promise.all([
      db.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      db.from("study_sessions").select("duration_minutes,is_running").eq("user_id", data.userId),
      db.from("subjects").select("id", { count: "exact", head: true }).eq("user_id", data.userId),
      db.from("targets").select("id", { count: "exact", head: true }).eq("user_id", data.userId),
      db.from("session_breaks").select("id", { count: "exact", head: true }).eq("user_id", data.userId),
      db.from("reading_logs").select("id", { count: "exact", head: true }).eq("user_id", data.userId),
      db.from("user_roles").select("role").eq("user_id", data.userId),
    ]);

    const sRows = (sessions.data ?? []).filter((s) => !s.is_running);
    return {
      profile: profile.data ?? null,
      session_count: sRows.length,
      total_minutes: sRows.reduce((a, s) => a + (s.duration_minutes ?? 0), 0),
      subject_count: subjects.count ?? 0,
      target_count: targets.count ?? 0,
      break_count: breaks.count ?? 0,
      reading_log_count: readings.count ?? 0,
      roles: (roles.data ?? []).map((r) => r.role),
    };
  });

export const importUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ userId: z.string().uuid(), payload: z.record(z.string(), z.unknown()) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);

    // profile: upsert the exported profile onto the target account
    const profile = data.payload["profile"];
    if (profile && typeof profile === "object" && !Array.isArray(profile)) {
      const { error } = await db
        .from("profiles")
        .upsert({ ...(profile as Record<string, unknown>), id: data.userId }, { onConflict: "id" });
      if (error) throw new Error(`profiles: ${error.message}`);
    }

    let inserted = 0;
    for (const table of EXPORT_TABLES) {
      const rows = data.payload[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      await db.from(table).delete().eq("user_id", data.userId);
      const clean = rows.map((row) => ({
        ...(row as Record<string, unknown>),
        user_id: data.userId,
      }));
      const { error } = await db.from(table).insert(clean);
      if (error) throw new Error(`${table}: ${error.message}`);
      inserted += clean.length;
    }
    return inserted;
  });
