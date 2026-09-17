import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { BellRing, Check, History, ImagePlus, Trash2, Users, X } from "lucide-react";
import { sendNotification } from "@/lib/notifications.functions";
import {
  cancelScheduledNotification,
  deleteBrandImage,
  fetchAdminUsers,
  fetchNotificationHistory,
  fetchPushStats,
  fetchPushSubscribers,
  fetchScheduledNotifications,
  listBrandImages,
  relativeTime,
  scheduleNotification,
  uploadBrandImageWithProgress,
} from "@/lib/study";

/**
 * The server sometimes answers with an HTML error page (deploy in progress,
 * "Project not found", gateway 502). Dumping that markup into a toast is
 * useless — translate it into something a human can act on.
 */
function friendlyError(e: Error) {
  const raw = e.message ?? "";
  if (/<!doctype|<html|Project not found|No Lovable project/i.test(raw)) {
    return "Server abhi respond nahi kar raha (deploy chal raha ho sakta hai). Thodi der baad dubara try karo.";
  }
  if (/Forbidden/i.test(raw)) return "Sirf admin notification bhej sakte hain.";
  if (/Unauthorized|401/.test(raw)) return "Session expire ho gaya — dubara sign in karo.";
  if (/Failed to fetch|NetworkError/i.test(raw)) return "Network issue — connection check karke retry karo.";
  return raw.length > 160 ? "Notification bhejne me problem aayi. Dubara try karo." : raw;
}

const AUDIENCES = [
  { id: "all", label: "Everyone" },
  { id: "active", label: "Active (7d)" },
  { id: "subscribers", label: "Subscribers" },
  { id: "picked", label: "Chosen users" },
] as const;

type Tab = "compose" | "subscribers" | "history";

/** Admin console: compose pushes, see who subscribed, review the send history. */
export function AdminPushPanel() {
  const send = useServerFn(sendNotification);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("compose");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [actionPath, setActionPath] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]["id"]>("all");
  const [banner, setBanner] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [sendAt, setSendAt] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [userQuery, setUserQuery] = useState("");

  const users = useQuery({
    queryKey: ["admin-users-picker"],
    queryFn: () => fetchAdminUsers(200),
    enabled: audience === "picked",
  });
  const filteredUsers = (users.data ?? []).filter((u) => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return true;
    return `${u.display_name ?? ""} ${u.email ?? ""}`.toLowerCase().includes(q);
  });



  const gallery = useQuery({
    queryKey: ["brand-banners"],
    queryFn: () => listBrandImages("banners"),
  });

  const stats = useQuery({ queryKey: ["push-stats"], queryFn: fetchPushStats });
  const subs = useQuery({
    queryKey: ["push-subscribers"],
    queryFn: () => fetchPushSubscribers(200),
    enabled: tab === "subscribers",
  });
  const history = useQuery({
    queryKey: ["push-history"],
    queryFn: () => fetchNotificationHistory(50),
    enabled: tab === "history",
  });

  const scheduled = useQuery({
    queryKey: ["push-scheduled"],
    queryFn: fetchScheduledNotifications,
  });

  const schedule = useMutation({
    mutationFn: () =>
      scheduleNotification({
        title: title.trim(),
        body: body.trim(),
        audience: audience === "picked" ? "all" : audience,
        sendAt,
        ...(actionPath.trim() ? { actionPath: actionPath.trim() } : {}),
        ...(banner ? { imageUrl: banner } : {}),
      }),
    onSuccess: () => {
      setSendAt("");
      void scheduled.refetch();
      toast.success("Notification schedule ho gayi");
    },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  const mutation = useMutation({
    mutationFn: () =>
      send({
        data: {
          title: title.trim(),
          body: body.trim(),
          audience: audience === "picked" ? "all" : audience,
          ...(audience === "picked" ? { userIds: picked } : {}),
          ...(actionPath.trim() ? { actionPath: actionPath.trim() } : {}),
          ...(banner ? { imageUrl: banner } : {}),
        },
      }),
    retry: false,
    onSuccess: (r) => {
      if ("duplicate" in r && r.duplicate) {
        toast.message("Same notification abhi bheji ja chuki hai — duplicate skip kiya.");
        return;
      }
      setTitle("");
      setBody("");
      setActionPath("");
      setBanner("");
      setPicked([]);
      void stats.refetch();
      void history.refetch();
      toast.success(
        r.pushEnabled
          ? `Sent to ${r.stored} users · ${r.delivered} devices`
          : `Saved for ${r.stored} users (push admin settings me off hai)`,
      );
    },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  async function onPickBanner(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Sirf image file upload karo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image 5MB se choti honi chahiye.");
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const url = await uploadBrandImageWithProgress(file, "banners", setProgress);
      setBanner(url);
      void gallery.refetch();
      toast.success("Banner uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }


  const disabled =
    !title.trim() ||
    !body.trim() ||
    mutation.isPending ||
    (audience === "picked" && picked.length === 0);
  const s = stats.data;

  return (
    <section className="glass-panel p-4 sm:p-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold tracking-tight">Notifications</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Web + Android — send, track, manage.</p>
        </div>
        <BellRing className="size-5 shrink-0 text-muted-foreground" />
      </header>

      {/* Subscription stats */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Subscribers" value={s ? `${s.subscribers}/${s.total_users}` : "—"} />
        <Stat label="Devices" value={s ? String(s.devices) : "—"} />
        <Stat label="Web / Android" value={s ? `${s.web} / ${s.android}` : "—"} />
        <Stat label="Sent today" value={s ? String(s.sent_today) : "—"} />
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-full bg-muted p-1.5">
        {(
          [
            ["compose", "Compose", BellRing],
            ["subscribers", "Subscribers", Users],
            ["history", "History", History],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
              tab === id
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {tab === "compose" ? (
        <div className="mt-4">
          <div className="flex flex-wrap gap-1.5">
            {AUDIENCES.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAudience(a.id)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  audience === a.id
                    ? "border-transparent bg-brand text-brand-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {audience === "picked" ? (
            <div className="mt-3 rounded-3xl border border-border p-3">
              <input
                className="input rounded-full"
                placeholder="Search name or email"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {picked.length} selected
                {users.isLoading ? " · loading users…" : ""}
              </p>
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                {filteredUsers.map((u) => {
                  const on = picked.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() =>
                        setPicked((p) => (on ? p.filter((x) => x !== u.id) : [...p, u.id]))
                      }
                      className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left text-xs transition-colors ${
                        on ? "bg-foreground text-background" : "hover:bg-muted"
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        {u.display_name ?? u.email ?? u.id.slice(0, 8)}
                      </span>
                      <span className="shrink-0 opacity-70">{relativeTime(u.last_seen_at)}</span>
                    </button>
                  );
                })}
                {!users.isLoading && filteredUsers.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-muted-foreground">Koi user nahi mila.</p>
                ) : null}
              </div>
            </div>
          ) : null}


          <input
            className="input mt-3 rounded-full"
            placeholder="Title"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="mt-2 min-h-20 w-full rounded-3xl border border-border bg-background p-3 text-sm"
            placeholder="Message"
            maxLength={400}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <input
            className="input mt-2 rounded-full"
            placeholder="Open path (optional) e.g. /today"
            value={actionPath}
            onChange={(e) => setActionPath(e.target.value)}
          />

          {/* Banner upload + gallery */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void onPickBanner(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {banner ? (
            <div className="relative mt-3 overflow-hidden rounded-[28px] border border-border">
              <img src={banner} alt="Notification banner" className="h-36 w-full object-cover" />
              <button
                type="button"
                onClick={() => setBanner("")}
                aria-label="Remove banner"
                className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-background/85 backdrop-blur transition-transform active:scale-90"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : null}

          {uploading ? (
            <div className="mt-3 rounded-[28px] border border-border p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <p className="truncate text-xs font-medium">Uploading banner…</p>
                <span className="num text-xs font-semibold">{progress ?? 0}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progress ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-200 ease-out"
                  style={{ width: `${progress ?? 0}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ImagePlus className="size-4" />
              {banner ? "Replace banner image" : "Upload banner image"}
            </button>
          )}

          {/* Previously uploaded banners */}
          {gallery.data && gallery.data.length > 0 ? (
            <div className="mt-4">
              <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                Gallery · {gallery.data.length}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {gallery.data.map((img) => {
                  const active = img.url === banner;
                  return (
                    <div
                      key={img.path}
                      className={`group relative aspect-[4/3] overflow-hidden rounded-2xl border transition-colors ${
                        active ? "border-brand" : "border-border"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setBanner(active ? "" : img.url)}
                        className="size-full"
                        aria-label={active ? "Unselect image" : "Use this image"}
                      >
                        <img
                          src={img.url}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </button>
                      {active ? (
                        <span className="pointer-events-none absolute top-1.5 left-1.5 grid size-6 place-items-center rounded-full bg-brand text-brand-foreground">
                          <Check className="size-3.5" />
                        </span>
                      ) : null}
                      <button
                        type="button"
                        aria-label="Delete image"
                        onClick={async () => {
                          try {
                            await deleteBrandImage(img.path);
                            if (active) setBanner("");
                            void gallery.refetch();
                            toast.success("Image deleted");
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                        className="absolute right-1.5 bottom-1.5 grid size-7 place-items-center rounded-full bg-background/85 backdrop-blur transition-transform active:scale-90"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}


          <button
            type="button"
            disabled={disabled}
            onClick={() => mutation.mutate()}
            className="mt-3 h-12 w-full rounded-full bg-foreground text-sm font-semibold text-background transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
          >
            {mutation.isPending ? "Sending…" : `Send to ${AUDIENCES.find((a) => a.id === audience)?.label}`}
          </button>

          {/* Schedule for later — a background job publishes it at the chosen time. */}
          <div className="mt-4 rounded-[24px] border border-border bg-secondary/40 p-3">
            <p className="eyebrow">schedule</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="datetime-local"
                value={sendAt}
                onChange={(e) => setSendAt(e.target.value)}
                className="h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm"
              />
              <button
                type="button"
                disabled={
                  !title.trim() ||
                  !body.trim() ||
                  !sendAt ||
                  audience === "picked" ||
                  schedule.isPending
                }
                onClick={() => schedule.mutate()}
                className="h-11 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-50"
              >
                {schedule.isPending ? "Scheduling…" : "Schedule"}
              </button>
            </div>
            {(scheduled.data ?? []).length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {(scheduled.data ?? []).map((j) => (
                  <li
                    key={j.id}
                    className="flex items-center justify-between gap-2 rounded-2xl bg-background px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">{j.title}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {new Date(j.send_at).toLocaleString()} · {j.audience} · {j.status}
                      </span>
                    </span>
                    <button
                      onClick={async () => {
                        await cancelScheduledNotification(j.id).catch(() => {});
                        void scheduled.refetch();
                      }}
                      className="shrink-0 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "subscribers" ? (
        <ul className="mt-4 space-y-2">
          {subs.isLoading ? <li className="shimmer h-16 rounded-2xl" /> : null}
          {subs.data?.length === 0 ? (
            <li className="rounded-2xl border border-border p-4 text-center text-xs text-muted-foreground">
              Abhi kisi ne notifications enable nahi ki.
            </li>
          ) : null}
          {(subs.data ?? []).map((u) => (
            <li
              key={u.user_id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border p-3"
            >
              <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-[10px] font-semibold">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="size-full object-cover" loading="lazy" />
                ) : (
                  (u.display_name?.[0] ?? "U").toUpperCase()
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{u.display_name ?? "User"}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {u.platforms ?? "web"} · {u.devices} device{u.devices === 1 ? "" : "s"} ·{" "}
                  {relativeTime(u.last_seen_at)}
                </span>
              </span>
              <span className="num shrink-0 rounded-full bg-muted px-2 py-1 text-[10px]">
                {u.devices}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === "history" ? (
        <ul className="mt-4 space-y-2">
          {history.isLoading ? <li className="shimmer h-16 rounded-2xl" /> : null}
          {history.data?.length === 0 ? (
            <li className="rounded-2xl border border-border p-4 text-center text-xs text-muted-foreground">
              Abhi tak koi notification nahi bheji gayi.
            </li>
          ) : null}
          {(history.data ?? []).map((n, i) => (
            <li key={`${n.title}-${n.sent_at}-${i}`} className="rounded-2xl border border-border p-3">
              {n.image_url ? (
                <img
                  src={n.image_url}
                  alt=""
                  className="mb-2 h-24 w-full rounded-2xl object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <p className="min-w-0 truncate text-sm font-semibold">{n.title}</p>
                <span className="num shrink-0 text-[10px] text-muted-foreground">
                  {relativeTime(n.sent_at)}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
              <p className="num mt-2 text-[10px] text-muted-foreground">
                {n.audience ?? "all"} · {n.recipients} sent · {n.read_count} read
                {n.action_path ? ` · ${n.action_path}` : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-raised min-w-0 p-3">
      <p className="truncate text-[10px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="num mt-1 truncate text-base font-bold">{value}</p>
    </div>
  );
}
