"use client";
import { useEffect, useState } from "react";
import { api, Notice, PageTitle } from "@/components/ui";
import type { Settings } from "@/lib/settings";

const ZONES = ["America/Sao_Paulo", "America/Manaus", "America/Belem", "America/Fortaleza", "America/Recife", "America/Cuiaba", "America/Rio_Branco", "America/Noronha", "Europe/Lisbon"];

const PLATFORMS: { id: string; label: string; note: string }[] = [
  { id: "linkedin", label: "LinkedIn", note: "Só leitura de resultados e respostas para copiar — o LinkedIn proíbe preenchimento automático." },
  { id: "gupy", label: "Gupy", note: "Leitura de resultados e preenchimento automático do formulário." },
  { id: "catho", label: "Catho", note: "Leitura de resultados e preenchimento automático do formulário." },
  { id: "infojobs", label: "InfoJobs", note: "Leitura de resultados e preenchimento automático do formulário." },
  { id: "vagascom", label: "Vagas.com", note: "Leitura de resultados e preenchimento automático do formulário." },
];

export function ConfigClient({ accounts, ext, settings, flash }: { accounts: any[]; ext: any; settings: Settings; flash?: string }) {
  const [s, setS] = useState(settings);
  const [boards, setBoards] = useState(settings.company_boards.map((b) => `${b.ats}:${b.slug}`).join("\n"));
  const [showWarning, setShowWarning] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(flash ? { tone: "ok", text: flash } : null);

  useEffect(() => {
    window.postMessage({ type: "CANDIDATA_JOB_PLATFORMS", platforms: s.job_platforms }, location.origin);
  }, []); // sincroniza o que já está salvo com a extensão assim que a página carrega

  function togglePlatform(id: string) {
    setS((cur) => ({ ...cur, job_platforms: cur.job_platforms.includes(id) ? cur.job_platforms.filter((p) => p !== id) : [...cur.job_platforms, id] }));
  }

  async function save() {
    try {
      const company_boards = boards.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [ats, slug] = l.split(":"); return { ats: ats.trim().toLowerCase(), slug: (slug ?? "").trim() }; });
      await api("/api/settings", { method: "PUT", json: { ...s, company_boards } });
      window.postMessage({ type: "CANDIDATA_JOB_PLATFORMS", platforms: s.job_platforms }, location.origin);
      setMsg({ tone: "ok", text: "Configurações salvas." });
    } catch (e) { setMsg({ tone: "error", text: (e as Error).message }); }
  }
  const hasSend = (a: any) => a.scopes.some((x: string) => /gmail\.send|mail\.send/i.test(x));

  return (
    <>
      <PageTitle title="Configurações" />
      {msg && <div className="mb-6"><Notice tone={msg.tone}>{msg.text}</Notice></div>}

      <section className="surface p-6 mb-6 space-y-4">
        <h2 className="text-xl font-bold">Contas de e-mail</h2>
        <p className="muted">Os e-mails saem da sua própria conta. A plataforma só cria rascunhos e envia o que você aprovar.</p>
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3">
              <strong>{a.email}</strong><span className="muted text-sm">{a.provider === "gmail" ? "Gmail" : "Outlook"}</span>
              {a.status !== "ok" ? <span className="stamp" style={{ color: "#B3261E" }}>Reconectar</span> : hasSend(a) ? <span className="stamp" style={{ color: "#1F7A55" }}>Envio automático ativo</span> : <span className="stamp" style={{ color: "var(--muted)" }}>Só rascunhos</span>}
              {(a.status !== "ok" || !hasSend(a)) && <button className="text-sm underline" onClick={() => setShowWarning(`/api/oauth/${a.provider}/start${a.status === "ok" ? "?envio=1" : ""}`)}>{a.status !== "ok" ? "Conectar de novo" : "Ativar envio automático"}</button>}
              <button className="text-sm underline" onClick={async () => { if (confirm("Desconectar e apagar o acesso a esta conta?")) { await api(`/api/email-accounts/${a.id}`, { method: "DELETE" }); location.reload(); } }}>Desconectar</button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-ghost" onClick={() => setShowWarning("/api/oauth/gmail/start")}>Conectar Gmail</button>
          <button className="btn btn-ghost" onClick={() => setShowWarning("/api/oauth/outlook/start")}>Conectar Outlook</button>
        </div>
        {showWarning && <UnverifiedCard href={showWarning} outlook={showWarning.includes("outlook")} onClose={() => setShowWarning(null)} />}
      </section>

      <section className="surface p-6 mb-6 space-y-4">
        <h2 className="text-xl font-bold">Envio automático</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Num label="Limite de envios por dia" v={s.daily_send_limit} min={1} max={50} on={(v) => setS({ ...s, daily_send_limit: v })} />
          <div><label className="label">Fuso horário</label><select className="field" value={s.timezone} onChange={(e) => setS({ ...s, timezone: e.target.value })}>{ZONES.map((z) => <option key={z}>{z}</option>)}</select></div>
          <Hour label="1ª janela de envio" v={s.send_hour_1} on={(v) => setS({ ...s, send_hour_1: v })} />
          <Hour label="2ª janela de envio" v={s.send_hour_2} on={(v) => setS({ ...s, send_hour_2: v })} />
        </div>
        <p className="muted text-sm">Os envios agendados saem só nessas duas janelas, com um intervalo aleatório entre um e outro, para parecer envio humano e não sobrecarregar nada. Padrão: 9h e 14h.</p>
      </section>

      <section className="surface p-6 mb-6 space-y-4">
        <h2 className="text-xl font-bold">Respostas e vagas</h2>
        <Num label="Limite de caracteres por resposta do kit" v={s.answer_char_limit} min={100} max={3000} on={(v) => setS({ ...s, answer_char_limit: v })} />
        <div>
          <label className="label" htmlFor="boards">Empresas no Greenhouse ou Lever (uma por linha)</label>
          <textarea id="boards" className="field min-h-24" value={boards} onChange={(e) => setBoards(e.target.value)} placeholder={"greenhouse:nubank\nlever:empresa"} />
          <p className="muted text-sm mt-1">O nome vem do endereço de vagas da empresa: em boards.greenhouse.io/<strong>nubank</strong> é “nubank”; em jobs.lever.co/<strong>empresa</strong> é “empresa”.</p>
        </div>
      </section>

      <section className="surface p-6 mb-6 space-y-3">
        <h2 className="text-xl font-bold">Buscar também nestas plataformas (via extensão)</h2>
        <p className="muted">
          A busca por Adzuna cobre pouca coisa no Brasil. Marque abaixo as plataformas onde você quer que a extensão ajude: entre e pesquise normalmente,
          <strong> logada</strong>, nessas plataformas — a extensão vai avisar quantas vagas encontrou na tela e, com um clique seu, importa pro Candidata.ai
          pra pontuar contra seu perfil e entrar no mesmo painel de Buscar vagas. Nada é importado sem você clicar em “Importar”.
        </p>
        <ul className="space-y-2">
          {PLATFORMS.map((p) => (
            <li key={p.id} className="flex items-start gap-2">
              <input type="checkbox" id={`pf-${p.id}`} className="mt-1" checked={s.job_platforms.includes(p.id)} onChange={() => togglePlatform(p.id)} />
              <label htmlFor={`pf-${p.id}`}><strong>{p.label}</strong> — <span className="muted text-sm">{p.note}</span></label>
            </li>
          ))}
        </ul>
        {!ext && <p className="muted text-sm">Isso só funciona com a extensão instalada e conectada (abaixo).</p>}
      </section>
      <button className="btn btn-primary mb-10" onClick={save}>Salvar configurações</button>

      <section className="surface p-6 mb-6 space-y-3">
        <h2 className="text-xl font-bold">Extensão</h2>
        {ext ? <p>Conectada · versão {ext.ext_version ?? "?"}{ext.last_seen && ` · usada em ${new Date(ext.last_seen).toLocaleDateString("pt-BR")}`}</p> : <p className="muted">Não conectada.</p>}
        <a className="btn btn-ghost" href="/extensao">Instalar ou conectar</a>
      </section>

      <section className="surface p-6 space-y-3">
        <h2 className="text-xl font-bold">Seus dados</h2>
        <div className="flex gap-2 flex-wrap">
          <a className="btn btn-ghost" href="/api/export">Exportar histórico (CSV)</a>
          <button className="btn btn-danger" onClick={async () => {
            if (prompt('Isso apaga currículos, perfil, histórico, contas conectadas e sua conta. Digite APAGAR para confirmar.') !== "APAGAR") return;
            await api("/api/account", { method: "DELETE" });
            location.href = "/login";
          }}>Apagar todos os meus dados</button>
        </div>
      </section>
    </>
  );
}

function UnverifiedCard({ href, outlook, onClose }: { href: string; outlook: boolean; onClose: () => void }) {
  return (
    <div className="rounded-xl border-2 p-5 space-y-3" style={{ borderColor: "#B7791F" }}>
      <h3 className="font-bold text-lg">{outlook ? "A Microsoft pode pedir sua aprovação. É esperado." : "Vai aparecer “O Google não verificou este app”. É esperado."}</h3>
      <p>A plataforma está em fase de testes e ainda não passou pela verificação paga do {outlook ? "provedor" : "Google"}. Seus dados continuam protegidos: o acesso serve só para criar rascunhos e enviar os e-mails que você aprovar.</p>
      {!outlook && (
        <ol className="list-decimal pl-5 space-y-1">
          <li>Na tela de aviso, clique em <strong>Avançado</strong> (canto inferior esquerdo).</li>
          <li>Clique em <strong>Acessar Candidata.ai (não seguro)</strong>.</li>
          <li>Marque as permissões pedidas e clique em <strong>Continuar</strong>.</li>
        </ol>
      )}
      <figure className="grid sm:grid-cols-2 gap-3">
        <img src="/guia/google-aviso-1.svg" alt="Tela de aviso do Google com o link Avançado destacado" className="rounded-lg border" style={{ borderColor: "var(--line)" }} />
        <img src="/guia/google-aviso-2.svg" alt="Link Acessar Candidata.ai destacado" className="rounded-lg border" style={{ borderColor: "var(--line)" }} />
      </figure>
      <p className="muted text-sm">Você pode desconectar quando quiser aqui em Configurações, e isso apaga o acesso na hora.</p>
      <div className="flex gap-2"><a className="btn btn-primary" href={href}>Entendi, continuar</a><button className="btn btn-ghost" onClick={onClose}>Cancelar</button></div>
    </div>
  );
}
function Num({ label, v, on, min, max }: { label: string; v: number; on: (v: number) => void; min: number; max: number }) {
  return <div><label className="label">{label}</label><input className="field" type="number" min={min} max={max} value={v} onChange={(e) => on(Number(e.target.value))} /></div>;
}
function Hour({ label, v, on }: { label: string; v: number; on: (v: number) => void }) {
  return <div><label className="label">{label}</label><select className="field" value={v} onChange={(e) => on(Number(e.target.value))}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}h</option>)}</select></div>;
}
