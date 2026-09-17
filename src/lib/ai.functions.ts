import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "google/gemini-3.7-flash";
const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Ctx = { supabase: any; userId: string };

async function buildStudyContext({ supabase, userId }: Ctx) {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const [sessions, blocks, targets, subjects, settings] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("subject_name,topic,kind,started_at,duration_minutes,is_running,notes")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(80),
    supabase.from("timetable_blocks").select("title,kind,day_of_week,start_time,end_time"),
    supabase.from("targets").select("title,daily_hours,weekly_hours,deadline,is_active"),
    supabase.from("subjects").select("name,weekly_target_hours"),
    supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  return JSON.stringify(
    {
      now: new Date().toISOString(),
      settings: settings.data,
      subjects: subjects.data,
      targets: targets.data,
      timetable: blocks.data,
      recent_sessions: sessions.data,
    },
    null,
    0,
  );
}

async function callGateway(messages: Array<{ role: string; content: string }>) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages }),
  });
  if (res.status === 429) return "I'm rate limited right now — try again in a minute.";
  if (res.status === 402) return "AI credits are exhausted. Add credits to keep the assistant running.";
  if (!res.ok) {
    console.error("AI gateway error", res.status, await res.text());
    return "The AI assistant is unavailable right now.";
  }
  const json = (await res.json()) as any;
  return (json?.choices?.[0]?.message?.content as string) ?? "No response.";
}

function systemPrompt(tone: string) {
  return `You are the AI study manager inside Chronodeck, a personal study-time app.
You see the user's subjects, timetable, targets, settings and recent study sessions as JSON.
Answer in the user's language (Hindi, Hinglish or English — match their message).
Be concrete: reference real hours, subjects and gaps in their data. Keep replies under 130 words,
use short lines and numbers. Tone: ${tone}. Never invent data that is not in the JSON.`;
}

export const getDailyInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await buildStudyContext(context as unknown as Ctx);
    const text = await callGateway([
      { role: "system", content: systemPrompt("focused coach") },
      {
        role: "user",
        content: `Study data: ${ctx}\n\nGive ONE short insight (max 40 words) about today's balance versus my goals, with one concrete next action.`,
      },
    ]);
    return { insight: text };
  });

const AskSchema = z.object({ message: z.string().min(1).max(2000) });

export const askStudyAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(AskSchema)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const ctx = await buildStudyContext({ supabase, userId });

    const { data: history } = await supabase
      .from("ai_messages")
      .select("role,content")
      .order("created_at", { ascending: false })
      .limit(12);

    const prior = ((history ?? []) as Array<{ role: string; content: string }>)
      .slice()
      .reverse();

    const settings = await supabase
      .from("user_settings")
      .select("ai_tone")
      .eq("user_id", userId)
      .maybeSingle();

    const reply = await callGateway([
      { role: "system", content: systemPrompt(settings.data?.ai_tone ?? "coach") },
      { role: "system", content: `Study data JSON: ${ctx}` },
      ...prior,
      { role: "user", content: data.message },
    ]);

    await supabase.from("ai_messages").insert([
      { user_id: userId, role: "user", content: data.message },
      { user_id: userId, role: "assistant", content: reply },
    ]);

    return { reply };
  });
