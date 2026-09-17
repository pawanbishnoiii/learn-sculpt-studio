import { useEffect, useRef, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Full-screen black focus timer.
 * Swipe (or tap) anywhere to reveal the pause / stop controls.
 * After "Stop", only the explicit Exit button completes the session.
 */
export function FocusMode({
  startedAt,
  subject,
  topic,
  paused,
  breakKind,
  onPause,
  onResume,
  onExit,
}: {
  startedAt: string;
  subject: string;
  topic: string | null;
  paused: boolean;
  breakKind: string | null;
  onPause: (kind: string) => void;
  onResume: () => void;
  onExit: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [controls, setControls] = useState(false);
  const [stopped, setStopped] = useState(false);
  const touchY = useRef<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function reveal() {
    setControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), 6000);
  }

  const elapsed = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-[fade-in_0.5s_ease-out] flex-col items-center justify-center bg-black text-white"
      onClick={reveal}
      onTouchStart={(e) => {
        touchY.current = e.touches[0]?.clientY ?? null;
      }}
      onTouchMove={(e) => {
        const start = touchY.current;
        const y = e.touches[0]?.clientY ?? 0;
        if (start !== null && Math.abs(y - start) > 30) reveal();
      }}
    >
      <p className="font-mono text-[10px] tracking-[0.4em] text-white/35 uppercase">
        {paused ? `on ${breakKind ?? "break"}` : "focus mode"}
      </p>

      <div
        className={`mt-6 flex items-baseline font-mono tabular-nums transition-opacity duration-700 ${
          paused ? "opacity-40" : "opacity-100"
        }`}
      >
        <span className="text-[19vw] leading-none font-light tracking-tight sm:text-[9rem]">
          {pad(hours)}
        </span>
        <span className="px-2 text-[12vw] leading-none font-light text-white/30 sm:text-[6rem]">:</span>
        <span className="text-[19vw] leading-none font-light tracking-tight sm:text-[9rem]">
          {pad(minutes)}
        </span>
      </div>
      <span className="mt-2 font-mono text-xs tracking-[0.3em] text-white/30">{pad(seconds)}s</span>

      <p className="mt-8 text-sm font-medium text-white/70">{subject}</p>
      {topic ? <p className="mt-1 text-xs text-white/35">{topic}</p> : null}

      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-6 pb-10 transition-all duration-500 ${
          controls ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        }`}
      >
        {!stopped ? (
          <>
            <div className="flex w-full max-w-sm gap-2">
              {paused ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onResume();
                  }}
                  className="h-12 flex-1 rounded-2xl bg-white text-sm font-semibold text-black"
                >
                  Resume
                </button>
              ) : (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPause("pause");
                    }}
                    className="h-12 flex-1 rounded-2xl border border-white/20 text-sm font-medium text-white/80"
                  >
                    Pause
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPause("sleep");
                    }}
                    className="h-12 flex-1 rounded-2xl border border-white/20 text-sm font-medium text-white/80"
                  >
                    Sleep
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPause("free");
                    }}
                    className="h-12 flex-1 rounded-2xl border border-white/20 text-sm font-medium text-white/80"
                  >
                    Free
                  </button>
                </>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStopped(true);
              }}
              className="h-12 w-full max-w-sm rounded-2xl bg-white/10 text-sm font-semibold text-white"
            >
              Stop
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-white/50">
              Timer stopped. Exit to save this session with subject &amp; topic.
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExit();
              }}
              className="h-12 w-full max-w-sm rounded-2xl bg-brand text-sm font-semibold text-brand-foreground"
            >
              Exit &amp; save session
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStopped(false);
              }}
              className="text-xs text-white/40 underline"
            >
              Keep studying
            </button>
          </>
        )}
        <p className="pt-1 font-mono text-[9px] tracking-[0.3em] text-white/20 uppercase">
          swipe anywhere for controls
        </p>
      </div>
    </div>
  );
}
