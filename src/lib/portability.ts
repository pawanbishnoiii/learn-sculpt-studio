import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { downloadNoteBlob, restoreNote, type ChapterNote } from "@/lib/notes";

/**
 * Personal data transfer: one ZIP holding a JSON manifest of every table the
 * signed-in user owns plus the actual PDF files, so another account can
 * import the same study setup and history.
 */

type Row = Record<string, unknown>;

/** Tables copied as-is (subject/chapter links are remapped on import). */
const SIMPLE_TABLES = [
  "user_settings",
  "subject_targets",
  "targets",
  "timetable_blocks",
  "reading_logs",
  "reading_goals",
  "online_classes",
  "chapter_learning_state",
  "test_attempts",
] as const;

async function currentUser() {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error("Not signed in");
  return user;
}

async function readAll(table: string): Promise<Row[]> {
  const { data, error } = await supabase.from(table as never).select("*");
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as Row[];
}

export type ExportSummary = {
  subjects: number;
  chapters: number;
  sessions: number;
  notes: number;
};

/** Build the ZIP and hand it back with a short summary for the UI. */
export async function buildExportZip(): Promise<{ blob: Blob; summary: ExportSummary }> {
  const user = await currentUser();

  const manifest: Record<string, unknown> = {
    format: "bnoy-study-user-export",
    version: 2,
    exported_at: new Date().toISOString(),
    source_email: user.email ?? null,
  };

  const profile = await readAll("profiles");
  manifest["profile"] = profile[0] ?? null;

  const subjects = await readAll("subjects");
  const chapters = await readAll("chapters");
  const subtopics = await readAll("chapter_subtopics");
  const sessions = await readAll("study_sessions");
  const breaks = await readAll("session_breaks");
  const outcomes = await readAll("session_outcomes");
  const notes = (await readAll("chapter_notes")) as unknown as ChapterNote[];

  manifest["subjects"] = subjects;
  manifest["chapters"] = chapters;
  manifest["chapter_subtopics"] = subtopics;
  manifest["study_sessions"] = sessions;
  manifest["session_breaks"] = breaks;
  manifest["session_outcomes"] = outcomes;
  manifest["chapter_notes"] = notes;

  for (const table of SIMPLE_TABLES) manifest[table] = await readAll(table);

  const zip = new JSZip();
  const folder = zip.folder("media");
  for (const note of notes) {
    try {
      const blob = await downloadNoteBlob(note.storage_path);
      const extension = note.title.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin";
      folder?.file(`${note.id}.${extension}`, blob);
    } catch {
      // A missing file should not break the whole export.
    }
  }
  zip.file("data.json", JSON.stringify(manifest, null, 2));

  const blob = await zip.generateAsync({ type: "blob" });
  return {
    blob,
    summary: {
      subjects: subjects.length,
      chapters: chapters.length,
      sessions: sessions.length,
      notes: notes.length,
    },
  };
}

export function saveBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type ImportPreview = {
  zip: JSZip;
  manifest: Record<string, unknown>;
  summary: ExportSummary;
  exportedAt: string | null;
};

/** Read the uploaded ZIP and describe what it would add, before writing. */
export async function readImportZip(file: File): Promise<ImportPreview> {
  const zip = await JSZip.loadAsync(file);
  const entry = zip.file("data.json");
  if (!entry) throw new Error("Ye Bnoy Study export file nahi lag rahi");
  const manifest = JSON.parse(await entry.async("string")) as Record<string, unknown>;
  if (manifest["format"] !== "chronodeck-user-export") throw new Error("File format match nahi hua");
  const list = (key: string) => (Array.isArray(manifest[key]) ? (manifest[key] as Row[]) : []);
  return {
    zip,
    manifest,
    exportedAt: typeof manifest["exported_at"] === "string" ? manifest["exported_at"] : null,
    summary: {
      subjects: list("subjects").length,
      chapters: list("chapters").length,
      sessions: list("study_sessions").length,
      notes: list("chapter_notes").length,
    },
  };
}

function strip(row: Row, userId: string, extra: Row = {}): Row {
  const { id: _id, user_id: _u, created_at: _c, updated_at: _up, ...rest } = row;
  return { ...rest, ...extra, user_id: userId };
}

async function insertMapped(
  table: string,
  rows: Row[],
  userId: string,
  map: (row: Row) => Row | null,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const row of rows) {
    const mapped = map(row);
    if (!mapped) continue;
    const { data, error } = await supabase
      .from(table as never)
      .insert(strip(mapped, userId) as never)
      .select("id")
      .maybeSingle();
    if (error) continue; // skip a row rather than abort the whole import
    const newId = (data as Row | null)?.["id"];
    const oldId = row["id"];
    if (typeof newId === "string" && typeof oldId === "string") ids.set(oldId, newId);
  }
  return ids;
}

/** Write an uploaded export into the signed-in account. Existing data stays. */
export async function applyImport(preview: ImportPreview, onProgress?: (label: string) => void) {
  const user = await currentUser();
  const uid = user.id;
  const list = (key: string) => (Array.isArray(preview.manifest[key]) ? (preview.manifest[key] as Row[]) : []);
  const str = (value: unknown) => (typeof value === "string" ? value : null);

  onProgress?.("Subjects");
  const existingSubjects = await readAll("subjects");
  const byName = new Map(existingSubjects.map((s) => [String(s["name"]).toLowerCase(), String(s["id"])]));
  const subjectMap = new Map<string, string>();
  for (const row of list("subjects")) {
    const name = String(row["name"] ?? "").trim();
    if (!name) continue;
    const dupe = byName.get(name.toLowerCase());
    if (dupe) {
      subjectMap.set(String(row["id"]), dupe);
      continue;
    }
    const { data, error } = await supabase
      .from("subjects")
      .insert(strip(row, uid) as never)
      .select("id")
      .maybeSingle();
    if (!error && data) subjectMap.set(String(row["id"]), String((data as Row)["id"]));
  }

  onProgress?.("Chapters");
  const chapterMap = await insertMapped("chapters", list("chapters"), uid, (row) => {
    const subject = subjectMap.get(String(row["subject_id"]));
    if (!subject) return null;
    return { ...row, subject_id: subject };
  });

  onProgress?.("Topics");
  const subtopicMap = await insertMapped("chapter_subtopics", list("chapter_subtopics"), uid, (row) => {
    const chapter = chapterMap.get(String(row["chapter_id"]));
    if (!chapter) return null;
    return { ...row, chapter_id: chapter };
  });

  onProgress?.("Study history");
  const sessionMap = await insertMapped("study_sessions", list("study_sessions"), uid, (row) => ({
    ...row,
    subject_id: subjectMap.get(String(row["subject_id"])) ?? null,
    chapter_id: chapterMap.get(String(row["chapter_id"])) ?? null,
    subtopic_id: subtopicMap.get(String(row["subtopic_id"])) ?? null,
  }));

  for (const row of list("session_breaks")) {
    const session = sessionMap.get(String(row["session_id"])) ?? null;
    await supabase.from("session_breaks").insert(strip(row, uid, { session_id: session }) as never);
  }
  for (const row of list("session_outcomes")) {
    const session = sessionMap.get(String(row["session_id"]));
    if (!session) continue;
    await supabase.from("session_outcomes").insert(
      strip(row, uid, {
        session_id: session,
        chapter_id: chapterMap.get(String(row["chapter_id"])) ?? null,
        subtopic_id: subtopicMap.get(String(row["subtopic_id"])) ?? null,
      }) as never,
    );
  }

  onProgress?.("Targets and timetable");
  for (const table of SIMPLE_TABLES) {
    for (const row of list(table)) {
      const extra: Row = {};
      if ("subject_id" in row) extra["subject_id"] = subjectMap.get(String(row["subject_id"])) ?? null;
      if ("chapter_id" in row) extra["chapter_id"] = chapterMap.get(String(row["chapter_id"])) ?? null;
      if (table === "user_settings" || table === "reading_goals") {
        await supabase.from(table).upsert(strip(row, uid, extra) as never, { onConflict: "user_id" });
      } else {
        await supabase.from(table as never).insert(strip(row, uid, extra) as never);
      }
    }
  }

  onProgress?.("Study media");
  let restored = 0;
  for (const row of list("chapter_notes")) {
    const id = String(row["id"]);
    const file = preview.zip.file(new RegExp(`^(media/${id}\\.[^/]+|pdfs/${id}\\.pdf)$`, "i"))[0];
    if (!file) continue;
    const blob = await file.async("blob");
    try {
      const mimeType = str(row["mime_type"]);
      await restoreNote({
        blob,
        title: String(row["title"] ?? "notes.pdf"),
        subject_id: subjectMap.get(String(row["subject_id"])) ?? null,
        chapter_name: str(row["chapter_name"]),
        topic: str(row["topic"]),
        position: Number(row["position"]) || restored + 1,
        ...(mimeType ? { mime_type: mimeType } : {}),
      });
      restored += 1;
    } catch {
      // keep importing the rest
    }
  }

  return { subjects: subjectMap.size, chapters: chapterMap.size, sessions: sessionMap.size, notes: restored };
}
