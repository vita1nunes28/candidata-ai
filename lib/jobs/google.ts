import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import type { JobSource, RawJob } from "./types";
import { guessMode } from "./text";

/**
 * Busca na web (Google Custom Search JSON API), restrita a páginas de vaga de plataformas
 * conhecidas — não é "o Google inteiro", é uma busca dirigida pra achar vaga de verdade em vez
 * de página institucional. Precisa de GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX (gratuito até 100
 * buscas/dia; depois disso a API do Google cobra e paramos de chamar até o dia seguinte).
 * A descrição vem só do trecho (snippet) do resultado — bem mais curta que as outras fontes.
 */
// Os domínios já ficam restritos no próprio mecanismo (Programmable Search Engine) criado no
// Google Cloud, então aqui não repetimos "site:" na query — isso só reduziria ainda mais os
// resultados (dupla restrição). Também não forçamos a palavra "vaga": o título de uma vaga real
// quase nunca repete essa palavra ("Analista de Dados Pleno", por exemplo).
const MODE_TERM: Record<string, string> = { remoto: "remoto OR home office", hibrido: "híbrido", presencial: "presencial" };
const SENIORITY_TERM: Record<string, string> = { estagio: "estágio", junior: "júnior", pleno: "pleno", senior: "sênior", lideranca: "liderança OR gerente OR coordenador" };

export const googleJobs: JobSource = {
  id: "google",
  async search(input) {
    if (!env.googleCseKey() || !env.googleCseId()) return [];
    const out: RawJob[] = [];
    for (const kw of input.keywords) {
      const parts = [kw, input.location, input.mode ? MODE_TERM[input.mode] : "", input.seniority ? SENIORITY_TERM[input.seniority] : ""];
      const q = parts.filter(Boolean).join(" ");
      const qs = new URLSearchParams({ key: env.googleCseKey(), cx: env.googleCseId(), q, num: "10", gl: "br", hl: "pt-BR", safe: "active" });
      let res: Response;
      try {
        res = await fetch(`https://www.googleapis.com/customsearch/v1?${qs}`, { next: { revalidate: 21600 } });
      } catch (e) {
        console.error("[google-jobs] rede falhou:", e instanceof Error ? e.message : e);
        continue; // rede falhou pra essa palavra-chave; segue pras próximas em vez de derrubar a busca toda
      }
      if (res.status === 429) { console.error("[google-jobs] cota diária estourada (429)"); break; } // não adianta insistir agora
      if (!res.ok) {
        console.error("[google-jobs] erro", res.status, (await res.text()).slice(0, 300));
        continue;
      }
      const data = await res.json();
      if (!data.items?.length) console.error("[google-jobs] 0 resultados pra:", q, "-", data.searchInformation?.formattedTotalResults ?? "?");
      for (const r of data.items ?? []) {
        const url: string | undefined = r.link;
        const title: string | undefined = r.title;
        if (!url || !title) continue;
        out.push({
          source: "google",
          external_id: createHash("sha256").update(url).digest("hex").slice(0, 32),
          title: title.replace(/\s*[-|–]\s*(LinkedIn|Gupy|Catho|InfoJobs|Vagas\.com|Indeed).*$/i, "").trim().slice(0, 300),
          company: null,
          location: input.location ?? null,
          work_mode: guessMode(`${title} ${r.snippet ?? ""}`),
          posted_at: null,
          url,
          description: r.snippet ?? null,
        });
      }
    }
    return out;
  },
};
