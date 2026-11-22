import { PageTitle } from "@/components/ui";

export default function Termos() {
  return (
    <article className="max-w-3xl space-y-4">
      <PageTitle title="Termos de uso">Versão de novembro de 2026.</PageTitle>
      <p>A Candidata.ai ajuda você a encontrar vagas e preparar candidaturas. Ao usar, você concorda com o seguinte:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Você é responsável pela veracidade do seu perfil e pelo conteúdo enviado em seu nome. Revise as candidaturas antes de enviá-las.</li>
        <li>A plataforma não inventa informações, mas textos gerados por IA podem conter erros. A revisão final é sua.</li>
        <li>Envios automáticos só acontecem depois da sua confirmação explícita, nas janelas e limites que você configurou.</li>
        <li>A extensão nunca envia formulários, resolve captchas ou faz login por você. Não use a plataforma para violar termos de outros sites.</li>
        <li>É proibido usar a plataforma para spam ou para enviar mensagens a quem não publicou um contato para candidaturas.</li>
        <li>O serviço está em fase de testes, sem garantia de disponibilidade.</li>
      </ul>
    </article>
  );
}
