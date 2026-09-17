import idle from "@/assets/owl-idle.png";
import celebrate from "@/assets/owl-celebrate.png";
import sleepy from "@/assets/owl-sleepy.png";

export type MascotState = "idle" | "celebrating" | "sleepy";

const SRC: Record<MascotState, string> = {
  idle,
  celebrating: celebrate,
  sleepy,
};

const ALT: Record<MascotState, string> = {
  idle: "Chronodeck owl waiting for your next session",
  celebrating: "Chronodeck owl celebrating your streak",
  sleepy: "Chronodeck owl feeling sleepy — it is late",
};

/**
 * Picks a reaction state from the clock and the user's progress.
 * celebrating → daily goal hit or a streak longer than 2 days
 * sleepy      → between 23:00 and 05:00
 */
export function mascotState({
  goalHit,
  streak,
  hour = new Date().getHours(),
}: {
  goalHit: boolean;
  streak: number;
  hour?: number;
}): MascotState {
  if (goalHit || streak > 2) return "celebrating";
  if (hour >= 23 || hour < 5) return "sleepy";
  return "idle";
}

export function Mascot({
  state = "idle",
  size = 72,
  className = "",
}: {
  state?: MascotState;
  size?: number;
  className?: string;
}) {
  return (
    <img
      key={state}
      src={SRC[state]}
      alt={ALT[state]}
      width={size}
      height={size}
      loading="lazy"
      style={{ width: size, height: size }}
      className={`select-none object-contain ${
        state === "celebrating" ? "float-soft" : ""
      } ${className}`}
    />
  );
}
