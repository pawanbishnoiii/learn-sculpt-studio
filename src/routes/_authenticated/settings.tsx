import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FormSkeleton, Skeleton, SoftCard } from "@/components/ui/skeletons";
import { fetchProfile, fetchSettings, fetchSubjects, saveProfile, saveSettings, type Settings } from "@/lib/study";
import { useTheme, type BackgroundStyle } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Bnoy Study OS" },
      {
        name: "description",
        content: "Configure study goals, AI coach tone, auto-stop timer and weekly start day.",
      },
      { property: "og:title", content: "Settings — Bnoy Study OS" },
      {
        property: "og:description",
        content: "Personalize your study goals, AI tone and timer preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

const inputCls = "input";

function SettingsPage() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const profile = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const { backgroundStyle, setBackgroundStyle } = useTheme();

  const [draft, setDraft] = useState<Partial<Settings>>({});
  const [name, setName] = useState("");

  useEffect(() => {
    if (settings.data) setDraft(settings.data);
  }, [settings.data]);

  useEffect(() => {
    if (profile.data?.display_name) setName(profile.data.display_name);
  }, [profile.data]);

  const saveM = useMutation({
    mutationFn: async () => {
      await saveSettings({
        daily_goal_hours: Number(draft.daily_goal_hours ?? 4),
        weekly_goal_hours: Number(draft.weekly_goal_hours ?? 20),
        auto_stop_hours: Number(draft.auto_stop_hours ?? 6),
        ai_tone: draft.ai_tone ?? "coach",
        ai_autopilot: Boolean(draft.ai_autopilot),
        week_starts_monday: Boolean(draft.week_starts_monday),
        background_style: (draft.background_style ?? backgroundStyle) as Settings["background_style"],
        timer_background_effects: Boolean(draft.timer_background_effects),
        timer_show_details: Boolean(draft.timer_show_details),
        timer_sounds_haptics: Boolean(draft.timer_sounds_haptics),
        timer_keep_awake: Boolean(draft.timer_keep_awake),
      });
      if (name.trim()) await saveProfile({ display_name: name.trim() });
    },
    onSuccess: () => {
      setBackgroundStyle((draft.background_style ?? backgroundStyle) as BackgroundStyle);
      qc.invalidateQueries();
      toast.success("Settings saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (settings.isLoading || profile.isLoading) {
    return (
      <div className="space-y-4 px-4 py-6">
        <SoftCard className="space-y-3">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3 w-3/4 rounded-full" />
        </SoftCard>
        <FormSkeleton fields={3} />
        <FormSkeleton fields={4} />
      </div>
    );
  }

  return (
    <>

      <section className="px-4 pt-6">
        <div className="pop-sheet p-6">
          <p className="eyebrow">Preferences</p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight">Settings</h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Goals, AI tone aur timer behaviour — sab yahin se tune karo.
          </p>
        </div>
      </section>

      <section className="mt-5 space-y-4 px-4">
        <div className="glass-panel p-5">
          <h3 className="text-base font-bold tracking-tight">Profile</h3>
          <div className="mt-3 space-y-3">
            <div>
              <label className="eyebrow mb-1.5 block">Display name</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="glass-panel p-5">
          <h3 className="text-base font-bold tracking-tight">Appearance</h3>
          <p className="mt-1 text-xs text-muted-foreground">App background ka style choose karo.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["clean", "grid", "colorful"] as const).map((style) => (
              <button key={style} type="button" onClick={() => { setDraft({ ...draft, background_style: style }); setBackgroundStyle(style); }} className={`h-12 rounded-xl border text-xs font-bold capitalize ${((draft.background_style ?? backgroundStyle) === style) ? "border-brand bg-brand text-brand-foreground" : "border-border bg-background"}`}>{style}</button>
            ))}
          </div>
        </div>

        <div className="glass-panel p-5">
          <h3 className="text-base font-bold tracking-tight">Goals</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="eyebrow mb-1.5 block">Daily hours</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={draft.daily_goal_hours ?? 4}
                onChange={(e) => setDraft({ ...draft, daily_goal_hours: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="eyebrow mb-1.5 block">Weekly hours</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={draft.weekly_goal_hours ?? 20}
                onChange={(e) => setDraft({ ...draft, weekly_goal_hours: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="glass-panel p-5">
          <h3 className="text-base font-bold tracking-tight">Timer</h3>
          <div className="mt-3">
            <label className="eyebrow mb-1.5 block">
              Auto-stop after (hours)
            </label>
            <input
              type="number"
              min={1}
              max={24}
              step={1}
              value={draft.auto_stop_hours ?? 6}
              onChange={(e) => setDraft({ ...draft, auto_stop_hours: Number(e.target.value) })}
              className={inputCls}
            />
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Background job closes any session left running past this limit.
            </p>
            <div className="mt-4 space-y-2">
              {([
                ["timer_background_effects", "Background effects"],
                ["timer_show_details", "Subject and topic details"],
                ["timer_sounds_haptics", "Sounds and haptics"],
                ["timer_keep_awake", "Keep screen awake"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3 text-sm">
                  <span>{label}</span>
                  <input type="checkbox" checked={Boolean(draft[key])} onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })} className="size-5 accent-brand" />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel p-5">
          <h3 className="text-base font-bold tracking-tight">AI coach</h3>
          <div className="mt-3 space-y-3">
            <div>
              <label className="eyebrow mb-1.5 block">Tone</label>
              <select
                value={draft.ai_tone ?? "coach"}
                onChange={(e) => setDraft({ ...draft, ai_tone: e.target.value })}
                className={inputCls}
              >
                <option value="coach">Focused coach</option>
                <option value="friend">Supportive friend</option>
                <option value="strict">Strict mentor</option>
                <option value="teacher">Patient teacher</option>
              </select>
            </div>
            <label className="flex items-center justify-between">
              <span className="text-sm">Week starts Monday</span>
              <input
                type="checkbox"
                checked={Boolean(draft.week_starts_monday)}
                onChange={(e) => setDraft({ ...draft, week_starts_monday: e.target.checked })}
                className="size-5 accent-brand"
              />
            </label>
          </div>
        </div>

        <button
          disabled={saveM.isPending}
          onClick={() => saveM.mutate()}
          className="btn-pop w-full"
        >
          Save settings
        </button>
      </section>
    </>
  );
}
