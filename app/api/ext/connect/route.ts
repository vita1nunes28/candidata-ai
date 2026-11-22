import { NextResponse } from "next/server";
import { randomToken, sha256 } from "@/lib/crypto";
import { route } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

/** Gera o token da extensão (chamado pela página /extensao/conectar, com o usuário logado). */
export const POST = route(async () => {
  const { user } = await requireUser();
  const token = randomToken();
  const admin = supabaseAdmin();
  await admin.from("ext_tokens").delete().eq("user_id", user.id); // uma extensão por usuário no MVP
  await admin.from("ext_tokens").insert({ user_id: user.id, token_hash: sha256(token) });
  return NextResponse.json({ token });
});
