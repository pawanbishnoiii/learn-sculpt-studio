import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — Chronodeck Study OS" },
      {
        name: "description",
        content: "Set a new Chronodeck password and get back to your timer, timetable and targets.",
      },
      { property: "og:title", content: "Reset password — Chronodeck Study OS" },
      { property: "og:description", content: "Choose a new password for your Chronodeck study account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setReady(Boolean(session)));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Dono password same hone chahiye");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password update ho gaya");
      navigate({ to: "/today", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-lines flex min-h-[100svh] items-center justify-center bg-background px-5">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel w-full max-w-sm p-6"
      >
        <p className="font-mono text-[10px] tracking-[0.3em] text-brand uppercase">Reset</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Naya password set karo</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {ready
            ? "Minimum 6 characters. Set karte hi tum wapas deck pe pahunch jaoge."
            : "Email wala reset link kholo — usi link se yeh page unlock hoga."}
        </p>

        <form onSubmit={submit} className="mt-5 space-y-2.5">
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="new password"
            disabled={!ready}
            className="h-12 w-full rounded-xl border border-border bg-background/70 px-4 text-sm outline-none transition-colors focus:border-brand/60 disabled:opacity-50"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="confirm password"
            disabled={!ready}
            className="h-12 w-full rounded-xl border border-border bg-background/70 px-4 text-sm outline-none transition-colors focus:border-brand/60 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || !ready}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] text-sm font-semibold text-brand-foreground transition-opacity disabled:opacity-50"
          >
            {busy ? "Saving…" : "Update password"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
