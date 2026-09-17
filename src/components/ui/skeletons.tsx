import type { ReactNode } from "react";

/** Base shimmering block. Everything else composes this. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-2xl bg-muted ${className}`} />;
}

/** A soft pastel card wrapper used for both real content and its skeleton. */
export function SoftCard({
  children,
  className = "",
  tint,
}: {
  children: ReactNode;
  className?: string;
  tint?: "lavender" | "sky" | "lilac" | "mint" | "mustard" | "coral";
}) {
  return (
    <section
      className={`rounded-[var(--radius-card)] border border-border p-4 shadow-[0_10px_30px_-24px_rgb(15_23_42_/_0.5)] sm:p-5 ${
        tint ? `tint-${tint}` : "bg-panel"
      } ${className}`}
    >
      {children}
    </section>
  );
}

/** Hero / summary card placeholder. */
export function HeroSkeleton() {
  return (
    <SoftCard className="space-y-4">
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-3 w-full rounded-full" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    </SoftCard>
  );
}

/** Row of compact stat tiles. */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius-card)] border border-border bg-panel p-4">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="mt-2 h-2.5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Stacked list rows (history, sessions, subjects). */
export function ListSkeleton({ rows = 4, withBar = false }: { rows?: number; withBar?: boolean }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-[var(--radius-card)] border border-border bg-panel p-4"
          style={{ opacity: 1 - i * 0.12 }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2 rounded-full" />
              <Skeleton className="h-2.5 w-1/3 rounded-full" />
            </div>
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
          {withBar ? <Skeleton className="mt-3 h-2 w-full rounded-full" /> : null}
        </div>
      ))}
    </div>
  );
}

/** Form-shaped placeholder (profile, settings). */
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <SoftCard className="space-y-3">
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: fields }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-full" />
      ))}
      <Skeleton className="h-12 w-full rounded-full" />
    </SoftCard>
  );
}

/** Whole-page fallback: hero + stats + list. */
export function PageSkeleton() {
  return (
    <div className="space-y-4 px-4 py-5 sm:px-5">
      <HeroSkeleton />
      <StatsSkeleton />
      <ListSkeleton rows={3} withBar />
    </div>
  );
}
