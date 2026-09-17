import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Settings = {
  push_enabled: boolean;
  avatar_upload_enabled: boolean;
  android_min_version: string | null;
  android_latest_version: string | null;
  android_update_url: string | null;
  android_force_update: boolean;
};

const FIELDS =
  "push_enabled,avatar_upload_enabled,android_min_version,android_latest_version,android_update_url,android_force_update";

async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase.from("app_settings").select(FIELDS).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Settings;
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-2">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
          value ? "bg-brand" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-panel shadow transition-all duration-200 ${
            value ? "left-6" : "left-1"
          }`}
        />
      </button>
    </label>
  );
}

/** Admin: push master switch, avatar uploads, and Android app release controls. */
export function AdminAppControlPanel() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["app-control-settings"], queryFn: fetchSettings });
  const [form, setForm] = useState<Settings | null>(null);

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  const save = useMutation({
    mutationFn: async (next: Settings) => {
      const { error } = await supabase.from("app_settings").update(next).eq("id", true);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-control-settings"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!form) {
    return (
      <section className="glass-panel p-4 sm:p-5">
        <div className="shimmer h-24 rounded-3xl" />
      </section>
    );
  }

  return (
    <section className="glass-panel p-4 sm:p-5">
      <h2 className="text-sm font-bold tracking-tight">App control</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Ye settings web aur Android app dono ko control karti hain.
      </p>

      <div className="mt-3 divide-y divide-border">
        <Toggle
          label="Push notifications"
          hint="Master switch for all devices"
          value={form.push_enabled}
          onChange={(v) => setForm({ ...form, push_enabled: v })}
        />
        <Toggle
          label="Avatar uploads"
          hint="Users apni photo upload kar sakte hain"
          value={form.avatar_upload_enabled}
          onChange={(v) => setForm({ ...form, avatar_upload_enabled: v })}
        />
        <Toggle
          label="Force Android update"
          hint="Purane version par app block ho jaayegi"
          value={form.android_force_update}
          onChange={(v) => setForm({ ...form, android_force_update: v })}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <input
          className="input rounded-full"
          placeholder="Min version"
          value={form.android_min_version ?? ""}
          onChange={(e) => setForm({ ...form, android_min_version: e.target.value })}
        />
        <input
          className="input rounded-full"
          placeholder="Latest version"
          value={form.android_latest_version ?? ""}
          onChange={(e) => setForm({ ...form, android_latest_version: e.target.value })}
        />
      </div>
      <input
        className="input mt-2 rounded-full"
        placeholder="Play Store / APK update URL"
        value={form.android_update_url ?? ""}
        onChange={(e) => setForm({ ...form, android_update_url: e.target.value })}
      />

      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate(form)}
        className="mt-4 h-12 w-full rounded-full bg-foreground text-sm font-semibold text-background transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-50"
      >
        {save.isPending ? "Saving…" : "Save app control"}
      </button>
    </section>
  );
}
