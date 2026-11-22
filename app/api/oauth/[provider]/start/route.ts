import { NextResponse } from "next/server";
import { randomToken } from "@/lib/crypto";
import { providerOf } from "@/lib/email";
import { route } from "@/lib/http";
import { requireUser } from "@/lib/supabase/server";

/** Inicia a conexão da caixa de e-mail. ?envio=1 pede também a permissão de envio automático. */
export const GET = route(async (req: Request, ctx: { params: Promise<{ provider: string }> }) => {
  const { user } = await requireUser();
  const { provider } = await ctx.params;
  const p = providerOf(provider);
  const wantSend = new URL(req.url).searchParams.get("envio") === "1";
  const state = randomToken(16);
  const res = NextResponse.redirect(p.authUrl(state, { wantSend, loginHint: user.email ?? undefined }));
  res.cookies.set("oauth_state", `${provider}:${state}`, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
});
