import { NextResponse } from "next/server";
import { z } from "zod";
import { route } from "@/lib/http";
import { requireUser } from "@/lib/supabase/server";

const body = z.object({
  status: z.enum(["resultado", "salva", "gerada", "enviada", "formulario", "resposta", "descartada"]).optional(),
  cv_version_id: z.string().uuid().nullable().optional(),
});

/** Atualiza status de uma ou várias vagas (ids separados por vírgula = ação em lote). */
export const PATCH = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { sb, user } = await requireUser();
  const { id } = await ctx.params;
  const ids = id.split(",").slice(0, 100);
  const b = body.parse(await req.json());
  const patch: Record<string, unknown> = { ...b };
  if (b.status === "enviada" || b.status === "formulario") patch.applied_at = new Date().toISOString();
  const { error } = await sb.from("user_jobs").update(patch).eq("user_id", user.id).in("id", ids);
  if (error) throw error;
  return NextResponse.json({ ok: true });
});
