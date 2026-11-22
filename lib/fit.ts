import type { SupabaseClient } from "@supabase/supabase-js";
import { llm } from "@/lib/llm/gemini";
import { FIT_SYSTEM, fitPrompt } from "@/lib/llm/prompts";
import { LLMQuotaError } from "@/lib/llm/types";
import { profileForLLM } from "@/lib/privacy";
import { fitBatchSchema } from "@/lib/schemas";
import { consumeGeneration } from "@/lib/usage";

/** Calcula nota de aderência em lote (1 chamada de IA a cada 12 vagas). Vagas já avaliadas ficam em cache. */
export async function scoreUserJobs(admin: SupabaseClient, userId: string, userJobIds: string[]) {
  const { data: profile } = await admin.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (!profile?.confirmed_at) return { skipped: "Confirme seu perfil para ver a nota de aderência." };
  const { data: rows } = await admin
    .from("user_jobs")
    .select("id, jobs(title, company, description)")
    .in("id", userJobIds)
    .is("fit_score", null);
  const pending = (rows ?? []) as unknown as { id: string; jobs: { title: string; company: string | null; description: string | null } }[];
  for (let i = 0; i < pending.length; i += 12) {
    const chunk = pending.slice(i, i + 12);
    try {
      await consumeGeneration(admin, userId);
      const out = await llm.completeJSON({
        system: FIT_SYSTEM,
        prompt: fitPrompt(profileForLLM(profile), chunk.map((c) => ({ id: c.id, ...c.jobs }))),
        schema: fitBatchSchema,
        temperature: 0.1,
      });
      await Promise.all(
        out.notas
          .filter((n) => chunk.some((c) => c.id === n.id))
          .map((n) => admin.from("user_jobs").update({ fit_score: Math.round(n.nota), fit_reason: n.justificativa }).eq("id", n.id).eq("user_id", userId)),
      );
    } catch (e) {
      if (e instanceof LLMQuotaError || (e as { status?: number }).status === 429) return { skipped: (e as Error).message };
      throw e;
    }
  }
  return {};
}
