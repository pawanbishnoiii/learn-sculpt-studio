import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

/** Routes that own the whole viewport and must not render the app chrome. */
const BARE_ROUTES = ["/onboarding"];

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    if (location.pathname !== "/onboarding") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!profile?.onboarded) throw redirect({ to: "/onboarding" });
    }

    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (BARE_ROUTES.some((r) => pathname.startsWith(r))) return <Outlet />;
  return (
    <AppShell>
      <div data-page={pathname.slice(1)} className="route-experience">
        <Outlet />
      </div>
    </AppShell>
  );
}
