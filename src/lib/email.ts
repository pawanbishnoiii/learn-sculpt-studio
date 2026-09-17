import { supabase } from "@/integrations/supabase/client";

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

/** Admin-only: RLS blocks non-admins, so this resolves to null for normal users. */
export async function fetchEmailSettings(): Promise<EmailSettings | null> {
  const { data, error } = await supabase
    .from("email_settings")
    .select("provider,smtp_host,smtp_port,smtp_user,smtp_password,from_email,from_name")
    .maybeSingle();
  if (error) throw error;
  return (data as EmailSettings) ?? null;
}

export async function updateEmailSettings(patch: Partial<EmailSettings>) {
  const { error } = await supabase.from("email_settings").update(patch).eq("id", true);
  if (error) throw error;
}
