import { createServerFn } from "@tanstack/react-start";

/**
 * Public Google Web Client ID for the native One Tap prompt.
 *
 * The client ID is a *public* OAuth identifier (it ships in the One Tap
 * request anyway), so returning it to the browser is safe. It lives in the
 * server secret store as GOOGLE_OAUTH_CLIENT_ID, which is why it needs a
 * server function instead of a VITE_ variable.
 */
export const getGoogleClientId = createServerFn({ method: "GET" }).handler(async () => {
  const id = (process.env["GOOGLE_OAUTH_CLIENT_ID"] ?? "").trim();
  return { clientId: id || null };
});
