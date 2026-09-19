import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-observed login / app-open telemetry.
 *
 * The browser cannot read its own public IP or network provider, so the IP is
 * taken from the edge request headers here and the client only supplies the
 * device context it can actually see.
 */
const clientContextSchema = z
  .object({
    platform: z.string().max(40).optional(),
    app_version: z.string().max(40).optional(),
    host: z.string().max(200).optional(),
    origin: z.string().max(300).optional(),
    path: z.string().max(300).optional(),
    referrer: z.string().max(200).nullable().optional(),
    standalone: z.boolean().optional(),
    screen: z.string().max(40).optional(),
    lang: z.string().max(40).optional(),
    ua: z.string().max(300).optional(),
    connection: z.string().max(40).nullable().optional(),
  })
  .partial();

function deviceLabel(ua: string): { device: string; browser: string; os: string } {
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /Android/i.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/i.test(ua)
        ? "iOS"
        : /Mac OS X/i.test(ua)
          ? "macOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Unknown";
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /OPR\//i.test(ua)
      ? "Opera"
      : /Chrome\//i.test(ua)
        ? "Chrome"
        : /Safari\//i.test(ua)
          ? "Safari"
          : /Firefox\//i.test(ua)
            ? "Firefox"
            : "Unknown";
  const device = /iPad|Tablet/i.test(ua)
    ? "Tablet"
    : /Mobi|Android|iPhone/i.test(ua)
      ? "Phone"
      : "Desktop";
  return { device, browser, os };
}

export const recordLoginEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        event: z.enum(["sign_in", "app_open", "sign_out"]).default("sign_in"),
        context: clientContextSchema.default({}),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const request = getRequest();
    const h = request?.headers;
    const ip =
      h?.get("cf-connecting-ip") ??
      h?.get("x-real-ip") ??
      h?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    const ua = data.context.ua ?? h?.get("user-agent") ?? "";
    const labels = deviceLabel(ua);

    const { error } = await context.supabase.from("app_events").insert({
      user_id: context.userId,
      event: data.event,
      path: data.context.path ?? null,
      platform: data.context.platform ?? null,
      metadata: {
        ...data.context,
        ip,
        country: h?.get("cf-ipcountry") ?? null,
        city: h?.get("cf-ipcity") ?? null,
        // Browsers do not expose the network provider / ISP name; only the
        // coarse connection type is available and only on some browsers.
        network_provider: null,
        ...labels,
      } as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true, ip };
  });
