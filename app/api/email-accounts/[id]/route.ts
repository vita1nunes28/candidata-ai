import { NextResponse } from "next/server";
import { decrypt } from "@/lib/crypto";
import { providerOf } from "@/lib/email";
import { route } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

/** Desconecta a conta: revoga no provedor e apaga o token. */
export const DELETE = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { user } = await requireUser();
  const { id } = await ctx.params;
  const admin = supabaseAdmin();
  const { data: acc } = await admin.from("email_accounts").select("*").eq("id", id).eq("user_id", user.id).single();
  if (acc) {
    await providerOf(acc.provider).revoke(decrypt(acc.refresh_token_enc)).catch(() => {});
    await admin.from("send_queue").update({ status: "cancelado", last_error: "Conta desconectada" }).eq("account_id", id).eq("status", "agendado");
    await admin.from("email_accounts").delete().eq("id", id);
  }
  return NextResponse.json({ ok: true });
});
