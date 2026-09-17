import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/lib/theme";

type Particle = { id: number; delay: number; duration: number };

/**
 * Cinematic day / night switcher — pill track, spring thumb, grainy ripple burst.
 * Purely presentational: it flips the app theme class via the ThemeProvider.
 */
export function CinematicThemeSwitcher({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === "dark";

  function handleToggle() {
    setParticles([0, 1, 2].map((i) => ({ id: i, delay: i * 0.08, duration: 0.6 + i * 0.1 })));
    setTimeout(() => setParticles([]), 1000);
    setTheme(isDark ? "light" : "dark");
  }

  if (!mounted) {
    return <div className={`h-9 w-16 rounded-full bg-secondary ${className}`} aria-hidden />;
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
      onClick={handleToggle}
      className={`theme-toggle relative h-9 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-secondary transition-colors ${className}`}
    >
      {/* inner groove + gloss */}
      <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1px_2px_rgb(15_23_42/0.18)]" />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/50 to-transparent dark:from-white/10" />

      {/* background icons */}
      <span className="pointer-events-none absolute inset-0 grid grid-cols-2 place-items-center text-muted-foreground">
        <span className="grid size-8 place-items-center"><Sun className="size-3.5" strokeWidth={2} /></span>
        <span className="grid size-8 place-items-center"><Moon className="size-3.5" strokeWidth={2} /></span>
      </span>

      {/* thumb */}
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 520, damping: 26, mass: 0.7 }}
        className="absolute top-[3px] grid size-7 place-items-center rounded-full text-primary-foreground shadow-md"
        style={{
          left: isDark ? 33 : 3,
          background: isDark
            ? "linear-gradient(135deg,#312e81,#0f172a)"
            : "linear-gradient(135deg,var(--accent-start),var(--accent-end))",
        }}
      >
        <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/40 to-transparent" />

        <AnimatePresence>
          {particles.map((p) => (
            <motion.span
              key={p.id}
              initial={{ scale: 0, opacity: 0.45 }}
              animate={{ scale: 3.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 rounded-full border border-current"
            />
          ))}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ rotate: -60, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 60, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative grid place-items-center"
          >
            {isDark ? <Moon className="size-3.5" strokeWidth={2} /> : <Sun className="size-3.5" strokeWidth={2} />}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </button>
  );
}

export default CinematicThemeSwitcher;
