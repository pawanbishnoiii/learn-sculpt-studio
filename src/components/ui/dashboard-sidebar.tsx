import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Menu, X, type LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type DashboardNavGroup = {
  label: string;
  items: DashboardNavItem[];
};

function SidebarBody({
  groups,
  pathname,
  collapsed,
  onCollapse,
  onNavigate,
}: {
  groups: DashboardNavGroup[];
  pathname: string;
  collapsed: boolean;
  onCollapse?: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-panel p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-1 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">C</span>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-bold">Chronodeck</p>
              <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">Admin OS</p>
            </div>
          ) : null}
        </div>
        {onCollapse ? (
          <Button variant="ghost" size="icon" onClick={onCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="size-9 min-h-9">
            <ChevronLeft className={cn("transition-transform", collapsed && "rotate-180")} />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={onNavigate} aria-label="Close menu" className="size-9 min-h-9">
            <X />
          </Button>
        )}
      </div>

      <nav aria-label="Admin" className="mt-4 flex-1 space-y-5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label}>
            {!collapsed ? <p className="mb-1 px-3 text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">{group.label}</p> : null}
            <div className="space-y-1">
              {group.items.map(({ to, label, icon: Icon, exact }) => {
                const active = exact ? pathname === to : pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={onNavigate}
                    title={collapsed ? label : undefined}
                    className={cn(
                      "relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                      active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active ? <motion.span layoutId="admin-sidebar-active" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-yellow" /> : null}
                    <Icon className="size-4 shrink-0" />
                    {!collapsed ? <span className="truncate">{label}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <Link to="/today" onClick={onNavigate} className={cn("mt-4 flex min-h-11 items-center justify-center rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-secondary", collapsed && "px-0")}>
        {collapsed ? "←" : "Back to study"}
      </Link>
    </div>
  );
}

export function DashboardSidebar({ groups, pathname }: { groups: DashboardNavGroup[]; pathname: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
      <aside className={cn("sticky top-4 hidden h-[calc(100svh-2rem)] shrink-0 overflow-hidden rounded-2xl border border-border shadow-sm transition-[width] duration-300 lg:block", collapsed ? "w-16" : "w-64")}>
        <SidebarBody groups={groups} pathname={pathname} collapsed={collapsed} onCollapse={() => setCollapsed((value) => !value)} />
      </aside>

      <Button onClick={() => setMobileOpen(true)} size="icon" className="fixed bottom-5 left-4 z-40 shadow-xl lg:hidden" aria-label="Open admin menu">
        <Menu />
      </Button>
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div className="fixed inset-0 z-[90] bg-overlay lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)}>
            <motion.aside className="h-full w-[min(84vw,19rem)] border-r border-border" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 360, damping: 34 }} onClick={(event) => event.stopPropagation()}>
              <SidebarBody groups={groups} pathname={pathname} collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}