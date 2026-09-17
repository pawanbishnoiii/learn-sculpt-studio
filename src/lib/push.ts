import { supabase } from "@/integrations/supabase/client";

const appId = import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID'] as
  | string
  | undefined;
const vapidKey = import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY'] as
  | string
  | undefined;

const firebaseConfig = {
  apiKey: import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY'] as
    | string
    | undefined,
  projectId: import.meta.env['VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID'] as
    | string
    | undefined,
  appId,
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushStatus =
  | "registered"
  | "not-configured"
  | "unsupported"
  | "open-in-new-tab"
  | "denied"
  | "signed-out";

export type PushResult = { status: PushStatus; token?: string };

export const pushCopy: Record<PushStatus, string> = {
  registered: "Notifications on — ab reminders is device par aayenge.",
  "not-configured": "Push abhi configure nahi hai. Admin ko bolo web push enable kare.",
  unsupported: "Is browser me push notifications support nahi hain.",
  "open-in-new-tab": "Preview iframe me permission nahi milti — app ko naye tab me kholo.",
  denied: "Notifications block hain — browser site settings se allow karo.",
  "signed-out": "Pehle sign in karo.",
};

export function isPushConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      appId &&
      vapidKey &&
      firebaseConfig.messagingSenderId,
  );
}

/**
 * Runs on every app start: when the user has already granted notification
 * permission we silently refresh their FCM token row in `device_tokens`, so
 * rotated tokens never go stale and admins always see live devices.
 * Never prompts — that still requires an explicit tap.
 */
export async function syncDeviceTokenOnStart(): Promise<PushResult> {
  if (typeof window === "undefined") return { status: "unsupported" };
  if (!isPushConfigured()) return { status: "not-configured" };
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return { status: "denied" };
  }
  if (window.top !== window.self) return { status: "open-in-new-tab" };
  try {
    return await enablePush();
  } catch {
    return { status: "unsupported" };
  }
}

/** Must be called from a click handler and from a top-level page (not an iframe). */
export async function enablePush(): Promise<PushResult> {
  if (!isPushConfigured()) return { status: "not-configured" };

  const { isSupported, getMessaging, getToken } = await import("firebase/messaging");
  const { initializeApp, getApps, getApp } = await import("firebase/app");

  if (!("Notification" in window) || !("serviceWorker" in navigator) || !(await isSupported())) {
    return { status: "unsupported" };
  }
  if (window.top !== window.self) return { status: "open-in-new-tab" };

  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const registration = await registerActiveWorker();

  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: firebaseConfig.apiKey!,
        projectId: firebaseConfig.projectId!,
        appId: appId!,
        messagingSenderId: firebaseConfig.messagingSenderId,
      });
  const messaging = getMessaging(app);

  let token: string | null = null;
  try {
    token = await getToken(messaging, { vapidKey: vapidKey!, serviceWorkerRegistration: registration });
  } catch (err) {
    // Android Chrome sometimes still reports "no active service worker" on the
    // very first subscribe. One re-registration + retry clears it reliably.
    if (!/no active service worker/i.test(String(err))) throw err;
    const retryReg = await registerActiveWorker(true);
    token = await getToken(messaging, { vapidKey: vapidKey!, serviceWorkerRegistration: retryReg });
  }

  if (!token) return { status: "denied" };

  const { data } = await supabase.auth.getUser();
  if (!data.user) return { status: "signed-out" };

  await supabase.from("device_tokens").upsert(
    {
      user_id: data.user.id,
      token,
      platform: "web",
      device_label: navigator.userAgent.slice(0, 80),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );

  return { status: "registered", token };
}

/**
 * Registers the messaging worker and does not resolve until the registration
 * actually has an `active` worker — `getToken` throws otherwise.
 */
async function registerActiveWorker(force = false): Promise<ServiceWorkerRegistration> {
  const query = new URLSearchParams(
    Object.entries(firebaseConfig).filter(([, v]) => Boolean(v)) as [string, string][],
  ).toString();
  const url = `/firebase-messaging-sw.js?${query}`;

  if (force) {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing) await existing.unregister().catch(() => {});
  }

  const registration = await navigator.serviceWorker.register(url, { scope: "/" });
  await registration.update().catch(() => {});
  await waitForActive(registration);
  await navigator.serviceWorker.ready;

  // `ready` can resolve with a different registration object than the one we
  // just created; always hand FCM one that has an active worker.
  if (registration.active) return registration;
  const ready = await navigator.serviceWorker.ready;
  return ready;
}

/** Resolves once the registration has an activated worker (or times out). */
async function waitForActive(reg: ServiceWorkerRegistration): Promise<void> {
  if (reg.active) return;
  const worker = reg.installing ?? reg.waiting;
  if (!worker) {
    // Nothing installing yet — poll briefly for the browser to pick it up.
    for (let i = 0; i < 40 && !reg.active; i += 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
    return;
  }
  await new Promise<void>((resolve) => {
    const done = () => {
      worker.removeEventListener("statechange", onChange);
      resolve();
    };
    const onChange = () => {
      if (worker.state === "activated" || worker.state === "redundant") done();
    };
    worker.addEventListener("statechange", onChange);
    setTimeout(done, 10_000);
  });
}
