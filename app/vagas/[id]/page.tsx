import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { supabaseServer } from "@/lib/supabase/server";
import { Revisao } from "./Revisao";

export const dynamic = "force-dynamic";

export default async function Vaga({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const { data: uj } = await sb.from("user_jobs").select("id, status, fit_score, fit_reason, cv_version_id, jobs(*)").eq("id", id).maybeSingle();
  if (!uj) notFound();
  const [{ data: gen }, { data: cvs }, { data: accounts }, { data: queue }, settings] = await Promise.all([
    sb.from("generations").select("*").eq("user_job_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("cv_versions").select("id, label, is_default").order("created_at"),
    sb.from("email_accounts").select("id, provider, email, scopes, status"),
    sb.from("send_queue").select("id, mode, status, run_at, last_error, to_email").eq("user_job_id", id).order("created_at", { ascending: false }),
    getSettings(sb, auth.user!.id),
  ]);
  return <Revisao uj={uj as any} initialGen={gen} cvs={cvs ?? []} accounts={accounts ?? []} queue={queue ?? []} settings={settings} />;
}
