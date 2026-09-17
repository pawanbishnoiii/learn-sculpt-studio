import books from "@/assets/icon-books.png";
import target from "@/assets/icon-target.png";
import clock from "@/assets/icon-clock.png";
import brain from "@/assets/icon-brain.png";
import cls from "@/assets/icon-class.png";
import brk from "@/assets/icon-break.png";
import trophy from "@/assets/icon-trophy.png";
import magazine from "@/assets/icon-magazine.png";
import calendar from "@/assets/icon-calendar.png";

export const ICONS = {
  books,
  target,
  clock,
  brain,
  class: cls,
  break: brk,
  trophy,
  magazine,
  calendar,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon3D({
  name,
  size = 40,
  className = "",
  priority = false,
}: {
  name: IconName;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <img
      src={ICONS[name]}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      style={{ width: size, height: size }}
      className={`select-none object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)] ${className}`}
    />
  );
}
