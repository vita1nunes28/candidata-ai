import { NextResponse } from "next/server";
import { z } from "zod";
import { route } from "@/lib/http";
import { requireUser } from "@/lib/supabase/server";

const body = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(20).max(5000),
  answer_kit: z.array(z.object({ pergunta: z.string().max(400), resposta: z.string().max(3000) })).max(30),
});

/** Salva a edição livre do usuário. */
export const PATCH = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { sb, user } = await requireUser();
  const { id } = await ctx.params;
  const b = body.parse(await req.json());
  const { error } = await sb.from("generations").update({ ...b, edited: true }).eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  return NextResponse.json({ ok: true });
});
