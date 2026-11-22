"use client";
import { useState } from "react";
import { api, Notice, PageTitle } from "@/components/ui";

/** Gera o token e entrega para a extensão via postMessage (a extensão escuta nesta página). */
export default function Conectar() {
  const [state, setState] = useState<"idle" | "ok" | "noext" | "error">("idle");
  const [err, setErr] = useState("");
  async function connect() {
    if (!document.documentElement.dataset.candidataExt) return setState("noext");
    try {
      const { token } = await api("/api/ext/connect", { method: "POST" });
      const done = new Promise<boolean>((resolve) => {
        const h = (e: MessageEvent) => { if (e.source === window && e.data?.type === "CANDIDATA_TOKEN_OK") { window.removeEventListener("message", h); resolve(true); } };
        window.addEventListener("message", h);
        setTimeout(() => resolve(false), 4000);
      });
      window.postMessage({ type: "CANDIDATA_TOKEN", token, apiBase: location.origin }, location.origin);
      setState((await done) ? "ok" : "noext");
    } catch (e) { setErr((e as Error).message); setState("error"); }
  }
  return (
    <>
      <PageTitle title="Conectar a extensão">Liga a extensão à sua conta. Nenhuma senha ou chave de IA fica na extensão.</PageTitle>
      <div className="surface p-6 space-y-4 max-w-xl">
        <button className="btn btn-primary" onClick={connect}>Conectar minha conta</button>
        {state === "ok" && <Notice tone="ok">Extensão conectada. <a className="underline font-bold" href="/teste-formulario" target="_blank">Testar numa vaga de exemplo</a>.</Notice>}
        {state === "noext" && <Notice tone="warn">Não encontrei a extensão neste navegador. Termine a instalação em “Instalar extensão” e recarregue esta página.</Notice>}
        {state === "error" && <Notice tone="error">{err}</Notice>}
      </div>
    </>
  );
}
