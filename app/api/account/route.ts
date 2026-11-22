import { NextResponse } from "next/server";
import { decrypt } from "@/lib/crypto";
import { providerOf } from "@/lib/email";
import { route } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

/** LGPD: apaga TODOS os dados do usuário com um clique (arquivos, tokens, histórico e a conta). */
export const DELETE = route(async () => {
  const { user } = await requireUser();
  const admin = supabaseAdmin();
  const { data: accs } = await admin.from("email_accounts").select("provider, refresh_token_enc").eq("user_id", user.id);
  for (const a of accs ?? []) await providerOf(a.provider).revoke(decrypt(a.refresh_token_enc)).catch(() => {});
  const { data: files } = await admin.storage.from("cvs").list(user.id);
  if (files?.length) await admin.storage.from("cvs").remove(files.map((f) => `${user.id}/${f.name}`));
  await admin.auth.admin.deleteUser(user.id); // as tabelas apagam em cascata
  return NextResponse.json({ ok: true });
});
