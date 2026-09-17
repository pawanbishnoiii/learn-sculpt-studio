import { useState } from "react";
import { toast } from "sonner";
import { enablePush, pushCopy } from "@/lib/push";

/** One-tap opt-in for browser / Android push notifications. */
export function PushToggle() {
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission === "granted"
      : false,
  );

  async function turnOn() {
    setBusy(true);
    try {
      const result = await enablePush();
      if (result.status === "registered") {
        setOn(true);
        toast.success(pushCopy.registered);
      } else {
        toast.error(pushCopy[result.status]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Notifications enable nahi hui");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass-panel flex items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <h2 className="text-sm font-bold tracking-tight">Notifications</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Study reminders aur admin announcements is device par.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void turnOn()}
        disabled={busy || on}
        className="shrink-0 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60"
      >
        {on ? "Enabled" : busy ? "Enabling…" : "Enable"}
      </button>
    </section>
  );
}
