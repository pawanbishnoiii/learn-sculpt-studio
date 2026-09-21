import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Keeps a long-running login alive.
 *
 * Mobile browsers freeze background tabs, so the automatic token refresh timer
 * can be suspended long enough for the stored session to look expired when the
 * user returns. Re-checking on visibility/online restores it before any query
 * fires, which is what makes "stay signed in for days" actually work.
 */
export function useSessionKeeper() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let last = 0;

    const revive = async () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last < 15_000) return;
      last = now;
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;
      const expiresIn = (session.expires_at ?? 0) * 1000 - now;
      if (expiresIn < 5 * 60_000) await supabase.auth.refreshSession();
    };

    document.addEventListener("visibilitychange", revive);
    window.addEventListener("online", revive);
    void revive();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });

    return () => {
      document.removeEventListener("visibilitychange", revive);
      window.removeEventListener("online", revive);
      sub.subscription.unsubscribe();
    };
  }, [router, queryClient]);
}
