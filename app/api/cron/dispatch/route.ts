import { NextResponse } from "next/server";
import { buildOutgoing, withAccount } from "@/lib/email";
import { TemporaryEmailError, TokenRevokedError } from "@/lib/email/types";
import { env } from "@/lib/env";
import { jitter, sleep } from "@/lib/schedule";
import { getSettings } from "@/lib/settings";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { consumeSend } from "@/lib/usage";

export const maxDuration = 60;
const BUDGET_MS = 50_000;

/**
 * Disparo dos envios agendados. Só é chamado pelo banco quando há algo vencido
 * (ver supabase/migrations/002_disparo.sql). Envia com intervalo aleatório; o
 * que não couber nesta execução sai na próxima checagem.
 */
export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  const started = Date.now();
  const admin = supabaseAdmin();
  const { data: due } = await admin
    .from("send_queue")
    .select("id, user_id, user_job_id, account_id, to_email, attempts, user_jobs(cv_version_id)")
    .eq("status", "agendado")
    .lte("run_at", new Date().toISOString())
    .order("run_at")
    .limit(20);

  let sent = 0;
  for (const item of due ?? []) {
    if (Date.now() - started > BUDGET_MS) break;
    const settings = await getSettings(admin, item.user_id);
    if (!(await consumeSend(admin, item.user_id, settings.daily_send_limit))) {
      // limite do dia atingido: passa para amanhã, mesma hora
      await admin.from("send_queue").update({ run_at: new Date(Date.now() + 864e5).toISOString(), last_error: "Limite diário atingido; reagendado para amanhã." }).eq("id", item.id);
      continue;
    }
    // trava otimista: só segue se ainda estiver agendado
    const { data: locked } = await admin.from("send_queue").update({ status: "enviando" }).eq("id", item.id).eq("status", "agendado").select("id");
    if (!locked?.length) continue;
    try {
      const { data: gen } = await admin.from("generations").select("subject, body").eq("user_job_id", item.user_job_id).order("created_at", { ascending: false }).limit(1).single();
      const cvVersionId = (item.user_jobs as unknown as { cv_version_id: string | null })?.cv_version_id;
      const msgId = await withAccount(admin, item.account_id, item.user_id, async (p, token, from) =>
        p.send(token, await buildOutgoing(admin, { userId: item.user_id, from, to: item.to_email, subject: gen!.subject, body: gen!.body, cvVersionId })),
      );
      await admin.from("send_queue").update({ status: "enviado", sent_at: new Date().toISOString(), provider_msg_id: msgId, last_error: null }).eq("id", item.id);
      await admin.from("user_jobs").update({ status: "enviada", applied_at: new Date().toISOString() }).eq("id", item.user_job_id);
      sent++;
    } catch (e) {
      const temporary = e instanceof TemporaryEmailError && item.attempts < 1;
      await admin
        .from("send_queue")
        .update(
          temporary
            ? { status: "agendado", attempts: item.attempts + 1, run_at: new Date(Date.now() + 3 * 3600e3).toISOString(), last_error: "Falha temporária; nova tentativa na próxima janela." }
            : { status: "erro", attempts: item.attempts + 1, last_error: e instanceof TokenRevokedError ? e.message : (e as Error).message.slice(0, 300) },
        )
        .eq("id", item.id);
    }
    await sleep(jitter(2000, 6000));
  }
  return NextResponse.json({ sent });
}
