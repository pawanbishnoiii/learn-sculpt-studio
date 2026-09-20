import { openDB, type IDBPDatabase } from "idb";
import { supabase } from "@/integrations/supabase/client";

/**
 * Offline-first write queue.
 *
 * Study writes (reading, revision, class and daily-plan updates) are appended
 * here whenever the network is unavailable, then replayed in order once the
 * connection is back. Every item carries a client-generated UUID so a replay
 * that partially succeeded can never create a duplicate row.
 */

export type QueuedKind = "session" | "reading" | "plan_done" | "break";

export type QueuedItem = {
  id: string;
  kind: QueuedKind;
  payload: Record<string, unknown>;
  created_at: string;
  attempts: number;
};

const DB_NAME = "bnoy-offline";
const STORE = "queue";
const MAX_ATTEMPTS = 6;

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  if (typeof indexedDB === "undefined") return null;
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: "id" });
      }
    },
  });
  return dbPromise;
}

export function isOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

export async function enqueue(kind: QueuedKind, payload: Record<string, unknown>) {
  const handle = db();
  if (!handle) throw new Error("Offline storage available nahi hai");
  const item: QueuedItem = {
    id: (payload["id"] as string) ?? crypto.randomUUID(),
    kind,
    payload,
    created_at: new Date().toISOString(),
    attempts: 0,
  };
  await (await handle).put(STORE, item);
  notify();
  return item;
}

export async function queuedItems(): Promise<QueuedItem[]> {
  const handle = db();
  if (!handle) return [];
  const rows = (await (await handle).getAll(STORE)) as QueuedItem[];
  return rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function pendingCount() {
  return (await queuedItems()).length;
}

async function remove(id: string) {
  const handle = db();
  if (!handle) return;
  await (await handle).delete(STORE, id);
}

async function bumpAttempts(item: QueuedItem) {
  const handle = db();
  if (!handle) return;
  const next = { ...item, attempts: item.attempts + 1 };
  if (next.attempts >= MAX_ATTEMPTS) await (await handle).delete(STORE, item.id);
  else await (await handle).put(STORE, next);
}

/** Duplicate primary key means the row already landed on an earlier replay. */
function alreadyApplied(error: { code?: string } | null) {
  return error?.code === "23505";
}

async function userId() {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not signed in");
  return id;
}

async function apply(item: QueuedItem) {
  const p = item.payload as Record<string, any>;

  if (item.kind === "session") {
    const user_id = await userId();
    const { error } = await supabase.from("study_sessions").insert({
      id: item.id,
      user_id,
      subject_id: p["subject_id"] ?? null,
      subject_name: p["subject_name"] ?? null,
      chapter: p["chapter"] ?? null,
      topic: p["topic"] ?? null,
      kind: p["kind"] ?? "reading",
      notes: p["notes"] ?? null,
      started_at: p["started_at"],
      ended_at: p["ended_at"],
      is_running: false,
      duration_minutes: p["duration_minutes"] ?? 0,
      duration_seconds: (p["duration_minutes"] ?? 0) * 60,
    } as never);
    if (error && !alreadyApplied(error)) throw error;
    return;
  }

  if (item.kind === "break") {
    const user_id = await userId();
    const { error } = await supabase.from("session_breaks").insert({
      id: item.id,
      user_id,
      session_id: p["session_id"] ?? null,
      kind: p["kind"] ?? "pause",
      note: p["note"] ?? null,
      started_at: p["started_at"],
      ended_at: p["ended_at"],
      duration_minutes: p["duration_minutes"] ?? 0,
    } as never);
    if (error && !alreadyApplied(error)) throw error;
    return;
  }

  if (item.kind === "plan_done") {
    const { error } = await supabase
      .from("daily_study_plan_items")
      .update({ completed_at: (p["completed_at"] as string) ?? new Date().toISOString() })
      .eq("id", p["item_id"] as string);
    if (error) throw error;
    return;
  }

  if (item.kind === "reading") {
    const { error } = await (supabase.rpc as any)("log_reading", {
      _kind: p["reading_kind"],
      _minutes: p["minutes"],
    });
    if (error) throw error;
    return;
  }
}

let flushing = false;

/** Replay everything that is waiting. Returns how many writes landed. */
export async function flushQueue(): Promise<number> {
  if (flushing || !isOnline()) return 0;
  flushing = true;
  let synced = 0;
  try {
    for (const item of await queuedItems()) {
      try {
        await apply(item);
        await remove(item.id);
        synced += 1;
      } catch {
        await bumpAttempts(item);
        if (!isOnline()) break;
      }
    }
  } finally {
    flushing = false;
    notify();
  }
  return synced;
}

const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function onQueueChange(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
