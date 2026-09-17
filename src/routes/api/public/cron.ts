import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/cron")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = await authenticateCronRequest(request);
        if (authError) return authError;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.rpc("close_stale_sessions");
        if (error) {
          console.error("close_stale_sessions failed", error);
          return new Response("Failed to close sessions", { status: 500 });
        }
        const { dispatchDueNotifications } = await import("@/lib/notifications.server");
        const { sent } = await dispatchDueNotifications();
        return new Response(`ok (${sent} scheduled sent)`);
      },
    },
  },
});
