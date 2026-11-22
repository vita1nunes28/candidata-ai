import { NextResponse } from "next/server";
import { z } from "zod";
import { cors, extUser, preflight } from "@/lib/ext-auth";
import { route } from "@/lib/http";
import { llm } from "@/lib/llm/gemini";
import { ANSWER_SYSTEM, answerPrompt } from "@/lib/llm/prompts";
import { profileForLLM } from "@/lib/privacy";
import { HttpError } from "@/lib/supabase/server";
import { consumeGeneration } from "@/lib/usage";

export const OPTIONS = preflight;
export const maxDuration = 60;

const body = z.object({
  questions: z.array(z.object({ id: z.string().max(100), question: z.string().min(3).max(500), maxChars: z.number().int().min(20).max(5000).optional() })).min(1).max(15),
  jobText: z.string().max(8000).optional(),
});
const answerSchema = z.object({ resposta: z.string().max(5000), alerta: z.string().nullable().optional() });

/** Gera respostas para perguntas abertas de um formulário (até 15 por vez). */
export const POST = route(async (req: Request) => {
  const { admin, userId } = await extUser(req);
  const b = body.parse(await req.json());
  const { data: p } = await admin.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (!p?.confirmed_at) throw new HttpError(409, "Confirme seu perfil na plataforma antes de usar a extensão.");
  const profile = profileForLLM(p);
  const answers = [];
  for (const q of b.questions) {
    await consumeGeneration(admin, userId);
    const max = Math.min(q.maxChars ?? 800, 3000);
    const r = await llm.completeJSON({ system: ANSWER_SYSTEM, prompt: answerPrompt({ question: q.question, profile, jobText: b.jobText, maxChars: max }), schema: answerSchema, temperature: 0.4 });
    answers.push({ id: q.id, answer: r.resposta.slice(0, max), alert: r.alerta ?? null });
  }
  return cors(NextResponse.json({ answers }));
});
