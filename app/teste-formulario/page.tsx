"use client";
import { useState } from "react";

/** Formulário fictício (campos controlados em React) para testar a extensão. Nada é enviado. */
export default function Teste() {
  const [v, setV] = useState<Record<string, string>>({});
  const [file, setFile] = useState("");
  const [sent, setSent] = useState(false);
  const on = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  const filled = Object.values(v).filter(Boolean).length + (file ? 1 : 0);
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">Vaga de exemplo: Analista de Dados Pleno</h1>
      <p className="muted mt-2 mb-6">Empresa Fictícia S.A. · Remoto. Esta página serve só para testar a extensão: abra o ícone da Candidata.ai e clique em “Preencher este formulário”.</p>
      <article className="surface p-5 mb-6 text-sm" id="job-description">
        <h2 className="font-bold mb-2">Sobre a vaga</h2>
        <p>Buscamos analista de dados para construir dashboards e modelos de atribuição de mídia paga. Requisitos: SQL, Python, Google Analytics 4, experiência com Google Ads e Meta Ads. Diferencial: dbt e BigQuery.</p>
        <p className="mt-2">Perguntas de triagem: Você já trabalhou com modelos de atribuição? Descreva um projeto.</p>
      </article>
      <form className="surface p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label" htmlFor="fn">Nome</label><input id="fn" name="firstName" className="field" value={v.fn ?? ""} onChange={on("fn")} /></div>
          <div><label className="label" htmlFor="ln">Sobrenome</label><input id="ln" name="lastName" className="field" value={v.ln ?? ""} onChange={on("ln")} /></div>
          <div><label className="label" htmlFor="em">E-mail</label><input id="em" type="email" name="email" className="field" value={v.em ?? ""} onChange={on("em")} /></div>
          <div><label className="label" htmlFor="ph">Celular</label><input id="ph" type="tel" className="field" placeholder="(21) 99999-9999" value={v.ph ?? ""} onChange={on("ph")} /></div>
          <div><label className="label" htmlFor="li">Perfil do LinkedIn</label><input id="li" className="field" value={v.li ?? ""} onChange={on("li")} /></div>
          <div><label className="label" htmlFor="ct">Cidade onde mora</label><input id="ct" className="field" value={v.ct ?? ""} onChange={on("ct")} /></div>
          <div><label className="label" htmlFor="sal">Pretensão salarial (CLT)</label><input id="sal" className="field" value={v.sal ?? ""} onChange={on("sal")} /></div>
          <div><label className="label" htmlFor="gen">Gênero</label><select id="gen" className="field" value={v.gen ?? ""} onChange={on("gen")}><option value="">Selecione</option><option>Mulher</option><option>Homem</option><option>Não binário</option><option>Prefiro não informar</option></select></div>
        </div>
        <fieldset><legend className="label">Aceita mudança de cidade?</legend>
          <label className="mr-4"><input type="radio" name="reloc" value="Sim" checked={v.reloc === "Sim"} onChange={on("reloc")} /> Sim</label>
          <label><input type="radio" name="reloc" value="Não" checked={v.reloc === "Não"} onChange={on("reloc")} /> Não</label>
        </fieldset>
        <div><label className="label" htmlFor="cv">Currículo</label><input id="cv" type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />{file && <p className="text-sm mt-1">Anexado: {file}</p>}</div>
        <div><label className="label" htmlFor="why">Por que você quer trabalhar na Empresa Fictícia?</label><textarea id="why" maxLength={500} className="field min-h-24" value={v.why ?? ""} onChange={on("why")} /></div>
        <div><label className="label" htmlFor="attr">Você já trabalhou com modelos de atribuição? Descreva um projeto.</label><textarea id="attr" maxLength={800} className="field min-h-24" value={v.attr ?? ""} onChange={on("attr")} /></div>
        <p className="muted text-sm">Campos preenchidos que o site reconheceu: {filled}</p>
        <button className="btn btn-primary" type="submit">Enviar candidatura</button>
        {sent && <p style={{ color: "#1F7A55" }} className="font-bold">Teste concluído. Nada foi enviado de verdade.</p>}
      </form>
    </div>
  );
}
