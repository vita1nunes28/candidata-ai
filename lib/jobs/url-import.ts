import type { RawJob } from "./types";
import { guessMode, htmlToText } from "./text";

const BLOCKED = /(^|\.)(linkedin\.com|indeed\.com|glassdoor\.)/i;

/** Importa UMA vaga a partir do link colado pelo usuário (Gupy, páginas de carreira etc.). */
export async function importFromUrl(raw: string): Promise<RawJob> {
  const url = new URL(raw);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Use um link http(s).");
  if (BLOCKED.test(url.hostname)) throw new Error("Este site não permite leitura automática. Copie a descrição da vaga e cole manualmente.");
  const res = await fetch(url, { headers: { "User-Agent": "Candidata.ai/0.1 (+importação manual de vaga)" }, redirect: "follow" });
  if (!res.ok) throw new Error(`Não consegui abrir o link (código ${res.status}).`);
  const html = (await res.text()).slice(0, 2_000_000);

  // 1) dados estruturados JobPosting (Gupy e muitas páginas de carreira publicam)
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1]);
      const items = Array.isArray(parsed) ? parsed : parsed["@graph"] ?? [parsed];
      const jp = items.find((x: { "@type"?: string }) => x?.["@type"] === "JobPosting");
      if (jp) {
        const description = htmlToText(jp.description);
        const loc = jp.jobLocation?.address ?? (Array.isArray(jp.jobLocation) ? jp.jobLocation[0]?.address : null);
        return {
          source: "url",
          external_id: url.href,
          title: jp.title,
          company: jp.hiringOrganization?.name ?? url.hostname,
          location: [loc?.addressLocality, loc?.addressRegion].filter(Boolean).join(", ") || null,
          work_mode: jp.jobLocationType === "TELECOMMUTE" ? "remoto" : guessMode(description.slice(0, 800)),
          posted_at: jp.datePosted ?? null,
          url: url.href,
          description,
        };
      }
    } catch {
      /* ignora blocos inválidos */
    }
  }
  // 2) fallback: título e texto da página
  const title = htmlToText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? url.hostname);
  const body = htmlToText(html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html);
  return {
    source: "url",
    external_id: url.href,
    title: title.split(/[|–-]/)[0].trim(),
    company: url.hostname.replace(/^www\./, ""),
    location: null,
    work_mode: guessMode(body.slice(0, 2000)),
    posted_at: null,
    url: url.href,
    description: body.slice(0, 15000),
  };
}
