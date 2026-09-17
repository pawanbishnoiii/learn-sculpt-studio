import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarRange,
  LayoutDashboard,
  Palette,
  Settings2,
  Smartphone,
  Users,
} from "lucide-react";
import { isAdmin } from "@/lib/study";

const LINKS = [
  { to: "/admin", label: "Overview", Icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users & roles", Icon: Users },
  { to: "/admin/schedule", label: "Schedule", Icon: CalendarRange },
  { to: "/admin/notifications", label: "Notifications", Icon: Bell },
  { to: "/admin/branding", label: "Branding", Icon: Palette },
  { to: "/admin/android", label: "Android app", Icon: Smartphone },
  { to: "/admin/settings", label: "Settings", Icon: Settings2 },
] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: isAdmin });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (admin.isLoading) {
    return <p className="px-5 py-10 text-sm text-muted-foreground">Checking access…</p>;
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
    <div className="flex min-h-[calc(100svh-5rem)] gap-0 lg:gap-6">
      <aside className="sticky top-20 hidden h-[calc(100svh-6rem)] w-60 shrink-0 flex-col rounded-3xl border border-border bg-panel p-3 lg:flex">
        <div className="flex items-center gap-2.5 px-2 py-3">
          <span className="grid size-9 place-items-center rounded-2xl bg-foreground text-background">
            <LayoutDashboard className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-heading truncate text-sm font-extrabold tracking-tight">Chronodeck</p>
            <p className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">Admin</p>
          </div>
        </div>
        <nav className="mt-2 space-y-1">
          {LINKS.map(({ to, label, Icon, ...rest }) => {
            const exact = "exact" in rest && rest.exact;
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand text-brand-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 pb-10">
        {/* mobile section switcher */}
        <div className="sticky top-[4.5rem] z-20 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-background/95 px-4 py-3 lg:hidden">
          {LINKS.map(({ to, label, Icon, ...rest }) => {
            const exact = "exact" in rest && rest.exact;
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  active ? "bg-foreground text-background" : "border border-border text-muted-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="px-4 sm:px-5 lg:px-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
