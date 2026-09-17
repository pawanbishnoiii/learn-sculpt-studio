import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** table -> query keys to invalidate when a row changes */
const MAP: Record<string, string[][]> = {
  study_sessions: [["sessions", "8w"], ["sessions", "study-recent"], ["running"], ["targets"], ["plan"], ["chapter-state"], ["attempts"], ["admin-overview"]],
  session_breaks: [["breaks"], ["open-break"]],

  notifications: [["notifications"]],
  profiles: [["profile"], ["admin-users"], ["admin-overview"]],
  user_roles: [["is-admin"], ["admin-users"]],
  subjects: [["subjects"]],
  targets: [["targets"]],
  subject_targets: [["subject-targets"]],
  daily_study_plan_items: [["plan"]],
  chapter_learning_state: [["chapter-state"], ["plan"]],
  test_attempts: [["attempts"]],
  timetable_blocks: [["blocks"]],
  user_settings: [["settings"]],
  app_settings: [["app-settings"]],
};

/**
 * One shared realtime channel that keeps React Query caches fresh for
 * sessions, breaks, streak, admin data and notifications.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel("app-realtime");

    for (const table of Object.keys(MAP)) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        for (const key of MAP[table] ?? []) void qc.invalidateQueries({ queryKey: key });
      });
    }

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}
