import {
  exportUser,
  userDetail,
  importUser,
} from "@/lib/admin.functions";

/** Everything stored for one account, as a plain JSON object. */
export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  return exportUser({ data: { userId } });
}

/** A compact profile + activity preview for the admin user drawer. */
export async function fetchUserDetail(userId: string): Promise<Record<string, unknown>> {
  return userDetail({ data: { userId } });
}

/** Push a previously exported file back into an account. */
export async function importUserData(userId: string, payload: unknown): Promise<number> {
  return importUser({ data: { userId, payload: payload as Record<string, unknown> } });
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
