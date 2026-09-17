import { createFileRoute } from "@tanstack/react-router";
import { AdminSchedulePanel } from "@/components/admin/AdminSchedulePanel";

export const Route = createFileRoute("/_authenticated/admin/schedule")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Schedule builder — Chronodeck Admin" },
      { name: "description", content: "Add timetable blocks and preview the daily, weekly and monthly study schedule." },
      { property: "og:title", content: "Schedule builder — Chronodeck Admin" },
      { property: "og:description", content: "Build subjects and timetable blocks with day, week and month views." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subjects, timetable blocks and a day / week / month preview.
        </p>
      </header>
      <AdminSchedulePanel />
    </div>
  ),
});
