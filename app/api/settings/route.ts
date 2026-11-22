import { NextResponse } from "next/server";
import { z } from "zod";
import { route } from "@/lib/http";
import { requireUser } from "@/lib/supabase/server";

const schema = z.object({
  daily_send_limit: z.number().int().min(1).max(50),
  send_hour_1: z.number().int().min(0).max(23),
  send_hour_2: z.number().int().min(0).max(23),
  timezone: z.string().max(60),
  answer_char_limit: z.number().int().min(100).max(3000),
  company_boards: z.array(z.object({ ats: z.enum(["greenhouse", "lever"]), slug: z.string().trim().regex(/^[a-z0-9-_.]+$/i).max(60) })).max(50),
});

export const PUT = route(async (req: Request) => {
  const { sb, user } = await requireUser();
  const s = schema.parse(await req.json());
  Intl.DateTimeFormat("en-US", { timeZone: s.timezone }); // valida o fuso
  const { error } = await sb.from("settings").upsert({ ...s, user_id: user.id, updated_at: new Date().toISOString() });
  if (error) throw error;
  return NextResponse.json({ ok: true });
});
