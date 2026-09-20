import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { flushQueue, isOnline, onQueueChange, pendingCount } from "@/lib/offline";

/**
 * Watches the connection and replays queued study writes as soon as the
 * network returns, then refreshes the caches that depend on them.
 */
export function useOfflineQueue() {
  const qc = useQueryClient();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refreshCount = async () => {
      const n = await pendingCount();
      if (!cancelled) setPending(n);
    };

    const sync = async () => {
      if (!isOnline()) return;
      setSyncing(true);
      try {
        const synced = await flushQueue();
        if (synced > 0 && !cancelled) {
          toast.success(`${synced} offline entry sync ho gayi`);
          for (const key of [
            ["sessions", "8w"],
            ["sessions", "study-recent"],
            ["plan"],
            ["reading"],
            ["breaks"],
            ["chapter-state"],
          ]) {
            void qc.invalidateQueries({ queryKey: key });
          }
        }
      } finally {
        if (!cancelled) setSyncing(false);
        void refreshCount();
      }
    };

    const goOnline = () => {
      setOnline(true);
      void sync();
    };
    const goOffline = () => setOnline(false);

    setOnline(isOnline());
    void refreshCount();
    void sync();

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const off = onQueueChange(() => void refreshCount());
    const timer = window.setInterval(() => void sync(), 60_000);

    return () => {
      cancelled = true;
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      off();
      window.clearInterval(timer);
    };
  }, [qc]);

  return { online, pending, syncing };
}
