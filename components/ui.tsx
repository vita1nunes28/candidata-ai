"use client";
import { useState } from "react";

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "ok"; children: React.ReactNode }) {
  const styles = {
    info: { background: "color-mix(in srgb, var(--ink) 10%, var(--surface))", borderColor: "color-mix(in srgb, var(--ink) 35%, transparent)" },
    warn: { background: "color-mix(in srgb, #B7791F 14%, var(--surface))", borderColor: "#B7791F" },
    error: { background: "color-mix(in srgb, #B3261E 12%, var(--surface))", borderColor: "#B3261E" },
    ok: { background: "color-mix(in srgb, #1F7A55 12%, var(--surface))", borderColor: "#1F7A55" },
  }[tone];
  return <div role={tone === "error" ? "alert" : "status"} className="rounded-xl border px-4 py-3 text-[0.95rem]" style={styles}>{children}</div>;
}

export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost text-sm py-1"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Copiado" : label}
    </button>
  );
}

const STATUS: Record<string, { label: string; color: string }> = {
  resultado: { label: "Encontrada", color: "var(--muted)" },
  salva: { label: "Salva", color: "#3B4C80" },
  gerada: { label: "E-mail pronto", color: "#6B4FB3" },
  enviada: { label: "Enviada", color: "#1F7A55" },
  formulario: { label: "Formulário enviado", color: "#1F7A55" },
  resposta: { label: "Respondeu", color: "#B7791F" },
  descartada: { label: "Descartada", color: "var(--muted)" },
};
export function Stamp({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, color: "var(--muted)" };
  return <span className="stamp" style={{ color: s.color }}>{s.label}</span>;
}

export function FitBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="muted text-sm">sem nota</span>;
  const color = score >= 75 ? "#1F7A55" : score >= 50 ? "#B7791F" : "#B3261E";
  return <span className="font-bold tabular-nums" style={{ color }}>{score}<span className="muted font-normal text-sm">/100</span></span>;
}

export async function api<T = any>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.json ? { "Content-Type": "application/json" } : init?.headers,
    body: init?.json ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Algo deu errado. Tente de novo.");
  return data;
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-3xl md:text-4xl font-bold">{title}</h1>
      {children && <p className="muted mt-2 max-w-2xl">{children}</p>}
    </header>
  );
}
