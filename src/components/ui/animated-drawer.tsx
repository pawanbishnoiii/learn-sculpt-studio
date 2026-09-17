"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Drawer } from "vaul";
import useMeasure from "react-use-measure";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export type AnimatedDrawerView = {
  id: string;
  /** Rendered inside the drawer body. Receives a setter to switch views. */
  render: (api: { go: (id: string) => void; close: () => void }) => ReactNode;
};

/**
 * Bottom sheet whose height animates smoothly between multi-step views.
 * Measurement drives the height so each view transition feels physical.
 */
export function AnimatedDrawer({
  open,
  onOpenChange,
  views,
  initialView,
  title,
  showClose = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  views: AnimatedDrawerView[];
  initialView?: string;
  title?: string;
  showClose?: boolean;
}) {
  const first = initialView ?? views[0]?.id ?? "default";
  const [view, setView] = useState(first);
  const [elementRef, bounds] = useMeasure();

  useEffect(() => {
    if (!open) setView(first);
  }, [open, first]);

  const active = views.find((v) => v.id === view) ?? views[0];
  const api = { go: setView, close: () => onOpenChange(false) };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md outline-none">
          <div className="mx-3 mb-3 overflow-hidden rounded-3xl border border-border bg-popover shadow-2xl">
            <motion.div
              animate={{ height: bounds.height > 0 ? bounds.height : "auto" }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              <div ref={elementRef} className="p-5">
                <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
                {(title || showClose) && (
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <Drawer.Title className="text-base font-semibold tracking-tight">
                      {title ?? ""}
                    </Drawer.Title>
                    {showClose ? (
                      <button
                        aria-label="Close"
                        onClick={() => onOpenChange(false)}
                        className="grid size-8 place-items-center rounded-full bg-accent text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    ) : null}
                  </div>
                )}
                <motion.div
                  key={view}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {active?.render(api)}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export default AnimatedDrawer;
