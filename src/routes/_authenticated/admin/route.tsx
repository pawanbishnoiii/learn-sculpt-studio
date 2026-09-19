import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Activity,
  ArchiveRestore,
  CalendarRange,
  LayoutDashboard,
  Palette,
  Settings2,
  Smartphone,
  Users,
} from "lucide-react";
import { isAdmin } from "@/lib/study";
import { DashboardSidebar, type DashboardNavGroup } from "@/components/ui/dashboard-sidebar";
import { GooeyLoader } from "@/components/ui/gooey-loader";

const GROUPS: DashboardNavGroup[] = [
  { label: "Workspace", items: [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { to: "/admin/users", label: "Users & roles", icon: Users },
    { to: "/admin/activity", label: "Activity", icon: Activity },
    { to: "/admin/data", label: "Data transfer", icon: ArchiveRestore },
  ] },
  { label: "Operations", items: [
    { to: "/admin/schedule", label: "Schedule", icon: CalendarRange },
    { to: "/admin/notifications", label: "Notifications", icon: Bell },
  ] },
  { label: "Product", items: [
    { to: "/admin/branding", label: "Branding", icon: Palette },
    { to: "/admin/android", label: "Android app", icon: Smartphone },
    { to: "/admin/settings", label: "Settings", icon: Settings2 },
  ] },
];

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: isAdmin });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (admin.isLoading) {
    return <GooeyLoader label="Checking admin access" className="min-h-[70svh]" />;
  }

  if (!admin.data) {
    return (
      <div className="px-5 py-10">
        <div className="rounded-3xl border border-border bg-panel p-6">
          <h1 className="text-xl font-bold tracking-tight">Admin only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This console is limited to accounts with the admin role.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-[1600px] gap-5 p-3 sm:p-4">
      <DashboardSidebar groups={GROUPS} pathname={pathname} />
      <div className="min-w-0 flex-1 pb-10">
        <div className="w-full px-1 sm:px-3 lg:px-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
