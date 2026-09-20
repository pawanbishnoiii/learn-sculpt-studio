/* Bnoy Study push service worker. Config arrives via the registration query string
   because a service worker cannot read import.meta.env. */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Activate immediately so the very first getToken() call finds an active worker
// instead of failing with "Subscription failed - no active service worker".
self.addEventListener("install", (event) => event.waitUntil(
  caches.open("chronodeck-shell-v1").then((cache) => cache.addAll(["/", "/today", "/favicon.png", "/manifest.json"]).catch(() => {})).then(() => self.skipWaiting()),
));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open("chronodeck-shell-v1").then((cache) => cache.put(event.request, copy)).catch(() => {});
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))));
});

const firebaseConfig = Object.fromEntries(new URL(self.location).searchParams);
const messaging = firebaseConfig.apiKey ? (firebase.initializeApp(firebaseConfig), firebase.messaging()) : null;

messaging?.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Bnoy Study";
  self.registration.showNotification(title, {
    body: payload.notification?.body || "",
    icon: "/favicon.ico",
    data: { path: payload.data?.path || "/today" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.path || "/today";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(path);
          return client.focus();
        }
      }
      return self.clients.openWindow(path);
    }),
  );
});
