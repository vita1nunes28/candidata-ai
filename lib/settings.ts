import type { SupabaseClient } from "@supabase/supabase-js";

export const DEFAULT_SETTINGS = {
  daily_send_limit: Number(process.env.DEFAULT_DAILY_SEND_LIMIT || 20),
  send_hour_1: 9,
  send_hour_2: 14,
  timezone: "America/Sao_Paulo",
  auto_send_enabled: false,
  answer_char_limit: 600,
  company_boards: [] as { ats: "greenhouse" | "lever"; slug: string }[],
};
export type Settings = typeof DEFAULT_SETTINGS;

export async function getSettings(sb: SupabaseClient, userId: string): Promise<Settings> {
  const { data } = await sb.from("settings").select("*").eq("user_id", userId).maybeSingle();
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) };
}
