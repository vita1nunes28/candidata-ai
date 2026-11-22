"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api, CopyButton, FitBadge, Notice, PageTitle, Stamp } from "@/components/ui";
import type { Settings } from "@/lib/settings";

type Gen = { id: string; subject: string; body: string; fit_points: string[]; answer_kit: { pergunta: string; resposta: string }[]; alerts: string[] };

export function Revisao({ uj, initialGen, cvs, accounts, queue, settings }: { uj: any; initialGen: Gen | null; cvs: any[]; accounts: any[]; queue: any[]; settings: Settings }) {
  const job = uj.jobs;
  const [gen, setGen] = useState<Gen | null>(initialGen);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "error" | "warn" | "info"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [cvId, setCvId] = useState<string>(uj.cv_version_id ?? "");
  const words = useMemo(() => (gen?.body.trim().split(/\s+/).length ?? 0), [gen?.body]);

  async function generate(style?: string, force = false) {
    setBusy(style ? "Reescrevendo…" : "Gerando e-mail e respostas…"); setMsg(null);
    try {
      const r = await api("/api/generate", { method: "POST", json: { userJobId: uj.id, style, force } });
      setGen(r.generation); setDirty(false);
    } catch (e) { setMsg({ tone: "error", text: (e as Error).message }); }
    setBusy("");
  }
  async function saveEdits() {
    if (!gen) return;
    await api(`/api/generations/${gen.id}`, { method: "PATCH", json: { subject: gen.subject, body: gen.body, answer_kit: gen.answer_kit } });
    setDirty(false); setMsg({ tone: "ok", text: "Alterações salvas." });
  }
  async function chooseCv(id: string) {
    setCvId(id);
    await api(`/api/jobs/${uj.id}`, { method: "PATCH", json: { cv_version_id: id || null } });
  }
  const edit = (patch: Partial<Gen>) => { setGen((g) => (g ? { ...g, ...patch } : g)); setDirty(true); };

  return (
    <>
      <Link href="/busca" className="text-sm underline">Voltar para a busca</Link>
      <PageTitle title={job.title}>{[job.company, job.location].filter(Boolean).join(" · ")}</PageTitle>

      <section className="surface p-6 mb-6 space-y-3">
        <div className="flex flex-wrap gap-4 items-center"><FitBadge score={uj.fit_score} /><Stamp status={uj.status} /><a className="underline text-sm" href={job.url} target="_blank" rel="noreferrer">Abrir vaga na fonte</a></div>
        {uj.fit_reason && <p>{uj.fit_reason}</p>}
        <p className="text-sm">{job.hr_email ? <>E-mail de RH: <strong>{job.hr_email}</strong> · <a className="underline" href={job.hr_email_source_url} target="_blank" rel="noreferrer">onde foi publicado</a></> : <span className="muted">A empresa não publicou um e-mail de RH. Candidate-se pelo link e use o kit de respostas (ou a extensão) no formulário.</span>}</p>
        <details><summary className="underline text-sm cursor-pointer">Descrição completa</summary><p className="whitespace-pre-line text-sm mt-2 max-h-96 overflow-auto">{job.description}</p></details>
        {cvs.length > 1 && (
          <div className="max-w-xs"><label className="label">Currículo para esta vaga</label>
            <select className="field" value={cvId} onChange={(e) => chooseCv(e.target.value)}><option value="">Padrão</option>{cvs.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
          </div>
        )}
      </section>

      {busy && <div className="mb-4"><Notice>{busy}</Notice></div>}
      {msg && <div className="mb-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}

      {!gen ? (
        <section className="surface p-6"><p className="mb-3">Ainda não há candidatura gerada para esta vaga.</p><button className="btn btn-primary" disabled={!!busy} onClick={() => generate()}>Gerar e-mail e kit de respostas</button></section>
      ) : (
        <>
          {gen.alerts.length > 0 && (
            <div className="mb-6"><Notice tone="warn"><strong>Pontos que seu perfil não comprova:</strong><ul className="list-disc pl-5 mt-1">{gen.alerts.map((a, i) => <li key={i}>{a}</li>)}</ul>Nada foi inventado. Se você tem essa experiência, adicione no perfil e gere de novo.</Notice></div>
          )}

          <section className="surface p-6 mb-6 space-y-4">
            <h2 className="text-xl font-bold">E-mail de candidatura</h2>
            <div><h3 className="label">Pontos de aderência usados</h3><ul className="list-disc pl-5">{gen.fit_points.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
            <div><label className="label" htmlFor="sub">Assunto</label><input id="sub" className="field" value={gen.subject} onChange={(e) => edit({ subject: e.target.value })} /></div>
            <div>
              <label className="label" htmlFor="body">Corpo</label>
              <textarea id="body" className="field min-h-72" value={gen.body} onChange={(e) => edit({ body: e.target.value })} />
              <p className={`text-sm mt-1 ${words < 120 || words > 200 ? "text-amber-700" : "muted"}`}>{words} palavras (ideal: 120 a 200). Sua assinatura e o CV são adicionados no envio.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-ghost text-sm" disabled={!!busy} onClick={() => generate("curto")}>Reescrever: mais curto</button>
              <button className="btn btn-ghost text-sm" disabled={!!busy} onClick={() => generate("formal")}>Reescrever: mais formal</button>
              <button className="btn btn-ghost text-sm" disabled={!!busy} onClick={() => generate("tecnico")}>Reescrever: mais técnico</button>
              <button className="btn btn-ghost text-sm" disabled={!!busy} onClick={() => generate(undefined, true)}>Gerar de novo</button>
              {dirty && <button className="btn btn-primary text-sm" onClick={saveEdits}>Salvar alterações</button>}
            </div>
          </section>

          <section className="surface p-6 mb-6 space-y-4">
            <h2 className="text-xl font-bold">Kit de respostas para o formulário</h2>
            <p className="muted text-sm">Limite por resposta: {settings.answer_char_limit} caracteres (mude em Configurações).</p>
            {gen.answer_kit.map((k, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between gap-2"><span className="font-bold">{k.pergunta}</span><CopyButton text={k.resposta} /></div>
                <textarea className="field min-h-24" value={k.resposta} maxLength={Math.max(settings.answer_char_limit, k.resposta.length)} onChange={(e) => edit({ answer_kit: gen.answer_kit.map((x, j) => (j === i ? { ...x, resposta: e.target.value } : x)) })} />
                <p className="muted text-xs text-right">{k.resposta.length}/{settings.answer_char_limit}</p>
              </div>
            ))}
            {dirty && <button className="btn btn-primary text-sm" onClick={saveEdits}>Salvar alterações</button>}
          </section>

          <Envio uj={uj} gen={gen} accounts={accounts} queue={queue} settings={settings} dirty={dirty} />
        </>
      )}
    </>
  );
}

function Envio({ uj, gen, accounts, queue, settings, dirty }: { uj: any; gen: Gen; accounts: any[]; queue: any[]; settings: Settings; dirty: boolean }) {
  const job = uj.jobs;
  const ok = accounts.filter((a) => a.status === "ok");
  const [acc, setAcc] = useState(ok[0]?.id ?? "");
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [win, setWin] = useState<1 | 2>(1);
  const [confirmAuto, setConfirmAuto] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const selected = ok.find((a) => a.id === acc);
  const canAuto = selected && selected.scopes.some((s: string) => /gmail\.send|mail\.send/i.test(s));
  const mailto = job.hr_email ? `mailto:${job.hr_email}?subject=${encodeURIComponent(gen.subject)}&body=${encodeURIComponent(gen.body)}` : null;

  async function send(mode: "rascunho" | "agendado") {
    setMsg(null);
    try {
      const r = await api("/api/send", { method: "POST", json: { userJobIds: [uj.id], accountId: acc, mode, day, window: win, confirmAuto } });
      const res = r.results[0];
      setMsg({ tone: res?.ok ? "ok" : "error", text: res?.message ?? "Sem resultado." });
    } catch (e) { setMsg({ tone: "error", text: (e as Error).message }); }
  }

  if (!job.hr_email) {
    return (
      <section className="surface p-6 space-y-3">
        <h2 className="text-xl font-bold">Candidatar pelo link</h2>
        <p>Abra o formulário da vaga e use a extensão para preencher, ou copie as respostas do kit acima.</p>
        <div className="flex gap-2 flex-wrap">
          <a className="btn btn-primary" href={job.url} target="_blank" rel="noreferrer">Abrir formulário</a>
          <button className="btn btn-ghost" onClick={async () => { await api(`/api/jobs/${uj.id}`, { method: "PATCH", json: { status: "formulario" } }); location.reload(); }}>Marcar como candidatura enviada</button>
        </div>
      </section>
    );
  }

  return (
    <section className="surface p-6 space-y-5">
      <h2 className="text-xl font-bold">Enviar</h2>
      {dirty && <Notice tone="warn">Salve as alterações antes de enviar.</Notice>}

      <div className="space-y-2">
        <h3 className="font-bold">1. Copiar</h3>
        <div className="flex gap-2 flex-wrap"><CopyButton text={`${gen.subject}\n\n${gen.body}`} label="Copiar assunto e corpo" />{mailto && <a className="btn btn-ghost text-sm py-1" href={mailto}>Abrir no meu app de e-mail</a>}</div>
        <p className="muted text-sm">No modo copiar, anexe o CV você mesmo.</p>
      </div>

      {ok.length === 0 ? (
        <Notice>Para criar rascunhos ou agendar, <Link className="underline font-bold" href="/configuracoes">conecte seu Gmail ou Outlook</Link>.</Notice>
      ) : (
        <>
          <div className="max-w-sm"><label className="label">Enviar pela conta</label><select className="field" value={acc} onChange={(e) => setAcc(e.target.value)}>{ok.map((a) => <option key={a.id} value={a.id}>{a.email}</option>)}</select></div>
          <div className="space-y-2">
            <h3 className="font-bold">2. Criar rascunho</h3>
            <p className="muted text-sm">O e-mail fica nos rascunhos da sua caixa, com o CV anexado. Você revisa e clica em enviar.</p>
            <button className="btn btn-primary" disabled={dirty} onClick={() => send("rascunho")}>Criar rascunho</button>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold">3. Agendar envio automático</h3>
            {!canAuto ? (
              <p className="text-sm">Esta conta ainda não tem permissão de envio. <Link className="underline" href="/configuracoes">Ativar envio automático</Link>.</p>
            ) : (
              <>
                <div className="flex gap-3 flex-wrap items-end">
                  <div><label className="label">Dia</label><input className="field" type="date" value={day} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDay(e.target.value)} /></div>
                  <div><label className="label">Janela</label><select className="field" value={win} onChange={(e) => setWin(Number(e.target.value) as 1 | 2)}><option value={1}>{settings.send_hour_1}h</option><option value={2}>{settings.send_hour_2}h</option></select></div>
                </div>
                {!settings.auto_send_enabled && (
                  <label className="flex gap-2 items-start text-sm"><input type="checkbox" className="mt-1" checked={confirmAuto} onChange={(e) => setConfirmAuto(e.target.checked)} />Confirmo que a plataforma pode enviar este e-mail sozinha, pela minha conta, no horário escolhido. Posso cancelar antes do envio.</label>
                )}
                <button className="btn btn-primary" disabled={dirty || (!settings.auto_send_enabled && !confirmAuto)} onClick={() => send("agendado")}>Agendar</button>
                <p className="muted text-sm">Os envios saem em 2 janelas por dia ({settings.send_hour_1}h e {settings.send_hour_2}h), com intervalo entre eles. Limite: {settings.daily_send_limit} por dia.</p>
              </>
            )}
          </div>
        </>
      )}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {queue.length > 0 && (
        <div><h3 className="font-bold mb-1">Histórico de envio</h3><ul className="text-sm space-y-1">{queue.map((q) => <li key={q.id}>{q.mode === "rascunho" ? "Rascunho" : "Agendado"} para {q.to_email} · <strong>{q.status}</strong>{q.run_at && ` · ${new Date(q.run_at).toLocaleString("pt-BR")}`}{q.last_error && ` · ${q.last_error}`}</li>)}</ul></div>
      )}
    </section>
  );
}
