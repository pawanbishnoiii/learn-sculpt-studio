import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Menu, X, CalendarDays, Clock3, History, Target, ArrowRight, Check } from "lucide-react";
import { useRef, useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { supabase } from "@/integrations/supabase/client";
import appLogo from "@/assets/chronodeck-logo.png";
import pathArt from "@/assets/chronodeck-learning-path.png";
import { ActivityArtwork, type ActivityKind } from "@/components/study-ui";
import { ShaderBackground } from "@/components/ui/frorest-green";

const activities: Array<{ kind: ActivityKind; title: string; copy: string; bg: string }> = [
  {
    kind: "reading",
    title: "Reading",
    copy: "Log newspaper, magazine and book reading as real study time.",
    bg: "var(--yellow-soft)",
  },
  {
    kind: "revision",
    title: "Revision",
    copy: "Come back to chapters on a schedule instead of by memory.",
    bg: "var(--lavender-soft)",
  },
  {
    kind: "class",
    title: "Online class",
    copy: "Track lectures alongside self-study so the week stays honest.",
    bg: "var(--blue-soft)",
  },
  {
    kind: "practice",
    title: "Test & practice",
    copy: "Record attempts and see which subjects still need work.",
    bg: "var(--mint-soft)",
  },
];

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Bnoy Study — Make every study session count" },
      {
        name: "description",
        content: "Plan focused study sessions and understand your progress with Bnoy Study.",
      },
    ],
  }),
  component: WelcomePage,
});

const features = [
  {
    Icon: Clock3,
    title: "Focus timer",
    copy: "Run a quiet full-screen timer, pause for a break, and save the topic you covered.",
  },
  {
    Icon: CalendarDays,
    title: "Weekly timetable",
    copy: "Turn your weekly plan into study blocks that can launch a session directly.",
  },
  {
    Icon: Target,
    title: "Subject targets",
    copy: "Set daily and weekly goals and compare them with time you actually studied.",
  },
  {
    Icon: History,
    title: "History and progress",
    copy: "Review sessions by day with subjects, topics, categories, notes, and durations.",
  },
];

function WelcomePage() {
  const root = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const session = useQuery({
    queryKey: ["welcome-session"],
    queryFn: () => supabase.auth.getSession().then((r) => r.data.session),
  });
  const destination = session.data ? "/today" : "/auth";
  useGSAP(
    () => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const tl = gsap.timeline({ defaults: { ease: "power2.out", duration: 0.55 } });
      tl.from("[data-hero-copy] > *", { opacity: 0, y: 12, stagger: 0.07 }).from(
        "[data-preview]",
        { opacity: 0, y: 12, scale: 0.98 },
        "<.15",
      );
      gsap.utils
        .toArray<HTMLElement>("[data-reveal]")
        .forEach((node) =>
          gsap.from(node, {
            opacity: 0,
            y: 16,
            duration: 0.45,
            scrollTrigger: { trigger: node, start: "top 90%", once: true },
          }),
        );
    },
    { scope: root },
  );

  return (
    <div ref={root} className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between">
          <a href="#top" className="flex items-center gap-2.5 font-bold">
            <img src={appLogo} width="36" height="36" alt="" className="size-9 rounded-xl" />
            Bnoy Study
          </a>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
            {[
              ["Features", "features"],
              ["How it works", "how"],
              ["About", "about"],
              ["FAQ", "faq"],
            ].map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link to="/auth" className="px-4 text-sm font-semibold">
              Sign in
            </Link>
            <Link
              to={destination}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              {session.data ? "Open dashboard" : "Get started"}
            </Link>
          </div>
          <button
            aria-label="Toggle menu"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
            className="grid size-11 place-items-center md:hidden"
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
        {menu && (
          <nav className="mx-auto max-w-6xl border-t border-border py-3 md:hidden">
            {[
              ["Features", "features"],
              ["How it works", "how"],
              ["About", "about"],
              ["FAQ", "faq"],
            ].map(([label, id]) => (
              <a
                key={id}
                onClick={() => setMenu(false)}
                href={`#${id}`}
                className="block rounded-lg px-3 py-3 text-sm"
              >
                {label}
              </a>
            ))}
            <Link
              to={destination}
              className="mt-2 flex rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              Get started
            </Link>
          </nav>
        )}
      </header>

      <main id="top">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-[1.05fr_.95fr] md:py-20">
          <div data-hero-copy>
            <p className="section-label">Your calm study workspace</p>
            <h1 className="mt-4 max-w-xl text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.04] font-extrabold tracking-[-.04em]">
              A little focus.{" "}
              <span className="relative inline-block">
                <span
                  aria-hidden
                  className="absolute inset-x-[-.25em] inset-y-[.12em] -z-10 rounded-[1.25rem] bg-[var(--lavender-soft)]"
                />
                A lot of progress.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              Plan your week, enter a distraction-free focus session, and see where your study time
              really goes.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to={destination}
                className="inline-flex h-13 min-h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 font-bold text-background"
              >
                Start studying <ArrowRight className="size-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex h-13 min-h-12 items-center justify-center rounded-full border border-border bg-panel px-7 font-semibold"
              >
                Explore the app
              </a>
            </div>
          </div>
          <div data-preview className="relative">
            <img
              src={pathArt}
              width={1024}
              height={1024}
              alt="Student climbing a path of books"
              className="mx-auto w-full max-w-md object-contain"
            />
            <div className="surface-card absolute -bottom-4 left-0 w-44 bg-panel p-4 shadow-lg sm:w-52">
              <p className="text-xs text-muted-foreground">Focused today · demo</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums">02:15</p>
              <div className="mt-3 h-2 rounded-full bg-secondary">
                <div className="h-full w-3/5 rounded-full bg-foreground" />
              </div>
            </div>
            <div className="surface-card absolute -top-2 right-0 hidden w-44 bg-[var(--blue-soft)] p-4 sm:block">
              <p className="text-xs text-muted-foreground">Next block · demo</p>
              <p className="mt-1 font-bold">Geography · 4:00</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {activities.map((a) => (
              <article
                data-reveal
                key={a.title}
                className="surface-card p-5"
                style={{ background: a.bg }}
              >
                <ActivityArtwork kind={a.kind} className="size-16 rounded-2xl" />
                <h3 className="mt-4 text-lg font-bold">{a.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{a.copy}</p>
              </article>
            ))}
          </div>
        </section>


        <section id="how" data-reveal className="border-y border-border bg-panel px-5 py-16">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold text-primary">How it works</p>
            <h2 className="mt-2 text-3xl font-bold">A simple study loop</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {["Plan your day", "Start a focus session", "Review your progress"].map((x, i) => (
                <div key={x} className="rounded-2xl border border-border bg-background p-6">
                  <span className="grid size-9 place-items-center rounded-full bg-primary/10 font-mono text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{x}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {i === 0
                      ? "Choose a timetable block, subject, and topic."
                      : i === 1
                        ? "Study with a clear timer and intentional breaks."
                        : "Use your history and targets to plan the next session."}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Times shown in previews are illustrative demo data.
            </p>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-5 py-20">
          <div data-reveal className="max-w-xl">
            <p className="text-sm font-semibold text-primary">Features</p>
            <h2 className="mt-2 text-3xl font-bold">
              Everything around the session, without the clutter
            </h2>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            {features.map(({ Icon, title, copy }) => (
              <article
                data-reveal
                key={title}
                className="rounded-3xl border border-border bg-panel p-6"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-xl font-bold">{title}</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="about" data-reveal className="border-y border-border bg-panel px-5 py-16">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold text-primary">About Bnoy Study</p>
            <h2 className="mt-2 text-3xl font-bold">Built to make effort visible</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Bnoy Study helps students organise their time, maintain focus, and understand their
              study effort. It brings planning, timing, targets, and session history into one
              connected workspace.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Your real subjects and topics",
                "Clear daily and weekly progress",
                "Intentional break logging",
                "Light and dark appearance",
              ].map((x) => (
                <li key={x} className="flex gap-2 text-sm">
                  <Check className="size-5 text-success" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-5 py-20">
          <h2 className="text-3xl font-bold">Frequently asked questions</h2>
          <Accordion.Root
            type="single"
            collapsible
            className="mt-7 divide-y divide-border border-y border-border"
          >
            {[
              [
                "Does the timer keep my session after a refresh?",
                "Yes. Running sessions are stored in your account and reconstructed from saved timestamps.",
              ],
              [
                "Can I plan different subjects each week?",
                "Yes. The timetable supports day-based blocks, subjects, time ranges, and study or class categories.",
              ],
              [
                "What appears in history?",
                "Finished study sessions and logged breaks, including available subjects, topics, notes, categories, and durations.",
              ],
              [
                "Can I use dark mode?",
                "Yes. Bnoy Study includes light and dark appearances from the account header.",
              ],
            ].map(([q = "", a = ""]) => (
              <Accordion.Item key={q} value={q}>

                <Accordion.Header>
                  <Accordion.Trigger className="flex w-full items-center justify-between py-5 text-left font-semibold">
                    {q}
                    <span aria-hidden>+</span>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="pb-5 text-sm leading-6 text-muted-foreground">
                  {a}
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </section>

        <section className="px-5 pb-20">
          <div className="mx-auto max-w-6xl rounded-3xl bg-[#172033] px-6 py-12 text-center text-white">
            <h2 className="text-3xl font-bold">Ready for a more focused study day?</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/65">
              Start with one session. Bnoy Study will keep the plan and progress around it
              organised.
            </p>
            <Link
              to={destination}
              className="mt-6 inline-flex h-12 items-center rounded-xl bg-white px-6 font-semibold text-[#172033]"
            >
              Get started
            </Link>
          </div>
        </section>
      </main>
      <footer className="relative isolate overflow-hidden border-t border-border px-5 py-14">
        <ShaderBackground className="absolute inset-0 -z-10 h-full w-full" />
        <div className="absolute inset-0 -z-10 bg-black/25" />
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-white/85 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-white">© {new Date().getFullYear()} Bnoy Study OS</p>
          <div className="flex gap-5">
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#faq">FAQ</a>
            <Link to="/auth">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
