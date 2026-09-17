import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    const receive = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    window.addEventListener("beforeinstallprompt", receive);
    return () => window.removeEventListener("beforeinstallprompt", receive);
  }, []);
  if (!prompt) return null;
  return <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold hover:bg-secondary" onClick={async () => { await prompt.prompt(); const result = await prompt.userChoice; if (result.outcome === "accepted") setPrompt(null); }}><Download className="size-4" />Install Chronodeck</button>;
}