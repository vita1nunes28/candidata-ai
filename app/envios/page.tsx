import { getSettings } from "@/lib/settings";
import { supabaseServer } from "@/lib/supabase/server";
import { EnviosClient } from "./EnviosClient";

export const dynamic = "force-dynamic";

export default async function Envios() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const [{ data: ready }, { data: queue }, { data: accounts }, settings] = await Promise.all([
    sb.from("user_jobs").select("id, jobs(title, company, hr_email)").eq("status", "gerada"),
    sb.from("send_queue").select("id, mode, status, run_at, last_error, to_email, user_jobs(jobs(title, company))").order("created_at", { ascending: false }).limit(100),
    sb.from("email_accounts").select("id, email, scopes, status"),
    getSettings(sb, auth.user!.id),
  ]);
  return <EnviosClient ready={(ready ?? []).filter((r: any) => r.jobs?.hr_email)} queue={queue ?? []} accounts={(accounts ?? []).filter((a) => a.status === "ok")} settings={settings} />;
}
