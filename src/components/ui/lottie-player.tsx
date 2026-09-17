import { useEffect, useState, type ComponentType } from "react";

type LottieComponent = ComponentType<{
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string | undefined;
}>;

/**
 * Client-only Lottie renderer. The player is imported lazily so SSR never
 * touches lottie-web and the engine stays out of the main bundle.
 * lottie-react v3 exports named components (no default) and fetches URLs itself.
 */
export function LottiePlayer({
  src,
  className,
  loop = true,
  autoplay = true,
}: {
  src: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
}) {
  const [Player, setPlayer] = useState<LottieComponent | null>(null);

  useEffect(() => {
    let alive = true;
    void import("lottie-react")
      .then((m) => {
        // v3 exports named forwardRef components (objects, not functions).
        const resolved = (m.LottieSvg ?? m.Lottie) as unknown as LottieComponent | undefined;
        if (alive && resolved) setPlayer(() => resolved);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);


  if (!Player) return <div className={className} aria-hidden />;
  return <Player src={src} loop={loop} autoplay={autoplay} className={className} />;
}
