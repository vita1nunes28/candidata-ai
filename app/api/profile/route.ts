import { NextResponse } from "next/server";
import { route } from "@/lib/http";
import { profileSchema } from "@/lib/schemas";
import { requireUser } from "@/lib/supabase/server";

export const GET = route(async () => {
  const { sb, user } = await requireUser();
  const { data } = await sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ profile: data });
});

/** Salvar = confirmar. Nada é usado antes desta confirmação. */
export const PUT = route(async (req: Request) => {
  const { sb, user } = await requireUser();
  const p = profileSchema.parse(await req.json());
  const { error } = await sb.from("profiles").upsert({ ...p, user_id: user.id, confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  if (error) throw error;
  return NextResponse.json({ ok: true });
});
