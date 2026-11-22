import { NextResponse } from "next/server";
import { z } from "zod";
import { extractText } from "@/lib/cv-parse";
import { route } from "@/lib/http";
import { llm } from "@/lib/llm/gemini";
import { CV_SYSTEM, cvPrompt } from "@/lib/llm/prompts";
import { splitContact } from "@/lib/privacy";
import { cvExtractionSchema } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { HttpError, requireUser } from "@/lib/supabase/server";
import { consumeGeneration } from "@/lib/usage";

export const maxDuration = 60;
const MAX = 5 * 1024 * 1024;

/** Envia um CV: guarda o arquivo, extrai o texto e monta um rascunho de perfil para revisão. */
export const POST = route(async (req: Request) => {
  const { sb, user } = await requireUser();
  const form = await req.formData();
  const file = form.get("file");
  const label = String(form.get("label") || "Principal").slice(0, 40);
  if (!(file instanceof File)) throw new HttpError(400, "Escolha um arquivo PDF ou DOCX.");
  if (file.size > MAX) throw new HttpError(400, "O arquivo passa de 5 MB.");
  const okType = /\.(pdf|docx)$/i.test(file.name);
  if (!okType) throw new HttpError(400, "Formato não suportado. Envie PDF ou DOCX.");

  const { count } = await sb.from("consents").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("kind", "cv");
  if (!count) throw new HttpError(403, "Antes de enviar o currículo, aceite o uso dele na tela de perfil.");

  const buf = await file.arrayBuffer();
  const text = await extractText(buf, file.type, file.name);
  if (text.length < 200) throw new HttpError(422, "Não consegui ler texto neste arquivo. Se for um PDF escaneado (imagem), exporte de novo a partir do Word ou Google Docs.");

  const path = `${user.id}/${crypto.randomUUID()}${file.name.toLowerCase().endsWith(".pdf") ? ".pdf" : ".docx"}`;
  const up = await sb.storage.from("cvs").upload(path, buf, { contentType: file.type || "application/octet-stream" });
  if (up.error) throw up.error;

  const contact = splitContact(text);
  const admin = supabaseAdmin();
  await consumeGeneration(admin, user.id);
  const extracted = await llm.completeJSON({ system: CV_SYSTEM, prompt: cvPrompt(contact.redacted), schema: cvExtractionSchema, temperature: 0.1 });

  const { count: existing } = await sb.from("cv_versions").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  const { data: cv, error } = await sb
    .from("cv_versions")
    .insert({ user_id: user.id, label, file_path: path, file_name: file.name, mime_type: file.type || "application/pdf", raw_text: text, structured_json: extracted, is_default: !existing })
    .select("id")
    .single();
  if (error) throw error;

  return NextResponse.json({ cvId: cv.id, draft: { ...extracted, email: contact.email, phone: contact.phone, links: contact.links } });
});

export const GET = route(async () => {
  const { sb, user } = await requireUser();
  const { data } = await sb.from("cv_versions").select("id, label, file_name, is_default, created_at").eq("user_id", user.id).order("created_at");
  return NextResponse.json({ cvs: data ?? [] });
});

const patch = z.object({ id: z.string().uuid(), label: z.string().max(40).optional(), makeDefault: z.boolean().optional() });
export const PATCH = route(async (req: Request) => {
  const { sb, user } = await requireUser();
  const b = patch.parse(await req.json());
  if (b.makeDefault) {
    await sb.from("cv_versions").update({ is_default: false }).eq("user_id", user.id);
    await sb.from("cv_versions").update({ is_default: true }).eq("id", b.id);
  }
  if (b.label) await sb.from("cv_versions").update({ label: b.label }).eq("id", b.id);
  return NextResponse.json({ ok: true });
});

export const DELETE = route(async (req: Request) => {
  const { sb } = await requireUser();
  const id = new URL(req.url).searchParams.get("id");
  const { data } = await sb.from("cv_versions").select("file_path").eq("id", id).single();
  if (data) await sb.storage.from("cvs").remove([data.file_path]);
  await sb.from("cv_versions").delete().eq("id", id);
  return NextResponse.json({ ok: true });
});
