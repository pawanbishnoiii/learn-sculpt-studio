import { supabase } from "@/integrations/supabase/client";

/** Everything stored for one account, as a plain JSON object. */
export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc("admin_export_user", { _user_id: userId });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

/** A compact profile + activity preview for the admin user drawer. */
export async function fetchUserDetail(userId: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc("admin_user_detail", { _user_id: userId });
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

/** Push a previously exported file back into an account. */
export async function importUserData(userId: string, payload: unknown): Promise<number> {
  const { data, error } = await supabase.rpc("admin_import_user", {
    _user_id: userId,
    _payload: payload as never,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

/** Trigger a browser download of the export. */
export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
