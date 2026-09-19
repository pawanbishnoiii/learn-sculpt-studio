import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

export type FloatingMenuItem = { id: string; label: string; icon: ReactNode; center?: boolean };

function buzz(ms = 12) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
}

/** Per-character flip row, as in the Liquid Morph reference. */
function MorphRow({
  item,
  active,
  index,
  isOpen,
  onSelect,
}: {
  item: FloatingMenuItem;
  active: boolean;
  index: number;
  isOpen: boolean;
  onSelect: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const animatingRef = useRef(false);
  const pendingLeaveRef = useRef(false);
  const chars = item.label.split("");
  const lockDuration = 30 * chars.length + 300;

  const handleEnter = useCallback(() => {
    pendingLeaveRef.current = false;
    if (hovered) return;
    setHovered(true);
    animatingRef.current = true;
    window.setTimeout(() => {
      animatingRef.current = false;
      if (pendingLeaveRef.current) {
        pendingLeaveRef.current = false;
        setHovered(false);
      }
    }, lockDuration);
  }, [hovered, lockDuration]);

  const handleLeave = useCallback(() => {
    if (animatingRef.current) pendingLeaveRef.current = true;
    else setHovered(false);
  }, []);

  const lift = hovered || active;

  return (
    <motion.button
      type="button"
      onClick={() => {
        buzz();
        onSelect();
      }}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      aria-current={active ? "page" : undefined}
      initial={false}
      animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : 14 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease, delay: isOpen ? 0.12 + index * 0.05 : 0 }}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors ${
        active ? "bg-primary/20 text-primary-foreground" : "text-primary-foreground/75 hover:bg-primary-foreground/10"
      }`}
    >
      <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${active ? "bg-peach text-dark-card" : "bg-primary-foreground/10"} [&_svg]:size-4`}>
        {item.icon}
      </span>
      <span className="relative block overflow-hidden text-[15px] font-extrabold leading-5">
        <span className="flex">
          {chars.map((char, i) => (
            <span key={`${char}-${i}`} className="relative inline-block overflow-hidden">
              <motion.span
                className="inline-block"
                animate={{ y: lift && !reduceMotion ? "-100%" : "0%" }}
                transition={{ duration: 0.3, ease, delay: reduceMotion ? 0 : i * 0.03 }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
              <motion.span
                aria-hidden
                className="absolute inset-0 inline-block"
                animate={{ y: lift && !reduceMotion ? "0%" : "100%" }}
                transition={{ duration: 0.3, ease, delay: reduceMotion ? 0 : i * 0.03 }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            </span>
          ))}
        </span>
      </span>
    </motion.button>
  );
}

export function LiquidMorphFloatingMenu({
  items,
  activeId,
  onSelect,
}: {
  items: FloatingMenuItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeItem = items.find((i) => i.id === activeId) ?? items[0];

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [isOpen]);

  const openHeight = 96 + items.length * 48;

  return (
    <div ref={containerRef} className="pointer-events-auto mx-auto flex w-full justify-center">
      <motion.div
        className="relative overflow-hidden shadow-[0_24px_60px_-20px_rgba(24,10,60,0.55)]"
        onClick={() => {
          if (!isOpen) {
            buzz(10);
            setIsOpen(true);
          }
        }}
        style={{ cursor: isOpen ? "default" : "pointer" }}
        animate={{ width: isOpen ? 296 : 188, height: isOpen ? openHeight : 60, borderRadius: isOpen ? 34 : 72 }}
        whileHover={isOpen || reduceMotion ? undefined : { scale: 1.04 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.8, ease, height: { duration: isOpen ? 0.8 : 0.18 }, scale: { duration: 0.25, ease } }
        }
      >
        {/* bright base layer */}
        <span aria-hidden className="absolute inset-0 bg-peach" />
        {/* dark liquid circle expanding from the bottom bar */}
        <motion.span
          aria-hidden
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-dark-card"
          animate={{ width: isOpen ? 860 : 0, height: isOpen ? 860 : 0, opacity: isOpen ? 1 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.85, ease }}
        />

        {/* expanded items */}
        <div
          className="absolute inset-x-3 top-3 grid gap-1"
          style={{ pointerEvents: isOpen ? "auto" : "none" }}
        >
          {items.map((item, index) => (
            <MorphRow
              key={item.id}
              item={item}
              index={index}
              isOpen={isOpen}
              active={item.id === activeId}
              onSelect={() => {
                setIsOpen(false);
                if (item.id !== activeId) onSelect(item.id);
              }}
            />
          ))}
        </div>

        {/* bottom bar: current page + hamburger */}
        <motion.button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            buzz(10);
            setIsOpen((open) => !open);
          }}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          className="absolute inset-x-0 bottom-0 flex h-[60px] items-center justify-between"
          animate={{ paddingLeft: isOpen ? 22 : 20, paddingRight: isOpen ? 22 : 18, paddingBottom: isOpen ? 14 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.8, ease }}
        >
          <span className={`flex items-center gap-2 text-sm font-extrabold ${isOpen ? "text-primary-foreground" : "text-dark-card"}`}>
            <span className={`grid size-7 place-items-center rounded-xl ${isOpen ? "bg-primary-foreground/15" : "bg-dark-card/10"} [&_svg]:size-4`}>
              {activeItem?.icon}
            </span>
            {isOpen ? "Menu" : (activeItem?.label ?? "Menu")}
          </span>
          <span aria-hidden className="grid gap-[5px]">
            <motion.span
              className={`block h-[2px] w-5 rounded-full ${isOpen ? "bg-primary-foreground" : "bg-dark-card"}`}
              animate={{ rotate: isOpen ? 45 : 0, y: isOpen ? 3.5 : 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease }}
            />
            <motion.span
              className={`block h-[2px] w-5 rounded-full ${isOpen ? "bg-primary-foreground" : "bg-dark-card"}`}
              animate={{ rotate: isOpen ? -45 : 0, y: isOpen ? -3.5 : 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease }}
            />
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
}

export default LiquidMorphFloatingMenu;
