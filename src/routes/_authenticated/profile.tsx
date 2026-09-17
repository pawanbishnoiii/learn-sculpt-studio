import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Icon3D } from "@/components/Icon3D";
import { AvatarPicker } from "@/components/AvatarPicker";
import { PushToggle } from "@/components/PushToggle";
import { PageHeader } from "@/components/study-ui";
import { Button } from "@/components/ui/button";
import { FormSkeleton, Skeleton, SoftCard, StatsSkeleton } from "@/components/ui/skeletons";

import {
  fetchSessions,
  fmtHM,
  isAdmin,
  minutesInRange,
  saveOnboarding,
  startOfWeek,
  syncIdentityToProfile,
} from "@/lib/study";

export const Route = createFileRoute("/_authenticated/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Profile — Chronodeck Study OS" },
      {
        name: "description",
        content: "Your Chronodeck profile: Google identity, personal details and lifetime study stats.",
      },
      { property: "og:title", content: "Profile — Chronodeck Study OS" },
      { property: "og:description", content: "Manage your details and see your study record." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: syncIdentityToProfile });
  const admin = useQuery({ queryKey: ["is-admin"], queryFn: isAdmin });
  const sessions = useQuery({ queryKey: ["sessions", "all"], queryFn: () => fetchSessions() });

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    gender: "",
    age: "",
    phone: "",
    avg_study_hours: "3",
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const p = profile.data;
    if (!p || dirty) return;
    setForm({
      first_name: p.first_name ?? "",
      last_name: p.last_name ?? "",
      gender: p.gender ?? "",
      age: p.age ? String(p.age) : "",
      phone: p.phone ?? "",
      avg_study_hours: String(p.avg_study_hours ?? 3),
    });
  }, [profile.data, dirty]);

  const save = useMutation({
    mutationFn: () =>
      saveOnboarding({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        gender: form.gender,
        age: Number(form.age) || 0,
        phone: form.phone.trim(),
        avg_study_hours: Number(form.avg_study_hours) || 0,
      }),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = sessions.data ?? [];
  const total = all.reduce((a, s) => a + (s.duration_minutes ?? 0), 0);
  const week = minutesInRange(all, startOfWeek());
  const field = "field-control";

  const stats = [
    { l: "Recent total", v: fmtHM(total), tint: "tint-lavender" },
    { l: "This week", v: fmtHM(week), tint: "tint-sky" },
    { l: "Sessions", v: String(all.filter((s) => !s.is_running).length), tint: "tint-mint" },
  ];

  if (profile.isLoading) {
    return (
      <div className="space-y-5 px-4 py-6">
        <SoftCard className="flex items-center gap-4">
          <Skeleton className="size-16 shrink-0 rounded-[22px]" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-3 w-1/2 rounded-full" />
          </div>
        </SoftCard>
        <StatsSkeleton count={3} />
        <FormSkeleton fields={5} />
      </div>
    );
  }

  return (
    <div className="app-page space-y-6">
      <PageHeader eyebrow="Account" title="Your study profile" description="Manage your identity, preferences and notifications." />

      <section className="relative overflow-hidden rounded-[32px] bg-peach p-6 sm:p-8">
        <div className="relative flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[22px] bg-background/70 shadow-[var(--shadow-card)]">
            {profile.data?.avatar_url ? (
              <img
                src={profile.data.avatar_url}
                alt={`${profile.data.display_name ?? "Your"} avatar`}
                className="size-full object-cover"
              />
            ) : (
              <Icon3D name="brain" size={52} priority />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{admin.data ? "Admin" : "Student"}</p>
            <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight">
              {profile.data?.display_name ?? "Your profile"}
            </h1>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {fmtHM(total)} across the latest {all.length} records
            </p>
          </div>
        </div>

        {admin.data ? (
          <Link to="/admin" className="mt-5 inline-flex min-h-11 items-center rounded-full border border-foreground/15 px-5 text-sm font-semibold">
            Open admin console
          </Link>
        ) : null}
      </section>

      {/* Bento stats */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.l} className={`rounded-[22px] p-5 ${s.tint} text-[var(--pop-ink)] dark:text-foreground`}>
            <p className="num text-lg leading-none font-extrabold">{s.v}</p>
            <p className="mt-1.5 text-[10px] font-semibold tracking-wide uppercase opacity-70">{s.l}</p>
          </div>
        ))}
      </section>

      <AvatarPicker avatarUrl={profile.data?.avatar_url} displayName={profile.data?.display_name} />

      <PushToggle />

      <section className="surface-card p-5 sm:p-7">
        <h2 className="text-base font-bold tracking-tight">Personal details</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Ye details tumhare plan aur AI coach ko sharp banati hain.</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="text-sm font-semibold">First name<input
            className={field}
            placeholder="First name"
            value={form.first_name}
            onChange={(e) => { setDirty(true); setForm({ ...form, first_name: e.target.value }); }}
          /></label>
          <label className="text-sm font-semibold">Last name<input
            className={field}
            placeholder="Last name"
            value={form.last_name}
            onChange={(e) => { setDirty(true); setForm({ ...form, last_name: e.target.value }); }}
          /></label>
        </div>
        <select
          className={`${field} mt-2`}
          value={form.gender}
          onChange={(e) => { setDirty(true); setForm({ ...form, gender: e.target.value }); }}
        >
          <option value="">Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer_not">Prefer not to say</option>
        </select>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            className={field}
            inputMode="numeric"
            placeholder="Age"
            value={form.age}
            onChange={(e) => { setDirty(true); setForm({ ...form, age: e.target.value }); }}
          />
          <input
            className={field}
            inputMode="tel"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => { setDirty(true); setForm({ ...form, phone: e.target.value }); }}
          />
        </div>

        <div className="card-raised mt-4 p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <span className="text-xs font-semibold">Average study time</span>
            <span className="num rounded-full bg-brand/12 px-2.5 py-1 text-xs font-bold text-brand">
              {form.avg_study_hours}h/day
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={14}
            step={0.5}
            value={form.avg_study_hours}
            onChange={(e) => { setDirty(true); setForm({ ...form, avg_study_hours: e.target.value }); }}
            className="mt-3 w-full accent-[var(--brand)]"
          />
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending || !dirty} className="mt-5 sm:w-auto">
          {save.isPending ? "Saving…" : dirty ? "Save profile" : "Saved"}
        </Button>
      </section>
    </div>
  );
}
