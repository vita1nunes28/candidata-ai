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
          <h2 className="text-xl font-bold">Suas candidaturas</h2>
          <a className="btn btn-ghost text-sm" href="/api/export">Exportar CSV</a>
        </div>
        {list.length === 0 ? (
          <div className="surface p-6"><p>Nenhuma vaga salva ainda.</p><Link className="btn btn-primary mt-3" href="/busca">Buscar vagas</Link></div>
        ) : (
          <Kanban list={list as any} />
        )}
      </section>
    </>
  );
}

type JobRow = { id: string; status: string; applied_at: string | null; jobs: { title: string; company: string; url: string } };

const COLUMNS: { key: string; title: string; statuses: string[]; blurb: string }[] = [
  { key: "salva", title: "1 · Salvas", statuses: ["salva"], blurb: "Próximo passo: gerar a candidatura (e-mail ou dados para o formulário)." },
  { key: "gerada", title: "2 · Candidatura pronta", statuses: ["gerada"], blurb: "Próximo passo: revisar o texto e enviar." },
  { key: "enviada", title: "3 · Enviada, aguardando", statuses: ["enviada", "formulario"], blurb: "Candidatura já saiu. Marque aqui quando a empresa responder." },
  { key: "resposta", title: "4 · Respondeu", statuses: ["resposta"], blurb: "A empresa deu retorno — confira e decida os próximos passos." },
];

function nextAction(status: string): string {
  return (
    {
      salva: "Gerar candidatura",
      gerada: "Revisar e enviar",
      enviada: "Ver candidatura",
      formulario: "Ver candidatura",
      resposta: "Ver resposta",
    }[status] ?? "Ver"
  );
}

function Kanban({ list }: { list: JobRow[] }) {
  const descartadas = list.filter((j) => j.status === "descartada");
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = list.filter((j) => col.statuses.includes(j.status));
          return (
            <div key={col.key} className="surface p-4">
              <h3 className="font-bold mb-1">{col.title} <span className="muted font-normal">({items.length})</span></h3>
              <p className="muted text-xs mb-3">{col.blurb}</p>
              <ul className="space-y-2">
                {items.length === 0 && <li className="muted text-sm">Nada aqui ainda.</li>}
                {items.map((j) => (
                  <li key={j.id} className="rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
                    <Link href={`/vagas/${j.id}`} className="font-bold hover:underline block">{j.jobs.title}</Link>
                    <div className="muted text-sm mb-2">{j.jobs.company}</div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link href={`/vagas/${j.id}`} className="btn btn-primary text-sm py-1">{nextAction(j.status)}</Link>
                      {["enviada", "formulario"].includes(j.status) && <MarkReply id={j.id} />}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      {descartadas.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm underline cursor-pointer">Vagas descartadas ({descartadas.length})</summary>
          <ul className="surface divide-y mt-2" style={{ borderColor: "var(--line)" }}>
            {descartadas.map((j) => (
              <li key={j.id} className="p-3 flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
                <Link href={`/vagas/${j.id}`} className="hover:underline">{j.jobs.title} · {j.jobs.company}</Link>
                <Stamp status={j.status} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
