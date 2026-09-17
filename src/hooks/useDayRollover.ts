import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

function localDayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function msUntilMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2, 0);
  return Math.max(1000, next.getTime() - now.getTime());
}

/**
 * Keeps "today" honest. Screens left open past midnight used to keep showing
 * yesterday's totals, so at the student's local midnight (and whenever the app
 * comes back to the foreground) we bump the day key and refetch everything that
 * is scoped to a day.
 */
export function useDayRollover() {
  const qc = useQueryClient();
  const [day, setDay] = useState(() => localDayKey());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const sync = () => {
      const key = localDayKey();
      setDay((prev) => {
        if (prev === key) return prev;
        void qc.invalidateQueries();
        return key;
      });
    };

    const schedule = () => {
      timer = setTimeout(() => {
        sync();
        schedule();
      }, msUntilMidnight());
    };

    schedule();

    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [qc]);

  return day;
}
