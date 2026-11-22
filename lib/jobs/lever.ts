import type { JobSource, RawJob } from "./types";
import { guessMode, matchesKeywords } from "./text";

/** Lever Postings API: pública, por empresa (slug em Configurações). */
export const lever: JobSource = {
  id: "lever",
  async search(input, { boards }) {
    const out: RawJob[] = [];
    for (const b of boards.filter((x) => x.ats === "lever")) {
      const res = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(b.slug)}?mode=json`, { next: { revalidate: 21600 } });
      if (!res.ok) continue;
      const list = await res.json();
      for (const j of Array.isArray(list) ? list : []) {
        if (!matchesKeywords(j.text, input.keywords)) continue;
        const lists = (j.lists ?? []).map((l: { text: string; content: string }) => `${l.text}\n${l.content.replace(/<[^>]+>/g, "\n")}`).join("\n\n");
        const description = [j.descriptionPlain, lists, j.additionalPlain].filter(Boolean).join("\n\n");
        out.push({
          source: "lever",
          external_id: `${b.slug}:${j.id}`,
          title: j.text,
          company: b.slug,
          location: j.categories?.location ?? null,
          work_mode: j.workplaceType === "remote" ? "remoto" : j.workplaceType === "hybrid" ? "hibrido" : j.workplaceType === "on-site" ? "presencial" : guessMode(description.slice(0, 800)),
          posted_at: j.createdAt ? new Date(j.createdAt).toISOString() : null,
          url: j.hostedUrl,
          description,
        });
      }
    }
    return out;
  },
};
