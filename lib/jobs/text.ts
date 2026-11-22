import { createHash } from "node:crypto";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };

export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  let s = html.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e) => ENTITIES[e]);
  s = s
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h\d|tr)\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e) => ENTITIES[e]);
  return s.replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
}

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export const dedupKey = (company: string | null, title: string, location: string | null) =>
  sha256(`${norm(company)}|${norm(title)}|${norm(location)}`);

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const IGNORE = /(no-?reply|noreply|privacidade|privacy|dpo|lgpd|example|sentry|wixpress)/i;

/** Só aceita e-mail que está escrito no próprio texto publicado. Nunca deduz padrões. */
export function findPublicEmail(text: string): string | null {
  const found = (text.match(EMAIL_RE) ?? []).filter((e) => !IGNORE.test(e));
  const preferred = found.find((e) => /(rh|hr|recrut|talent|vagas|jobs|careers|carreira|people|pessoas|curriculo|cv)/i.test(e));
  return (preferred ?? found[0] ?? null)?.toLowerCase() ?? null;
}

export function guessMode(text: string): string | null {
  const t = norm(text);
  if (/\b(remoto|remote|home office|anywhere)\b/.test(t)) return "remoto";
  if (/\b(hibrido|hybrid)\b/.test(t)) return "hibrido";
  if (/\b(presencial|on site|onsite)\b/.test(t)) return "presencial";
  return null;
}

export function matchesKeywords(title: string, keywords: string[]) {
  const t = norm(title);
  return keywords.some((k) => norm(k).split(" ").every((w) => t.includes(w)));
}
