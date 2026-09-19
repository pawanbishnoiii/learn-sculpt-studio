import { supabase } from "@/integrations/supabase/client";

/** One PDF attached to a chapter/topic, kept in a fixed sequence. */
export type ChapterNote = {
  id: string;
  subject_id: string | null;
  chapter_name: string | null;
  topic: string | null;
  title: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  position: number;
  created_at: string;
};

const BUCKET = "chapter-pdfs";

const COLUMNS =
  "id, subject_id, chapter_name, topic, title, storage_path, file_size, mime_type, position, created_at";

async function uid() {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not signed in");
  return id;
}

export async function fetchNotes(): Promise<ChapterNote[]> {
  const { data, error } = await supabase
    .from("chapter_notes")
    .select(COLUMNS)
    .order("subject_id", { ascending: true })
    .order("chapter_name", { ascending: true })
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ChapterNote[];
}

/** Upload one PDF and append it at the end of that chapter's sequence. */
export async function uploadNote(input: {
  file: File;
  subject_id: string | null;
  chapter_name: string | null;
  topic: string | null;
  existingCount: number;
}) {
  const user = await uid();
  if (input.file.type && input.file.type !== "application/pdf") {
    throw new Error("Sirf PDF file upload kar sakte ho");
  }
  const safe = input.file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${user}/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage.from(BUCKET).upload(path, input.file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (up.error) throw up.error;

  const { error } = await supabase.from("chapter_notes").insert({
    user_id: user,
    subject_id: input.subject_id,
    chapter_name: input.chapter_name,
    topic: input.topic,
    title: input.file.name,
    storage_path: path,
    file_size: input.file.size,
    mime_type: "application/pdf",
    position: input.existingCount + 1,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
}

/** Upload a PDF that came out of an import bundle. */
export async function restoreNote(input: {
  blob: Blob;
  title: string;
  subject_id: string | null;
  chapter_name: string | null;
  topic: string | null;
  position: number;
}) {
  const user = await uid();
  const safe = input.title.replace(/[^\w.\-]+/g, "_");
  const path = `${user}/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage.from(BUCKET).upload(path, input.blob, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (up.error) throw up.error;
  const { error } = await supabase.from("chapter_notes").insert({
    user_id: user,
    subject_id: input.subject_id,
    chapter_name: input.chapter_name,
    topic: input.topic,
    title: input.title,
    storage_path: path,
    file_size: input.blob.size,
    mime_type: "application/pdf",
    position: input.position,
  });
  if (error) throw error;
}

/** A short-lived link used for both inline preview and download. */
export async function noteUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 30);
  if (error || !data) throw error ?? new Error("Link nahi bana");
  return data.signedUrl;
}

export async function downloadNoteBlob(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw error ?? new Error("File download nahi hui");
  return data;
}

export async function deleteNote(note: ChapterNote) {
  const { error } = await supabase.from("chapter_notes").delete().eq("id", note.id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([note.storage_path]);
}

/** Swap two notes so the chapter sequence can be reordered. */
export async function swapNotePositions(a: ChapterNote, b: ChapterNote) {
  const updates = [
    supabase.from("chapter_notes").update({ position: b.position }).eq("id", a.id),
    supabase.from("chapter_notes").update({ position: a.position }).eq("id", b.id),
  ];
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/** Group notes into chapter buckets, each already in sequence order. */
export function groupByChapter(notes: ChapterNote[]) {
  const map = new Map<string, { subject_id: string | null; chapter_name: string | null; notes: ChapterNote[] }>();
  for (const note of notes) {
    const key = `${note.subject_id ?? "none"}::${note.chapter_name ?? "General"}`;
    const bucket = map.get(key) ?? {
      subject_id: note.subject_id,
      chapter_name: note.chapter_name,
      notes: [],
    };
    bucket.notes.push(note);
    map.set(key, bucket);
  }
  for (const bucket of map.values()) bucket.notes.sort((x, y) => x.position - y.position);
  return [...map.entries()].map(([key, value]) => ({ key, ...value }));
}
