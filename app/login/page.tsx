"use client";
import Link from "next/link";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Notice } from "@/components/ui";

export default function Login() {
  const sb = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [msg, setMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

  const oauth = (provider: "google" | "azure") =>
    sb.auth.signInWithOAuth({ provider, options: { redirectTo, scopes: provider === "azure" ? "email" : undefined } });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = mode === "entrar"
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
    if (r.error) return setMsg({ tone: "error", text: r.error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : r.error.message });
    if (mode === "criar" && !r.data.session) return setMsg({ tone: "ok", text: "Enviamos um link de confirmação para o seu e-mail." });
    window.location.href = "/";
  }

  return (
    <div className="max-w-md mx-auto pt-10">
      <h1 className="text-4xl font-bold">Candidata.ai</h1>
      <p className="muted mt-2 mb-8">Encontre vagas, gere candidaturas fiéis ao seu currículo e envie pelo seu próprio e-mail.</p>
      <div className="surface p-6 space-y-3">
        <button className="btn btn-ghost w-full" onClick={() => oauth("google")}>Entrar com Google</button>
        <button className="btn btn-ghost w-full" onClick={() => oauth("azure")}>Entrar com Microsoft</button>
        <div className="muted text-center text-sm py-1">ou com e-mail e senha</div>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label" htmlFor="em">E-mail</label><input id="em" className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label className="label" htmlFor="pw">Senha</label><input id="pw" className="field" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <button className="btn btn-primary w-full" type="submit">{mode === "entrar" ? "Entrar" : "Criar conta"}</button>
        </form>
        <button className="text-sm underline" onClick={() => setMode(mode === "entrar" ? "criar" : "entrar")}>
          {mode === "entrar" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      </div>
      <p className="muted text-sm mt-4">Ao continuar você concorda com os <Link className="underline" href="/termos">Termos de uso</Link> e a <Link className="underline" href="/privacidade">Política de privacidade</Link>.</p>
    </div>
  );
}
