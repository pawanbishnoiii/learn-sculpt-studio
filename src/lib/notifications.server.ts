/** Server-only fan-out helper shared by admin sends and the scheduled dispatcher. */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

export type FanOutPayload = {
  title: string;
  body: string;
  audience: "all" | "active" | "subscribers";
  actionPath?: string | null;
  imageUrl?: string | null;
  createdBy?: string | null;
};

export async function fanOutNotification(payload: FanOutPayload) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: settings } = await supabaseAdmin
    .from("app_settings")
    .select("push_enabled")
    .maybeSingle();

  let targets: string[] = [];
  if (payload.audience === "subscribers") {
    const { data: rows } = await supabaseAdmin.from("device_tokens").select("user_id");
    targets = [...new Set((rows ?? []).map((r) => r.user_id))];
  } else {
    let q = supabaseAdmin.from("profiles").select("id");
    if (payload.audience === "active") {
      q = q.gt("last_seen_at", new Date(Date.now() - 7 * 864e5).toISOString());
    }
    const { data: profiles } = await q;
    targets = (profiles ?? []).map((p) => p.id);
  }
  if (targets.length === 0) return { delivered: 0, stored: 0, pushEnabled: true };

  const rows = targets.map((id) => ({
    user_id: id,
    title: payload.title,
    body: payload.body,
    kind: "info",
    action_path: payload.actionPath ?? null,
    image_url: payload.imageUrl ?? null,
    audience: payload.audience,
    created_by: payload.createdBy ?? null,
  }));
  const { error } = await supabaseAdmin.from("notifications").insert(rows);
  if (error) throw new Error(error.message);

  if (settings?.push_enabled === false) {
    return { delivered: 0, stored: rows.length, pushEnabled: false };
  }

  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovableKey || !connectionKey) return { delivered: 0, stored: rows.length, pushEnabled: true };

  const { data: tokens } = await supabaseAdmin
    .from("device_tokens")
    .select("token")
    .in("user_id", targets);

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
            title: payload.title,
            body: payload.body,
            ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
          },
          data: { path: payload.actionPath ?? "/today" },
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
}

/** Sends every scheduled broadcast whose time has arrived. Claim-then-send avoids doubles. */
export async function dispatchDueNotifications() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: due } = await supabaseAdmin
    .from("scheduled_notifications")
    .select("*")
    .eq("status", "pending")
    .lte("send_at", new Date().toISOString())
    .limit(20);

  let sent = 0;
  for (const job of due ?? []) {
    // Atomic claim: only one worker can flip pending -> sending.
    const { data: claimed } = await supabaseAdmin
      .from("scheduled_notifications")
      .update({ status: "sending" })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    try {
      await fanOutNotification({
        title: job.title,
        body: job.body ?? "",
        audience: (job.audience as "all" | "active" | "subscribers") ?? "all",
        actionPath: job.action_path,
        imageUrl: job.image_url,
        createdBy: job.created_by,
      });
      await supabaseAdmin
        .from("scheduled_notifications")
        .update({ status: "sent", error: null })
        .eq("id", job.id);
      sent += 1;
    } catch (e) {
      await supabaseAdmin
        .from("scheduled_notifications")
        .update({ status: "failed", error: (e as Error).message })
        .eq("id", job.id);
    }
  }
  return { sent };
}
