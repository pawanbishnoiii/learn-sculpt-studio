import { createFileRoute } from "@tanstack/react-router";
import { EmailDelivery, SiteSettings } from "@/components/admin/AdminSections";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Platform settings — Bnoy Study Admin" },
      { name: "description", content: "Feature switches, default study goals and outgoing email configuration." },
      { property: "og:title", content: "Platform settings — Bnoy Study Admin" },
      { property: "og:description", content: "Feature flags, default goals and email delivery for Bnoy Study." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Feature switches, defaults and email delivery.</p>
      </header>
      <SiteSettings />
      <EmailDelivery />
    </div>
  ),
});
