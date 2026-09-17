import { useMemo } from "react";
import { LottiePlayer } from "@/components/ui/lottie-player";
import office from "@/assets/office-hello-upload.json.asset.json";
import booking from "@/assets/appointment-booking-upload.json.asset.json";
import books from "@/assets/girl-books-upload.json.asset.json";
import hero from "@/assets/super-woman-upload.json.asset.json";

const animations = [office, booking, books, hero];

export function AnimationShowcase() {
  const chosen = useMemo(() => animations[new Date().getDay() % animations.length]!, []);
  return (
    <section className="surface-card daily-motion-card flex items-center gap-3 overflow-hidden p-3.5 sm:gap-4 sm:p-5">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[var(--blue-soft)] sm:size-20">
        <LottiePlayer src={chosen.url} className="size-20 sm:size-24" />
      </div>
      <div className="min-w-0">
        <p className="section-label">Daily motion</p>
        <h2 className="mt-1 text-base font-bold sm:text-lg">Small steps build momentum.</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
          Your study companion changes through the week.
        </p>
      </div>
    </section>
  );
}
