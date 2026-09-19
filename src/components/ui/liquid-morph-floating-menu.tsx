import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type FloatingMenuItem = { id: string; label: string; icon: ReactNode; center?: boolean };

export function LiquidMorphFloatingMenu({ items, activeId, onSelect }: { items: FloatingMenuItem[]; activeId: string; onSelect: (id: string) => void }) {
  const reduceMotion = useReducedMotion();
  const select = (id: string) => {
    if (id === activeId) return;
    if ("vibrate" in navigator) navigator.vibrate(12);
    onSelect(id);
  };
  return (
    <motion.nav
      aria-label="Primary navigation"
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 26 }}
      className="liquid-nav pointer-events-auto relative mx-auto grid w-full max-w-md grid-cols-5 items-end border border-border bg-panel/95 p-1.5 shadow-2xl backdrop-blur-xl"
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <Button
            key={item.id}
            variant="ghost"
            onClick={() => select(item.id)}
            aria-current={active ? "page" : undefined}
            className={`relative h-14 min-h-14 min-w-0 rounded-[18px] px-0 ${item.center ? "-translate-y-3" : ""}`}
          >
            {active ? <motion.span layoutId="liquid-nav-active" className="absolute inset-0 rounded-[18px] bg-dark-card shadow-lg" transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 30 }} /> : null}
            {item.center && !active ? <span aria-hidden className="absolute inset-0 rounded-[18px] bg-peach shadow-md" /> : null}
            <span className={`relative z-10 flex min-w-0 flex-col items-center gap-1 transition-colors ${active ? "text-primary-foreground" : "text-foreground/65"}`}>
              <motion.span animate={active && !reduceMotion ? { y: [0, -2, 0] } : undefined} className="[&_svg]:size-5">{item.icon}</motion.span>
              <span className="max-w-full truncate text-[9px] font-bold">{item.label}</span>
            </span>
          </Button>
        );
      })}
    </motion.nav>
  );
}