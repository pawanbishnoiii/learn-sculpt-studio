import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  ANALYTICS_FILTERS,
  dailyTrend,
  fmtHM,
  monthlyTrend,
  weeklyTrend,
  type AnalyticsFilter,
  type Session,
} from "@/lib/study";

type Range = "daily" | "weekly" | "monthly";

const RANGES: { k: Range; l: string }[] = [
  { k: "daily", l: "Daily" },
  { k: "weekly", l: "Weekly" },
  { k: "monthly", l: "Monthly" },
];

/**
 * Study analytics — minutes over time with Reading / Class / Other filters and
 * a daily, weekly or monthly view.
 */
export function StudyAnalytics({ sessions }: { sessions: Session[] }) {
  const [filter, setFilter] = useState<AnalyticsFilter>("all");
  const [range, setRange] = useState<Range>("daily");

  const data = useMemo(() => {
    if (range === "weekly") return weeklyTrend(sessions, 8, filter);
    if (range === "monthly") return monthlyTrend(sessions, 6, filter);
    return dailyTrend(sessions, 14, filter);
  }, [sessions, range, filter]);

  const total = data.reduce((a, d) => a + d.value, 0);
  const best = Math.max(0, ...data.map((d) => d.value));

  return (
    <section className="rounded-[28px] border-2 border-foreground/10 bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">analytics</p>
          <h2 className="mt-1 text-base font-extrabold tracking-tight">Study trend</h2>
          <p className="num mt-1 text-[11px] text-muted-foreground">
            {fmtHM(total)} total · best {fmtHM(best)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {RANGES.map((r) => (
            <button
              key={r.k}
              onClick={() => setRange(r.k)}
              aria-pressed={range === r.k}
              className={`rounded-full border-2 px-2.5 py-1 text-[10px] font-bold transition ${
                range === r.k
                  ? "border-transparent bg-foreground text-background"
                  : "border-border text-muted-foreground"
              }`}
            >
              {r.l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {ANALYTICS_FILTERS.map((f) => (
          <motion.button
            key={f.k}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(f.k)}
            aria-pressed={filter === f.k}
            className={`rounded-full border-2 px-3 py-1.5 text-[11px] font-bold transition ${
              filter === f.k
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border bg-secondary/50 text-muted-foreground"
            }`}
          >
            {f.l}
          </motion.button>
        ))}
      </div>

      <div className="mt-4 h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {range === "daily" ? (
            <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <Tooltip
                formatter={(v: number) => [fmtHM(v), "Studied"]}
                contentStyle={{
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--panel, var(--card))",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#trendFill)"
              />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v: number) => [fmtHM(v), "Studied"]}
                contentStyle={{
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--panel, var(--card))",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[10, 10, 4, 4]} fill="var(--primary)" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {total === 0 ? (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Is filter me abhi koi record nahi.
        </p>
      ) : null}
    </section>
  );
}
