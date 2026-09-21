import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageSkeleton } from "@/components/ui/skeletons";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in — Bnoy Study" },
      { name: "description", content: "Finishing your Google sign-in and opening your Bnoy Study dashboard." },
      { property: "og:title", content: "Signing you in — Bnoy Study" },
      { property: "og:description", content: "Finishing your Google sign-in for Bnoy Study." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthCallback,
});

/** Public landing spot for the Google redirect flow used outside Lovable hosting. */
function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function finish(userId?: string) {
      if (cancelled || !userId) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", userId)
        .maybeSingle();
      navigate({ to: profile?.onboarded ? "/today" : "/onboarding", replace: true });
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void finish(session?.user.id);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void finish(data.session.user.id);
    });

    const timeout = window.setTimeout(() => {
      if (!cancelled) void supabase.auth.getSession().then(({ data }) => {
        if (!data.session) navigate({ to: "/auth", replace: true });
      });
    }, 6000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageSkeleton />
    </div>
  );
}
