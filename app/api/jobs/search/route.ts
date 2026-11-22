import { NextResponse } from "next/server";
import { scoreUserJobs } from "@/lib/fit";
import { route } from "@/lib/http";
import { SOURCES } from "@/lib/jobs";
import { upsertJobs } from "@/lib/jobs/store";
import { searchSchema } from "@/lib/schemas";
import { getSettings } from "@/lib/settings";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

export const maxDuration = 60;

const EN = /\b(the|and|with|you|we|our|experience|requirements)\b/gi;

export const POST = route(async (req: Request) => {
  const { sb, user } = await requireUser();
  const input = searchSchema.parse(await req.json());
  const settings = await getSettings(sb, user.id);
  const admin = supabaseAdmin();

  const results = await Promise.allSettled(SOURCES.map((s) => s.search(input, { boards: settings.company_boards })));
  let raws = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const failed = results.filter((r) => r.status === "rejected").length;

  // filtros locais
  const since = input.maxAgeDays ? Date.now() - input.maxAgeDays * 864e5 : 0;
  raws = raws.filter((j) => {
    if (since && j.posted_at && new Date(j.posted_at).getTime() < since) return false;
    if (input.mode && j.work_mode && j.work_mode !== input.mode) return false;
    if (input.location && input.mode !== "remoto" && j.location && !j.location.toLowerCase().includes(input.location.toLowerCase().split(",")[0])) {
      if (j.source !== "adzuna") return false; // a Adzuna já filtra por local
    }
    if (input.language) {
      const en = ((j.description ?? "").match(EN) ?? []).length > 8;
      if (input.language === "en" && !en) return false;
      if (input.language === "pt" && en) return false;
    }
    return true;
  });

  const jobs = await upsertJobs(admin, raws.slice(0, 80));
  if (jobs.length) {
    await admin
      .from("user_jobs")
      .upsert(jobs.map((j) => ({ user_id: user.id, job_id: j.id, status: "resultado" })), { onConflict: "user_id,job_id", ignoreDuplicates: true });
  }
  const ids = jobs.map((j) => j.id);
  const { data: uj } = await admin.from("user_jobs").select("id").eq("user_id", user.id).in("job_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const fit = await scoreUserJobs(admin, user.id, (uj ?? []).map((u) => u.id));

  const { data: list } = await sb
    .from("user_jobs")
    .select("id, status, fit_score, fit_reason, jobs(*)")
    .eq("user_id", user.id)
    .in("job_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
    .order("fit_score", { ascending: false, nullsFirst: false });

  return NextResponse.json({ items: list ?? [], notice: fit.skipped ?? (failed ? "Uma das fontes não respondeu agora; mostramos o que veio das outras." : null) });
});
