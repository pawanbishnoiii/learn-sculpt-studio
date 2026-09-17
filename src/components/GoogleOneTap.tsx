import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getGoogleClientId } from "@/lib/auth-config.functions";

const SDK_SRC = "https://accounts.google.com/gsi/client";

/** Build-time override; otherwise the ID comes from the server secret store. */
const ENV_CLIENT_ID = (import.meta.env["VITE_GOOGLE_CLIENT_ID"] as string | undefined)?.trim();

let clientIdPromise: Promise<string | null> | null = null;

/** Google Web Client ID — public value, resolved once per page load. */
export async function resolveGoogleClientId(): Promise<string | null> {
  if (ENV_CLIENT_ID) return ENV_CLIENT_ID;
  clientIdPromise ??= getGoogleClientId()
    .then((r) => r.clientId ?? null)
    .catch(() => null);
  return clientIdPromise;
}

declare global {
  interface Window {
    google?: any;
  }
}

function loadSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") return reject(new Error("no document"));
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gsi failed")));
      // The root already injects the tag; poll in case it loaded before we attached.
      const started = Date.now();
      const tick = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(tick);
          resolve();
        } else if (Date.now() - started > 8000) {
          clearInterval(tick);
          reject(new Error("gsi timeout"));
        }
      }, 120);
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gsi failed"));
    document.head.appendChild(s);
  });
}

let initialized = false;

async function initOneTap(onSignedIn?: () => void) {
  const clientId = await resolveGoogleClientId();
  if (!clientId) return false;
  await loadSdk();
  if (!window.google?.accounts?.id) return false;
  if (!initialized) {
    window.google.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: false,
      itp_support: true,
      use_fedcm_for_prompt: true,
      ux_mode: "popup",
      callback: async (response: { credential?: string }) => {
        if (!response?.credential) return;
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: response.credential,
        });
        if (error) {
          toast.error("Google sign-in failed. Try again.");
          return;
        }
        onSignedIn?.();
      },
    });
    initialized = true;
  }
  return true;
}

/** Opens the One Tap card (top-right). Resolves false when it can't be shown. */
export async function promptGoogleOneTap(onSignedIn?: () => void): Promise<boolean> {
  try {
    const ready = await initOneTap(onSignedIn);
    if (!ready) return false;
    window.google.accounts.id.prompt();
    return true;
  } catch {
    return false;
  }
}

/**
 * Google One Tap — no full-page redirect.
 * Shows the native One Tap prompt for signed-out visitors and exchanges the
 * returned Google JWT for a session in the background.
 * Silently does nothing when no Google Web Client ID is configured.
 */
export function GoogleOneTap({ onSignedIn }: { onSignedIn?: () => void }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session || cancelled) return;
      await promptGoogleOneTap(onSignedIn);
    })();

    return () => {
      cancelled = true;
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* noop */
      }
    };
  }, [onSignedIn]);

  return null;
}
