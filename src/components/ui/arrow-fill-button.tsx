import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const COMPACT_LAYOUT_BREAKPOINT = 1280;
const ANIMATION_DURATION_MS = 450;

export interface ArrowFillButtonOwnProps {
  btnText?: string;
  bgColor?: string;
  textColor?: string;
  fillBgColor?: string;
  fillTextColor?: string;
  arrowColor?: string;
  hoverArrowColor?: string;
  animationDuration?: number;
  fillOnHover?: boolean;
  fullWidth?: boolean;
}

export type ArrowFillButtonProps = ArrowFillButtonOwnProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof ArrowFillButtonOwnProps>;

/**
 * Dark pill CTA with an arrow badge that sweeps a coloured fill across the
 * label on hover (desktop) or press (touch).
 */
export function ArrowFillButton({
  btnText = "Continue",
  className,
  bgColor = "var(--foreground)",
  textColor = "var(--background)",
  fillBgColor = "var(--warm)",
  fillTextColor = "var(--foreground)",
  arrowColor = "var(--foreground)",
  hoverArrowColor = "var(--foreground)",
  animationDuration = ANIMATION_DURATION_MS,
  fillOnHover = true,
  fullWidth = false,
  ...props
}: ArrowFillButtonProps) {
  const [isCompact, setIsCompact] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const releaseTimeout = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${COMPACT_LAYOUT_BREAKPOINT - 1}px)`);
    const sync = () => {
      setIsCompact(mq.matches);
      if (!mq.matches) setIsPressed(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(
    () => () => {
      if (releaseTimeout.current) window.clearTimeout(releaseTimeout.current);
    },
    [],
  );

  const release = () => {
    if (releaseTimeout.current) window.clearTimeout(releaseTimeout.current);
    releaseTimeout.current = window.setTimeout(() => {
      setIsPressed(false);
      releaseTimeout.current = null;
    }, animationDuration);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    props.onPointerDown?.(event);
    if (!isCompact || event.pointerType === "mouse") return;
    if (releaseTimeout.current) window.clearTimeout(releaseTimeout.current);
    setIsPressed(true);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    props.onPointerUp?.(event);
    if (!isCompact || event.pointerType === "mouse") return;
    release();
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    props.onPointerCancel?.(event);
    if (!isCompact || event.pointerType === "mouse") return;
    release();
  };

  const style = {
    background: bgColor,
    color: textColor,
    "--afb-duration": `${animationDuration}ms`,
  } as CSSProperties;

  return (
    <button
      {...props}
      type={props.type ?? "button"}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      data-pressed={isPressed ? "true" : undefined}
      style={style}
      className={cn(
        "group relative inline-flex h-14 items-center justify-between gap-4 overflow-hidden rounded-full pr-2 pl-7 text-[15px] font-bold tracking-tight",
        "transition-transform duration-200 active:scale-[0.98] disabled:opacity-60",
        fullWidth && "w-full",
        className,
      )}
    >
      <span className="relative z-10 grid">
        <span className="col-start-1 row-start-1">{btnText}</span>
        <span
          aria-hidden
          className={cn("col-start-1 row-start-1 overflow-hidden [clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-(--afb-duration) ease-out group-data-[pressed=true]:[clip-path:inset(0_0_0_0)]", fillOnHover && "group-hover:[clip-path:inset(0_0_0_0)]")}
          style={{ color: fillTextColor }}
        >
          {btnText}
        </span>
      </span>

      <span
        aria-hidden
        className={cn("absolute inset-0 origin-left scale-x-0 rounded-full transition-transform duration-(--afb-duration) ease-out group-data-[pressed=true]:scale-x-100", fillOnHover && "group-hover:scale-x-100")}
        style={{ background: fillBgColor }}
      />

      <span
        aria-hidden
        className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full transition-transform duration-(--afb-duration) group-hover:translate-x-0.5"
        style={{ background: fillBgColor }}
      >
        <ArrowRight
          className="size-4 transition-colors"
          style={{ color: isPressed ? hoverArrowColor : arrowColor }}
        />
      </span>
    </button>
  );
}

export default ArrowFillButton;
