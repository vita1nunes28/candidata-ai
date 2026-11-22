"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CopyButton, Notice, PageTitle } from "@/components/ui";

const STEPS = [
  { t: "Baixe a extensão", d: "Clique no botão abaixo. Um arquivo .zip vai para a sua pasta Downloads.", see: "O arquivo candidata-extensao.zip aparece nos downloads.", img: "/guia/passo-1.svg", download: true },
  { t: "Descompacte o arquivo", d: "Descompactar é transformar o .zip numa pasta comum.", see: "Uma pasta chamada candidata-extensao ao lado do .zip.", img: "/guia/passo-2.svg", os: true },
  { t: "Abra a página de extensões", d: "Copie o endereço abaixo, cole na barra de endereço do Chrome e aperte Enter.", see: "A página “Extensões” do Chrome.", img: "/guia/passo-3.svg", copy: "chrome://extensions" },
  { t: "Ative o “Modo do desenvolvedor”", d: "Clique na chave no canto superior direito. Esse modo só permite instalar extensões que não vêm da loja do Chrome.", see: "Aparecem três botões novos no topo, à esquerda.", img: "/guia/passo-4.svg" },
  { t: "Clique em “Carregar sem compactação”", d: "Na janela que abrir, escolha a PASTA candidata-extensao (a que você descompactou), não o arquivo .zip.", see: "O cartão “Candidata.ai” na lista de extensões.", img: "/guia/passo-5.svg" },
  { t: "Fixe a extensão e conecte sua conta", d: "Clique no ícone de quebra-cabeça no canto superior direito do Chrome e no alfinete ao lado de Candidata.ai. Depois clique no botão abaixo para conectar.", see: "O ícone da Candidata.ai fica sempre visível na barra.", img: "/guia/passo-6.svg", connect: true },
];

export default function Guia() {
  const [i, setI] = useState(0);
  const [os, setOs] = useState<"win" | "mac">("win");
  const [detected, setDetected] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(/Android|iPhone|iPad/i.test(navigator.userAgent));
    if (/Mac/i.test(navigator.platform)) setOs("mac");
    const check = () => setDetected(document.documentElement.dataset.candidataExt ?? null);
    check();
    const t = setInterval(check, 1500);
    return () => clearInterval(t);
  }, []);

  const s = STEPS[i];
  return (
    <>
      <PageTitle title="Instalar a extensão">A extensão preenche formulários de candidatura com um clique. Quem clica em enviar é sempre você.</PageTitle>
      {mobile && <div className="mb-6"><Notice tone="warn">A extensão funciona só no Chrome do computador. Abra esta página no computador para instalar.</Notice></div>}

      {detected ? (
        <section className="surface p-6 mb-6 space-y-3">
          <h2 className="text-2xl font-bold">✅ Tudo pronto!</h2>
          <p>A extensão (versão {detected}) está instalada. Se ainda não conectou sua conta, clique em “Conectar minha conta”.</p>
          <div className="flex gap-2 flex-wrap">
            <a className="btn btn-primary" href="/teste-formulario" target="_blank">Testar numa vaga de exemplo</a>
            <Link className="btn btn-ghost" href="/extensao/conectar">Conectar minha conta</Link>
          </div>
        </section>
      ) : (
        <section className="surface p-6 mb-6">
          <p className="muted text-sm mb-2" aria-live="polite">Passo {i + 1} de {STEPS.length}</p>
          <div className="h-1.5 rounded-full mb-5" style={{ background: "var(--line)" }}><div className="h-1.5 rounded-full" style={{ width: `${((i + 1) / STEPS.length) * 100}%`, background: "var(--ink)" }} /></div>
          <h2 className="text-2xl font-bold mb-2">{s.t}</h2>
          <p className="mb-4 max-w-2xl">{s.d}</p>
          {s.os && (
            <div className="mb-4">
              <div role="tablist" className="flex gap-2 mb-2">
                <button role="tab" aria-selected={os === "win"} className={`btn text-sm ${os === "win" ? "btn-primary" : "btn-ghost"}`} onClick={() => setOs("win")}>Windows</button>
                <button role="tab" aria-selected={os === "mac"} className={`btn text-sm ${os === "mac" ? "btn-primary" : "btn-ghost"}`} onClick={() => setOs("mac")}>Mac</button>
              </div>
              <p>{os === "win" ? "Abra a pasta Downloads, clique com o botão direito em candidata-extensao.zip e escolha “Extrair tudo…”. Depois clique em “Extrair”." : "Abra a pasta Downloads e dê dois cliques em candidata-extensao.zip. A pasta aparece ao lado."}</p>
            </div>
          )}
          {s.download && <a className="btn btn-primary mb-4" href="/candidata-extensao.zip" download>Baixar extensão (.zip)</a>}
          {s.copy && <div className="flex items-center gap-2 mb-4"><code className="surface px-3 py-2">{s.copy}</code><CopyButton text={s.copy} label="Copiar endereço" /></div>}
          {s.connect && <Link className="btn btn-primary mb-4" href="/extensao/conectar">Conectar minha conta</Link>}
          <img src={s.img} alt={`Ilustração: ${s.t}`} className="rounded-xl border w-full max-w-2xl" style={{ borderColor: "var(--line)" }} />
          <p className="mt-3"><strong>O que você deve ver:</strong> {s.see}</p>
          <div className="flex gap-2 mt-5">
            <button className="btn btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Voltar</button>
            <button className="btn btn-primary" disabled={i === STEPS.length - 1} onClick={() => setI(i + 1)}>Próximo</button>
          </div>
        </section>
      )}

      <section className="surface p-6 mb-6">
        <h2 className="text-xl font-bold mb-3">Vídeo</h2>
        {/* Para incorporar o vídeo: troque o parágrafo abaixo por <iframe src="https://www.youtube.com/embed/SEU_ID" ...> */}
        <div className="rounded-xl border-2 border-dashed p-8 text-center muted" style={{ borderColor: "var(--line)" }}>Vídeo curto do passo a passo em breve.</div>
      </section>

      <section className="surface p-6 mb-6 space-y-4">
        <h2 className="text-xl font-bold">Deu problema?</h2>
        <Faq q="Apareceu “Manifesto ausente” ou “Não foi possível carregar”">Você escolheu o arquivo .zip. Volte ao passo 2, descompacte e, no passo 5, selecione a <strong>pasta</strong> candidata-extensao.</Faq>
        <Faq q="Não acho o “Modo do desenvolvedor”">Confira se o endereço é exatamente chrome://extensions. A chave fica no canto superior direito; em janelas estreitas, aumente a janela. Em computadores de empresa, o administrador pode ter bloqueado.</Faq>
        <Faq q="O Chrome avisa sobre extensões no modo do desenvolvedor">É normal para extensões instaladas fora da loja. Pode fechar o aviso.</Faq>
        <Faq q="A extensão não aparece na barra">Clique no ícone de quebra-cabeça (canto superior direito) e no alfinete ao lado de Candidata.ai.</Faq>
      </section>

      <section id="atualizar" className="surface p-6 space-y-2">
        <h2 className="text-xl font-bold">Como atualizar</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Baixe a nova versão no passo 1.</li>
          <li>Descompacte e substitua a pasta candidata-extensao antiga pela nova (mesmo lugar).</li>
          <li>Em chrome://extensions, clique no botão de recarregar (seta circular) no cartão da Candidata.ai.</li>
        </ol>
      </section>
    </>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return <details><summary className="font-bold cursor-pointer">{q}</summary><p className="mt-2">{children}</p></details>;
}
