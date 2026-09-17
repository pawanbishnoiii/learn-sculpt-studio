import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

async function fetchPresets() {
  const { data, error } = await supabase
    .from("avatar_presets")
    .select("id,name,image_url,sort_order,is_active")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Admin: upload the ready-made avatar library users can pick from. */
export function AdminAvatarPanel() {
  const qc = useQueryClient();
  const presets = useQuery({ queryKey: ["admin-avatar-presets"], queryFn: fetchPresets });
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("avatar_presets").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-avatar-presets"] });
      qc.invalidateQueries({ queryKey: ["avatar-presets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function upload(files: FileList) {
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
        const path = `avatar-presets/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("data").upload(path, file);
        if (error) throw new Error(error.message);
        const { data: signed, error: signedError } = await supabase.storage.from("data").createSignedUrl(path, 60 * 60 * 24 * 3650);
        if (signedError) throw new Error(signedError.message);
        const { error: insertError } = await supabase.from("avatar_presets").insert({
          name: file.name.replace(/\.[^.]+$/, ""),
          image_url: signed.signedUrl,
          sort_order: presets.data?.length ?? 0,
        });
        if (insertError) throw new Error(insertError.message);
      }
      qc.invalidateQueries({ queryKey: ["admin-avatar-presets"] });
      qc.invalidateQueries({ queryKey: ["avatar-presets"] });
      toast.success("Avatars uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass-panel p-4 sm:p-5">
      <h2 className="text-sm font-bold tracking-tight">Avatar library</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Yahan upload kiye avatars users profile me choose kar sakte hain.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void upload(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="mt-3 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60"
      >
        {busy ? "Uploading…" : "Upload avatars"}
      </button>

      <div className="mt-4 flex flex-wrap gap-3">
        {(presets.data ?? []).map((p) => (
          <div key={p.id} className="relative">
            <img
              src={p.image_url}
              alt={p.name}
              className="size-14 rounded-full object-cover ring-2 ring-border"
            />
            <button
              type="button"
              onClick={() => remove.mutate(p.id)}
              aria-label={`Remove ${p.name}`}
              className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground"
            >
              ×
            </button>
          </div>
        ))}
        {presets.data?.length === 0 ? (
          <p className="text-xs text-muted-foreground">Abhi koi avatar upload nahi hua.</p>
        ) : null}
      </div>
    </section>
  );
}
