import * as React from "react";
import { cn } from "@/lib/utils";

export interface GooeyLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  primaryColor?: string;
  secondaryColor?: string;
  borderColor?: string;
}

export const GooeyLoader = React.forwardRef<HTMLDivElement, GooeyLoaderProps>(function GooeyLoader({
  label = "Loading", className, primaryColor, secondaryColor, borderColor, style, ...props
}, ref) {
  const colors = {
    "--gooey-primary-color": primaryColor || "var(--primary)",
    "--gooey-secondary-color": secondaryColor || "var(--lavender)",
    "--gooey-border-color": borderColor || "var(--border)",
    ...style,
  } as React.CSSProperties;
  return (
    <div ref={ref} style={colors} className={cn("flex flex-col items-center justify-center gap-3", className)} role="status" aria-live="polite" {...props}>
      <svg className="absolute size-0" aria-hidden="true">
        <filter id="gooey-loader-filter"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/><feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo"/><feComposite in="SourceGraphic" in2="goo" operator="atop"/></filter>
      </svg>
      <div className="gooey-loader-10" aria-hidden="true">
        <span className="gooey-loader-10__ball gooey-loader-10__ball--one" />
        <span className="gooey-loader-10__ball gooey-loader-10__ball--two" />
      </div>
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
    </div>
  );
});
GooeyLoader.displayName = "GooeyLoader";
