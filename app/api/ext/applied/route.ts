import { NextResponse } from "next/server";
import { z } from "zod";
import { cors, extUser, preflight } from "@/lib/ext-auth";
import { route } from "@/lib/http";
import { upsertJobs } from "@/lib/jobs/store";

export const OPTIONS = preflight;

const body = z.object({ url: z.string().url(), title: z.string().min(2).max(200), company: z.string().max(120).optional(), description: z.string().max(15000).optional() });

/** "Marcar como candidatura enviada": registra a vaga no histórico. */
export const POST = route(async (req: Request) => {
  const { admin, userId } = await extUser(req);
  const b = body.parse(await req.json());
  const [job] = await upsertJobs(admin, [{ source: "extensao", external_id: b.url, title: b.title, company: b.company ?? new URL(b.url).hostname, location: null, work_mode: null, posted_at: null, url: b.url, description: b.description ?? null }]);
  await admin.from("user_jobs").upsert({ user_id: userId, job_id: job.id, status: "formulario", applied_at: new Date().toISOString() }, { onConflict: "user_id,job_id" });
  return cors(NextResponse.json({ ok: true }));
});
