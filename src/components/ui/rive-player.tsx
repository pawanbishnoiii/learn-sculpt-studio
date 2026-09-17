import { useRive } from "@rive-app/react-canvas";
import { cn } from "@/lib/utils";

export function RivePlayer({ src, className }: { src: string; className?: string }) {
  const { RiveComponent } = useRive({ src, autoplay: true });
  return (
    <div aria-hidden="true" className={cn("overflow-hidden", className)}>
      <RiveComponent className="size-full" />
    </div>
  );
}