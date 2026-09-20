import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminEvents, adminUsers, type AdminEvent } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Activity — Bnoy Study Admin" },
      { name: "description", content: "Sign-in, app-open and page-view history with user, path and platform filters." },
      { property: "og:title", content: "Activity — Bnoy Study Admin" },
      { property: "og:description", content: "Review sign-ins, app opens and page views across Bnoy Study." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminActivityPage,
});

const WINDOWS = [1, 7, 14, 30, 90];

const selectCls =
  "h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand/60";

function AdminActivityPage() {
  const [userId, setUserId] = useState("");
  const [kind, setKind] = useState("");
  const [path, setPath] = useState("");
  const [days, setDays] = useState(14);

  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => adminUsers({ data: { limit: 500 } }) });
  const events = useQuery({
    queryKey: ["admin-events", userId || "all", days],
    queryFn: () =>
      adminEvents({ data: { userId: userId || null, days, limit: 1000 } }),
  });

  const rows = (events.data ?? []).filter((r: AdminEvent) => {
    if (kind && r.event !== kind) return false;
    if (path.trim() && !(r.path ?? "").toLowerCase().includes(path.trim().toLowerCase())) return false;
    return true;
  });
  const kinds = [...new Set((events.data ?? []).map((r) => r.event).filter((k): k is string => !!k))].sort();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign-ins, app opens and page views — filter by user, event, path and time.
        </p>
      </header>

      <section className="surface-card p-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select className={selectCls} value={userId} onChange={(e) => setUserId(e.target.value)} aria-label="Filter by user">
            <option value="">All users</option>
            {(users.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name || u.email || u.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <select className={selectCls} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by event">
            <option value="">All events</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <input
            className={selectCls}
            placeholder="Path contains…"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            aria-label="Filter by path"
          />
          <select
            className={selectCls}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Time window"
          >
            {WINDOWS.map((d) => (
              <option key={d} value={d}>
                Last {d} day{d > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        {events.isLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Loading activity…</p>
        ) : rows.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            No events in this window yet — activity starts logging as accounts use the app.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Path</th>
                  <th className="px-4 py-3">Platform</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="num px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="max-w-40 truncate px-4 py-2.5 font-semibold">
                      {r.display_name || r.email || r.user_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold">{r.event ?? "—"}</span>
                    </td>
                    <td className="max-w-48 truncate px-4 py-2.5 text-muted-foreground">{r.path ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.platform ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 200 ? (
              <p className="px-4 py-3 text-[11px] font-semibold text-muted-foreground">
                Showing the latest 200 of {rows.length} events — narrow the filters to see more.
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
