import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/AuthScreen";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Chronodeck — Sign in to your AI Study OS" },
      {
        name: "description",
        content:
          "Sign in to Chronodeck to run your focus timer, weekly timetable, targets and AI study manager.",
      },
      { property: "og:title", content: "Chronodeck — AI Study OS" },
      {
        property: "og:description",
        content: "Sign in with Google to track study hours, classes, breaks and targets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthScreen,
});
