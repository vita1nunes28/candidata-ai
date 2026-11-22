import { env } from "@/lib/env";
import type { JobSource, RawJob } from "./types";
import { guessMode } from "./text";

/** Adzuna: API oficial e gratuita (developer.adzuna.com). Descrição vem resumida; o link leva à vaga completa. */
export const adzuna: JobSource = {
  id: "adzuna",
  async search(input) {
    if (!env.adzunaId() || !env.adzunaKey()) return [];
    const out: RawJob[] = [];
    for (const kw of input.keywords) {
      const what = [kw, input.mode === "remoto" ? "remoto" : "", input.seniority ?? ""].filter(Boolean).join(" ");
      const qs = new URLSearchParams({
        app_id: env.adzunaId(),
        app_key: env.adzunaKey(),
        what,
        results_per_page: "20",
        "content-type": "application/json",
      });
      if (input.location) qs.set("where", input.location);
      if (input.maxAgeDays) qs.set("max_days_old", String(input.maxAgeDays));
      const res = await fetch(`https://api.adzuna.com/v1/api/jobs/br/search/1?${qs}`, { next: { revalidate: 21600 } });
      if (!res.ok) continue;
      const data = await res.json();
      for (const r of data.results ?? []) {
        out.push({
          source: "adzuna",
          external_id: String(r.id),
          title: r.title?.replace(/<[^>]+>/g, "") ?? "",
          company: r.company?.display_name ?? null,
          location: r.location?.display_name ?? null,
          work_mode: guessMode(`${r.title} ${r.description}`),
          posted_at: r.created ?? null,
          url: r.redirect_url,
          description: r.description?.replace(/<[^>]+>/g, "") ?? null,
        });
      }
    }
    return out;
  },
};
