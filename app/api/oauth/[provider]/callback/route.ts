import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { providerOf } from "@/lib/email";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { CONSENT_VERSION } from "@/lib/version";

export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const url = new URL(req.url);
  const back = (msg: string) => NextResponse.redirect(`${env.appUrl()}/configuracoes?email=${encodeURIComponent(msg)}`);
  const store = await cookies();
  const saved = store.get("oauth_state")?.value;
  store.delete("oauth_state");
  if (url.searchParams.get("error")) return back("Conexão cancelada.");
  if (!saved || saved !== `${provider}:${url.searchParams.get("state")}`) return back("A conexão expirou. Tente de novo.");

  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return NextResponse.redirect(`${env.appUrl()}/login`);
  try {
    const p = providerOf(provider);
    const r = await p.exchangeCode(url.searchParams.get("code") ?? "");
    const admin = supabaseAdmin();
    const { error } = await admin.from("email_accounts").upsert(
      { user_id: data.user.id, provider, email: r.email, scopes: r.scopes, refresh_token_enc: encrypt(r.refreshToken), status: "ok" },
      { onConflict: "user_id,provider,email" },
    );
    if (error) throw error;
    await admin.from("consents").insert({ user_id: data.user.id, kind: "email", version: CONSENT_VERSION });
    return back(`Conta ${r.email} conectada.`);
  } catch (e) {
    return back((e as Error).message || "Não foi possível conectar.");
  }
}
