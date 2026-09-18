import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  GraduationCap,
  History as HistoryIcon,
  LayoutDashboard,
  LogOut,
  Play,
  Settings as SettingsIcon,
  ShieldCheck,
  Target,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { clientContext } from "@/lib/platform";
import { syncDeviceTokenOnStart } from "@/lib/push";
import appLogo from "@/assets/chronodeck-logo.png";

import {
  fetchSessions,
  fetchSettings,
  fetchXp,
  isAdmin,
  minutesInRange,
  startOfToday,
  syncIdentityToProfile,
  touchLastSeen,
  logEvent,
} from "@/lib/study";
import { CinematicThemeSwitcher } from "@/components/ui/cinematic-theme-switcher";
import { LiquidMorphFloatingMenu } from "@/components/ui/liquid-morph-floating-menu";
import { PushPrompt } from "@/components/PushPrompt";
import { NotificationBell } from "@/components/NotificationBell";
import { StreakFlame } from "@/components/StreakFlame";
import { InstallAppButton } from "@/components/InstallAppButton";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";


const NAV = [
  { to: "/today", label: "Home", Icon: LayoutDashboard },
  { to: "/timetable", label: "Timetable", Icon: CalendarDays },
  { to: "/study", label: "Study", Icon: Play, center: true },
  { to: "/targets", label: "Targets", Icon: Target },
  { to: "/history", label: "History", Icon: HistoryIcon },
] as const;

const EIGHT_WEEKS = new Date(Date.now() - 8 * 7 * 864e5).toISOString();

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const profile = useQuery({ queryKey: ["profile"], queryFn: syncIdentityToProfile });
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: isAdmin });
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // The admin console is a desktop-style workspace: the student bottom nav
  // does not belong there.
  const focusMode = pathname === "/timer";
  const hideNav = pathname.startsWith("/admin") || focusMode;

  useRealtimeSync();

  const sessions = useQuery({
    queryKey: ["sessions", "8w"],
    queryFn: () => fetchSessions(EIGHT_WEEKS),
  });
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const xp = useQuery({ queryKey: ["xp"], queryFn: fetchXp });

  const dailyGoal = settings.data?.daily_goal_hours ?? 4;
  const all = useMemo(() => sessions.data ?? [], [sessions.data]);
  const todayPct = Math.min(
    100,
    Math.round((minutesInRange(all, startOfToday()) / (dailyGoal * 60)) * 100),
  );
  const streakAlive = !xp.data?.last_streak_at || Date.now() - new Date(xp.data.last_streak_at).getTime() <= 48 * 60 * 60 * 1000;
  const streak = streakAlive ? (xp.data?.streak ?? 0) : 0;

  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  // Presence heartbeat + lightweight page-view telemetry for the admin console.
  useEffect(() => {
    void touchLastSeen().catch(() => {});
    void logEvent("page_view", pathname).catch(() => {});
  }, [pathname]);

  // One platform ping per app load so admins can see web vs Android app usage.
  useEffect(() => {
    void logEvent("platform", window.location.pathname, clientContext()).catch(() => {});
  }, []);

  // Keep this device's push token registered/refreshed on every app start.
  useEffect(() => {
    void syncDeviceTokenOnStart().catch(() => {});
  }, []);

  useEffect(() => {

    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void touchLastSeen().catch(() => {});
    }, 120_000);
    return () => window.clearInterval(id);
  }, []);

  // Sticky mini progress reveals itself once the hero card scrolls away.
  useEffect(() => {
    let frame = 0;
    let last = false;
    const read = () => {
      frame = 0;
      const next = window.scrollY > 220;
      if (next !== last) {
        last = next;
        setScrolled(next);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials =
    (profile.data?.first_name?.[0] ?? profile.data?.display_name?.[0] ?? "S") +
    (profile.data?.last_name?.[0] ?? "T");

  return (
    <div className="app-backdrop min-h-screen text-foreground lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      {!hideNav ? (
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-panel px-4 py-6 lg:flex">
          <Link to="/today" className="flex items-center gap-3 px-2">
            <img src={appLogo} alt="Chronodeck" width={1024} height={1024} className="size-11 rounded-2xl object-contain" />
            <span><span className="font-heading block text-lg font-extrabold">Chronodeck</span><span className="text-xs text-muted-foreground">Study OS</span></span>
          </Link>
          <nav aria-label="Primary" className="mt-10 grid gap-2">
            {NAV.map(({ to, label, Icon }) => (
              <Link key={to} to={to} className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition-colors ${pathname === to ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <Icon className="size-5" />{label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto rounded-[24px] bg-lavender-soft p-4">
            <p className="text-sm font-bold">Today’s progress</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel"><div className="h-full rounded-full bg-blue" style={{ width: `${todayPct}%` }} /></div>
            <p className="mt-2 text-xs text-muted-foreground">{todayPct}% of your daily goal</p>
          </div>
        </aside>
      ) : null}
      <div className="flex min-h-screen min-w-0 flex-col">
      {/* Opaque background instead of a large backdrop-blur: blurring a sticky
          layer forces a full-width GPU repaint on every scroll frame. */}
      {!focusMode ? <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <Link to="/today" className="flex min-w-0 items-center gap-3 lg:hidden">
          <img
            src={appLogo}
            alt="Chronodeck"
            width={1024}
            height={1024}
            loading="lazy"
            className="size-9 shrink-0 rounded-xl object-contain shadow-sm"
          />
          <span className="min-w-0">
            <span className="font-heading block truncate text-sm leading-none font-extrabold tracking-tight">
              Chronodeck
            </span>
            <span className="mt-1 block font-mono text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
              Study OS
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <CinematicThemeSwitcher />
          <NotificationBell />

          {streak > 2 ? (
            <span
              className="flex items-center gap-1 rounded-xl border border-[color-mix(in_oklab,var(--state-partial)_40%,transparent)] bg-[color-mix(in_oklab,var(--state-partial)_12%,transparent)] py-0.5 pr-2 pl-1"
              style={{ color: "var(--state-partial)" }}
            >
              <StreakFlame days={streak} size={22} />
            </span>
          ) : null}
          <div className="relative">
            <button
              onClick={() => setMenu((v) => !v)}
              aria-label="Account menu"
              aria-expanded={menu}
              className="grid size-9 place-items-center overflow-hidden rounded-full bg-warm/15 text-[10px] font-semibold text-warm outline-1 -outline-offset-1 outline-border transition-transform active:scale-95"
            >
              {profile.data?.avatar_url ? (
                <img
                  src={profile.data.avatar_url}
                  alt="Your avatar"
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                initials.toUpperCase()
              )}
            </button>

            {menu ? (
              <>
                <button
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setMenu(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 shadow-2xl"
                >
                  <MenuLink to="/profile" Icon={UserIcon} label="Profile" />
                  <MenuLink to="/classes" Icon={GraduationCap} label="Online classes" />
                  <InstallAppButton />
                  <MenuLink to="/settings" Icon={SettingsIcon} label="Settings" />
                  {admin.data ? <MenuLink to="/admin" Icon={ShieldCheck} label="Admin console" /> : null}
                  <button
                    onClick={signOut}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                </motion.div>
              </>
            ) : null}
          </div>
        </div>
        </div>

        <AnimatePresence initial={false}>
          {scrolled ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 pt-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div
                    className="gradient-bar h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{ width: `${todayPct}%` }}
                  />
                </div>
                <span className="num text-[11px] text-muted-foreground">{todayPct}%</span>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header> : null}

      <main
             className={`w-full min-w-0 flex-1 ${
          focusMode ? "max-w-none pb-0" : hideNav ? "pb-10" : "pb-28"
        }`}
      >
        {/* Enter-only fade. `popLayout` + exit animations kept two full pages
            mounted mid-navigation, which was the main scroll-jank source. */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>
      <PushPrompt />

      {hideNav || typeof document === "undefined"
        ? null
        : createPortal(
            <nav
               className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
              style={{ position: "fixed" }}
            >
              <LiquidMorphFloatingMenu
                activeId={pathname}
                onSelect={(to) => navigate({ to })}
                items={NAV.map(({ to, label, Icon, ...rest }) => ({
                  id: to,
                  label,
                  icon: <Icon />,
                  center: "center" in rest && rest.center,
                }))}
              />
            </nav>,
            document.body,
          )}
      </div>
    </div>
  );
}


function MenuLink({
  to,
  Icon,
  label,
}: {
  to: string;
  Icon: typeof UserIcon;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
