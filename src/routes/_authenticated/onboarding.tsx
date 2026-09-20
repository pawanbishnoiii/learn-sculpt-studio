import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { fetchMyProfile, saveOnboarding, syncIdentityToProfile } from "@/lib/study";
import { AvatarPicker } from "@/components/AvatarPicker";
import { SubjectsManager } from "@/components/SubjectsManager";
import { Button } from "@/components/ui/button";
import { ActivityArtwork } from "@/components/study-ui";

export const Route = createFileRoute("/_authenticated/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set up your profile — Bnoy Study" },
      {
        name: "description",
        content: "Three quick steps: your details, your study rhythm and your subjects.",
      },
      { property: "og:title", content: "Set up your profile — Bnoy Study" },
      { property: "og:description", content: "A 60 second setup before your study dashboard opens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingPage,
});

const STEPS = ["Your details", "Study rhythm", "Your subjects"] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const profile = useQuery({ queryKey: ["profile"], queryFn: syncIdentityToProfile });
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    gender: "",
    age: "",
    phone: "",
    avg_study_hours: "3",
  });

  useEffect(() => {
    if (!profile.data) return;
    if (profile.data.onboarded) {
      navigate({ to: "/today", replace: true });
      return;
    }
    setForm((f) => ({
      ...f,
      first_name: f.first_name || (profile.data?.first_name ?? ""),
      last_name: f.last_name || (profile.data?.last_name ?? ""),
      phone: f.phone || (profile.data?.phone ?? ""),
      gender: f.gender || (profile.data?.gender ?? ""),
      age: f.age || (profile.data?.age ? String(profile.data.age) : ""),
    }));
  }, [profile.data, navigate]);

  const errors = useMemo(() => {
    const age = Number(form.age);
    const digits = form.phone.replace(/\D/g, "");
    return {
      first_name: form.first_name.trim() ? "" : "Please enter your first name",
      gender: form.gender ? "" : "Please select your gender",
      age: age >= 8 && age <= 100 ? "" : "Enter an age between 8 and 100",
      phone: digits.length >= 10 ? "" : "Enter a valid mobile number (10 digits)",
    };
  }, [form]);

  const stepValid = step === 0 ? Object.values(errors).every((e) => !e) : true;

  const save = useMutation({
    mutationFn: async () => {
      await saveOnboarding({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        gender: form.gender,
        age: Number(form.age) || 0,
        phone: form.phone.trim(),
        avg_study_hours: Number(form.avg_study_hours) || 0,
      });
    },
    onSuccess: async () => {
      await fetchMyProfile();
      toast.success("Welcome to Bnoy Study");
      navigate({ to: "/today", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="overflow-hidden rounded-[36px] bg-lavender-soft p-6 sm:p-9">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-muted-foreground">
                Step {step + 1} of 3 · {STEPS[step]}
              </p>
              <h1 className="mt-2 text-[clamp(1.75rem,4.5vw,2.5rem)] leading-[1.1] font-extrabold">
                {step === 0
                  ? "Let’s set up your profile"
                  : step === 1
                    ? "How much can you study?"
                    : "Add the subjects you study"}
              </h1>
            </div>
            <ActivityArtwork
              kind={step === 0 ? "reading" : step === 1 ? "revision" : "practice"}
              className="hidden size-24 shrink-0 sm:block"
            />
          </div>
          <div className="mt-6 flex gap-2" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={`h-2 flex-1 rounded-full ${i <= step ? "bg-foreground" : "bg-panel"}`}
              />
            ))}
          </div>
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="surface-card mt-5 p-5 sm:p-7"
        >
          {step === 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="First name" error={touched ? errors.first_name : ""}>
                <input
                  className={inputClass}
                  autoComplete="given-name"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </Field>
              <Field label="Last name">
                <input
                  className={inputClass}
                  autoComplete="family-name"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </Field>
              <Field label="Mobile number" error={touched ? errors.phone : ""}>
                <input
                  className={inputClass}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="10 digit number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label="Age" error={touched ? errors.age : ""}>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                />
              </Field>
              <Field label="Gender" error={touched ? errors.gender : ""} className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: "male", l: "Male" },
                    { v: "female", l: "Female" },
                    { v: "other", l: "Other" },
                    { v: "prefer_not", l: "Prefer not to say" },
                  ].map((g) => (
                    <button
                      key={g.v}
                      type="button"
                      aria-pressed={form.gender === g.v}
                      onClick={() => setForm({ ...form, gender: g.v })}
                      className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
                        form.gender === g.v
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-secondary text-foreground hover:bg-accent"
                      }`}
                    >
                      {g.l}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          ) : step === 1 ? (
            <div className="grid gap-7">
              <Field label={`Average study time per day · ${form.avg_study_hours}h`}>
                <input
                  type="range"
                  min={1}
                  max={14}
                  step={0.5}
                  value={form.avg_study_hours}
                  onChange={(e) => setForm({ ...form, avg_study_hours: e.target.value })}
                  className="w-full accent-[var(--foreground)]"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  We start from this and grow it slowly, only when you keep hitting your plan.
                </p>
              </Field>
              <Field label="Profile picture">
                <AvatarPicker avatarUrl={profile.data?.avatar_url} displayName={profile.data?.display_name} />
              </Field>
            </div>
          ) : (
            <SubjectsManager
              title="Your subjects"
              subtitle="Add the subjects you study — your timer, plan and targets all run on these."
            />
          )}
        </motion.div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="rounded-full"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ArrowLeft /> Back
          </Button>
          {step < 2 ? (
            <Button
              className="min-h-12 rounded-full px-7"
              onClick={() => {
                setTouched(true);
                if (!stepValid) {
                  toast.error("Please complete the required fields");
                  return;
                }
                setTouched(false);
                setStep((s) => s + 1);
              }}
            >
              Continue <ArrowRight />
            </Button>
          ) : (
            <Button
              className="min-h-12 rounded-full px-7"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              <Check /> {save.isPending ? "Saving…" : "Finish & open dashboard"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-12 w-full rounded-2xl border border-border bg-secondary px-4 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-foreground/25";

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-sm text-destructive">{error}</span> : null}
    </label>
  );
}
