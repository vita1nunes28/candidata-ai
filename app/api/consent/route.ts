import { NextResponse } from "next/server";
import { z } from "zod";
import { route } from "@/lib/http";
import { requireUser } from "@/lib/supabase/server";
import { CONSENT_VERSION } from "@/lib/version";

const body = z.object({ kinds: z.array(z.enum(["termos", "cv", "email", "ia"])).min(1) });

export const POST = route(async (req: Request) => {
  const { sb, user } = await requireUser();
  const { kinds } = body.parse(await req.json());
  const { error } = await sb.from("consents").insert(kinds.map((kind) => ({ user_id: user.id, kind, version: CONSENT_VERSION })));
  if (error) throw error;
  return NextResponse.json({ ok: true });
});
