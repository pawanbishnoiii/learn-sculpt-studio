import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

const input = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(400),
  /** Empty / omitted = broadcast to every user with a registered device. */
  userIds: z.array(z.string().uuid()).max(500).optional(),
  actionPath: z.string().max(200).optional(),
  imageUrl: z.string().url().max(1000).optional(),
  /** "all" = everyone, "active" = seen in the last 7 days, "subscribers" = has a device token. */
  audience: z.enum(["all", "active", "subscribers"]).optional(),
});

/** Admin-only: store an in-app notification and fan it out to FCM device tokens. */
export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => input.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!admin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("push_enabled")
      .maybeSingle();

    // Duplicate guard: double-taps / retried requests must not fan out twice.
    const { data: recent } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("created_by", context.userId)
      .eq("title", data.title)
      .gt("created_at", new Date(Date.now() - 60_000).toISOString())
      .limit(1);
    if (recent && recent.length > 0) {
      return { delivered: 0, stored: 0, pushEnabled: true, duplicate: true };
    }

    const audience = data.audience ?? "all";
    let targets = data.userIds ?? [];
    if (targets.length === 0) {
      if (audience === "subscribers") {
        const { data: rows } = await supabaseAdmin.from("device_tokens").select("user_id");
        targets = [...new Set((rows ?? []).map((r) => r.user_id))];
      } else {
        let q = supabaseAdmin.from("profiles").select("id");
        if (audience === "active") {
          q = q.gt("last_seen_at", new Date(Date.now() - 7 * 864e5).toISOString());
        }
        const { data: profiles } = await q;
        targets = (profiles ?? []).map((p) => p.id);
      }
    }
    if (targets.length === 0) return { delivered: 0, stored: 0, pushEnabled: true };

    const rows = targets.map((id) => ({
      user_id: id,
      title: data.title,
      body: data.body,
      kind: "info",
      action_path: data.actionPath ?? null,
      image_url: data.imageUrl ?? null,
      audience,
      created_by: context.userId,
    }));
    const { error: insertError } = await supabaseAdmin.from("notifications").insert(rows);
    if (insertError) throw new Error(insertError.message);

    if (settings?.push_enabled === false) {
      return { delivered: 0, stored: rows.length, pushEnabled: false };
    }

    const { data: tokens } = await supabaseAdmin
      .from("device_tokens")
      .select("token")
      .in("user_id", targets);

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["FIREBASE_MESSAGING_API_KEY"];
    if (!lovableKey || !connectionKey) {
      return { delivered: 0, stored: rows.length, pushEnabled: true };
    }

    let delivered = 0;
    const stale: string[] = [];

    for (const row of tokens ?? []) {
      const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": connectionKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: row.token,
            notification: {
              title: data.title,
              body: data.body,
              ...(data.imageUrl ? { image: data.imageUrl } : {}),
            },
            ...(data.actionPath ? { data: { path: data.actionPath } } : {}),
          },
        }),
      });
      if (res.ok) {
        delivered += 1;
        continue;
      }
      const text = await res.text();
      console.error(`FCM send failed [${res.status}]: ${text}`);
      if (res.status === 404 || res.status === 400) stale.push(row.token);
    }

    if (stale.length) await supabaseAdmin.from("device_tokens").delete().in("token", stale);

    return { delivered, stored: rows.length, pushEnabled: true };
  });

const selfInput = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(400),
  actionPath: z.string().max(200).optional(),
});

/** Any signed-in user: notify themselves (used when a study timer completes). */
export const notifySelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => selfInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actionPath = data.actionPath ?? "/history";

    await supabaseAdmin.from("notifications").insert({
      user_id: context.userId,
      title: data.title,
      body: data.body,
      kind: "session",
      action_path: actionPath,
      created_by: context.userId,
    });

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["FIREBASE_MESSAGING_API_KEY"];
    if (!lovableKey || !connectionKey) return { delivered: 0 };

    const { data: tokens } = await supabaseAdmin
      .from("device_tokens")
      .select("token")
      .eq("user_id", context.userId);

    let delivered = 0;
    const stale: string[] = [];
    for (const row of tokens ?? []) {
      const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": connectionKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: row.token,
            notification: { title: data.title, body: data.body },
            data: { path: actionPath },
          },
        }),
      });
      if (res.ok) {
        delivered += 1;
        continue;
      }
      const text = await res.text();
      console.error(`FCM send failed [${res.status}]: ${text}`);
      if (res.status === 404 || res.status === 400) stale.push(row.token);
    }
    if (stale.length) await supabaseAdmin.from("device_tokens").delete().in("token", stale);
    return { delivered };
  });
