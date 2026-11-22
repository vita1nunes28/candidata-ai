"use client";
import { useEffect, useState } from "react";
import { api, Notice, PageTitle } from "@/components/ui";

type Exp = { company: string; role: string; start?: string | null; end?: string | null; achievements: string[] };
type P = Record<string, any>;
const EMPTY: P = { experiences: [], education: [], skills: [], tools: [], languages: [], certifications: [], links: {}, work_modes: [], diversity: {} };
const NAO = "Prefiro não informar";

export default function Perfil() {
  const [p, setP] = useState<P>(EMPTY);
  const [cvs, setCvs] = useState<any[]>([]);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [cvConsent, setCvConsent] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "error" | "warn"; text: string } | null>(null);

  const load = async () => {
    const [{ profile }, { cvs }] = await Promise.all([api("/api/profile"), api("/api/cv")]);
    if (profile) { setP({ ...EMPTY, ...profile }); setConfirmed(profile.confirmed_at); }
    setCvs(cvs);
  };
  useEffect(() => { load().catch(() => {}); }, []);
  const set = (k: string, v: unknown) => setP((x) => ({ ...x, [k]: v }));

  async function upload(file: File, label: string) {
    setBusy("Lendo o currículo…"); setMsg(null);
    try {
      if (cvConsent) await api("/api/consent", { method: "POST", json: { kinds: ["cv"] } });
      const fd = new FormData(); fd.append("file", file); fd.append("label", label);
      const r = await fetch("/api/cv", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      // o rascunho só preenche o que estiver vazio; nada é salvo até você confirmar
      setP((x) => ({ ...EMPTY, ...data.draft, ...Object.fromEntries(Object.entries(x).filter(([, v]) => v != null && !(Array.isArray(v) && !v.length) && !(typeof v === "object" && !Array.isArray(v) && !Object.keys(v as object).length))) }));
      setMsg({ tone: "warn", text: "Pronto. Revise cada campo abaixo e clique em “Confirmar perfil”. Nada é usado antes disso." });
      setCvs((await api("/api/cv")).cvs);
    } catch (e) { setMsg({ tone: "error", text: (e as Error).message }); }
    setBusy("");
  }

  async function save() {
    setBusy("Salvando…");
    try {
      const clean: P = { ...p, salary_clt: p.salary_clt ? Number(p.salary_clt) : null, salary_pj: p.salary_pj ? Number(p.salary_pj) : null, email: p.email || null };
      delete clean.user_id; delete clean.confirmed_at; delete clean.updated_at;
      await api("/api/profile", { method: "PUT", json: clean });
      setConfirmed(new Date().toISOString());
      setMsg({ tone: "ok", text: "Perfil confirmado. Agora você pode buscar vagas e gerar candidaturas." });
    } catch (e) { setMsg({ tone: "error", text: (e as Error).message }); }
    setBusy("");
  }

  return (
    <>
      <PageTitle title="Perfil e CV">A plataforma lê seu currículo e monta o perfil. Você revisa tudo antes de qualquer uso.</PageTitle>

      <section className="surface p-6 mb-6 space-y-4">
        <h2 className="text-xl font-bold">Currículos</h2>
        {cvs.length > 0 && (
          <ul className="space-y-2">
            {cvs.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3">
                <span className="font-bold">{c.label}</span><span className="muted text-sm">{c.file_name}</span>
                {c.is_default ? <span className="stamp" style={{ color: "#1F7A55" }}>Padrão</span> :
                  <button className="text-sm underline" onClick={async () => { await api("/api/cv", { method: "PATCH", json: { id: c.id, makeDefault: true } }); load(); }}>Usar como padrão</button>}
                <button className="text-sm underline" onClick={async () => { if (confirm("Apagar este currículo?")) { await api(`/api/cv?id=${c.id}`, { method: "DELETE" }); load(); } }}>Apagar</button>
              </li>
            ))}
          </ul>
        )}
        <UploadForm onUpload={upload} consent={cvConsent} setConsent={setCvConsent} busy={!!busy} hasCv={cvs.length > 0} />
        <p className="muted text-sm">Dica: tenha uma versão por área (ex.: “Dados” e “Marketing”) e escolha qual anexar em cada vaga.</p>
      </section>

      {msg && <div className="mb-6"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
      {busy && <div className="mb-6"><Notice>{busy}</Notice></div>}

      <section className="surface p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl font-bold">Revisão do perfil</h2>
          {confirmed ? <span className="stamp" style={{ color: "#1F7A55" }}>Confirmado</span> : <span className="stamp" style={{ color: "#B7791F" }}>Aguardando confirmação</span>}
        </div>

        <Group title="Dados e contato">
          <Text label="Nome completo" v={p.full_name} on={(v) => set("full_name", v)} />
          <Text label="E-mail" v={p.email} on={(v) => set("email", v)} type="email" />
          <Text label="Telefone" v={p.phone} on={(v) => set("phone", v)} />
          <Text label="Cidade" v={p.city} on={(v) => set("city", v)} />
          <Text label="LinkedIn" v={p.links?.linkedin} on={(v) => set("links", { ...p.links, linkedin: v })} />
          <Text label="Portfólio" v={p.links?.portfolio} on={(v) => set("links", { ...p.links, portfolio: v })} />
          <Text label="GitHub" v={p.links?.github} on={(v) => set("links", { ...p.links, github: v })} />
        </Group>

        <div><label className="label">Resumo profissional</label><textarea className="field min-h-24" value={p.summary ?? ""} onChange={(e) => set("summary", e.target.value)} /></div>

        <div className="space-y-3">
          <h3 className="font-bold text-lg">Experiências</h3>
          {(p.experiences as Exp[]).map((x, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--line)" }}>
              <div className="grid sm:grid-cols-2 gap-3">
                <Text label="Empresa" v={x.company} on={(v) => upd(i, { company: v })} />
                <Text label="Cargo" v={x.role} on={(v) => upd(i, { role: v })} />
                <Text label="Início" v={x.start} on={(v) => upd(i, { start: v })} />
                <Text label="Fim (ou “atual”)" v={x.end} on={(v) => upd(i, { end: v })} />
              </div>
              <label className="label">Conquistas (uma por linha)</label>
              <textarea className="field min-h-20" value={x.achievements.join("\n")} onChange={(e) => upd(i, { achievements: e.target.value.split("\n") })} />
              <button className="text-sm underline" onClick={() => set("experiences", p.experiences.filter((_: Exp, j: number) => j !== i))}>Remover experiência</button>
            </div>
          ))}
          <button className="btn btn-ghost text-sm" onClick={() => set("experiences", [...p.experiences, { company: "", role: "", achievements: [] }])}>Adicionar experiência</button>
        </div>

        <Group title="Formação, habilidades e idiomas">
          <List label="Formação (instituição — curso, uma por linha)" v={p.education.map((e: any) => `${e.institution} — ${e.course}`)} on={(arr) => set("education", arr.map((l) => { const [institution, course = ""] = l.split(" — "); return { institution, course }; }))} />
          <List label="Habilidades (separadas por vírgula)" comma v={p.skills} on={(v) => set("skills", v)} />
          <List label="Ferramentas (separadas por vírgula)" comma v={p.tools} on={(v) => set("tools", v)} />
          <List label="Idiomas (idioma — nível, um por linha)" v={p.languages.map((l: any) => `${l.language}${l.level ? ` — ${l.level}` : ""}`)} on={(arr) => set("languages", arr.map((l) => { const [language, level = null] = l.split(" — "); return { language, level }; }))} />
          <List label="Certificações (uma por linha)" v={p.certifications} on={(v) => set("certifications", v)} />
        </Group>

        <Group title="Preferências (o currículo não traz; preencha uma vez)">
          <Text label="Pretensão CLT (R$/mês)" v={p.salary_clt} on={(v) => set("salary_clt", v.replace(/\D/g, ""))} />
          <Text label="Pretensão PJ (R$/mês)" v={p.salary_pj} on={(v) => set("salary_pj", v.replace(/\D/g, ""))} />
          <Text label="Disponibilidade para início" v={p.availability} on={(v) => set("availability", v)} placeholder="Ex.: imediata, 30 dias" />
          <Text label="Autorização de trabalho" v={p.work_authorization} on={(v) => set("work_authorization", v)} placeholder="Ex.: brasileiro(a), sem restrições" />
          <fieldset>
            <legend className="label">Modalidades aceitas</legend>
            <div className="flex gap-4">
              {["presencial", "hibrido", "remoto"].map((m) => (
                <label key={m} className="flex gap-2 items-center"><input type="checkbox" checked={p.work_modes.includes(m)} onChange={(e) => set("work_modes", e.target.checked ? [...p.work_modes, m] : p.work_modes.filter((x: string) => x !== m))} />{m === "hibrido" ? "híbrido" : m}</label>
              ))}
            </div>
          </fieldset>
          <Select label="Aceita mudança de cidade?" v={p.accepts_relocation == null ? "" : p.accepts_relocation ? "sim" : "nao"} opts={[["", NAO], ["sim", "Sim"], ["nao", "Não"]]} on={(v) => set("accepts_relocation", v === "" ? null : v === "sim")} />
        </Group>

        <Group title="Diversidade (opcional)">
          <p className="muted text-sm sm:col-span-2">Usado só para responder formulários que perguntam. Nunca vai para a IA.</p>
          <Select label="Gênero" v={p.diversity.gender ?? ""} opts={[["", NAO], ["Mulher", "Mulher"], ["Homem", "Homem"], ["Não binário", "Não binário"], ["Outro", "Outro"]]} on={(v) => set("diversity", { ...p.diversity, gender: v || null })} />
          <Select label="Raça/cor (IBGE)" v={p.diversity.race ?? ""} opts={[["", NAO], ["Branca", "Branca"], ["Preta", "Preta"], ["Parda", "Parda"], ["Amarela", "Amarela"], ["Indígena", "Indígena"]]} on={(v) => set("diversity", { ...p.diversity, race: v || null })} />
          <Select label="Pessoa com deficiência" v={p.diversity.pcd ?? ""} opts={[["", NAO], ["Sim", "Sim"], ["Não", "Não"]]} on={(v) => set("diversity", { ...p.diversity, pcd: v || null })} />
        </Group>

        <button className="btn btn-primary" onClick={save} disabled={!!busy || !p.full_name}>Confirmar perfil</button>
      </section>
    </>
  );

  function upd(i: number, patch: Partial<Exp>) {
    set("experiences", p.experiences.map((x: Exp, j: number) => (j === i ? { ...x, ...patch } : x)));
  }
}

function UploadForm({ onUpload, consent, setConsent, busy, hasCv }: { onUpload: (f: File, l: string) => void; consent: boolean; setConsent: (b: boolean) => void; busy: boolean; hasCv: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState(hasCv ? "" : "Principal");
  return (
    <div className="grid sm:grid-cols-[1fr_12rem_auto] gap-3 items-end">
      <div><label className="label" htmlFor="cv">Arquivo (PDF ou DOCX, até 5 MB)</label><input id="cv" className="field" type="file" accept=".pdf,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
      <div><label className="label" htmlFor="lb">Nome desta versão</label><input id="lb" className="field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Dados" /></div>
      <button className="btn btn-primary" disabled={!file || !consent || busy || !label} onClick={() => file && onUpload(file, label)}>Enviar currículo</button>
      <label className="flex gap-2 items-start sm:col-span-3 text-sm">
        <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        Autorizo guardar este currículo para montar meu perfil e anexá-lo às minhas candidaturas. Posso apagar quando quiser.
      </label>
    </div>
  );
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h3 className="font-bold text-lg mb-3">{title}</h3><div className="grid sm:grid-cols-2 gap-3">{children}</div></div>;
}
function Text({ label, v, on, type = "text", placeholder }: { label: string; v: any; on: (v: string) => void; type?: string; placeholder?: string }) {
  return <div><label className="label">{label}</label><input className="field" type={type} value={v ?? ""} placeholder={placeholder} onChange={(e) => on(e.target.value)} /></div>;
}
function Select({ label, v, opts, on }: { label: string; v: string; opts: [string, string][]; on: (v: string) => void }) {
  return <div><label className="label">{label}</label><select className="field" value={v} onChange={(e) => on(e.target.value)}>{opts.map(([val, l]) => <option key={val} value={val}>{l}</option>)}</select></div>;
}
function List({ label, v, on, comma }: { label: string; v: string[]; on: (v: string[]) => void; comma?: boolean }) {
  const sep = comma ? ", " : "\n";
  return (
    <div className={comma ? "" : "sm:col-span-2"}>
      <label className="label">{label}</label>
      <textarea className="field min-h-16" defaultValue={(v ?? []).join(sep)} key={(v ?? []).join("|")} onBlur={(e) => on(e.target.value.split(comma ? "," : "\n").map((s) => s.trim()).filter(Boolean))} />
    </div>
  );
}
