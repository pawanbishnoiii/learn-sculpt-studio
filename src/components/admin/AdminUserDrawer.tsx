import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { fetchUserDetail } from "@/lib/admin-export";
import { fmtHM } from "@/lib/study";

type Detail = {
  profile?: Record<string, unknown> | null;
  xp?: { total_xp?: number; level?: number; streak?: number; best_streak?: number } | null;
  total_minutes?: number;
  session_count?: number;
  subject_count?: number;
  reading_minutes?: number;
  last_seen_at?: string | null;
  recent_sessions?: Array<Record<string, unknown>>;
  subjects?: Array<{ id: string; name: string; color: string }>;
};

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "—" : String(v));

/** Full read-only preview of one account, for admins. */
export function AdminUserDrawer({
  userId,
  name,
  onClose,
}: {
  userId: string;
  name: string;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: () => fetchUserDetail(userId) as Promise<Detail>,
  });
  const d = detail.data;
  const profile = (d?.profile ?? {}) as Record<string, unknown>;
  const sessions = d?.recent_sessions ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-lg overflow-y-auto bg-background p-5 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <h2 className="min-w-0 flex-1 truncate text-lg font-extrabold tracking-tight">{name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="grid size-9 place-items-center rounded-full border border-border"
          >
            <X className="size-4" />
          </button>
        </div>

        {detail.isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading preview…</p>
        ) : detail.isError ? (
          <p className="mt-6 text-sm text-destructive">Could not load this account.</p>
        ) : (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-3">
              {[
                ["Total study", fmtHM(d?.total_minutes ?? 0)],
                ["Sessions", String(d?.session_count ?? 0)],
                ["Subjects", String(d?.subject_count ?? 0)],
                ["Reading", fmtHM(d?.reading_minutes ?? 0)],
                ["Streak", `${d?.xp?.streak ?? 0}d (best ${d?.xp?.best_streak ?? 0}d)`],
                ["XP", `${d?.xp?.total_xp ?? 0} · lvl ${d?.xp?.level ?? 1}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-border bg-panel p-3">
                  <dt className="text-[11px] font-bold text-muted-foreground">{k}</dt>
                  <dd className="num mt-1 text-lg font-extrabold">{v}</dd>
                </div>
              ))}
            </dl>

            <section className="mt-5 rounded-2xl border border-border bg-panel p-4">
              <h3 className="text-sm font-extrabold">Profile</h3>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>Email: {str(profile["email"])}</li>
                <li>Phone: {str(profile["phone"])}</li>
                <li>Gender: {str(profile["gender"])}</li>
                <li>Age: {str(profile["age"])}</li>
                <li>Timezone: {str(profile["timezone"])}</li>
                <li>
                  Last seen:{" "}
                  {d?.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : "never"}
                </li>
                <li>Onboarded: {profile["onboarded"] ? "yes" : "no"}</li>
              </ul>
            </section>

            <section className="mt-4 rounded-2xl border border-border bg-panel p-4">
              <h3 className="text-sm font-extrabold">Subjects</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(d?.subjects ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No subjects yet.</p>
                ) : (
                  (d?.subjects ?? []).map((s) => (
                    <span
                      key={s.id}
                      className="rounded-full border border-border px-2.5 py-1 text-[11px] font-bold"
                    >
                      {s.name}
                    </span>
                  ))
                )}
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-border bg-panel p-4">
              <h3 className="text-sm font-extrabold">Recent sessions</h3>
              {sessions.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No sessions recorded.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {sessions.map((s, i) => (
                    <li
                      key={str(s["id"]) + i}
                      className="flex items-center justify-between gap-3 rounded-xl bg-background px-3 py-2 text-xs"
                    >
                      <span className="min-w-0 truncate font-semibold">
                        {str(s["subject_name"] ?? s["topic"] ?? s["kind"])}
                      </span>
                      <span className="num shrink-0 text-muted-foreground">
                        {fmtHM(Number(s["duration_minutes"] ?? 0))} ·{" "}
                        {new Date(str(s["started_at"])).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </aside>
    </div>
  );
}
