import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { platformLabel } from "@/lib/platform";

type Meta = {
  platform?: string;
  host?: string;
  app_version?: string | null;
  standalone?: boolean;
};

type Row = { platform: string; users: number; events: number };
type HostRow = { host: string; users: number; events: number; versions: string[] };

async function fetchPlatformUsage(): Promise<{ platforms: Row[]; hosts: HostRow[] }> {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data, error } = await supabase
    .from("app_events")
    .select("user_id,metadata")
    .eq("event", "platform")
    .gte("created_at", since)
    .limit(4000);
  if (error) throw new Error(error.message);

  const byPlatform = new Map<string, { users: Set<string>; events: number }>();
  const byHost = new Map<string, { users: Set<string>; events: number; versions: Set<string> }>();

  for (const row of data ?? []) {
    const meta = (row.metadata ?? {}) as Meta;
    const key = meta.platform ?? "web";
    const p = byPlatform.get(key) ?? { users: new Set<string>(), events: 0 };
    p.users.add(row.user_id ?? "anonymous");
    p.events += 1;
    byPlatform.set(key, p);

    const host = meta.host ?? "unknown";
    const h = byHost.get(host) ?? { users: new Set<string>(), events: 0, versions: new Set<string>() };
    h.users.add(row.user_id ?? "anonymous");
    h.events += 1;
    if (meta.app_version) h.versions.add(meta.app_version);
    byHost.set(host, h);
  }

  return {
    platforms: [...byPlatform.entries()]
      .map(([platform, v]) => ({ platform, users: v.users.size, events: v.events }))
      .sort((a, b) => b.users - a.users),
    hosts: [...byHost.entries()]
      .map(([host, v]) => ({ host, users: v.users.size, events: v.events, versions: [...v.versions] }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 12),
  };
}

/** Admin: web vs Android-app split plus the exact hosts users open the app from. */
export function PlatformBreakdown() {
  const q = useQuery({ queryKey: ["admin-platforms"], queryFn: fetchPlatformUsage });
  const rows = q.data?.platforms ?? [];
  const hosts = q.data?.hosts ?? [];
  const total = rows.reduce((n, r) => n + r.users, 0) || 1;

  return (
    <section className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
      <h2 className="font-heading text-base font-bold tracking-tight">Where users sign in</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Last 30 days · web browser vs Android app shell, plus the URL they opened.
      </p>

      {q.isLoading ? <div className="shimmer mt-4 h-16 rounded-2xl" /> : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((r) => (
          <div key={r.platform} className="rounded-2xl border border-border bg-background p-3">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {platformLabel(r.platform)}
            </p>
            <p className="mt-1 font-mono text-xl font-bold">{r.users}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-brand" style={{ width: `${(r.users / total) * 100}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{r.events} opens</p>
          </div>
        ))}
        {!q.isLoading && rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No platform pings yet.</p>
        ) : null}
      </div>

      {hosts.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-background text-[10px] tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2 font-semibold">Host / URL</th>
                <th className="px-3 py-2 font-semibold">Users</th>
                <th className="px-3 py-2 font-semibold">Opens</th>
                <th className="px-3 py-2 font-semibold">App version</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {hosts.map((h) => (
                <tr key={h.host}>
                  <td className="px-3 py-2 font-mono text-[11px]">{h.host}</td>
                  <td className="px-3 py-2 font-mono">{h.users}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{h.events}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {h.versions.length ? h.versions.join(", ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
