"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Digit = ({ value, size = "lg" }: { value: number; size?: "lg" | "sm" }) => {
  const box =
    size === "lg"
      ? "w-[18vw] max-w-24 h-[26vw] max-h-32 text-[13vw] sm:text-6xl rounded-2xl"
      : "w-10 h-14 text-3xl rounded-md";
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-zinc-900 font-mono font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${box}`}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: "-60%", opacity: 0, rotateX: -70 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: "60%", opacity: 0, rotateX: 70 }}
          transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.5 }}
          className="absolute inset-0 flex items-center justify-center will-change-transform"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

function Group({ text, size }: { text: string; size: "lg" | "sm" }) {
  return (
    <>
      {text.split("").map((d, i) => (
        <Digit key={`${text.length}-${i}`} value={parseInt(d, 10)} size={size} />
      ))}
    </>
  );
}

/**
 * Flip clock. Pass `seconds` to render an elapsed timer,
 * otherwise it shows the current wall-clock time.
 */
export default function FlipClock({
  seconds,
  size = "lg",
  showSeconds = true,
}: {
  seconds?: number;
  size?: "lg" | "sm";
  showSeconds?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (seconds !== undefined) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  const total = seconds !== undefined ? Math.max(0, Math.floor(seconds)) : null;
  const h = total !== null ? Math.floor(total / 3600) : now.getHours();
  const m = total !== null ? Math.floor((total % 3600) / 60) : now.getMinutes();
  const s = total !== null ? total % 60 : now.getSeconds();

  const sep = size === "lg" ? "text-[8vw] sm:text-4xl" : "text-3xl";

  return (
    <div className="flex items-center justify-center gap-1.5">
      <Group text={String(h).padStart(2, "0")} size={size} />
      <span className={`font-bold text-zinc-500 ${sep}`}>:</span>
      <Group text={String(m).padStart(2, "0")} size={size} />
      {showSeconds ? (
        <>
          <span className={`font-bold text-zinc-500 ${sep}`}>:</span>
          <Group text={String(s).padStart(2, "0")} size={size} />
        </>
      ) : null}
    </div>
  );
}
