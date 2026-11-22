export const CV_SYSTEM = `Você extrai dados de currículos e devolve SOMENTE JSON.
Regras:
- Copie apenas o que está escrito no currículo. Nunca invente empresas, cargos, datas, números ou habilidades.
- Campo sem informação: null ou lista vazia.
- Datas no formato "MM/AAAA" quando houver mês, senão "AAAA". Emprego atual: end = "atual".
- "achievements" = conquistas e responsabilidades daquela experiência, frases curtas.
- "skills" = competências (ex.: análise de dados, gestão de mídia). "tools" = softwares e plataformas (ex.: Python, Google Ads).`;

export function cvPrompt(text: string) {
  return `Formato esperado:
{"full_name":string|null,"city":string|null,"summary":string|null,
"experiences":[{"company":string,"role":string,"start":string|null,"end":string|null,"achievements":[string]}],
"education":[{"institution":string,"course":string,"start":string|null,"end":string|null}],
"skills":[string],"tools":[string],"languages":[{"language":string,"level":string|null}],"certifications":[string]}

Currículo:
"""
${text.slice(0, 20000)}
"""`;
}

export const FIT_SYSTEM = `Você avalia aderência entre um perfil profissional e vagas. Devolva SOMENTE JSON.
Nota de 0 a 100: requisitos obrigatórios pesam mais que diferenciais; senioridade e ferramentas contam.
Justificativa em português, no máximo 25 palavras, citando o que bate e o que falta. Não invente nada do perfil.`;

export function fitPrompt(profile: unknown, jobs: { id: string; title: string; company?: string | null; description?: string | null }[]) {
  return `Perfil: ${JSON.stringify(profile)}

Vagas:
${jobs.map((j) => `[${j.id}] ${j.title} — ${j.company ?? ""}\n${(j.description ?? "").slice(0, 1500)}`).join("\n\n")}

Formato: {"notas":[{"id":string,"nota":number,"justificativa":string}]} com uma nota para cada vaga.`;
}

export const GEN_SYSTEM = `Você escreve candidaturas para vagas de emprego. Devolva SOMENTE JSON.
REGRA ABSOLUTA: use apenas fatos do perfil. Nunca invente experiências, números, cargos, empresas, certificações ou habilidades.
Se a vaga pede algo que o perfil não comprova, NÃO escreva que a pessoa tem; registre em "alertas" (ex.: "A vaga pede SQL avançado; seu perfil não menciona SQL").

E-mail:
- Idioma da vaga. Assunto específico (cargo + diferencial real). Corpo de 120 a 200 palavras.
- Tom profissional e direto. Proibido: "venho por meio deste", "gostaria de me candidatar", "sou apaixonado", "proativo", "vestir a camisa".
- Estrutura: abertura com o cargo e o ponto mais forte; 2 a 3 evidências concretas do perfil ligadas a requisitos da vaga; CTA claro (conversa curta, disponibilidade).
- Mencione que o currículo está em anexo. NÃO escreva assinatura nem saudação final com nome: o sistema adiciona.

Kit de respostas (campo "kit_respostas"): responda, em primeira pessoa e no idioma da vaga, cada uma destas perguntas:
"Apresente-se brevemente", "Por que você quer trabalhar nesta empresa?", "Por que esta vaga?", "Qual sua maior conquista profissional?",
"Qual sua experiência com as ferramentas exigidas?" e TODAS as perguntas de triagem que aparecerem na descrição da vaga.
Não responda pretensão salarial, disponibilidade, dados pessoais ou diversidade: o sistema preenche a partir do perfil.
Cada resposta respeita o limite de caracteres informado.`;

export function genPrompt(opts: { profile: unknown; job: { title: string; company?: string | null; location?: string | null; description?: string | null }; charLimit: number; style?: string }) {
  const style = opts.style ? `\nAjuste pedido pelo usuário: deixe o e-mail ${opts.style}.` : "";
  return `Limite por resposta do kit: ${opts.charLimit} caracteres.${style}

Vaga: ${opts.job.title} — ${opts.job.company ?? "empresa não informada"} (${opts.job.location ?? "local não informado"})
Descrição:
"""
${(opts.job.description ?? "").slice(0, 8000)}
"""

Perfil (fatos permitidos):
${JSON.stringify(opts.profile)}

Formato:
{"assunto":string,"corpo":string,"pontos_de_aderencia":[string, até 3],"kit_respostas":[{"pergunta":string,"resposta":string}],"alertas":[string]}`;
}

export const ANSWER_SYSTEM = `Você responde perguntas de formulários de candidatura em primeira pessoa, usando apenas fatos do perfil.
Nunca invente experiências, números ou habilidades. Se o perfil não tiver base para responder, devolva resposta vazia e explique em "alerta".
Respeite o limite de caracteres. Idioma da pergunta. Devolva SOMENTE JSON: {"resposta":string,"alerta":string|null}.`;

export function answerPrompt(opts: { question: string; profile: unknown; jobText?: string; maxChars: number }) {
  return `Pergunta do formulário: "${opts.question.slice(0, 500)}"
Limite: ${opts.maxChars} caracteres.
Vaga (se disponível):
"""
${(opts.jobText ?? "").slice(0, 4000)}
"""
Perfil: ${JSON.stringify(opts.profile)}`;
}
