"use client";
import Link from "next/link";
import { useState } from "react";
import { api, Notice, PageTitle } from "@/components/ui";
import type { Settings } from "@/lib/settings";

const LABEL: Record<string, string> = { rascunho_criado: "Rascunho criado", agendado: "Agendado", enviando: "Enviando", enviado: "Enviado", erro: "Erro", cancelado: "Cancelado" };
const COLOR: Record<string, string> = { enviado: "#1F7A55", rascunho_criado: "#3B4C80", agendado: "#6B4FB3", erro: "#B3261E", cancelado: "var(--muted)", enviando: "#B7791F" };

export function EnviosClient({ ready, queue, accounts, settings }: { ready: any[]; queue: any[]; accounts: any[]; settings: Settings }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [acc, setAcc] = useState(accounts[0]?.id ?? "");
  const [mode, setMode] = useState<"rascunho" | "agendado">("rascunho");
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [win, setWin] = useState<1 | 2>(1);
  const [confirmAuto, setConfirmAuto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ ok: boolean; message: string; title: string }[]>([]);
  const [err, setErr] = useState("");

  async function go() {
    setBusy(true); setErr(""); setResults([]);
    try {
      const r = await api("/api/send", { method: "POST", json: { userJobIds: [...sel], accountId: acc, mode, day, window: win, confirmAuto } });
      setResults(r.results.map((x: any) => ({ ...x, title: ready.find((j) => j.id === x.userJobId)?.jobs.title })));
      setSel(new Set());
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  const act = async (id: string, json: unknown) => { try { await api(`/api/queue/${id}`, { method: "PATCH", json }); location.reload(); } catch (e) { setErr((e as Error).message); } };

  return (
    <>
      <PageTitle title="Envios">Envie várias candidaturas de uma vez e acompanhe a fila.</PageTitle>

      <section className="surface p-6 mb-8 space-y-4">
        <h2 className="text-xl font-bold">Prontas para enviar</h2>
        {ready.length === 0 ? <p className="muted">Nenhuma candidatura gerada com e-mail de RH. <Link className="underline" href="/busca">Buscar vagas</Link>.</p> : (
          <>
            <ul className="space-y-1">
              {ready.map((r) => (
                <li key={r.id}><label className="flex gap-2 items-center"><input type="checkbox" checked={sel.has(r.id)} onChange={() => setSel((s) => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })} /><Link className="hover:underline" href={`/vagas/${r.id}`}>{r.jobs.title}</Link><span className="muted text-sm">{r.jobs.company} · {r.jobs.hr_email}</span></label></li>
              ))}
            </ul>
            {accounts.length === 0 ? <Notice><Link className="underline font-bold" href="/configuracoes">Conecte seu Gmail ou Outlook</Link> para enviar em lote.</Notice> : (
              <div className="flex flex-wrap gap-3 items-end">
                <div><label className="label">Conta</label><select className="field" value={acc} onChange={(e) => setAcc(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.email}</option>)}</select></div>
                <div><label className="label">Como</label><select className="field" value={mode} onChange={(e) => setMode(e.target.value as any)}><option value="rascunho">Criar rascunhos</option><option value="agendado">Agendar envio</option></select></div>
                {mode === "agendado" && <>
                  <div><label className="label">Dia</label><input className="field" type="date" value={day} onChange={(e) => setDay(e.target.value)} /></div>
                  <div><label className="label">Janela</label><select className="field" value={win} onChange={(e) => setWin(Number(e.target.value) as 1 | 2)}><option value={1}>{settings.send_hour_1}h</option><option value={2}>{settings.send_hour_2}h</option></select></div>
                </>}
                <button className="btn btn-primary" disabled={!sel.size || busy || (mode === "agendado" && !settings.auto_send_enabled && !confirmAuto)} onClick={go}>{mode === "rascunho" ? `Criar ${sel.size} rascunho(s)` : `Agendar ${sel.size} envio(s)`}</button>
              </div>
            )}
            {mode === "agendado" && !settings.auto_send_enabled && (
              <label className="flex gap-2 items-start text-sm"><input type="checkbox" className="mt-1" checked={confirmAuto} onChange={(e) => setConfirmAuto(e.target.checked)} />Confirmo que a plataforma pode enviar esses e-mails sozinha, pela minha conta, na janela escolhida.</label>
            )}
          </>
        )}
        {err && <Notice tone="error">{err}</Notice>}
        {results.length > 0 && <ul className="text-sm space-y-1">{results.map((r, i) => <li key={i} style={{ color: r.ok ? "#1F7A55" : "#B3261E" }}>{r.title}: {r.message}</li>)}</ul>}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">Fila e histórico</h2>
        {queue.length === 0 ? <p className="muted">Nada na fila ainda.</p> : (
          <ul className="surface divide-y" style={{ borderColor: "var(--line)" }}>
            {queue.map((q) => (
              <li key={q.id} className="p-4 flex flex-wrap justify-between gap-3" style={{ borderColor: "var(--line)" }}>
                <div>
                  <div className="font-bold">{q.user_jobs?.jobs?.title}</div>
                  <div className="muted text-sm">{q.to_email}{q.run_at && ` · ${new Date(q.run_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`}</div>
                  {q.last_error && <div className="text-sm" style={{ color: "#B3261E" }}>{q.last_error}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="stamp" style={{ color: COLOR[q.status] }}>{LABEL[q.status] ?? q.status}</span>
                  {["agendado", "erro"].includes(q.status) && <>
                    <button className="text-sm underline" onClick={() => act(q.id, { action: "reagendar", day: new Date(Date.now() + 864e5).toISOString().slice(0, 10), window: 1 })}>Mover para amanhã {settings.send_hour_1}h</button>
                    <button className="text-sm underline" onClick={() => act(q.id, { action: "cancelar" })}>Cancelar</button>
                  </>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
