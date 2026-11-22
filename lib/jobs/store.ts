import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawJob } from "./types";
import { dedupKey, findPublicEmail } from "./text";

/** Grava vagas (deduplicadas) com o service role. Devolve os ids. */
export async function upsertJobs(admin: SupabaseClient, raws: RawJob[]) {
  const seen = new Map<string, RawJob>();
  for (const r of raws) {
    if (!r.title || !r.url) continue;
    const k = dedupKey(r.company, r.title, r.location);
    if (!seen.has(k)) seen.set(k, r);
  }
  if (!seen.size) return [];
  const rows = [...seen.entries()].map(([k, r]) => {
    const email = findPublicEmail(r.description ?? "");
    return {
      ...r,
      dedup_key: k,
      hr_email: email,
      hr_email_source_url: email ? r.url : null,
      fetched_at: new Date().toISOString(),
    };
  });
  const { data, error } = await admin.from("jobs").upsert(rows, { onConflict: "dedup_key" }).select("id, dedup_key");
  if (error) throw error;
  return data ?? [];
}
