import { cn } from "@/lib/utils";

export function GooeyLoader({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)} role="status" aria-live="polite">
      <div className="gooey-loader" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
    </div>
  );
}
