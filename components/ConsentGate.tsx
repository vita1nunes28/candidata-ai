"use client";
import Link from "next/link";
import { useState } from "react";
import { api, Notice } from "./ui";

/** Primeiro acesso: consentimento explícito (LGPD) antes de usar a plataforma. */
export function ConsentGate() {
  const [termos, setTermos] = useState(false);
  const [ia, setIa] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="surface p-6 space-y-4 max-w-2xl">
      <h2 className="text-2xl font-bold">Antes de começar</h2>
      <p>Para funcionar, a plataforma guarda seu currículo e suas candidaturas. Leia e confirme:</p>
      <label className="flex gap-3 items-start">
        <input type="checkbox" className="mt-1.5" checked={termos} onChange={(e) => setTermos(e.target.checked)} />
        <span>Li e aceito os <Link className="underline" href="/termos" target="_blank">Termos de uso</Link> e a <Link className="underline" href="/privacidade" target="_blank">Política de privacidade</Link>.</span>
      </label>
      <label className="flex gap-3 items-start">
        <input type="checkbox" className="mt-1.5" checked={ia} onChange={(e) => setIa(e.target.checked)} />
        <span>
          Entendo que o texto do currículo e das vagas é processado pela IA do Google (Gemini, camada gratuita), que pode usar esse conteúdo para melhorar os produtos dela.
          Contato, salário e dados de diversidade <strong>nunca</strong> são enviados à IA.
        </span>
      </label>
      {err && <Notice tone="error">{err}</Notice>}
      <button
        className="btn btn-primary"
        disabled={!termos || !ia}
        onClick={async () => {
          try {
            await api("/api/consent", { method: "POST", json: { kinds: ["termos", "ia"] } });
            location.reload();
          } catch (e) {
            setErr((e as Error).message);
          }
        }}
      >
        Aceitar e continuar
      </button>
    </div>
  );
}
