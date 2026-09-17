import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Monospace number that counts up to `value` whenever it changes. */
export function CountUp({
  value,
  decimals = 1,
  suffix = "",
  className = "",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const el = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const from = { n: reduced() ? value : prev.current };
    prev.current = value;
    const tween = gsap.to(from, {
      n: value,
      duration: reduced() ? 0 : 1,
      ease: "power2.out",
      onUpdate: () => {
        node.textContent = from.n.toFixed(decimals) + suffix;
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, decimals, suffix]);

  return (
    <span ref={el} className={`num ${className}`}>
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Idle breathing glow for the primary CTA. */
export function useIdleGlow<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useGSAP(
    () => {
      if (!ref.current || reduced()) return;
      gsap.to(ref.current, {
        boxShadow: "var(--shadow-glow)",
        duration: 1.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    },
    { scope: ref },
  );
  return ref;
}

/** Scroll-triggered reveal for a page section. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!ref.current || reduced()) return;
      gsap.from(ref.current, {
        opacity: 0,
        y: 22,
        duration: 0.6,
        delay,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 92%", once: true },
      });
    },
    { scope: ref, dependencies: [delay] },
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Staggered reveal of children matched by `selector` inside this wrapper. */
export function StaggerGrid({
  children,
  selector,
  className = "",
}: {
  children: ReactNode;
  selector: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!ref.current || reduced()) return;
      gsap.from(ref.current.querySelectorAll(selector), {
        opacity: 0,
        scale: 0.85,
        stagger: 0.02,
        duration: 0.4,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 95%", once: true },
      });
    },
    { scope: ref, dependencies: [selector] },
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Hero progress ring with a GSAP stroke-fill animation (Targets page). */
export function ProgressRing({
  pct,
  size = 168,
  stroke = 12,
  label,
  sub,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  label: string;
  sub?: string;
}) {
  const circle = useRef<SVGCircleElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(100, pct));

  useEffect(() => {
    const node = circle.current;
    if (!node) return;
    const state = { p: reduced() ? target : 0 };
    const apply = () => {
      node.style.strokeDashoffset = String(c - (c * state.p) / 100);
      if (readout.current) readout.current.textContent = `${Math.round(state.p)}%`;
    };
    apply();
    const tween = gsap.to(state, {
      p: target,
      duration: reduced() ? 0 : 1.1,
      ease: "power3.out",
      onUpdate: apply,
    });
    return () => {
      tween.kill();
    };
  }, [target, c]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="cd-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--accent-start)" />
              <stop offset="100%" stopColor="var(--accent-end)" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--bg-elevated)"
            strokeWidth={stroke}
          />
          <circle
            ref={circle}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="url(#cd-ring)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span ref={readout} className="num text-3xl font-semibold">
            0%
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium">{label}</p>
      {sub ? <p className="num mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

/** Draws Recharts line/area paths in on mount. Wrap the chart container. */
export function ChartDrawIn({
  children,
  className = "",
  deps = [],
}: {
  children: ReactNode;
  className?: string;
  deps?: unknown[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!ref.current || reduced()) return;
      const id = window.setTimeout(() => {
        const paths = ref.current?.querySelectorAll<SVGPathElement>(
          ".recharts-line-curve, .recharts-area-curve",
        );
        paths?.forEach((p) => {
          const len = p.getTotalLength();
          gsap.fromTo(
            p,
            { strokeDasharray: len, strokeDashoffset: len },
            { strokeDashoffset: 0, duration: 1.2, ease: "power2.out" },
          );
        });
      }, 60);
      return () => window.clearTimeout(id);
    },
    { scope: ref, dependencies: deps },
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Soft shimmer placeholder used before the first session exists. */
export function Shimmer({ className = "" }: { className?: string }) {
  return <span className={`shimmer block rounded-xl ${className}`} aria-hidden="true" />;
}
