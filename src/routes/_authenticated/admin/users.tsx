import { createFileRoute } from "@tanstack/react-router";
import { UsageInsights } from "@/components/admin/AdminSections";
import { PlatformBreakdown } from "@/components/admin/PlatformBreakdown";

export const Route = createFileRoute("/_authenticated/admin/users")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Users & roles — Chronodeck Admin" },
      { name: "description", content: "Search Chronodeck accounts, review presence and grant admin or moderator roles." },
      { property: "og:title", content: "Users & roles — Chronodeck Admin" },
      { property: "og:description", content: "Manage Chronodeck accounts, presence and roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Users & roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">Who is online, how they study, and what they can access.</p>
      </header>
      <PlatformBreakdown />
      <UsageInsights />
    </div>
  ),
});
