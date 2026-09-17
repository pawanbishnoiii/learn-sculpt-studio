import { motion, useInView, useSpring } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChartDataItem = {
  name: string;
  value: number;
  tone?: "lavender" | "sky" | "mint" | "coral" | "gold";
};

export type StatsCardProps = {
  title: string;
  currentValue: number;
  valuePostfix?: string;
  description: ReactNode;
  chartData: ChartDataItem[];
  tone?: ChartDataItem["tone"];
  className?: string;
};

const toneClass: Record<NonNullable<ChartDataItem["tone"]>, string> = {
  lavender: "bg-lavender",
  sky: "bg-blue",
  mint: "bg-mint",
  coral: "bg-pink",
  gold: "bg-yellow",
};

function AnimatedValue({ value, postfix = "" }: { value: number; postfix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInView(ref, { once: true });
  const spring = useSpring(0, { damping: 30, stiffness: 110, mass: 0.8 });

  useEffect(() => {
    if (visible) spring.set(value);
  }, [spring, value, visible]);

  useEffect(
    () => spring.on("change", (latest) => {
      if (ref.current) ref.current.textContent = `${Math.round(latest).toLocaleString()}${postfix}`;
    }),
    [postfix, spring],
  );

  return <span ref={ref}>0{postfix}</span>;
}

export function StatsCard({
  title,
  currentValue,
  valuePostfix,
  description,
  chartData,
  tone = "lavender",
  className,
}: StatsCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { once: true, amount: 0.35 });

  return (
    <motion.article
      ref={ref}
      whileTap={{ scale: 0.985 }}
      className={cn("stats-card min-w-0 overflow-hidden p-4 sm:p-5", className)}
    >
      <p className="truncate text-xs font-bold text-muted-foreground">{title}</p>
      <p className="num mt-2 text-2xl font-extrabold sm:text-3xl">
        <AnimatedValue value={currentValue} {...(valuePostfix ? { postfix: valuePostfix } : {})} />
      </p>
      <div className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{description}</div>
      <div className="mt-4 flex h-14 items-end gap-1.5" aria-label={`${title} activity chart`}>
        {chartData.map((item, index) => (
          <span key={`${item.name}-${index}`} className="flex h-full min-w-0 flex-1 items-end">
            <motion.span
              initial={{ height: 4, opacity: 0.35 }}
              animate={visible ? { height: `${Math.max(8, Math.min(100, item.value))}%`, opacity: 1 } : {}}
              transition={{ type: "spring", stiffness: 115, damping: 16, delay: index * 0.045 }}
              title={`${item.name}: ${Math.round(item.value)}%`}
              className={cn("block w-full rounded-full", toneClass[item.tone ?? tone])}
            />
          </span>
        ))}
      </div>
    </motion.article>
  );
}