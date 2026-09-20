import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { AdminAppControlPanel } from "@/components/admin/AdminAppControlPanel";
import { PlatformBreakdown } from "@/components/admin/PlatformBreakdown";
import { fetchPushStats } from "@/lib/study";

const TABLES = [
  ["profiles", "id (auth.users.id), display_name, first_name, last_name, avatar_url, bio, age, gender, phone, timezone, avg_study_hours, onboarded, onboarded_at, last_seen_at, sign_in_count, email, created_at, updated_at"],
  ["subjects", "id, user_id, name, color, weekly_target_hours, created_at — har user ke apne subjects"],
  ["study_sessions", "id, user_id, subject_id, subject_name, topic, notes, kind (reading|class|revision|practice), started_at, planned_end_at, ended_at, duration_minutes, break_minutes, is_running, auto_closed"],
  ["session_breaks", "id, user_id, session_id, kind (pause|sleep|free), note, started_at, ended_at, duration_minutes"],
  ["sessions", "legacy table: id, user_id, subject_id, started_at, ended_at, duration_seconds, mood, quality_rating, xp_earned"],
  ["timetable_blocks", "id, user_id, subject_id, title, kind, location, day_of_week (0=Sun), start_time, end_time, sort_order"],
  ["targets", "id, user_id, subject_id, title, daily_hours, weekly_hours, deadline, is_active"],
  ["user_xp", "id, user_id, total_xp, level, streak, updated_at — award_session_xp() trigger session complete par isko update karta hai"],
  ["user_settings", "user_id, daily_goal_hours, weekly_goal_hours, auto_stop_hours, week_starts_monday, ai_tone, ai_autopilot"],
  ["notifications", "id, user_id, created_by, title, body, kind, image_url, action_path, read, push_sent, audience, created_at"],
  ["scheduled_notifications", "id, title, body, image_url, action_path, audience, send_at, status, error, created_by — cron endpoint isko drain karta hai"],
  ["device_tokens", "id, user_id, token, platform (android|web|ios), device_label, last_seen_at"],
  ["motivations", "id, user_id, kind, title, body, author, month, is_global"],
  ["ai_messages", "id, user_id, role (user|assistant), content, created_at — AI coach chat history"],
  ["app_settings", "single row: site_name, tagline, banner_text, logo_url, favicon_url, accent_color, landing_enabled, ai_enabled, push_enabled, manual_log_enabled, avatar_upload_enabled, signup_enabled, google_auth_enabled, one_tap_enabled, email_auth_enabled, onboarding_require_subjects, default_daily_goal_hours, default_weekly_goal_hours, android_min_version, android_latest_version, android_update_url, android_force_update"],
  ["avatar_presets", "id, label, url, sort_order, is_active — profile avatar gallery"],
  ["email_settings", "id, provider, smtp_host, smtp_port, smtp_user, from_email, from_name (server-only)"],
  ["jobs", "id, kind, payload, status, attempts, last_error, run_at — background queue"],
  ["app_events", "id, user_id, event, path, metadata (platform, app_version, host, ua), created_at — web vs Android split isi se aata hai"],
  ["user_roles", "id, user_id, role (admin | moderator | user) — has_role(uid, role) security-definer function se check hota hai"],
] as const;

const FUNCTIONS = [
  ["has_role(_user_id, _role)", "boolean — RLS policies isi se admin check karti hain"],
  ["admin_overview()", "jsonb — dashboard KPIs"],
  ["admin_users(_limit)", "user list + total minutes + session count"],
  ["admin_push_stats() / admin_push_subscribers(_limit)", "push device stats"],
  ["admin_notification_history(_limit)", "sent notifications + read counts"],
  ["admin_set_role(_user_id, _role)", "role change (admin only)"],
  ["close_stale_sessions()", "8h+ chal rahi sessions auto-close"],
  ["award_session_xp()", "trigger — XP, level aur streak update"],
  ["touch_last_seen()", "profiles.last_seen_at ping"],
] as const;

const PROMPT = `Build a production-ready native Android app (Kotlin + Jetpack Compose, min SDK 26) for "Bnoy Study OS".

BACKEND
Supabase (Postgres + Auth + Realtime + Storage) via supabase-kt. Use only the anon/publishable key — never a service key.
Auth: Google One Tap (Credential Manager -> signInWithIdToken) + email/password. On first login upsert "profiles",
register the FCM token into "device_tokens" (platform = "android", device_label = model) and log an "app_events" row
with event = "platform" and metadata { platform: "android-app", app_version, host } so the admin console can split
web vs Android usage. Set the user-agent marker "BnoyStudyApp/<versionName>" on any WebView.

SCREENS
1. Home/Today — daily goal ring, today/week/month minutes, XP, level, streak (user_xp), running-session banner that
   deep-links to the Timer screen, timetable "next block" card, target progress bars.
2. Study setup — subject chips from "subjects", topic field, category (reading | class | revision | practice),
   Start button inserts into "study_sessions" with is_running = true (auto-fills from the current timetable_block).
3. Timer (separate, clean screen) — only the elapsed clock, subject/topic, three break buttons
   (Short break / Power nap / Free time -> "session_breaks"), a Stop button and a full-screen toggle.
   Stop opens a bottom sheet (topic + notes) that saves: is_running = false, ended_at, duration_minutes, break_minutes.
   Keep it running in a foreground service with a persistent notification; back navigation must not kill the session.
4. Timetable — "timetable_blocks" rendered as day / week / month views, tap a block to start a session for it.
5. Targets — "targets" with progress computed from completed sessions per subject.
6. History — completed sessions grouped by day with progress bars and break totals.
7. Notifications — inbox from "notifications", mark read, FCM handling that deep-links to /history on session complete.
8. Profile & Settings — avatar from "avatar_presets" or Storage upload, goals in "user_settings", theme, sign out.

RULES
- Every table has Row Level Security keyed on auth.uid(); admin-only data goes through the security-definer RPCs.
- Respect "app_settings": push_enabled, avatar_upload_enabled, signup_enabled, google_auth_enabled, ai_enabled,
  and android_min_version / android_latest_version / android_update_url / android_force_update
  (blocking update screen when installed versionCode < android_min_version and force update is on).
- Supabase Realtime on study_sessions, session_breaks, user_xp, targets and notifications so the UI refreshes instantly.
- Offline-first: cache today's data in Room, queue session writes and flush on reconnect.
- Material 3 with dynamic color, soft neo-pop pastel surfaces, 24dp rounded cards, large friendly typography,
  spring-based motion for the timer and bottom sheets.`;


export const Route = createFileRoute("/_authenticated/admin/android")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Android app — Bnoy Study Admin" },
      { name: "description", content: "Manage Android releases, force updates and the build prompt with full database reference." },
      { property: "og:title", content: "Android app — Bnoy Study Admin" },
      { property: "og:description", content: "Android release controls, install split and the app build prompt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminAndroid,
});

function AdminAndroid() {
  const push = useQuery({ queryKey: ["push-stats"], queryFn: fetchPushStats });
  const s = push.data;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT);
      toast.success("Build prompt copied");
    } catch {
      toast.error("Copy failed — select the text manually.");
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Android app</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Release controls, device split and everything a developer needs to build the app.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Devices", String(s?.devices ?? "—")],
          ["Subscribers", String(s?.subscribers ?? "—")],
          ["Android tokens", String(s?.android ?? "—")],
          ["Web tokens", String(s?.web ?? "—")],
        ].map(([l, v]) => (
          <div key={l} className="rounded-3xl border border-border bg-panel p-4">
            <p className="font-mono text-2xl font-bold">{v}</p>
            <p className="mt-1 text-[11px] tracking-wide text-muted-foreground uppercase">{l}</p>
          </div>
        ))}
      </section>

      <PlatformBreakdown />
      <AdminAppControlPanel />

      <section className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold tracking-tight">App build prompt</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Paste this into any AI builder to generate the native Android client.
            </p>
          </div>
          <button
            onClick={copy}
            className="flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-xs font-bold text-background"
          >
            <Copy className="size-3.5" /> Copy prompt
          </button>
        </div>
        <pre className="mt-4 max-h-96 overflow-auto rounded-2xl bg-background p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
          {PROMPT}
        </pre>
      </section>

      <section className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
        <h2 className="text-base font-bold tracking-tight">Database reference</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tables the Android client reads and writes. Every table is protected by row-level security
          scoped to the signed-in user.
        </p>
        <ul className="mt-3 space-y-2">
          {TABLES.map(([name, cols]) => (
            <li key={name} className="rounded-2xl border border-border bg-background p-3">
              <p className="font-mono text-xs font-bold text-brand">{name}</p>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">{cols}</p>
            </li>
          ))}
        </ul>

        <h3 className="mt-5 text-sm font-bold tracking-tight">Database functions (RPC)</h3>
        <ul className="mt-2 space-y-2">
          {FUNCTIONS.map(([name, desc]) => (
            <li key={name} className="rounded-2xl border border-border bg-background p-3">
              <p className="font-mono text-xs font-bold text-brand">{name}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{desc}</p>
            </li>
          ))}
        </ul>
      </section>

    </div>
  );
}
