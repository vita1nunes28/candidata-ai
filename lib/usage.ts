import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/supabase/server";

/** Conta uma geração de IA do dia; bloqueia ao passar do limite. */
export async function consumeGeneration(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin.rpc("bump_usage", { p_user: userId, p_field: "generations", p_limit: env.dailyGenerations() });
  if (error) throw error;
  if (!data) throw new HttpError(429, `Você chegou ao limite de ${env.dailyGenerations()} gerações de IA hoje. Amanhã o contador zera.`);
}

export async function consumeSend(admin: SupabaseClient, userId: string, limit: number) {
  const { data, error } = await admin.rpc("bump_usage", { p_user: userId, p_field: "sends", p_limit: limit });
  if (error) throw error;
  return Boolean(data);
}
