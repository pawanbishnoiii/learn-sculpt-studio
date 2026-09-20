import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/cron")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = await authenticateCronRequest(request);
        if (authError) return authError;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const results: Record<string, unknown> = {};
        const { error: closeError } = await supabaseAdmin.rpc("close_stale_sessions");
        results["sessions"] = closeError ? "failed" : "ok";
        if (closeError) console.error("close_stale_sessions failed", closeError);

        const { data: plans, error: planError } = await supabaseAdmin.rpc("refresh_all_daily_plans", {
          p_plan_date: new Date().toISOString().slice(0, 10),
        });
        results["plans"] = planError ? "failed" : plans;
        if (planError) console.error("refresh_all_daily_plans failed", planError);
        const { dispatchDueNotifications } = await import("@/lib/notifications.server");
        const { sent } = await dispatchDueNotifications();
        results["notifications"] = sent;
        return Response.json(results, { status: closeError && planError ? 500 : 200 });
      },
    },
  },
});
