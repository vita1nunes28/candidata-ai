import { NextResponse } from "next/server";
import { z } from "zod";
import { scoreUserJobs } from "@/lib/fit";
import { cors, extUser, preflight } from "@/lib/ext-auth";
import { route } from "@/lib/http";
import { upsertJobs } from "@/lib/jobs/store";

export const OPTIONS = preflight;
export const maxDuration = 60;

const rawJob = z.object({
  title: z.string().min(2).max(300),
  company: z.string().max(200).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  url: z.string().url(),
  description: z.string().max(10000).nullable().optional(),
});
const body = z.object({
  platform: z.enum(["linkedin", "gupy", "catho", "infojobs", "vagascom"]),
  jobs: z.array(rawJob).max(60),
});

/**
 * Recebe vagas que a extensão encontrou navegando (com a sessão logada do próprio candidato)
 * em LinkedIn/Gupy/Catho/InfoJobs/Vagas.com. Não é scraping do servidor: o navegador do
 * candidato já está na página, a extensão só lê o que está na tela e manda pra cá.
 */
export const POST = route(async (req: Request) => {
  const { admin, userId } = await extUser(req);
  const b = body.parse(await req.json());

  const raws = b.jobs.map((j) => ({
    source: b.platform,
    external_id: j.url,
    title: j.title,
    company: j.company || null,
    location: j.location || null,
    work_mode: null,
    posted_at: null,
    url: j.url,
    description: j.description || null,
  }));

  const jobs = await upsertJobs(admin, raws);
  if (jobs.length) {
    await admin
      .from("user_jobs")
      .upsert(jobs.map((j) => ({ user_id: userId, job_id: j.id, status: "resultado" })), { onConflict: "user_id,job_id", ignoreDuplicates: true });
  }
  const ids = jobs.map((j) => j.id);
  const { data: uj } = await admin
    .from("user_jobs")
    .select("id")
    .eq("user_id", userId)
    .in("job_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const fit = await scoreUserJobs(admin, userId, (uj ?? []).map((u) => u.id));

  return cors(NextResponse.json({ ok: true, received: b.jobs.length, saved: jobs.length, notice: fit.skipped ?? null }));
});
