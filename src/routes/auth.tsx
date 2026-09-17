import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/AuthScreen";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Chronodeck Study OS" },
      {
        name: "description",
        content: "Sign in to Chronodeck to run your study timer, timetable and AI study manager.",
      },
      { property: "og:title", content: "Sign in — Chronodeck Study OS" },
      {
        property: "og:description",
        content: "Sign in to track study hours, classes and targets with an AI study manager.",
      },
    ],
  }),
  component: AuthScreen,
});
