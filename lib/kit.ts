/** Respostas objetivas preenchidas direto do perfil — não passam pela IA. */
export function profileAnswers(p: Record<string, any>) {
  const brl = (n?: number | null) => (n ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : null);
  const modes: Record<string, string> = { presencial: "presencial", hibrido: "híbrido", remoto: "remoto" };
  const out: { pergunta: string; resposta: string }[] = [];
  const sal = [p.salary_clt && `CLT: ${brl(p.salary_clt)}/mês`, p.salary_pj && `PJ: ${brl(p.salary_pj)}/mês`].filter(Boolean).join(" · ");
  if (sal) out.push({ pergunta: "Pretensão salarial", resposta: sal });
  if (p.availability) out.push({ pergunta: "Disponibilidade para início", resposta: p.availability });
  if (p.work_modes?.length) out.push({ pergunta: "Modalidade de trabalho", resposta: p.work_modes.map((m: string) => modes[m] ?? m).join(", ") });
  if (p.accepts_relocation != null) out.push({ pergunta: "Aceita mudança de cidade?", resposta: p.accepts_relocation ? "Sim" : "Não" });
  if (p.work_authorization) out.push({ pergunta: "Autorização de trabalho", resposta: p.work_authorization });
  return out;
}
