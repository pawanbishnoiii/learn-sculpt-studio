import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

async function fetchPresets() {
  const { data, error } = await supabase
    .from("avatar_presets")
    .select("id,name,image_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Profile picture control: upload your own, or pick one of the admin-uploaded avatars. */
export function AvatarPicker({
  avatarUrl,
  displayName,
  uploadEnabled = true,
}: {
  avatarUrl: string | null | undefined;
  displayName: string | null | undefined;
  uploadEnabled?: boolean;
}) {
  const qc = useQueryClient();
  const presets = useQuery({ queryKey: ["avatar-presets"], queryFn: fetchPresets });
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  async function apply(url: string) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", data.user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profile photo updated");
  }

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Sirf image file chuno");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image 4MB se choti honi chahiye");
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Signed out");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
       const path = `avatars/${auth.user.id}/${Date.now()}.${ext}`;
       setProgress(20);
       const { error: uploadError } = await supabase.storage.from("data").upload(path, file, {
         contentType: file.type || "application/octet-stream",
         upsert: false,
       });
       if (uploadError) throw new Error(uploadError.message);
       setProgress(80);
      const { data: signed, error: signedError } = await supabase.storage
        .from("data")
        .createSignedUrl(path, 60 * 60 * 24 * 3650);
      if (signedError) throw new Error(signedError.message);
      setProgress(100);
      await apply(signed.signedUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  return (
    <section className="glass-panel p-5">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${displayName ?? "Your"} avatar`}
            className="size-16 shrink-0 rounded-full object-cover ring-2 ring-brand/30"
          />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-accent text-lg font-extrabold text-accent-foreground">
            {(displayName ?? "?").slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-bold tracking-tight">Profile photo</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Apni photo upload karo ya ready-made avatar chuno.
          </p>
          {uploadEnabled ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="mt-3 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60"
              >
                {busy ? `Uploading… ${progress}%` : "Upload photo"}
              </button>
              {busy ? (
                <div
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-2 h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              ) : null}
            </>

          ) : null}
        </div>
      </div>

      {presets.data && presets.data.length > 0 ? (
        <div className="mt-5">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Ready-made avatars
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {presets.data.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void apply(p.image_url)}
                title={p.name}
                className={`size-12 overflow-hidden rounded-full ring-2 transition-transform duration-200 hover:-translate-y-0.5 ${
                  avatarUrl === p.image_url ? "ring-brand" : "ring-border"
                }`}
              >
                <img src={p.image_url} alt={p.name} className="size-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
