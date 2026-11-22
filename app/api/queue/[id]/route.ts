import { NextResponse } from "next/server";
import { z } from "zod";
import { route } from "@/lib/http";
import { windowToUTC } from "@/lib/schedule";
import { getSettings } from "@/lib/settings";
import { HttpError, requireUser } from "@/lib/supabase/server";

const body = z.union([
  z.object({ action: z.literal("cancelar") }),
  z.object({ action: z.literal("reagendar"), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), window: z.union([z.literal(1), z.literal(2)]) }),
]);

/** Cancela ou muda a janela de um envio que ainda não saiu. */
export const PATCH = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { sb, user } = await requireUser();
  const { id } = await ctx.params;
  const b = body.parse(await req.json());
  const { data: item } = await sb.from("send_queue").select("status").eq("id", id).single();
  if (!item || !["agendado", "erro"].includes(item.status)) throw new HttpError(409, "Este envio não pode mais ser alterado.");
  if (b.action === "cancelar") {
    await sb.from("send_queue").update({ status: "cancelado" }).eq("id", id);
  } else {
    const s = await getSettings(sb, user.id);
    const runAt = windowToUTC(b.day, b.window === 1 ? s.send_hour_1 : s.send_hour_2, s.timezone);
    if (runAt.getTime() < Date.now()) throw new HttpError(400, "Esse horário já passou.");
    await sb.from("send_queue").update({ status: "agendado", run_at: runAt.toISOString(), last_error: null }).eq("id", id);
  }
  return NextResponse.json({ ok: true });
});
