import fireAnim from "@/assets/fire-streak.json.asset.json";
import { LottiePlayer } from "@/components/ui/lottie-player";

/** Animated streak flame with the day count next to it. */
export function StreakFlame({
  days,
  size = 26,
  showCount = true,
  className = "",
}: {
  days: number;
  size?: number;
  showCount?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={`${days} day streak`}
      aria-label={`${days} day streak`}
    >
      <span
        className="grid shrink-0 place-items-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        <LottiePlayer src={fireAnim.url} className="h-full w-full" />
      </span>
      {showCount ? <span className="num text-[11px] font-bold">{days}</span> : null}
    </span>
  );
}
