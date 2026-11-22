import { NextResponse } from "next/server";
import { sha256 } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/supabase/server";

/** A extensão se autentica com token próprio (nunca com chave de IA). */
export async function extUser(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Extensão não conectada.");
  const admin = supabaseAdmin();
  const { data } = await admin.from("ext_tokens").select("id, user_id").eq("token_hash", sha256(token)).maybeSingle();
  if (!data) throw new HttpError(401, "Conexão da extensão expirou. Conecte de novo na plataforma.");
  const version = req.headers.get("x-ext-version");
  await admin.from("ext_tokens").update({ last_seen: new Date().toISOString(), ext_version: version }).eq("id", data.id);
  return { admin, userId: data.user_id as string };
}

export function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Headers", "authorization, content-type, x-ext-version");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return res;
}
export const preflight = () => cors(new NextResponse(null, { status: 204 }));
