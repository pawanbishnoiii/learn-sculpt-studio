import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { OverviewStats } from "@/components/admin/AdminSections";
import { fetchSessions, fetchSubjects, fetchTargets, fmtHM, subjectProgress } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/admin/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin overview — Chronodeck Study OS" },
      { name: "description", content: "Live usage, study minutes and subject load across every Chronodeck account." },
      { property: "og:title", content: "Admin overview — Chronodeck" },
      { property: "og:description", content: "Live usage and study analytics for the Chronodeck study platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  const sessions = useQuery({ queryKey: ["sessions", "all"], queryFn: () => fetchSessions() });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const targets = useQuery({ queryKey: ["targets"], queryFn: fetchTargets });

  const all = sessions.data ?? [];
  const rows = subjectProgress(all, subjects.data ?? [], new Date(0));

  return (
    <div className="space-y-5">
      <header>
        <p className="font-mono text-[10px] tracking-[0.3em] text-brand uppercase">Console</p>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything happening across Chronodeck right now.
        </p>
      </header>

      <OverviewStats />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
          <h2 className="text-base font-bold tracking-tight">Subject load (all time)</h2>
          <ul className="mt-3 space-y-2">
            {rows.length ? (
              rows.map((r) => (
                <li key={r.name} className="flex items-center justify-between text-xs">
                  <span className="truncate">{r.name}</span>
                  <span className="ml-3 shrink-0 font-mono text-muted-foreground">
                    {r.sessions} · {fmtHM(r.minutes)}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-xs text-muted-foreground">No sessions recorded yet.</li>
            )}
          </ul>
          <p className="mt-4 text-[11px] text-muted-foreground">
            {targets.data?.length ?? 0} active targets tracked.
          </p>
        </section>

        <section className="rounded-3xl border border-border bg-panel p-4 sm:p-5">
          <h2 className="text-base font-bold tracking-tight">Recent sessions</h2>
          <ul className="mt-3 space-y-2">
            {all.slice(0, 15).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate">
                  {s.subject_name ?? "Study"}
                  {s.topic ? <span className="text-muted-foreground"> · {s.topic}</span> : null}
                </span>
                <span className="shrink-0 font-mono text-muted-foreground">
                  {new Date(s.started_at).toLocaleDateString()} ·{" "}
                  {s.is_running ? "running" : `${s.duration_minutes ?? 0}m`}
                </span>
              </li>
            ))}
            {all.length === 0 ? <li className="text-xs text-muted-foreground">Nothing yet.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
