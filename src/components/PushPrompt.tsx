import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { enablePush, pushCopy } from "@/lib/push";

const DISMISS_KEY = "chronodeck.push-prompt.dismissed";
const SNOOZE_KEY = "chronodeck.push-prompt.snoozed-until";
const SNOOZE_MS = 24 * 60 * 60 * 1000;

/**
 * Compact inline invitation. Permission is requested only after explicit opt-in.
 */
export function PushPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    const until = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    if (Number.isFinite(until) && until > Date.now()) return;
    const t = setTimeout(() => setShow(true), 7000);
    return () => clearTimeout(t);
  }, []);

  function close(permanent = false) {
    if (permanent) localStorage.setItem(DISMISS_KEY, "1");
    else localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    setShow(false);
  }

  async function allow() {
    setBusy(true);
    try {
      const result = await enablePush();
      if (result.status === "registered") {
        toast.success(pushCopy.registered);
        close(true);
      } else {
        toast.error(pushCopy[result.status]);
        close(result.status === "denied" || result.status === "unsupported");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Notifications enable nahi hui");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="fixed right-3 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-3 z-[70] rounded-2xl border border-border bg-panel p-3 shadow-xl sm:right-5 sm:left-auto sm:w-[390px] lg:bottom-5"
        >
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => close(true)}
            className="absolute top-2 right-2 grid size-9 place-items-center rounded-full text-muted-foreground"
          >
            <X className="size-4" />
          </button>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lavender-soft text-foreground">
              <Bell className="size-5" />
            </span>
            <div className="min-w-0 pr-6">
              <h3 className="text-sm font-bold">Study reminders</h3>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Get session summaries and planned-study reminders on this device.
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 pl-[52px]">
            <button
              type="button"
              onClick={() => close(false)}
              className="h-10 min-h-10 flex-1 rounded-full border border-border text-xs font-semibold"
            >
              Later
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void allow()}
              className="h-10 min-h-10 flex-[2] rounded-full bg-foreground text-xs font-bold text-background disabled:opacity-60"
            >
              {busy ? "Enabling…" : "Enable"}
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
