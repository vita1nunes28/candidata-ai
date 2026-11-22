import { NextResponse } from "next/server";
import { z } from "zod";
import { scoreUserJobs } from "@/lib/fit";
import { route } from "@/lib/http";
import { upsertJobs } from "@/lib/jobs/store";
import { importFromUrl } from "@/lib/jobs/url-import";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { HttpError, requireUser } from "@/lib/supabase/server";

export const maxDuration = 30;

const body = z.union([
  z.object({ url: z.string().url() }),
  z.object({ manual: z.object({ title: z.string().min(2).max(200), company: z.string().max(120).optional(), url: z.string().url(), description: z.string().min(50).max(20000) }) }),
]);

/** Importa vaga por link (Gupy, páginas de carreira) ou por texto colado. */
export const POST = route(async (req: Request) => {
  const { user } = await requireUser();
  const b = body.parse(await req.json());
  let raw;
  try {
    raw = "url" in b
      ? await importFromUrl(b.url)
      : { source: "manual", external_id: b.manual.url, title: b.manual.title, company: b.manual.company ?? null, location: null, work_mode: null, posted_at: null, url: b.manual.url, description: b.manual.description };
  } catch (e) {
    throw new HttpError(422, (e as Error).message);
  }
  const admin = supabaseAdmin();
  const [job] = await upsertJobs(admin, [raw]);
  const { data: uj } = await admin
    .from("user_jobs")
    .upsert({ user_id: user.id, job_id: job.id, status: "salva" }, { onConflict: "user_id,job_id" })
    .select("id")
    .single();
  await scoreUserJobs(admin, user.id, [uj!.id]);
  return NextResponse.json({ userJobId: uj!.id });
});
