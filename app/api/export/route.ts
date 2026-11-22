import { route } from "@/lib/http";
import { requireUser } from "@/lib/supabase/server";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Histórico em CSV (abre no Excel/Sheets). */
export const GET = route(async () => {
  const { sb, user } = await requireUser();
  const { data } = await sb.from("user_jobs").select("status, fit_score, applied_at, created_at, jobs(title, company, location, url, hr_email, source)").eq("user_id", user.id).neq("status", "resultado").order("created_at", { ascending: false });
  const head = ["Vaga", "Empresa", "Local", "Status", "Aderência", "E-mail RH", "Fonte", "Candidatura em", "Salva em", "Link"];
  const rows = (data ?? []).map((r) => {
    const j = r.jobs as unknown as Record<string, string>;
    return [j.title, j.company, j.location, r.status, r.fit_score, j.hr_email, j.source, r.applied_at, r.created_at, j.url].map(esc).join(";");
  });
  return new Response("\uFEFF" + [head.map(esc).join(";"), ...rows].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="candidaturas.csv"` },
  });
});
