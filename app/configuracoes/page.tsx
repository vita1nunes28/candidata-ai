import { getSettings } from "@/lib/settings";
import { supabaseServer } from "@/lib/supabase/server";
import { ConfigClient } from "./ConfigClient";

export const dynamic = "force-dynamic";

export default async function Config({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const sp = await searchParams;
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const [{ data: accounts }, { data: ext }, settings] = await Promise.all([
    sb.from("email_accounts").select("id, provider, email, scopes, status"),
    sb.from("ext_tokens").select("ext_version, last_seen").maybeSingle(),
    getSettings(sb, auth.user!.id),
  ]);
  return <ConfigClient accounts={accounts ?? []} ext={ext} settings={settings} flash={sp.email} />;
}
