import { NextResponse } from "next/server";
import { z } from "zod";
import { buildOutgoing, withAccount } from "@/lib/email";
import { TokenRevokedError } from "@/lib/email/types";
import { route } from "@/lib/http";
import { windowToUTC } from "@/lib/schedule";
import { getSettings } from "@/lib/settings";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { HttpError, requireUser } from "@/lib/supabase/server";

export const maxDuration = 60;

const body = z.object({
  userJobIds: z.array(z.string().uuid()).min(1).max(50),
  accountId: z.string().uuid(),
  mode: z.enum(["rascunho", "agendado"]),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  window: z.union([z.literal(1), z.literal(2)]).optional(),
  confirmAuto: z.boolean().optional(),
});

/** Cria rascunhos agora ou coloca envios na fila de uma janela. */
export const POST = route(async (req: Request) => {
  const { sb, user } = await requireUser();
  const b = body.parse(await req.json());
  const settings = await getSettings(sb, user.id);
  const admin = supabaseAdmin();

  const { data: acc } = await sb.from("email_accounts").select("id, provider, scopes, status").eq("id", b.accountId).single();
  if (!acc) throw new HttpError(404, "Conta de e-mail não encontrada.");
  if (acc.status !== "ok") throw new HttpError(409, new TokenRevokedError().message);

  const { data: items } = await sb.from("user_jobs").select("id, cv_version_id, jobs(hr_email, title)").in("id", b.userJobIds);
  const results: { userJobId: string; ok: boolean; message: string }[] = [];

  let runAt: Date | null = null;
  if (b.mode === "agendado") {
    const canSend = acc.provider === "gmail" ? acc.scopes.some((s: string) => s.endsWith("gmail.send")) : acc.scopes.some((s: string) => /mail\.send/i.test(s));
    if (!canSend) throw new HttpError(409, "Para agendar, ative o envio automático em Configurações (a conta precisa de permissão de envio).");
    if (!settings.auto_send_enabled && !b.confirmAuto) throw new HttpError(409, "Confirme que quer ativar o envio automático.");
    if (!settings.auto_send_enabled) await sb.from("settings").upsert({ user_id: user.id, ...settings, auto_send_enabled: true });
    if (!b.day || !b.window) throw new HttpError(400, "Escolha o dia e a janela de envio.");
    runAt = windowToUTC(b.day, b.window === 1 ? settings.send_hour_1 : settings.send_hour_2, settings.timezone);
    if (runAt.getTime() < Date.now() - 5 * 60000) throw new HttpError(400, "Esse horário já passou. Escolha outra janela.");
  }

  for (const it of items ?? []) {
    const job = it.jobs as unknown as { hr_email: string | null; title: string };
    if (!job.hr_email) {
      results.push({ userJobId: it.id, ok: false, message: "Sem e-mail público de RH: candidate-se pelo link." });
      continue;
    }
    const { data: gen } = await sb.from("generations").select("subject, body").eq("user_job_id", it.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!gen) {
      results.push({ userJobId: it.id, ok: false, message: "Gere o e-mail desta vaga primeiro." });
      continue;
    }
    if (b.mode === "rascunho") {
      try {
        const id = await withAccount(admin, acc.id, user.id, async (p, token, from) =>
          p.createDraft(token, await buildOutgoing(admin, { userId: user.id, from, to: job.hr_email!, subject: gen.subject, body: gen.body, cvVersionId: it.cv_version_id })),
        );
        await admin.from("send_queue").insert({ user_id: user.id, user_job_id: it.id, account_id: acc.id, to_email: job.hr_email, mode: "rascunho", status: "rascunho_criado", provider_msg_id: id });
        results.push({ userJobId: it.id, ok: true, message: "Rascunho criado na sua caixa de e-mail." });
      } catch (e) {
        results.push({ userJobId: it.id, ok: false, message: (e as Error).message });
        if (e instanceof TokenRevokedError) break;
      }
    } else {
      const { error } = await admin.from("send_queue").insert({ user_id: user.id, user_job_id: it.id, account_id: acc.id, to_email: job.hr_email, mode: "agendado", run_at: runAt!.toISOString(), status: "agendado" });
      results.push({ userJobId: it.id, ok: !error, message: error ? (error.code === "23505" ? "Já existe envio para este e-mail nesta vaga." : "Não foi possível agendar.") : "Agendado." });
    }
  }
  return NextResponse.json({ results });
});
