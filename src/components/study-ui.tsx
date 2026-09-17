import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import artReading from "@/assets/activity-reading-clay.png";
import artRevision from "@/assets/activity-revision-clay.png";
import artClass from "@/assets/activity-class-clay.png";
import artPractice from "@/assets/activity-practice-clay.png";
import { Button } from "@/components/ui/button";

export type ActivityKind = "reading" | "revision" | "class" | "practice";

const activityArtwork: Record<ActivityKind, string> = {
  reading: artReading,
  revision: artRevision,
  class: artClass,
  practice: artPractice,
};

export function ActivityArtwork({ kind, className }: { kind: ActivityKind; className?: string }) {
  return (
    <img
      src={activityArtwork[kind]}
      alt=""
      aria-hidden="true"
      width={768}
      height={768}
      loading="lazy"
      className={cn("block object-contain", className)}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="section-label">{eyebrow}</p> : null}
        <h1 className="mt-1 text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.08]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-[15px] leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div aria-label={label} className="inline-flex min-h-11 rounded-full bg-secondary p-1">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant="ghost"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-9 min-h-9 rounded-full px-4 shadow-none",
            value === option.value && "bg-panel text-foreground shadow-sm hover:bg-panel",
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

export function EmptyState({
  image,
  title,
  description,
  action,
}: {
  image?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-9 text-center">
      {image ? <img src={image} alt="" width={816} height={816} loading="lazy" className="size-32 object-contain" /> : null}
      <h3 className="mt-2 text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface-card p-5 sm:p-6", className)}>
      <h2 className="text-xl font-bold">{title}</h2>
      {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function ResponsiveSheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-end bg-overlay p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="responsive-sheet-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92svh] w-full overflow-y-auto rounded-t-[32px] bg-panel p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:h-full sm:max-h-none sm:max-w-lg sm:rounded-[32px] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="responsive-sheet-title" className="text-2xl font-bold">{title}</h2>
                {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="rounded-full">
                <X />
              </Button>
            </div>
            <div className="mt-6">{children}</div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}