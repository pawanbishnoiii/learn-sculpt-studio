import { cn } from "@/lib/utils";

/**
 * Soft radial ambience for light surfaces. Purely decorative, pointer-events none.
 */
export const RadialBackground = ({ className }: { className?: string }) => {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_-10%,color-mix(in_oklab,var(--accent-start)_12%,transparent),transparent_65%)]" />
      <div className="absolute -bottom-40 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--accent-end)_10%,transparent),transparent)] blur-2xl" />
    </div>
  );
};

export default RadialBackground;
