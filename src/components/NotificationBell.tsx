import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import {
  fetchInbox,
  markAllNotificationsRead,
  markNotificationRead,
  type InboxItem,
} from "@/lib/study";

/** Header bell + in-app inbox sheet. Realtime updates arrive via useRealtimeSync. */
export function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const inbox = useQuery({ queryKey: ["notifications"], queryFn: () => fetchInbox(40) });
  const items = inbox.data ?? [];
  const unread = items.filter((n) => !n.read).length;

  async function openItem(n: InboxItem) {
    setOpen(false);
    if (!n.read) {
      await markNotificationRead(n.id).catch(() => {});
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    }
    if (n.action_path) navigate({ to: n.action_path });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative grid size-9 place-items-center rounded-full bg-secondary/60 text-foreground outline-1 -outline-offset-1 outline-border transition-transform active:scale-95"
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-[var(--state-partial)] px-1 text-[9px] font-bold text-background">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <button
              aria-hidden
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="fixed right-3 z-50 mt-2 max-h-[70vh] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[26px] border border-border bg-popover p-2 shadow-2xl sm:absolute sm:right-0"
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="text-sm font-semibold">Notifications</p>
                {unread > 0 ? (
                  <button
                    onClick={async () => {
                      await markAllNotificationsRead().catch(() => {});
                      void qc.invalidateQueries({ queryKey: ["notifications"] });
                    }}
                    className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <CheckCheck className="size-3.5" /> Mark all read
                  </button>
                ) : null}
              </div>

              {inbox.isLoading ? (
                <div className="space-y-2 p-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                  Abhi koi notification nahi hai.
                </p>
              ) : (
                <ul className="space-y-1">
                  {items.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => void openItem(n)}
                        className={`w-full rounded-2xl p-3 text-left transition-colors hover:bg-accent ${
                          n.read ? "" : "bg-accent/60"
                        }`}
                      >
                        {n.image_url ? (
                          <img
                            src={n.image_url}
                            alt=""
                            loading="lazy"
                            className="mb-2 h-24 w-full rounded-xl object-cover"
                          />
                        ) : null}
                        <p className="text-sm font-semibold text-foreground">{n.title}</p>
                        {n.body ? (
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                        ) : null}
                        <p className="mt-1 text-[10px] text-muted-foreground/70">
                          {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
