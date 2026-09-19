import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Download, Upload, X } from "lucide-react";
import { adminEvents, adminUsers, type AdminEvent, type AdminUser } from "@/lib/admin.functions";
import { downloadJson, exportUserData, fetchUserDetail, importUserData } from "@/lib/admin-export";
import { fmtHM, relativeTime, setUserRole } from "@/lib/study";

type SortKey = "name" | "email" | "last_seen_at" | "total_minutes" | "session_count" | "created_at";

const th =
  "px-3 py-2.5 text-left text-[11px] font-bold tracking-wide text-muted-foreground uppercase whitespace-nowrap";
const td = "px-3 py-2.5 align-middle";

/** Sortable, searchable account table with a wide detail panel. */
export function AdminUsersTable() {
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => adminUsers({ data: { limit: 500 } }) });
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("last_seen_at");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (users.data ?? []).filter((u) =>
      term ? `${u.display_name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(term) : true,
    );
    const val = (u: AdminUser) => {
      switch (sort) {
        case "name":
          return (u.display_name ?? u.email ?? "").toLowerCase();
        case "email":
          return (u.email ?? "").toLowerCase();
        case "total_minutes":
          return u.total_minutes;
        case "session_count":
          return u.session_count;
        case "created_at":
          return u.created_at;
        default:
          return u.last_seen_at ?? "";
      }
    };
    return [...list].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return dir === "asc" ? cmp : -cmp;
    });
  }, [users.data, q, sort, dir]);

  const toggle = (key: SortKey) => {
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir(key === "name" || key === "email" ? "asc" : "desc");
    }
  };

  const head = (key: SortKey, label: string, extra = "") => (
    <th className={`${th} ${extra}`}>
      <button type="button" onClick={() => toggle(key)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        {sort === key ? dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}
      </button>
    </th>
  );

  const doExport = async (u: AdminUser) => {
    setBusy(u.id);
    try {
      const payload = await exportUserData(u.id);
      downloadJson(`chronodeck-${(u.display_name ?? u.email ?? u.id).replace(/\W+/g, "-").toLowerCase()}.json`, payload);
      toast.success("Account data downloaded");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const doImport = (u: AdminUser) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy(u.id);
      try {
        const payload = JSON.parse(await file.text()) as unknown;
        const added = await importUserData(u.id, payload);
        toast.success(`Imported ${added} records into this account`);
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setBusy(null);
      }
    };
    input.click();
  };

  return (
    <section className="surface-card overflow-hidden rounded-3xl border border-border bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="text-base font-bold tracking-tight">All accounts</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {rows.length} account{rows.length === 1 ? "" : "s"} · click a row for full history and logins
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          className="input h-10 w-64 rounded-full text-xs"
        />
      </div>

      {users.isLoading ? (
        <p className="p-5 text-sm text-muted-foreground">Loading accounts…</p>
      ) : rows.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">No accounts match this search.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="sticky top-0 z-10 bg-panel/95 backdrop-blur">
              <tr className="border-b border-border">
                {head("name", "Account")}
                {head("email", "Email", "hidden lg:table-cell")}
                {head("last_seen_at", "Last seen")}
                {head("total_minutes", "Studied")}
                {head("session_count", "Sessions")}
                {head("created_at", "Joined", "hidden xl:table-cell")}
                <th className={th}>Role</th>
                <th className={`${th} text-right`}>Data</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u)}
                  className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/50"
                >
                  <td className={td}>
                    <div className="flex items-center gap-2.5">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand/15 text-[11px] font-bold text-brand">
                          {(u.display_name ?? u.email ?? "?").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block max-w-44 truncate font-semibold">{u.display_name ?? "Unnamed"}</span>
                        <span className="block text-[11px] text-muted-foreground lg:hidden">{u.email ?? "no email"}</span>
                        {!u.onboarded ? (
                          <span className="text-[10px] font-bold text-amber-600">onboarding</span>
                        ) : null}
                      </span>
                    </div>
                  </td>
                  <td className={`${td} hidden max-w-56 truncate text-muted-foreground lg:table-cell`}>
                    {u.email ?? "—"}
                  </td>
                  <td className={`${td} num whitespace-nowrap`}>{relativeTime(u.last_seen_at)}</td>
                  <td className={`${td} num whitespace-nowrap`}>{fmtHM(u.total_minutes)}</td>
                  <td className={`${td} num`}>{u.session_count}</td>
                  <td className={`${td} num hidden whitespace-nowrap text-muted-foreground xl:table-cell`}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className={td} onClick={(e) => e.stopPropagation()}>
                    <select
                      aria-label={`Set role for ${u.display_name ?? u.email ?? "user"}`}
                      defaultValue=""
                      onChange={(e) => {
                        const role = e.target.value as "admin" | "moderator" | "user";
                        if (!role) return;
                        e.target.value = "";
                        const who = u.display_name ?? u.email ?? "this user";
                        if (!window.confirm(`Make ${who} a ${role}?`)) return;
                        setUserRole(u.id, role)
                          .then(() => toast.success(`${who} → ${role}`))
                          .catch((err: Error) => toast.error(err.message));
                      }}
                      className="h-8 rounded-full border border-border bg-background px-2 text-[11px]"
                    >
                      <option value="">Set role…</option>
                      <option value="user">user</option>
                      <option value="moderator">moderator</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title="Download account data"
                        disabled={busy === u.id}
                        onClick={() => void doExport(u)}
                        className="grid size-8 place-items-center rounded-full border border-border disabled:opacity-50"
                      >
                        <Download className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Import account data"
                        disabled={busy === u.id}
                        onClick={() => doImport(u)}
                        className="grid size-8 place-items-center rounded-full border border-border disabled:opacity-50"
                      >
                        <Upload className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected ? <UserDetailPanel user={selected} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}

type Detail = {
  profile?: Record<string, unknown> | null;
  total_minutes?: number;
  session_count?: number;
  subject_count?: number;
  target_count?: number;
  break_count?: number;
  reading_log_count?: number;
  roles?: string[];
};

function UserDetailPanel({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const detail = useQuery({
    queryKey: ["admin-user-detail", user.id],
    queryFn: () => fetchUserDetail(user.id) as Promise<Detail>,
  });
  const logins = useQuery({
    queryKey: ["admin-user-logins", user.id],
    queryFn: () => adminEvents({ data: { userId: user.id, days: 90, limit: 500 } }),
  });

  const d = detail.data;
  const profile = (d?.profile ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "—" : String(v));
  const sessions = (logins.data ?? []).filter((e: AdminEvent) => e.event === "sign_in" || e.event === "app_open");

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-3xl overflow-y-auto border-l border-border bg-background p-5"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-extrabold tracking-tight">{user.display_name ?? "Unnamed"}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {user.email ?? "no email"} · {(d?.roles ?? []).join(", ") || "user"} · joined{" "}
              {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account detail"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-border"
          >
            <X className="size-4" />
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ["Total study", fmtHM(d?.total_minutes ?? user.total_minutes)],
            ["Sessions", String(d?.session_count ?? user.session_count)],
            ["Subjects", String(d?.subject_count ?? 0)],
            ["Targets", String(d?.target_count ?? 0)],
            ["Breaks", String(d?.break_count ?? 0)],
            ["Reading logs", String(d?.reading_log_count ?? 0)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-border bg-panel p-3">
              <dt className="text-[11px] font-bold text-muted-foreground">{k}</dt>
              <dd className="num mt-1 text-lg font-extrabold">{v}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-5 rounded-2xl border border-border bg-panel p-4">
          <h3 className="text-sm font-extrabold">Profile</h3>
          <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <li>Phone: {str(profile["phone"])}</li>
            <li>Gender: {str(profile["gender"])}</li>
            <li>Age: {str(profile["age"])}</li>
            <li>Timezone: {str(profile["timezone"])}</li>
            <li>Sign-ins recorded: {str(profile["sign_in_count"])}</li>
            <li>Last seen: {user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : "never"}</li>
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-panel p-4">
          <h3 className="text-sm font-extrabold">Login &amp; device history</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Server-observed address and device labels. Network provider is not exposed by browsers.
          </p>
          {logins.isLoading ? (
            <p className="mt-3 text-xs text-muted-foreground">Loading logins…</p>
          ) : sessions.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No sign-ins recorded in the last 90 days.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">IP</th>
                    <th className="py-2 pr-3">Device</th>
                    <th className="py-2 pr-3">Browser / OS</th>
                    <th className="py-2 pr-3">Screen</th>
                    <th className="py-2">Network</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 60).map((e) => (
                    <tr key={e.id} className="border-b border-border/60 last:border-0">
                      <td className="num py-2 pr-3 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                      <td className="num py-2 pr-3">{e.ip ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {e.device ?? e.platform ?? "—"}
                        {e.standalone ? " · installed" : ""}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {(e.browser ?? "—") + " / " + (e.os ?? "—")}
                      </td>
                      <td className="num py-2 pr-3 text-muted-foreground">{e.screen ?? "—"}</td>
                      <td className="py-2 text-muted-foreground">{e.connection ?? "Unavailable"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
