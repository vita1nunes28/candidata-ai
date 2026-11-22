import { PageTitle } from "@/components/ui";

export default function Privacidade() {
  return (
    <article className="max-w-3xl space-y-4">
      <PageTitle title="Política de privacidade">Versão de novembro de 2026. Substitua [Responsável] e [contato] pelos seus dados antes de publicar.</PageTitle>
      <h2 className="text-xl font-bold">Quem trata os dados</h2>
      <p>[Responsável], contato [contato], é o controlador dos dados tratados pela Candidata.ai, nos termos da Lei 13.709/2018 (LGPD).</p>
      <h2 className="text-xl font-bold">Que dados e para quê</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Conta</strong> (e-mail, nome): login. Base legal: execução de contrato.</li>
        <li><strong>Currículo e perfil</strong>: montar o perfil, gerar candidaturas e anexar o CV. Base legal: consentimento.</li>
        <li><strong>Dados de diversidade e salário</strong> (opcionais): responder formulários que perguntam. Nunca são enviados a serviços de IA.</li>
        <li><strong>Acesso ao e-mail</strong> (Gmail/Outlook): criar rascunhos e enviar candidaturas que você aprovou. Não lemos sua caixa de entrada. Base legal: consentimento.</li>
        <li><strong>Vagas e histórico</strong>: mostrar o acompanhamento.</li>
      </ul>
      <h2 className="text-xl font-bold">Com quem compartilhamos</h2>
      <p>Supabase (banco e arquivos), Vercel (hospedagem), Google Gemini (processamento do texto do currículo e das vagas — na camada gratuita o Google pode usar o conteúdo para melhorar seus produtos), Google e Microsoft (envio dos e-mails pela sua conta). Não vendemos dados.</p>
      <h2 className="text-xl font-bold">Uso de dados das APIs do Google</h2>
      <p>O uso e a transferência de informações recebidas das APIs do Google seguem a Política de Dados do Usuário dos Serviços de API do Google, incluindo os requisitos de Uso Limitado. Usamos o acesso ao Gmail apenas para criar rascunhos e enviar mensagens que você aprovou.</p>
      <h2 className="text-xl font-bold">Segurança e retenção</h2>
      <p>Tokens de acesso ficam criptografados (AES-256). Envios concluídos são apagados após 30 dias. Você pode apagar todos os seus dados a qualquer momento em Configurações, o que também revoga o acesso ao seu e-mail.</p>
      <h2 className="text-xl font-bold">Seus direitos</h2>
      <p>Acesso, correção, portabilidade (exportação CSV), exclusão e revogação do consentimento, pelo próprio painel ou pelo contato acima.</p>
    </article>
  );
}
