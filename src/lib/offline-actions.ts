import { enqueue, isOnline } from "@/lib/offline";
import { setPlanItemDone } from "@/lib/plan";
import { createManualSession, logReading, type ReadingKind } from "@/lib/study";

/**
 * Study writes that must never be lost: try the network first, otherwise park
 * the write in the offline queue so it syncs automatically on reconnect.
 */

export type OfflineResult = { queued: boolean };

export async function saveStudyLog(input: {
  subject_id: string | null;
  subject_name: string | null;
  topic: string | null;
  notes: string | null;
  kind: string;
  started_at: string;
  ended_at: string;
}): Promise<OfflineResult> {
  if (isOnline()) {
    try {
      await createManualSession(input);
      return { queued: false };
    } catch (error) {
      if (isOnline()) throw error;
    }
  }
  const minutes = Math.max(
    1,
    Math.round((new Date(input.ended_at).getTime() - new Date(input.started_at).getTime()) / 60000),
  );
  await enqueue("session", { ...input, chapter: input.topic, duration_minutes: minutes });
  return { queued: true };
}

export async function saveReadingLog(kind: ReadingKind, minutes: number): Promise<OfflineResult> {
  if (isOnline()) {
    try {
      await logReading(kind, minutes);
      return { queued: false };
    } catch (error) {
      if (isOnline()) throw error;
    }
  }
  await enqueue("reading", { reading_kind: kind, minutes });
  return { queued: true };
}

export async function savePlanDone(itemId: string, done: boolean): Promise<OfflineResult> {
  if (isOnline()) {
    try {
      await setPlanItemDone(itemId, done);
      return { queued: false };
    } catch (error) {
      if (isOnline()) throw error;
    }
  }
  if (!done) throw new Error("Offline rehte hue task wapas pending nahi kar sakte");
  await enqueue("plan_done", { item_id: itemId, completed_at: new Date().toISOString() });
  return { queued: true };
}
