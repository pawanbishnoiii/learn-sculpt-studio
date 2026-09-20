import { createFileRoute } from "@tanstack/react-router";
import { AdminBrandingPanel } from "@/components/admin/AdminBrandingPanel";
import { AdminAvatarPanel } from "@/components/admin/AdminAvatarPanel";

export const Route = createFileRoute("/_authenticated/admin/branding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Branding — Bnoy Study Admin" },
      { name: "description", content: "Upload the Bnoy Study logo, favicon, banners and the shared avatar gallery." },
      { property: "og:title", content: "Branding — Bnoy Study Admin" },
      { property: "og:description", content: "Manage logo, favicon, banners and avatar presets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Branding</h1>
        <p className="mt-1 text-sm text-muted-foreground">Logo, favicon, banners and avatar presets.</p>
      </header>
      <AdminBrandingPanel />
      <AdminAvatarPanel />
    </div>
  ),
});
