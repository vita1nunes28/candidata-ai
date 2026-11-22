import type { JobSource, RawJob } from "./types";
import { guessMode, htmlToText, matchesKeywords } from "./text";

/** Greenhouse Job Board API: pública, por empresa (slug em Configurações). */
export const greenhouse: JobSource = {
  id: "greenhouse",
  async search(input, { boards }) {
    const out: RawJob[] = [];
    for (const b of boards.filter((x) => x.ats === "greenhouse")) {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(b.slug)}/jobs?content=true`, { next: { revalidate: 21600 } });
      if (!res.ok) continue;
      const data = await res.json();
      for (const j of data.jobs ?? []) {
        if (!matchesKeywords(j.title, input.keywords)) continue;
        const description = htmlToText(j.content);
        out.push({
          source: "greenhouse",
          external_id: `${b.slug}:${j.id}`,
          title: j.title,
          company: data.meta?.name ?? b.slug,
          location: j.location?.name ?? null,
          work_mode: guessMode(`${j.location?.name} ${description.slice(0, 800)}`),
          posted_at: j.updated_at ?? null,
          url: j.absolute_url,
          description,
        });
      }
    }
    return out;
  },
};
