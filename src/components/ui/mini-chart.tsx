import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type MiniChartPoint = { label: string; value: number };

const FALLBACK: MiniChartPoint[] = [
  { label: "Mon", value: 0 },
  { label: "Tue", value: 0 },
  { label: "Wed", value: 0 },
  { label: "Thu", value: 0 },
  { label: "Fri", value: 0 },
  { label: "Sat", value: 0 },
  { label: "Sun", value: 0 },
];

/**
 * Compact weekly activity chart. Hovering (or tapping) a bar shows its value
 * in the header readout.
 */
export function MiniChart({
  data = FALLBACK,
  title = "Activity",
  unit = "%",
  className,
}: {
  data?: MiniChartPoint[];
  title?: string;
  unit?: string;
  className?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [display, setDisplay] = useState<number | null>(null);
  const points = data.length ? data : FALLBACK;
  const max = Math.max(1, ...points.map((d) => d.value));

  useEffect(() => {
    if (hovered !== null) setDisplay(points[hovered]?.value ?? null);
  }, [hovered, points]);

  return (
    <div
      onMouseLeave={() => {
        setHovered(null);
        window.setTimeout(() => setDisplay(null), 150);
      }}
      className={cn(
        "rounded-3xl border border-border/60 bg-card p-5 shadow-[0_10px_30px_-18px_rgba(17,24,39,0.35)]",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" aria-hidden />
          <p className="text-sm font-semibold text-foreground">{title}</p>
        </div>
        <p className="num text-2xl leading-none font-bold text-foreground tabular-nums">
          {display !== null ? display : "—"}
          <span className="ml-0.5 text-xs font-semibold text-muted-foreground">
            {display !== null ? unit : ""}
          </span>
        </p>
      </div>

      <div className="mt-5 flex h-28 items-end justify-between gap-1.5">
        {points.map((item, index) => {
          const height = Math.max(6, (item.value / max) * 96);
          const active = hovered === index;
          return (
            <button
              key={item.label}
              type="button"
              onMouseEnter={() => setHovered(index)}
              onFocus={() => setHovered(index)}
              onClick={() => setHovered(index)}
              className="group flex flex-1 flex-col items-center gap-2"
              aria-label={`${item.label}: ${item.value}${unit}`}
            >
              <span
                style={{ height }}
                className={cn(
                  "w-full rounded-full transition-all duration-300",
                  active ? "bg-primary" : "bg-primary/25 group-hover:bg-primary/45",
                  hovered !== null && !active && "opacity-70",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-bold tracking-wide transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label.charAt(0)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MiniChart;
