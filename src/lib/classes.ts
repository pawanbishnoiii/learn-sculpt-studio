import { supabase } from "@/integrations/supabase/client";

/** An online class the student has scheduled or already attended. */
export type OnlineClass = {
  id: string;
  subject_id: string | null;
  chapter_id: string | null;
  chapter_name: string | null;
  title: string;
  mode: string;
  url: string | null;
  scheduled_at: string | null;
  duration_minutes: number | null;
  status: string;
  completed_at: string | null;
  notes_taken: boolean;
};

/** The spaced-revision track opened for a completed class's notes. */
export type ClassNoteRevision = {
  id: string;
  class_id: string;
  subject_id: string | null;
  chapter_name: string | null;
  title: string;
  review_stage: number;
  revisions_done: number;
  target_revisions: number;
  next_review_at: string;
  last_revised_at: string | null;
  total_minutes: number;
};

const CLASS_COLUMNS =
  "id, subject_id, chapter_id, chapter_name, title, mode, url, scheduled_at, duration_minutes, status, completed_at, notes_taken";

export async function fetchClasses(): Promise<OnlineClass[]> {
  const { data, error } = await supabase
    .from("online_classes")
    .select(CLASS_COLUMNS)
    .order("scheduled_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as unknown as OnlineClass[];
}

export async function fetchClassRevisions(): Promise<ClassNoteRevision[]> {
  const { data, error } = await supabase
    .from("class_note_revision_state")
    .select(
      "id, class_id, subject_id, chapter_name, title, review_stage, revisions_done, target_revisions, next_review_at, last_revised_at, total_minutes",
    )
    .order("next_review_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ClassNoteRevision[];
}

export async function createClass(input: {
  title: string;
  subject_id: string | null;
  chapter_name: string | null;
  mode: string;
  url: string | null;
  duration_minutes: number | null;
  status: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase.from("online_classes").insert({
    user_id: uid,
    title: input.title,
    subject_id: input.subject_id,
    chapter_name: input.chapter_name,
    mode: input.mode,
    url: input.url,
    duration_minutes: input.duration_minutes,
    status: input.status,
    completed_at: input.status === "completed" ? new Date().toISOString() : null,
  });
  if (error) throw error;
}

/** Marking a class complete opens its notes-revision track automatically. */
export async function setClassCompleted(id: string, completed: boolean) {
  const { error } = await supabase
    .from("online_classes")
    .update({
      status: completed ? "completed" : "scheduled",
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteClass(id: string) {
  const { error } = await supabase.from("online_classes").delete().eq("id", id);
  if (error) throw error;
}

/** Record one notes-revision pass and schedule the next one. */
export async function logNotesRevision(row: ClassNoteRevision, minutes: number) {
  const { error } = await supabase.rpc("complete_my_revision", {
    p_state_id: row.id,
    p_kind: "class",
    p_minutes: minutes,
  });
  if (error) throw error;
}
