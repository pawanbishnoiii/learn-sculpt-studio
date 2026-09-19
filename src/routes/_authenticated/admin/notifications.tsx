import { createFileRoute } from "@tanstack/react-router";
import { AdminPushPanel } from "@/components/admin/AdminPushPanel";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  ssr: false,
  head: () => ({
    meta: [
       { title: "Notifications — Bnoy Study Admin" },
       { name: "description", content: "Compose, schedule and review push notifications sent to Bnoy Study students." },
       { property: "og:title", content: "Notifications — Bnoy Study Admin" },
      { property: "og:description", content: "Send and schedule push notifications with audience targeting." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Compose, target, schedule and review delivery.</p>
      </header>
      <AdminPushPanel />
    </div>
  ),
});
