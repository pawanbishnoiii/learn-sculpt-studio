import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen, Clock3, Coffee, Grip, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import activityRive from "@/assets/activity-animojis-custom.riv.asset.json";
import { DraggableWidgetGrid, type WidgetItem } from "@/components/ui/draggable-widget-grid";
import { RivePlayer } from "@/components/ui/rive-player";
import { saveSettings, startOfToday, type Break, type Session } from "@/lib/study";

const DEFAULT_WIDGETS: WidgetItem[] = [
  { id: "day-window", size: "wide", label: "Study day" },
  { id: "focus", size: "sm", label: "Focused time" },
  { id: "breaks", size: "sm", label: "Break time" },
  { id: "output", size: "wide", label: "Study output" },
];

function clock(value: Date | null) {
  return value?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "—";
}

export function TodayStudyAnalytics({
  sessions,
  breaks,
  liveFocusMinutes,
  savedLayout,
}: {
  sessions: Session[];
  breaks: Break[];
  liveFocusMinutes: number;
  savedLayout?: unknown;
}) {
  const qc = useQueryClient();
  const widgets = useMemo(() => {
    if (!Array.isArray(savedLayout)) return DEFAULT_WIDGETS;
    const valid = savedLayout.filter((item): item is WidgetItem => {
      if (!item || typeof item !== "object") return false;
      const row = item as Record<string, unknown>;
      return typeof row.id === "string" && ["sm", "wide", "tall", "lg"].includes(String(row.size));
    });
    const known = valid.filter((item) => DEFAULT_WIDGETS.some((widget) => widget.id === item.id));
    const missing = DEFAULT_WIDGETS.filter((widget) => !known.some((item) => item.id === widget.id));
    return known.length ? [...known, ...missing] : DEFAULT_WIDGETS;
  }, [savedLayout]);

  const metrics = useMemo(() => {
    const from = startOfToday().getTime();
    const today = sessions
      .filter((session) => new Date(session.started_at).getTime() >= from)
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
    const todayBreaks = breaks.filter((entry) => new Date(entry.started_at).getTime() >= from);
    const first = today[0] ? new Date(today[0].started_at) : null;
    const lastRow = today.at(-1);
    const last = lastRow
      ? new Date(lastRow.ended_at ?? Date.now())
      : null;
    const focus = today.reduce((sum, row) => sum + (row.is_running ? 0 : row.duration_minutes ?? 0), 0) + liveFocusMinutes;
    const breakMinutes = todayBreaks.reduce((sum, row) => {
      if (row.duration_minutes) return sum + row.duration_minutes;
      if (!row.ended_at) return sum + Math.max(0, Math.round((Date.now() - new Date(row.started_at).getTime()) / 60000));
      return sum;
    }, 0);
    const completed = today.filter((row) => !row.is_running);
    const topics = [...new Set(completed.map((row) => row.topic?.trim()).filter(Boolean))] as string[];
    const subjects = new Set(completed.map((row) => row.subject_name?.trim()).filter(Boolean)).size;
    const wall = first && last ? Math.max(0, Math.round((last.getTime() - first.getTime()) / 60000)) : 0;
    return { first, last, focus, breakMinutes, completed, topics, subjects, wall };
  }, [sessions, breaks, liveFocusMinutes]);

  const persist = useMutation({
    mutationFn: (layout: WidgetItem[]) => saveSettings({ widget_layout: layout }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
    onError: () => toast.error("Widget order save nahi hua"),
  });

  const render = (item: WidgetItem) => {
    if (item.id === "day-window") return (
      <WidgetShell icon={<Clock3 />} label="Study day" tone="lavender">
        <div className="mt-auto grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <Metric value={clock(metrics.first)} label="First entry" />
          <span className="mb-6 h-px w-6 bg-foreground/20" />
          <Metric value={clock(metrics.last)} label="Last exit" align="right" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{metrics.wall ? `${metrics.wall}m day window · ${metrics.completed.length} sessions` : "Your first session will start today’s timeline."}</p>
      </WidgetShell>
    );
    if (item.id === "focus") return (
      <WidgetShell icon={<BookOpen />} label="Focused" tone="mint">
        <Metric value={`${Math.floor(metrics.focus / 60)}h ${metrics.focus % 60}m`} label="Net study" />
        <p className="mt-auto text-xs text-muted-foreground">Across {metrics.subjects} {metrics.subjects === 1 ? "subject" : "subjects"}</p>
      </WidgetShell>
    );
    if (item.id === "breaks") return (
      <WidgetShell icon={<Coffee />} label="Breaks" tone="peach">
        <Metric value={`${metrics.breakMinutes}m`} label="Recovery time" />
        <p className="mt-auto text-xs text-muted-foreground">{Math.max(0, metrics.wall - metrics.focus - metrics.breakMinutes)}m untracked gap</p>
      </WidgetShell>
    );
    return (
      <WidgetShell icon={<Sparkles />} label="Output" tone="sky">
        <div className="flex items-start justify-between gap-3">
          <Metric value={String(metrics.topics.length)} label="Topics covered" />
          <RivePlayer src={activityRive.url} className="-mt-3 size-20 shrink-0" />
        </div>
        <p className="mt-auto line-clamp-2 text-xs font-semibold text-muted-foreground">
          {metrics.topics.length ? metrics.topics.join(" · ") : "Complete a session and add its topic to see real output."}
        </p>
      </WidgetShell>
    );
  };

  return (
    <section className="today-analytics">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="section-label">Live day analytics</p>
          <h2 className="mt-1 truncate text-xl font-extrabold">From first entry to last exit</h2>
        </div>
        <Link to="/history" className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-border bg-panel px-3 text-xs font-bold">
          Edit entries <ArrowUpRight className="size-4" />
        </Link>
      </div>
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><Grip className="size-4" /> Press and hold to rearrange</div>
      <DraggableWidgetGrid
        key={widgets.map((item) => `${item.id}:${item.size}`).join("|")}
        items={widgets}
        onChange={(next) => persist.mutate(next)}
        renderItem={(item) => render(item)}
        maxColumns={4}
        cellSize={190}
        gap={12}
        radius={24}
      />
    </section>
  );
}

function WidgetShell({ icon, label, tone, children }: { icon: React.ReactNode; label: string; tone: "lavender" | "mint" | "peach" | "sky"; children: React.ReactNode }) {
  return <motion.div className={`analytics-widget analytics-${tone} flex h-full flex-col p-4`} whileTap={{ scale: 0.985 }}>
    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">{icon}<span>{label}</span></div>
    {children}
  </motion.div>;
}

function Metric({ value, label, align = "left" }: { value: string; label: string; align?: "left" | "right" }) {
  return <div className={align === "right" ? "text-right" : "text-left"}><p className="num mt-3 text-2xl font-extrabold">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{label}</p></div>;
}