import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { toast as sonner } from "sonner";
import {
  EMPTY_EMAIL_SETTINGS,
  fetchEmailSettings,
  updateEmailSettings,
  type EmailSettings,
} from "@/lib/email";
import {
  fetchAdminOverview,
  fetchAdminUsers,
  fetchAppSettings,
  fmtHM,
  relativeTime,
  setUserRole,
  updateAppSettings,
  type AppSettings,
} from "@/lib/study";
import { downloadJson, exportUserData, importUserData } from "@/lib/admin-export";
import { AdminUserDrawer } from "@/components/admin/AdminUserDrawer";

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-foreground/25 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88svh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-panel p-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h3 className="text-sm font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between rounded-2xl border border-border px-3 py-3 text-left text-sm transition-colors hover:border-brand/40"
    >
      <span>{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-brand" : "bg-muted"}`}>
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-background transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

export function OverviewStats() {
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: fetchAdminOverview });
  const o = overview.data;
  const stats: Array<[string, string, string]> = [
    ["Total users", String(o?.total_users ?? "—"), "from-[#C4B5FD] to-[#A78BFA]"],
    ["Onboarded", String(o?.onboarded_users ?? "—"), "from-[#BBF7D0] to-[#6EE7B7]"],
    ["Active today", String(o?.active_today ?? "—"), "from-[#FDE68A] to-[#FCD34D]"],
    ["Active this week", String(o?.active_week ?? "—"), "from-[#FBCFE8] to-[#F9A8D4]"],
    ["Sessions today", String(o?.sessions_today ?? "—"), "from-[#BAE6FD] to-[#7DD3FC]"],
    ["Studied today", o ? fmtHM(o.minutes_today) : "—", "from-[#DDD6FE] to-[#C4B5FD]"],
    ["Studied this week", o ? fmtHM(o.minutes_week) : "—", "from-[#FECACA] to-[#FCA5A5]"],
    ["Events today", String(o?.events_today ?? "—"), "from-[#E9D5FF] to-[#D8B4FE]"],
  ];

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(([label, value, grad]) => (
        <div
          key={label}
          className={`rounded-3xl bg-gradient-to-br ${grad} p-4 text-[#1F2937] shadow-[0_10px_30px_rgba(76,45,140,0.12)]`}
        >
          <p className="font-mono text-2xl leading-none font-bold">{value}</p>
          <p className="mt-2 text-[11px] font-semibold tracking-wide uppercase opacity-70">{label}</p>
        </div>
      ))}
    </section>
  );
}

export function UsageInsights() {
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchAdminUsers(100) });
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const list = (users.data ?? []).filter((u) =>
    q.trim()
      ? `${u.display_name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())
      : true,
  );

  const doExport = async (id: string, label: string) => {
    setBusy(id);
    try {
      const payload = await exportUserData(id);
       downloadJson(`bnoy-study-${label.replace(/\W+/g, "-").toLowerCase()}.json`, payload);
      sonner.success("History downloaded");
    } catch (err) {
      sonner.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const doImport = (id: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy(id);
      try {
        const payload = JSON.parse(await file.text()) as unknown;
        const added = await importUserData(id, payload);
        sonner.success(`Imported — ${added} subjects added`);
      } catch (err) {
        sonner.error((err as Error).message);
      } finally {
        setBusy(null);
      }
    };
    input.click();
  };

  return (
    <section className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight">Users</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Presence updates every 2 minutes. Roles apply instantly.
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          className="input h-10 w-56 rounded-full text-xs"
        />
      </div>

      <ul className="mt-4 space-y-2">
        {users.isLoading ? <li className="text-xs text-muted-foreground">Loading…</li> : null}
        {!users.isLoading && list.length === 0 ? (
          <li className="text-xs text-muted-foreground">No users found.</li>
        ) : null}
        {list.map((u) => (
          <li
            key={u.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3"
          >
            {u.avatar_url ? (
              <img src={u.avatar_url} alt="" className="size-10 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
                {(u.display_name ?? u.email ?? "?").slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{u.display_name ?? "Unnamed"}</p>
              <p className="truncate text-[11px] text-muted-foreground">{u.email ?? "no email"}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-[11px]">{relativeTime(u.last_seen_at)}</p>
              <p className="text-[10px] text-muted-foreground">
                {fmtHM(u.total_minutes)} · {u.session_count} sessions
                {u.onboarded ? "" : " · onboarding"}
              </p>
              <select
                aria-label="Set role"
                defaultValue=""
                onChange={(e) => {
                  const role = e.target.value as "admin" | "moderator" | "user";
                  if (!role) return;
                  e.target.value = "";
                  const who = u.display_name ?? u.email ?? "this user";
                  if (!window.confirm(`Make ${who} a ${role}?`)) return;
                  setUserRole(u.id, role)
                    .then(() => sonner.success(`${who} → ${role}`))
                    .catch((err: Error) => sonner.error(err.message));
                }}
                className="mt-1 h-7 rounded-full border border-border bg-background px-2 text-[10px]"
              >
                <option value="">Set role…</option>
                <option value="user">user</option>
                <option value="moderator">moderator</option>
                <option value="admin">admin</option>
              </select>
              <div className="mt-1 flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => setPreview({ id: u.id, name: u.display_name ?? u.email ?? "User" })}
                  className="rounded-full border border-border px-2 py-1 text-[10px] font-bold"
                >
                  Preview
                </button>
                <button
                  type="button"
                  disabled={busy === u.id}
                  onClick={() => void doExport(u.id, u.display_name ?? u.email ?? u.id)}
                  className="rounded-full border border-border px-2 py-1 text-[10px] font-bold disabled:opacity-50"
                >
                  Download
                </button>
                <button
                  type="button"
                  disabled={busy === u.id}
                  onClick={() => doImport(u.id)}
                  className="rounded-full border border-border px-2 py-1 text-[10px] font-bold disabled:opacity-50"
                >
                  Import
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {preview ? (
        <AdminUserDrawer
          userId={preview.id}
          name={preview.name}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </section>
  );
}

export function SiteSettings() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["app-settings"], queryFn: fetchAppSettings });
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const value = draft ?? settings.data ?? null;

  const save = useMutation({
    mutationFn: async (patch: AppSettings) => updateAppSettings(patch),
    onSuccess: async () => {
      setDraft(null);
      await qc.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Site settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!value) {
    return (
      <section className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
        <h2 className="text-base font-bold">Site settings</h2>
        <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
      </section>
    );
  }

  const set = (patch: Partial<AppSettings>) => setDraft({ ...value, ...patch });

  return (
    <section className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
      <h2 className="text-base font-bold tracking-tight">Site settings</h2>
      <p className="mt-1 text-xs text-muted-foreground">Global app identity and feature switches.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-muted-foreground">Site name</label>
          <input value={value.site_name} onChange={(e) => set({ site_name: e.target.value })} className="input mt-1" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Tagline</label>
          <input value={value.tagline} onChange={(e) => set({ tagline: e.target.value })} className="input mt-1" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Support email</label>
          <input
            type="email"
            value={value.support_email ?? ""}
            onChange={(e) => set({ support_email: e.target.value })}
            className="input mt-1"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Banner text</label>
          <input
            value={value.banner_text ?? ""}
            onChange={(e) => set({ banner_text: e.target.value })}
            className="input mt-1"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Toggle
          label="Manual history logging (users can add reading / class / break entries)"
          on={value.manual_log_enabled}
          onChange={(v) => set({ manual_log_enabled: v })}
        />
        <Toggle label="AI features enabled" on={value.ai_enabled} onChange={(v) => set({ ai_enabled: v })} />
        <Toggle
          label="Public landing page enabled"
          on={value.landing_enabled}
          onChange={(v) => set({ landing_enabled: v })}
        />
        <Toggle label="New sign-ups allowed" on={value.signup_enabled} onChange={(v) => set({ signup_enabled: v })} />
        <Toggle
          label="Google sign-in button"
          on={value.google_auth_enabled}
          onChange={(v) => set({ google_auth_enabled: v })}
        />
        <Toggle
          label="Google One Tap prompt (auto-detect Gmail account)"
          on={value.one_tap_enabled}
          onChange={(v) => set({ one_tap_enabled: v })}
        />
        <Toggle
          label="Email + password sign-in"
          on={value.email_auth_enabled}
          onChange={(v) => set({ email_auth_enabled: v })}
        />
        <Toggle
          label="Require subjects during onboarding"
          on={value.onboarding_require_subjects}
          onChange={(v) => set({ onboarding_require_subjects: v })}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs text-muted-foreground">Default daily goal (h)</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={value.default_daily_goal_hours}
            onChange={(e) => set({ default_daily_goal_hours: Number(e.target.value) })}
            className="input mt-1"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Default weekly goal (h)</label>
          <input
            type="number"
            min={0}
            step={1}
            value={value.default_weekly_goal_hours}
            onChange={(e) => set({ default_weekly_goal_hours: Number(e.target.value) })}
            className="input mt-1"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Banner level</label>
          <select
            value={value.announcement_level}
            onChange={(e) => set({ announcement_level: e.target.value })}
            className="input mt-1"
          >
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="danger">Danger</option>
          </select>
        </div>
      </div>

      <label className="mt-4 block text-xs text-muted-foreground">Maintenance note</label>
      <textarea
        value={value.maintenance_note ?? ""}
        onChange={(e) => set({ maintenance_note: e.target.value })}
        rows={2}
        className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-brand/60"
      />

      <button
        onClick={() => save.mutate(value)}
        disabled={!draft || save.isPending}
        className="mt-4 h-11 w-full rounded-full bg-brand text-sm font-semibold text-brand-foreground transition-opacity disabled:opacity-50 sm:w-48"
      >
        {save.isPending ? "Saving…" : "Save settings"}
      </button>
    </section>
  );
}

export function EmailDelivery() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["email-settings"], queryFn: fetchEmailSettings });
  const [draft, setDraft] = useState<EmailSettings | null>(null);
  const value = draft ?? q.data ?? null;

  const save = useMutation({
    mutationFn: async (patch: EmailSettings) => updateEmailSettings(patch),
    onSuccess: async () => {
      setDraft(null);
      await qc.invalidateQueries({ queryKey: ["email-settings"] });
      toast.success("Email settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) {
    return (
      <section className="glass-panel p-4 sm:p-5">
        <h2 className="text-base font-bold">Email delivery</h2>
        <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
      </section>
    );
  }

  const v = value ?? EMPTY_EMAIL_SETTINGS;
  const set = (patch: Partial<EmailSettings>) => setDraft({ ...v, ...patch });
  const smtp = v.provider === "smtp";

  return (
    <section className="glass-panel p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight">Email delivery</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Signup confirmation, password reset aur magic-link mails kahan se jayen.
          </p>
        </div>
        <span className="ai-accent rounded-xl px-2 py-1 font-mono text-[10px] tracking-widest uppercase">
          {smtp ? "SMTP" : "Built-in"}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(["lovable", "smtp"] as const).map((p) => (
          <button
            key={p}
            onClick={() => set({ provider: p })}
            className={`rounded-2xl border px-3 py-3 text-left text-sm transition-colors ${
              v.provider === p ? "border-brand/60 bg-brand/10" : "border-border hover:border-brand/30"
            }`}
          >
            <span className="block font-medium">{p === "lovable" ? "Built-in sender" : "Custom SMTP"}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {p === "lovable"
                ? "Default cloud mailer — zero setup, shared sending domain."
                : "Apna SMTP server / domain use karo (Resend, SES, Postmark, Gmail…)."}
            </span>
          </button>
        ))}
      </div>

      {smtp ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs text-muted-foreground">SMTP host</label>
            <input
              value={v.smtp_host ?? ""}
              onChange={(e) => set({ smtp_host: e.target.value })}
              placeholder="smtp.resend.com"
              className="input mt-1"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground">Port</label>
            <input
              type="number"
              value={v.smtp_port ?? 587}
              onChange={(e) => set({ smtp_port: Number(e.target.value) || 587 })}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground">Username</label>
            <input value={v.smtp_user ?? ""} onChange={(e) => set({ smtp_user: e.target.value })} className="input mt-1" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground">Password / API key</label>
            <input
              type="password"
              autoComplete="off"
              value={v.smtp_password ?? ""}
              onChange={(e) => set({ smtp_password: e.target.value })}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground">From name</label>
            <input
              value={v.from_name ?? ""}
              onChange={(e) => set({ from_name: e.target.value })}
              placeholder="Chronodeck"
              className="input mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-muted-foreground">From email</label>
            <input
              type="email"
              value={v.from_email ?? ""}
              onChange={(e) => set({ from_email: e.target.value })}
              placeholder="no-reply@yourdomain.com"
              className="input mt-1"
            />
          </div>
        </div>
      ) : null}

      <button
        onClick={() => save.mutate(v)}
        disabled={!draft || save.isPending}
        className="mt-4 h-11 w-full rounded-full bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] text-sm font-semibold text-brand-foreground transition-opacity disabled:opacity-50 sm:w-48"
      >
        {save.isPending ? "Saving…" : "Save email settings"}
      </button>
    </section>
  );
}
