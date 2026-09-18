import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type FloatingMenuItem = { id: string; label: string; icon: ReactNode; center?: boolean };

export function LiquidMorphFloatingMenu({ items, activeId, onSelect }: { items: FloatingMenuItem[]; activeId: string; onSelect: (id: string) => void }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 26 }}
      className="liquid-nav pointer-events-auto relative mx-auto grid w-full max-w-md grid-cols-5 items-end overflow-hidden border border-border bg-yellow p-1.5 shadow-2xl"
    >
      <motion.span
        aria-hidden
        className="absolute -bottom-28 h-48 w-48 rounded-full bg-dark-card"
        animate={{ x: `calc(${Math.max(0, items.findIndex((item) => item.id === activeId))} * 20vw)` }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
      />
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <Button
            key={item.id}
            variant="ghost"
            onClick={() => onSelect(item.id)}
            aria-current={active ? "page" : undefined}
            className={`relative h-14 min-h-14 min-w-0 rounded-[18px] px-0 ${item.center ? "-translate-y-3" : ""}`}
          >
            {active ? <motion.span layoutId="liquid-nav-active" className="absolute inset-0 rounded-[18px] bg-dark-card" transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 30 }} /> : null}
            <span className={`relative z-10 flex min-w-0 flex-col items-center gap-1 transition-colors ${active ? "text-primary-foreground" : "text-foreground/65"}`}>
              <span className="[&_svg]:size-5">{item.icon}</span>
              <span className="max-w-full truncate text-[9px] font-bold">{item.label}</span>
            </span>
          </Button>
        );
      })}
    </motion.div>
  );
}