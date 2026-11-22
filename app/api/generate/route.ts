import { NextResponse } from "next/server";
import { z } from "zod";
import { sha256 } from "@/lib/crypto";
import { route } from "@/lib/http";
import { profileAnswers } from "@/lib/kit";
import { llm } from "@/lib/llm/gemini";
import { GEN_SYSTEM, genPrompt } from "@/lib/llm/prompts";
import { LLMQuotaError } from "@/lib/llm/types";
import { profileForLLM } from "@/lib/privacy";
import { generationSchema } from "@/lib/schemas";
import { getSettings } from "@/lib/settings";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { HttpError, requireUser } from "@/lib/supabase/server";
import { consumeGeneration } from "@/lib/usage";

export const maxDuration = 60;

const STYLES = { curto: "mais curto (cerca de 120 palavras)", formal: "mais formal", tecnico: "mais técnico, citando ferramentas e métodos do perfil" } as const;
const body = z.object({ userJobId: z.string().uuid(), style: z.enum(["curto", "formal", "tecnico"]).optional(), force: z.boolean().optional() });

/** Gera e-mail + kit de respostas para uma vaga (com cache por vaga/perfil/CV). */
export const POST = route(async (req: Request) => {
  const { sb, user } = await requireUser();
  const b = body.parse(await req.json());
  const { data: uj } = await sb.from("user_jobs").select("id, cv_version_id, jobs(*)").eq("id", b.userJobId).single();
  if (!uj) throw new HttpError(404, "Vaga não encontrada.");
  const { data: profile } = await sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!profile?.confirmed_at) throw new HttpError(409, "Revise e confirme seu perfil antes de gerar candidaturas.");
  const settings = await getSettings(sb, user.id);

  const job = uj.jobs as unknown as { id: string; title: string; company: string | null; location: string | null; description: string | null };
  const cacheKey = sha256([job.id, uj.cv_version_id ?? "default", profile.updated_at, b.style ?? "", settings.answer_char_limit].join("|"));

  if (!b.force) {
    const { data: cached } = await sb.from("generations").select("*").eq("user_job_id", uj.id).eq("cache_key", cacheKey).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (cached) return NextResponse.json({ generation: cached, cached: true });
  }

  const admin = supabaseAdmin();
  await consumeGeneration(admin, user.id);
  let out;
  try {
    out = await llm.completeJSON({
      system: GEN_SYSTEM,
      prompt: genPrompt({ profile: profileForLLM(profile), job, charLimit: settings.answer_char_limit, style: b.style ? STYLES[b.style] : undefined }),
      schema: generationSchema,
      temperature: 0.5,
    });
  } catch (e) {
    if (e instanceof LLMQuotaError) throw new HttpError(429, e.message);
    throw e;
  }
  const kit = [...out.kit_respostas.map((k) => ({ ...k, resposta: k.resposta.slice(0, settings.answer_char_limit) })), ...profileAnswers(profile)];

  const { data: gen, error } = await sb
    .from("generations")
    .insert({ user_job_id: uj.id, user_id: user.id, cache_key: cacheKey, subject: out.assunto, body: out.corpo, fit_points: out.pontos_de_aderencia, answer_kit: kit, alerts: out.alertas })
    .select("*")
    .single();
  if (error) throw error;
  await sb.from("user_jobs").update({ status: "gerada" }).eq("id", uj.id).in("status", ["resultado", "salva"]);
  return NextResponse.json({ generation: gen, cached: false });
});
