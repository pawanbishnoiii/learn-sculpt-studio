import { CloudOff, RefreshCw } from "lucide-react";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

/**
 * Small live badge: shows when the app is offline and how many study entries
 * are still waiting to sync.
 */
export function OfflineStatus() {
  const { online, pending, syncing } = useOfflineQueue();

  if (online && pending === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-border bg-panel/95 px-3 py-1.5 text-[11px] font-bold shadow-lg backdrop-blur">
        {online ? (
          <RefreshCw className={`h-3.5 w-3.5 text-brand ${syncing ? "animate-spin" : ""}`} />
        ) : (
          <CloudOff className="h-3.5 w-3.5 text-amber-500" />
        )}
        <span className="truncate">
          {online
            ? `${pending} entry sync ho rahi hai`
            : pending > 0
              ? `Offline · ${pending} entry safe hai`
              : "Offline · sab kuch local save hoga"}
        </span>
      </div>
    </div>
  );
}
