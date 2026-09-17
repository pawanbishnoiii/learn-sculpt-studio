import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Sparkles } from "lucide-react";
import { fetchAppSettings, updateAppSettings, uploadBrandImageWithProgress } from "@/lib/study";

/** Admin: swap the app logo and browser favicon without a redeploy. */
export function AdminBrandingPanel() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["app-settings"], queryFn: fetchAppSettings });

  const save = useMutation({
    mutationFn: (patch: { logo_url?: string; favicon_url?: string }) => updateAppSettings(patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Branding updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="glass-panel p-4 sm:p-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold tracking-tight">Branding</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Logo aur favicon yahin se badlo.</p>
        </div>
        <Sparkles className="size-5 shrink-0 text-muted-foreground" />
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <BrandSlot
          label="App logo"
          folder="logo"
          url={settings.data?.logo_url ?? null}
          onPick={(logo_url) => save.mutate({ logo_url })}
        />
        <BrandSlot
          label="Favicon"
          folder="favicon"
          url={settings.data?.favicon_url ?? null}
          onPick={(favicon_url) => save.mutate({ favicon_url })}
        />
      </div>
    </section>
  );
}

function BrandSlot({
  label,
  folder,
  url,
  onPick,
}: {
  label: string;
  folder: "logo" | "favicon";
  url: string | null;
  onPick: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image 5MB se choti honi chahiye.");
      return;
    }
    setProgress(0);
    try {
      onPick(await uploadBrandImageWithProgress(file, folder, setProgress));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="card-raised p-3">
      <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-background">
          {url ? (
            <img src={url} alt={label} className="size-full object-contain" />
          ) : (
            <ImagePlus className="size-4 text-muted-foreground" />
          )}
        </span>
        <input
          ref={ref}
          type="file"
          accept="image/png,image/svg+xml,image/jpeg,image/webp"
          hidden
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={progress !== null}
          onClick={() => ref.current?.click()}
          className="h-10 min-w-0 rounded-full border border-border px-3 text-xs font-semibold transition-transform duration-200 active:scale-95 disabled:opacity-60"
        >
          {progress !== null ? `Uploading ${progress}%` : url ? "Replace" : "Upload"}
        </button>
      </div>
      {progress !== null ? (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

