import type { Profile } from "@/lib/schemas";

/**
 * O que pode ir para a IA. Na camada gratuita do Gemini o Google pode usar o
 * conteúdo para melhorar produtos, então NUNCA enviamos: contato, salário,
 * dados de diversidade, autorização de trabalho. Esses campos são preenchidos
 * direto do perfil, sem passar pela IA.
 */
export function profileForLLM(p: Partial<Profile>) {
  return {
    resumo: p.summary ?? null,
    cidade: p.city ?? null,
    experiencias: p.experiences ?? [],
    formacao: p.education ?? [],
    habilidades: p.skills ?? [],
    ferramentas: p.tools ?? [],
    idiomas: p.languages ?? [],
    certificacoes: p.certifications ?? [],
    modalidades_aceitas: p.work_modes ?? [],
    aceita_mudanca: p.accepts_relocation ?? null,
  };
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}/g;
const URL_RE = /\b(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com|behance\.net|[a-z0-9-]+\.(?:dev|io|me|com\.br|com))\/[^\s)]*/gi;

/** Extrai contato localmente e devolve o texto do CV sem e-mail e telefone. */
export function splitContact(text: string) {
  const emails = text.match(EMAIL_RE) ?? [];
  const phones = (text.match(PHONE_RE) ?? []).filter((p) => p.replace(/\D/g, "").length >= 10);
  const urls = text.match(URL_RE) ?? [];
  const find = (needle: string) => urls.find((u) => u.toLowerCase().includes(needle)) ?? null;
  const links = {
    linkedin: find("linkedin.com"),
    github: find("github.com"),
    portfolio: urls.find((u) => !/linkedin|github/i.test(u)) ?? null,
  };
  const redacted = text.replace(EMAIL_RE, "[email]").replace(PHONE_RE, (m) => (m.replace(/\D/g, "").length >= 10 ? "[telefone]" : m));
  return { email: emails[0] ?? null, phone: phones[0]?.trim() ?? null, links, redacted };
}
