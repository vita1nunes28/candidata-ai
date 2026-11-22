import Link from "next/link";
import { ConsentGate } from "@/components/ConsentGate";
import { Notice, PageTitle, Stamp } from "@/components/ui";
import { env } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import { EXTENSION_VERSION } from "@/lib/version";
import { MarkReply } from "./MarkReply";

export const dynamic = "force-dynamic";

export default async function Home() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  const uid = auth.user!.id;
  const { count: consent } = await sb.from("consents").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("kind", "termos");
  if (!consent) return <><PageTitle title="Boas-vindas" /><ConsentGate /></>;

  const [{ data: profile }, { data: jobs }, { data: usage }, { data: ext }, { data: accounts }, { count: queued }] = await Promise.all([
    sb.from("profiles").select("confirmed_at, full_name").eq("user_id", uid).maybeSingle(),
    sb.from("user_jobs").select("id, status, applied_at, jobs(title, company, url)").eq("user_id", uid).neq("status", "resultado").order("created_at", { ascending: false }),
    sb.from("usage").select("generations, sends").eq("user_id", uid).eq("day", new Date().toISOString().slice(0, 10)).maybeSingle(),
    sb.from("ext_tokens").select("ext_version, last_seen").eq("user_id", uid).maybeSingle(),
    sb.from("email_accounts").select("email, status").eq("user_id", uid),
    sb.from("send_queue").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("status", "agendado"),
  ]);

  const list = jobs ?? [];
  const count = (...s: string[]) => list.filter((j) => s.includes(j.status)).length;
  const funnel = [
    { label: "Vagas salvas", value: list.filter((j) => j.status !== "descartada").length },
    { label: "E-mails enviados", value: count("enviada", "resposta") },
    { label: "Formulários preenchidos", value: count("formulario") },
    { label: "Respostas recebidas", value: count("resposta") },
  ];
  const max = Math.max(1, funnel[0].value);
  const revoked = (accounts ?? []).filter((a) => a.status !== "ok");
  const extOld = ext?.ext_version && ext.ext_version !== EXTENSION_VERSION;

  return (
    <>
      <PageTitle title={profile?.full_name ? `Olá, ${profile.full_name.split(" ")[0]}` : "Acompanhamento"}>Como estão suas candidaturas.</PageTitle>
      <div className="space-y-3 mb-8">
        {!profile?.confirmed_at && <Notice tone="warn">Seu perfil ainda não foi confirmado. <Link className="underline font-bold" href="/perfil">Envie o currículo e revise o perfil</Link> para gerar candidaturas.</Notice>}
        {!ext && <Notice>A extensão do Chrome ainda não está conectada. <Link className="underline font-bold" href="/extensao">Ver o passo a passo</Link>.</Notice>}
        {extOld && <Notice tone="warn">Há uma nova versão da extensão ({EXTENSION_VERSION}). <Link className="underline font-bold" href="/extensao#atualizar">Veja como atualizar</Link>.</Notice>}
        {revoked.map((a) => <Notice key={a.email} tone="error">O acesso a {a.email} expirou ou foi revogado. <Link className="underline font-bold" href="/configuracoes">Conecte de novo</Link>.</Notice>)}
      </div>

      <section className="surface p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Funil</h2>
        <ol className="space-y-3">
          {funnel.map((f) => (
            <li key={f.label} className="grid grid-cols-[11rem_1fr_3rem] items-center gap-3">
              <span className="text-sm">{f.label}</span>
              <span className="h-3 rounded-full" style={{ background: "var(--line)" }}>
                <span className="block h-3 rounded-full" style={{ width: `${(f.value / max) * 100}%`, background: "var(--ink)" }} />
              </span>
              <span className="font-bold tabular-nums text-right">{f.value}</span>
            </li>
          ))}
        </ol>
        <p className="muted text-sm mt-4">
          Hoje: {usage?.generations ?? 0} de {env.dailyGenerations()} gerações de IA · {usage?.sends ?? 0} envios · {queued ?? 0} na fila
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Histórico</h2>
          <a className="btn btn-ghost text-sm" href="/api/export">Exportar CSV</a>
        </div>
        {list.length === 0 ? (
          <div className="surface p-6"><p>Nenhuma vaga salva ainda.</p><Link className="btn btn-primary mt-3" href="/busca">Buscar vagas</Link></div>
        ) : (
          <ul className="surface divide-y" style={{ borderColor: "var(--line)" }}>
            {list.slice(0, 60).map((j) => {
              const job = j.jobs as unknown as { title: string; company: string; url: string };
              return (
                <li key={j.id} className="p-4 flex flex-wrap items-center gap-3 justify-between" style={{ borderColor: "var(--line)" }}>
                  <div className="min-w-0">
                    <Link href={`/vagas/${j.id}`} className="font-bold hover:underline">{job.title}</Link>
                    <div className="muted text-sm">{job.company}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Stamp status={j.status} />
                    {["enviada", "formulario"].includes(j.status) && <MarkReply id={j.id} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
