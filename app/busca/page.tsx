"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, FitBadge, Notice, PageTitle, Stamp } from "@/components/ui";

type Item = { id: string; status: string; fit_score: number | null; fit_reason: string | null; jobs: any };
const MODES: Record<string, string> = { presencial: "Presencial", hibrido: "Híbrido", remoto: "Remoto" };

export default function Busca() {
  const router = useRouter();
  const [kw, setKw] = useState("");
  const [f, setF] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Item[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "error" | "warn" | "info"; text: string } | null>(null);
  const [url, setUrl] = useState("");
  const [manual, setManual] = useState(false);
  const [man, setMan] = useState({ title: "", company: "", url: "", description: "" });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const keywords = kw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!keywords.length) return;
    setBusy("Buscando vagas e calculando aderência…"); setMsg(null); setSel(new Set());
    try {
      const r = await api("/api/jobs/search", { method: "POST", json: { keywords, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), maxAgeDays: f.maxAgeDays ? Number(f.maxAgeDays) : undefined } });
      setItems(r.items);
      setMsg(r.notice ? { tone: "warn", text: r.notice } : r.items.length ? null : { tone: "info", text: "Nenhuma vaga encontrada. Tente menos filtros ou outros cargos, ou importe uma vaga pelo link." });
    } catch (e) { setMsg({ tone: "error", text: (e as Error).message }); }
    setBusy("");
  }

  async function importJob() {
    setBusy("Importando vaga…"); setMsg(null);
    try {
      const r = await api("/api/jobs/import", { method: "POST", json: manual ? { manual: man } : { url } });
      router.push(`/vagas/${r.userJobId}`);
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
      setBusy("");
    }
  }

  async function batch(status: string) {
    const ids = [...sel];
    await api(`/api/jobs/${ids.join(",")}`, { method: "PATCH", json: { status } });
    setItems((x) => x.map((i) => (sel.has(i.id) ? { ...i, status } : i)));
    setSel(new Set());
  }

  async function generateAll() {
    const ids = [...sel];
    for (let i = 0; i < ids.length; i++) {
      setBusy(`Gerando candidatura ${i + 1} de ${ids.length}…`);
      try {
        await api("/api/generate", { method: "POST", json: { userJobId: ids[i] } });
        setItems((x) => x.map((it) => (it.id === ids[i] ? { ...it, status: "gerada" } : it)));
      } catch (e) {
        setMsg({ tone: "error", text: (e as Error).message });
        break;
      }
    }
    setBusy(""); setSel(new Set());
    setMsg((m) => m ?? { tone: "ok", text: "Candidaturas geradas. Abra cada vaga para revisar, ou vá em Envios para enviar em lote." });
  }

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <>
      <PageTitle title="Buscar vagas">Fontes oficiais (Adzuna, Greenhouse e Lever) e importação por link para Gupy e páginas de carreira.</PageTitle>

      <form onSubmit={search} className="surface p-6 space-y-4 mb-6">
        <div><label className="label" htmlFor="kw">Cargos (separe por vírgula)</label><input id="kw" className="field" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="Ex.: analista de dados, growth" /></div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><label className="label">Local</label><input className="field" value={f.location ?? ""} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Ex.: Rio de Janeiro" /></div>
          <Sel label="Modalidade" v={f.mode} on={(v) => setF({ ...f, mode: v })} opts={[["", "Qualquer"], ["remoto", "Remoto"], ["hibrido", "Híbrido"], ["presencial", "Presencial"]]} />
          <Sel label="Senioridade" v={f.seniority} on={(v) => setF({ ...f, seniority: v })} opts={[["", "Qualquer"], ["estagio", "Estágio"], ["junior", "Júnior"], ["pleno", "Pleno"], ["senior", "Sênior"], ["lideranca", "Liderança"]]} />
          <Sel label="Idioma da vaga" v={f.language} on={(v) => setF({ ...f, language: v })} opts={[["", "Qualquer"], ["pt", "Português"], ["en", "Inglês"]]} />
          <Sel label="Publicada há" v={f.maxAgeDays} on={(v) => setF({ ...f, maxAgeDays: v })} opts={[["", "Qualquer data"], ["3", "3 dias"], ["7", "7 dias"], ["15", "15 dias"], ["30", "30 dias"]]} />
        </div>
        <button className="btn btn-primary" disabled={!!busy}>Buscar</button>
        <p className="muted text-sm">Para buscar vagas de empresas específicas no Greenhouse e Lever, cadastre-as em <Link className="underline" href="/configuracoes">Configurações</Link>.</p>
        <Notice>
          Poucas vagas aqui? A Adzuna cobre pouco o Brasil.{" "}
          {isMobile ? (
            <>Pelo computador, você pode ativar em <Link className="underline" href="/configuracoes">Configurações</Link> a busca em LinkedIn, Gupy, Catho, InfoJobs e Vagas.com com a extensão — esse recurso não existe no celular. Por aqui, use a importação por link logo abaixo.</>
          ) : (
            <>Em <Link className="underline" href="/configuracoes">Configurações</Link>, ative a busca em LinkedIn, Gupy, Catho, InfoJobs e Vagas.com: você pesquisa normalmente, logada, nessas plataformas, e a extensão avisa e importa as vagas que encontrar pra cá, com nota de aderência.</>
          )}
        </Notice>
      </form>

      <details className="surface p-6 mb-6">
        <summary className="font-bold cursor-pointer">Importar uma vaga pelo link (Gupy, página de carreiras)</summary>
        <div className="mt-4 space-y-3">
          <Notice>Vagas da Gupy entram colando o link da vaga. A busca automática usa só fontes com API oficial. LinkedIn e Indeed não permitem leitura automática: para elas, cole a descrição manualmente.</Notice>
          {!manual ? (
            <div className="flex gap-2 flex-wrap"><input className="field flex-1 min-w-60" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://empresa.gupy.io/jobs/..." /><button className="btn btn-primary" disabled={!url || !!busy} onClick={importJob}>Importar</button></div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="field" placeholder="Título da vaga" value={man.title} onChange={(e) => setMan({ ...man, title: e.target.value })} />
              <input className="field" placeholder="Empresa" value={man.company} onChange={(e) => setMan({ ...man, company: e.target.value })} />
              <input className="field sm:col-span-2" placeholder="Link da vaga" value={man.url} onChange={(e) => setMan({ ...man, url: e.target.value })} />
              <textarea className="field sm:col-span-2 min-h-32" placeholder="Cole aqui a descrição completa" value={man.description} onChange={(e) => setMan({ ...man, description: e.target.value })} />
              <button className="btn btn-primary w-fit" disabled={!!busy} onClick={importJob}>Salvar vaga</button>
            </div>
          )}
          <button className="text-sm underline" onClick={() => setManual(!manual)}>{manual ? "Importar pelo link" : "Colar a descrição manualmente"}</button>
        </div>
      </details>

      {busy && <div className="mb-4"><Notice>{busy}</Notice></div>}
      {msg && <div className="mb-4"><Notice tone={msg.tone}>{msg.text}</Notice></div>}

      {items.length > 0 && (
        <div className="sticky top-0 z-10 py-3 mb-3 flex flex-wrap gap-2 items-center" style={{ background: "var(--bg)" }}>
          <label className="flex gap-2 items-center text-sm mr-2"><input type="checkbox" checked={sel.size === items.length} onChange={(e) => setSel(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())} />Selecionar todas</label>
          <span className="muted text-sm mr-2">{sel.size} selecionada(s)</span>
          <button className="btn btn-ghost text-sm" disabled={!sel.size} onClick={() => batch("salva")}>Salvar</button>
          <button className="btn btn-primary text-sm" disabled={!sel.size || !!busy} onClick={generateAll}>Gerar candidaturas</button>
          <button className="btn btn-ghost text-sm" disabled={!sel.size} onClick={() => batch("descartada")}>Descartar</button>
        </div>
      )}

      <ul className="space-y-3">
        {items.filter((i) => i.status !== "descartada").map((i) => {
          const j = i.jobs;
          return (
            <li key={i.id} className="surface p-5">
              <div className="flex gap-3">
                <input type="checkbox" className="mt-1.5" aria-label={`Selecionar ${j.title}`} checked={sel.has(i.id)} onChange={() => toggle(i.id)} />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <Link href={`/vagas/${i.id}`} className="font-bold text-lg hover:underline">{j.title}</Link>
                      <div className="muted text-sm">{[j.company, j.location, MODES[j.work_mode], j.posted_at && new Date(j.posted_at).toLocaleDateString("pt-BR")].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div className="text-right"><FitBadge score={i.fit_score} /><div><Stamp status={i.status} /></div></div>
                  </div>
                  {i.fit_reason && <p className="text-sm">{i.fit_reason}</p>}
                  <p className="text-sm">
                    {j.hr_email ? <>E-mail de RH: <strong>{j.hr_email}</strong> <span className="muted">(publicado na vaga)</span></> : <span className="muted">A empresa não publicou um e-mail de RH. Candidate-se pelo link.</span>}
                  </p>
                  <details><summary className="text-sm underline cursor-pointer">Ver descrição</summary><p className="whitespace-pre-line text-sm mt-2 max-h-80 overflow-auto">{j.description || "Descrição resumida na fonte; abra o link para ver completa."}</p></details>
                  <div className="flex gap-3 text-sm"><a className="underline" href={j.url} target="_blank" rel="noreferrer">Abrir na fonte ({j.source})</a><Link className="underline" href={`/vagas/${i.id}`}>Revisar candidatura</Link></div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Sel({ label, v, on, opts }: { label: string; v?: string; on: (v: string) => void; opts: [string, string][] }) {
  return <div><label className="label">{label}</label><select className="field" value={v ?? ""} onChange={(e) => on(e.target.value)}>{opts.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select></div>;
}
