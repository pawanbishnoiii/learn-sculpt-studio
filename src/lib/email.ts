import { getEmailSettings, updateEmailSettingsRow } from "@/lib/admin.functions";

export type EmailProvider = "lovable" | "smtp";

export type EmailSettings = {
  provider: EmailProvider;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password: string | null;
  from_email: string | null;
  from_name: string | null;
};

export const EMPTY_EMAIL_SETTINGS: EmailSettings = {
  provider: "lovable",
  smtp_host: "",
  smtp_port: 587,
  smtp_user: "",
  smtp_password: "",
  from_email: "",
  from_name: "",
};

/** Admin-only: resolves to null for non-admins. */
export async function fetchEmailSettings(): Promise<EmailSettings | null> {
  const row = await getEmailSettings();
  return (row as EmailSettings | null) ?? null;
}

export async function updateEmailSettings(patch: Partial<EmailSettings>) {
  await updateEmailSettingsRow({ data: patch });
}
