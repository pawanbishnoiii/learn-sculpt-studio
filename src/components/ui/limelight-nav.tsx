import {
  cloneElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type NavItem = {
  id: string | number;
  icon: ReactElement<{ className?: string }>;
  label?: string;
  onClick?: () => void;
  /** Render a raised center CTA-style item (excluded from the limelight track). */
  center?: boolean;
  content?: ReactNode;
};

export type LimelightNavProps = {
  items: NavItem[];
  activeIndex?: number;
  onTabChange?: (index: number) => void;
  className?: string;
  limelightClassName?: string;
  iconContainerClassName?: string;
  iconClassName?: string;
};

/**
 * Adaptive bottom navigation with a "limelight" beam that slides under the
 * active item. Pure layout-effect positioning — no animation library needed.
 */
export function LimelightNav({
  items,
  activeIndex = 0,
  onTabChange,
  className,
  limelightClassName,
  iconContainerClassName,
  iconClassName,
}: LimelightNavProps) {
  const [isReady, setIsReady] = useState(false);
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const limelightRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const limelight = limelightRef.current;
    const activeItem = navItemRefs.current[activeIndex];
    if (!limelight || !activeItem) return undefined;

    const newLeft =
      activeItem.offsetLeft + activeItem.offsetWidth / 2 - limelight.offsetWidth / 2;
    limelight.style.left = `${newLeft}px`;

    if (!isReady) {
      const t = window.setTimeout(() => setIsReady(true), 60);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [activeIndex, isReady, items]);


  if (items.length === 0) return null;

  return (
    <nav
      className={cn(
        "relative flex items-end justify-between rounded-[26px] border border-border bg-panel px-2 pt-2 pb-1.5 shadow-lg",
        className,
      )}
    >
      {items.map(({ id, icon, label, onClick, center, content }, index) => (
        <a
          key={id}
          ref={(el) => {
            navItemRefs.current[index] = el;
          }}
          className={cn(
            "relative z-20 flex flex-1 cursor-pointer flex-col items-center gap-1 py-1",
            iconContainerClassName,
          )}
          onClick={(e) => {
            e.preventDefault();
            onTabChange?.(index);
            onClick?.();
          }}
          aria-label={label}
          aria-current={activeIndex === index ? "page" : undefined}
        >
          {content ??
            cloneElement(icon, {
              className: cn(
                "size-[20px] transition-all duration-200",
                activeIndex === index
                  ? "text-brand opacity-100"
                  : "text-muted-foreground opacity-60",
                center && "size-5",
                icon.props.className,
                iconClassName,
              ),
            })}
          {label && !content ? (
            <span
              className={cn(
                "text-[10px] font-medium transition-colors",
                activeIndex === index ? "text-brand" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          ) : null}
        </a>
      ))}

      {/* Limelight beam that tracks the active tab */}
      <div
        ref={limelightRef}
        className={cn(
          "pointer-events-none absolute top-0 z-10 w-14 transition-[left] duration-300 ease-out",
          isReady ? "opacity-100" : "opacity-0",
          limelightClassName,
        )}
      >
        {/* glow dot */}
        <div className="mx-auto size-1.5 rounded-full bg-brand shadow-[0_0_12px_2px_var(--brand)]" />
        {/* light cone */}
        <div
          className="mx-auto h-7 w-10 [clip-path:polygon(38%_0,62%_0,100%_100%,0_100%)]"
          style={{
            background:
              "linear-gradient(to bottom, color-mix(in oklab, var(--brand) 45%, transparent), transparent)",
          }}
        />
      </div>
    </nav>
  );
}

export default LimelightNav;
