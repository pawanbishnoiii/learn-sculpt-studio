/**
 * Client platform detection — lets the admin console tell whether an account is
 * signing in from the Android app shell or a normal web browser.
 *
 * The Android wrapper is expected to expose `window.Bnoy StudyApp` (JS bridge)
 * or append `Bnoy StudyApp/<version>` to the WebView user-agent.
 */
export type Platform = "android-app" | "android-web" | "ios" | "web";

declare global {
  interface Window {
    Bnoy StudyApp?: { version?: string };
  }
}

export function detectPlatform(): Platform {
  if (typeof window === "undefined") return "web";
  const ua = navigator.userAgent || "";
  if (window.Bnoy StudyApp || /Bnoy StudyApp/i.test(ua)) return "android-app";
  if (/Android/i.test(ua)) return "android-web";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  return "web";
}

export function platformLabel(p: Platform | string | null | undefined) {
  switch (p) {
    case "android-app":
      return "Android app";
    case "android-web":
      return "Android browser";
    case "ios":
      return "iOS browser";
    default:
      return "Web";
  }
}

export function appVersion() {
  if (typeof window === "undefined") return null;
  return window.Bnoy StudyApp?.version ?? null;
}

/**
 * Everything the admin console needs to answer "web ya Android app?" and
 * "kaunse URL se?" for a single app load.
 */
export function clientContext() {
  if (typeof window === "undefined") return { platform: "web" as Platform };
  return {
    platform: detectPlatform(),
    app_version: appVersion(),
    host: window.location.host,
    origin: window.location.origin,
    path: window.location.pathname,
    referrer: document.referrer ? new URL(document.referrer).host : null,
    standalone:
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari home-screen apps
      (navigator as unknown as { standalone?: boolean }).standalone === true,
    screen: `${window.screen.width}x${window.screen.height}`,
    lang: navigator.language,
    ua: navigator.userAgent.slice(0, 200),
  };
}
