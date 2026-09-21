import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { GoogleOneTap } from "@/components/GoogleOneTap";
import authStudent from "@/assets/chronodeck-auth-student.png";
import appLogo from "@/assets/bnoy-b-logo.png.asset.json";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C36.9 40.2 44 35 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}

/** Google blocks its sign-in flow inside embedded frames — offer a real tab. */
function googleBlocked() {
  toast.error("Google sign-in needs its own browser tab.", {
    duration: 8000,
    action: {
      label: "Open app",
      onClick: () => window.open(window.location.href, "_blank", "noopener,noreferrer"),
    },
  });
}

export function AuthScreen() {
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(true);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const routed = useRef(false);

  useEffect(() => {
    async function route(userId: string | undefined) {
      if (!userId || routed.current) return;
      routed.current = true;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", userId)
        .maybeSingle();
      navigate({ to: profile?.onboarded ? "/today" : "/onboarding", replace: true });
    }

    supabase.auth.getSession().then(({ data }) => void route(data.session?.user.id));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        routed.current = false;
        return;
      }
      void route(session?.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function google() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        googleBlocked();
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarded")
          .eq("id", data.user.id)
          .maybeSingle();
        routed.current = true;
        navigate({ to: profile?.onboarded ? "/today" : "/onboarding", replace: true });
      } else {
        setBusy(false);
      }
    } catch {
      googleBlocked();
      setBusy(false);
    }
  }

  async function withEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link bhej diya — apna inbox check karo.");
        setMode("signin");
      } else if (mode === "signup") {
        // Signup is also a safe sign-in surface for returning users. Only the
        // explicit invalid-credentials response falls through to account creation.
        const login = await supabase.auth.signInWithPassword({ email, password });
        if (login.data.session) return;
        if (login.error && login.error.code !== "invalid_credentials") throw login.error;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) setConfirmationEmail(email);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "h-13 w-full rounded-2xl bg-secondary px-4 text-[15px] font-medium text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-transparent transition focus:ring-2 focus:ring-ring";

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-hidden bg-blue-soft dark:bg-background md:grid md:grid-cols-[minmax(0,1fr)_minmax(420px,0.8fr)]">
      <GoogleOneTap />

      <header className="relative z-10 flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top))] md:absolute md:inset-x-0 md:top-0 md:px-10">
        <div className="flex items-center gap-2.5">
          <img
            src={appLogo.url}
             alt="Bnoy Study"
            width={1024}
            height={1024}
            className="size-9 rounded-2xl object-contain shadow-lg"
          />
          <span className="font-heading text-[18px] leading-none font-extrabold text-foreground">
             Bnoy Study
          </span>
        </div>
        <Link
          to="/welcome"
          className="rounded-full border border-border bg-panel/70 px-3.5 py-2 text-[12px] font-bold text-foreground"
        >
          Tour
        </Link>
      </header>

      {/* Landing hero */}
      <main className="relative z-10 flex min-h-[43svh] flex-1 flex-col items-center justify-end px-6 pb-7 text-center md:min-h-screen md:justify-center md:px-12 md:pb-10">
        <motion.img
          src={authStudent}
          alt="Student studying beside books and a desk"
          width={1024}
          height={1024}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-h-[48svh] w-full max-w-[560px] object-contain"
        />
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="font-heading mt-1 text-[clamp(2rem,4vw,4.5rem)] leading-[1.02] font-extrabold tracking-tight text-foreground"
        >
          Study smart.
          <br />
          Track every minute.
        </motion.h1>
        <p className="mt-2.5 max-w-[19rem] text-[13px] leading-relaxed font-medium text-muted-foreground">
          Timer, timetable, targets aur AI study manager — sab ek tap mein.
        </p>
      </main>

      {/* Sticky landing CTA */}
      <div className="relative z-10 px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:hidden">
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            setMode("signup");
            setSheet(true);
          }}
          className="flex h-15 w-full items-center justify-center gap-2 rounded-full bg-foreground py-4 text-[15px] font-bold text-background shadow-xl"
        >
          <Sparkles className="size-4" />
          Get Started
        </motion.button>
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setSheet(true);
          }}
          className="mt-3 w-full text-[13px] font-semibold text-muted-foreground"
        >
          Already have an account? <span className="text-brand">Sign in</span>
        </button>
      </div>

      {/* Login card — slides up from the bottom */}
      <AnimatePresence>
        {sheet ? (
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end bg-black/45 md:static md:z-10 md:items-stretch md:bg-transparent"
            onClick={() => setSheet(false)}
          >
            <motion.section
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.9 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 700) setSheet(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[92svh] w-full touch-pan-y overflow-y-auto rounded-t-[32px] border-border bg-panel px-5 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-30px_rgb(0_0_0_/_0.5)] md:max-h-none md:w-full md:rounded-l-[48px] md:rounded-tr-none md:border-l md:px-[clamp(2rem,5vw,4.5rem)] md:py-24 md:shadow-xl"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border md:hidden" />
              <p className="mb-2 hidden text-sm font-semibold text-primary md:block">
                 Welcome to Bnoy Study
              </p>

              {confirmationEmail ? (
                <div role="status" className="rounded-2xl bg-primary/10 p-5 text-center">
                  <h2 className="text-xl font-bold">Check your email</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    We sent a confirmation link to{" "}
                    <strong className="text-foreground">{confirmationEmail}</strong>.
                  </p>
                  <button
                    onClick={() => setConfirmationEmail(null)}
                    className="mt-4 text-sm font-semibold text-primary"
                  >
                    Use another email
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="font-heading text-[24px] leading-[1.12] font-extrabold text-foreground">
                    {mode === "signin"
                      ? "Welcome back"
                      : mode === "signup"
                        ? "Create your deck"
                        : "Reset password"}
                  </h2>
                  <p className="mt-1.5 text-[13px] font-medium text-muted-foreground">
                    {mode === "forgot"
                      ? "Email daalo — hum reset link bhej denge."
                      : "Google se ek tap, ya email se sign in karo."}
                  </p>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={google}
                    disabled={busy}
                    className="mt-5 flex h-13 w-full items-center justify-center gap-3 rounded-full border border-border bg-panel text-[15px] font-bold text-foreground shadow-sm transition hover:bg-secondary disabled:opacity-60"
                  >
                    <GoogleMark />
                    Continue with Google
                  </motion.button>

                  <div className="my-4 flex items-center gap-3 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                    <span className="h-px flex-1 bg-border" /> or{" "}
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <form onSubmit={withEmail} className="space-y-2.5">
                    {formError ? (
                      <p
                        role="alert"
                        className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
                      >
                        {formError}
                      </p>
                    ) : null}
                    <label
                      htmlFor="auth-email"
                      className="block text-sm font-semibold text-foreground"
                    >
                      Email
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className={inputCls}
                    />
                    {mode !== "forgot" ? (
                      <div className="relative">
                        <label
                          htmlFor="auth-password"
                          className="mb-1.5 block text-sm font-semibold text-foreground"
                        >
                          Password
                        </label>
                        <input
                          id="auth-password"
                          type={showPw ? "text" : "password"}
                          required
                          minLength={6}
                          autoComplete={mode === "signin" ? "current-password" : "new-password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          className={`${inputCls} pr-13`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          aria-label={showPw ? "Hide password" : "Show password"}
                          className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground"
                        >
                          {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                        </button>
                      </div>
                    ) : null}

                    {mode !== "forgot" ? (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="text-[13px] font-semibold text-brand"
                        >
                          Forgot password?
                        </button>
                      </div>
                    ) : null}

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      disabled={busy}
                      className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-foreground text-[15px] font-bold text-background disabled:opacity-60"
                    >
                      {busy ? (
                        <span className="size-4 animate-spin rounded-full border-2 border-background/40 border-t-background" aria-hidden />
                      ) : null}
                      {mode === "signin"
                        ? "Sign in with Email"
                        : mode === "signup"
                          ? "Sign up with Email"
                          : "Send reset link"}
                    </motion.button>
                  </form>

                  <button
                    type="button"
                    onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                    className="mt-4 w-full text-[13px] font-semibold text-muted-foreground"
                  >
                    {mode === "signin" ? (
                      <>
                        No account? <span className="text-brand">Create one</span>
                      </>
                    ) : (
                      <>
                        Already have an account? <span className="text-brand">Sign in</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
