import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt, encrypt } from "@/lib/crypto";
import { gmail } from "./gmail";
import { outlook } from "./outlook";
import { EmailProvider, OutgoingEmail, TokenRevokedError } from "./types";

export const PROVIDERS: Record<string, EmailProvider> = { gmail, outlook };

export function providerOf(id: string): EmailProvider {
  const p = PROVIDERS[id];
  if (!p) throw new Error("Provedor de e-mail desconhecido.");
  return p;
}

/** Executa uma ação com o token da conta. Trata token girado e revogado. */
export async function withAccount<T>(
  admin: SupabaseClient,
  accountId: string,
  userId: string,
  fn: (p: EmailProvider, token: string, from: string) => Promise<T>,
): Promise<T> {
  const { data: acc } = await admin.from("email_accounts").select("*").eq("id", accountId).eq("user_id", userId).single();
  if (!acc) throw new Error("Conta de e-mail não encontrada.");
  if (acc.status !== "ok") throw new TokenRevokedError();
  const p = providerOf(acc.provider);
  try {
    const { accessToken, refreshToken } = await p.accessToken(decrypt(acc.refresh_token_enc));
    if (refreshToken) await admin.from("email_accounts").update({ refresh_token_enc: encrypt(refreshToken) }).eq("id", acc.id);
    return await fn(p, accessToken, acc.email);
  } catch (e) {
    if (e instanceof TokenRevokedError) await admin.from("email_accounts").update({ status: "revogado" }).eq("id", acc.id);
    throw e;
  }
}

/** Monta o e-mail final: assinatura + CV anexado. "From" é sempre a conta autenticada. */
export async function buildOutgoing(
  admin: SupabaseClient,
  opts: { userId: string; from: string; to: string; subject: string; body: string; cvVersionId?: string | null },
): Promise<OutgoingEmail> {
  const { data: prof } = await admin.from("profiles").select("full_name, phone, links").eq("user_id", opts.userId).single();
  const sig = [prof?.full_name, prof?.phone, prof?.links?.linkedin].filter(Boolean).join("\n");
  let attachment: OutgoingEmail["attachment"];
  const cvq = admin.from("cv_versions").select("file_path, file_name, mime_type").eq("user_id", opts.userId);
  const { data: cv } = opts.cvVersionId ? await cvq.eq("id", opts.cvVersionId).maybeSingle() : await cvq.eq("is_default", true).maybeSingle();
  if (cv) {
    const { data: file } = await admin.storage.from("cvs").download(cv.file_path);
    if (file) attachment = { filename: cv.file_name, mime: cv.mime_type, data: Buffer.from(await file.arrayBuffer()) };
  }
  return { from: opts.from, to: opts.to, subject: opts.subject, body: sig ? `${opts.body.trim()}\n\n${sig}` : opts.body, attachment };
}
