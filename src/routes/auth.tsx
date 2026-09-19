import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/AuthScreen";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
       { title: "Sign in — Bnoy Study" },
      {
        name: "description",
         content: "Sign in to Bnoy Study to run your study timer, timetable and AI study manager.",
      },
       { property: "og:title", content: "Sign in — Bnoy Study" },
      {
        property: "og:description",
        content: "Sign in to track study hours, classes and targets with an AI study manager.",
      },
       { property: "og:type", content: "website" },
       { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthScreen,
});
