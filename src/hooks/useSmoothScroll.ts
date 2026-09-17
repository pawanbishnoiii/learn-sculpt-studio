import { useEffect } from "react";

/**
 * Lenis-powered smooth scrolling for the whole app.
 * Respects the user's reduced-motion preference and stays inert during SSR.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let disposed = false;
    let instance: { raf: (t: number) => void; destroy: () => void } | null = null;

    void import("lenis").then(({ default: Lenis }) => {
      if (disposed) return;
      const lenis = new Lenis({ duration: 0.9, smoothWheel: true, touchMultiplier: 1.4 });
      instance = { raf: (t) => lenis.raf(t), destroy: () => lenis.destroy() };
      const loop = (time: number) => {
        instance?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      instance?.destroy();
    };
  }, []);
}
