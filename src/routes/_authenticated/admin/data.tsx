import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { adminUsers } from "@/lib/admin.functions";
import { downloadJson, exportUserData, importUserData } from "@/lib/admin-export";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/data")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Data transfer — Chronodeck Admin" },
      { name: "description", content: "Export a full account to a file, or restore an export into an account." },
      { property: "og:title", content: "Data transfer — Chronodeck Admin" },
      { property: "og:description", content: "Export and import complete Chronodeck accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDataPage,
});

const TABLE_LABELS: Record<string, string> = {
  profile: "Profile",
  user_settings: "Settings",
  user_xp: "XP",
  subjects: "Subjects",
  subject_targets: "Subject targets",
  chapter_learning_state: "Chapter progress",
  study_sessions: "Study sessions",
  session_breaks: "Session breaks",
  session_outcomes: "Session outcomes",
  targets: "Targets",
  timetable_blocks: "Timetable",
  reading_goals: "Reading goals",
  reading_logs: "Reading logs",
  online_classes: "Online classes",
  daily_study_plan_items: "Plan items",
  test_attempts: "Test attempts",
  notifications: "Notifications",
  device_tokens: "Devices",
  ai_messages: "AI messages",
  app_events: "Activity events",
};

const selectCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand/60";

type Payload = Record<string, unknown>;

function summarize(payload: Payload) {
  return Object.entries(TABLE_LABELS)
    .map(([key, label]) => {
      const rows = payload[key];
      const count = Array.isArray(rows) ? rows.length : key === "profile" && rows ? 1 : 0;
      return { key, label, count };
    })
    .filter((s) => s.count > 0);
}

function AdminDataPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState("");
  const [imported, setImported] = useState<{ userId: string; label: string; payload: Payload } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => adminUsers({ data: { limit: 500 } }) });

  const exportUser = useMutation({
    mutationFn: async () => {
      const u = (users.data ?? []).find((x) => x.id === userId);
      if (!u) throw new Error("Pehle user chuno");
      const payload = await exportUserData(u.id);
      downloadJson(`chronodeck-${(u.display_name || u.email || u.id).replace(/\W+/g, "-").toLowerCase()}.json`, payload);
      return u;
    },
    onSuccess: (u) => toast.success(`Export ready — ${(u.display_name || u.email) ?? "account"}`),
    onError: (e: Error) => toast.error(e.message),
  });

  const readExport = async (file: File) => {
    try {
      const payload = JSON.parse(await file.text()) as Payload;
      const rows = summarize(payload).reduce((a, s) => a + s.count, 0);
      if (rows === 0) throw new Error("File me koi data nahi mila");
      const target = (users.data ?? []).find((x) => x.id === userId);
      if (!target) throw new Error("Pehle target account chuno");
      setImported({ userId: target.id, label: target.display_name || target.email || target.id, payload });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const runImport = async () => {
    if (!imported) return;
    setBusy("Restoring…");
    try {
      const inserted = await importUserData(imported.userId, imported.payload);
      toast.success(`Import complete — ${inserted} rows restored into ${imported.label}`);
      setImported(null);
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const target = (users.data ?? []).find((x) => x.id === userId);
  const previewRows = imported ? summarize(imported.payload) : [];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Data transfer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download a complete account as one file, or restore a file into an account.
        </p>
      </header>

      <section className="surface-card p-5">
        <label className="block text-xs font-bold text-muted-foreground">
          Account
          <select className={`mt-1 ${selectCls}`} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Choose an account…</option>
            {(users.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name || u.email || u.id.slice(0, 8)} — {u.session_count} sessions
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button className="gap-2" disabled={!userId || exportUser.isPending || !!busy} onClick={() => exportUser.mutate()}>
            <Download className="size-4" /> {exportUser.isPending ? "Preparing…" : "Export account"}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!userId || !!busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" /> Import a file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readExport(file);
              e.target.value = "";
            }}
          />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Import replaces the account's existing study rows with the file's data — export a fresh backup first.
        </p>
      </section>

      {imported ? (
        <section className="surface-card p-5">
          <h2 className="text-base font-extrabold tracking-tight">Restore into {imported.label}?</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Existing rows in the categories below will be replaced by the file's data.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {previewRows.map((s) => (
              <li key={s.key} className="flex items-center justify-between rounded-2xl border border-border bg-panel px-3 py-2.5">
                <span className="text-sm font-semibold">{s.label}</span>
                <span className="num rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold">{s.count}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Button disabled={!!busy} onClick={() => void runImport()}>
              {busy ?? "Import now"}
            </Button>
            <Button variant="outline" disabled={!!busy} onClick={() => setImported(null)}>
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      <section className="surface-card p-5">
        <h2 className="text-base font-extrabold tracking-tight">All accounts</h2>
        {users.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading accounts…</p>
        ) : (users.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No accounts yet.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {(users.data ?? []).map((u) => (
              <li
                key={u.id}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                  userId === u.id ? "border-foreground bg-secondary" : "border-border bg-panel"
                }`}
              >
                <button type="button" onClick={() => setUserId(u.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-bold">{u.display_name || "Unnamed"}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {u.email ?? u.id} · joined {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </button>
                <span className="num shrink-0 rounded-full bg-secondary px-3 py-1 text-[11px] font-bold">
                  {u.session_count} sessions
                </span>
              </li>
            ))}
          </ul>
        )}
        {target ? (
          <p className="mt-3 text-[11px] font-semibold text-muted-foreground">
            Selected: {target.display_name || target.email || target.id}
          </p>
        ) : null}
      </section>
    </div>
  );
}
