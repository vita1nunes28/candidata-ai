import { PageTitle } from "@/components/ui";

const ITEMS: [string, string][] = [
  ["LinkedIn: só painel de cópia", "Os termos do LinkedIn proíbem extensões que preenchem formulários automaticamente, e sua conta poderia ser restringida. Por isso, no LinkedIn a extensão só abre um painel com as respostas para você copiar."],
  ["Gupy: entra pelo link da vaga", "A Gupy não tem API oficial de busca. Para não violar regras do site, as vagas da Gupy entram quando você cola o link. A busca automática usa só fontes com API oficial: Adzuna, Greenhouse e Lever."],
  ["LinkedIn, Indeed e Glassdoor não são lidos automaticamente", "Esses sites proíbem leitura automática. Para vagas deles, cole a descrição manualmente na busca."],
  ["E-mail de RH: só quando é público", "Mostramos e-mail de RH apenas quando ele está escrito na própria vaga ou na página de carreiras, e registramos onde foi encontrado. Nunca adivinhamos padrões como nome@empresa.com. Sem e-mail, a opção é candidatar-se pelo link."],
  ["IA gratuita do Google (Gemini)", "A plataforma usa a camada gratuita do Gemini para ler o currículo e escrever as candidaturas, sem custo. Nessa camada o Google pode usar o conteúdo para melhorar os produtos dele, por isso contato, salário, autorização de trabalho e dados de diversidade nunca são enviados à IA: eles são preenchidos direto do seu perfil."],
  ["Limite diário da IA", "A camada gratuita tem limite de uso. Cada vaga gerada fica guardada (não gastamos de novo) e há um limite de gerações por dia, que aparece no painel. Se o limite acabar, a geração volta no dia seguinte."],
  ["A IA não inventa nada", "Os textos usam só o que está no seu perfil. Quando a vaga pede algo que você não comprova, aparece um alerta em vez de uma frase inventada."],
  ["Aviso de app não verificado", "Ao conectar o Gmail aparece “O Google não verificou este app”. É esperado: a plataforma está em testes e ainda não passou pela verificação paga do Google. Clique em Avançado e depois em Acessar Candidata.ai. O acesso serve só para rascunhos e para os envios que você aprovar, e você pode desconectar quando quiser."],
  ["Envio automático em 2 janelas por dia", "Os envios agendados saem em duas janelas por dia (padrão 9h e 14h; você muda em Configurações), com intervalo aleatório entre eles e no máximo 20 por dia. Você pode cancelar ou mudar a janela antes do envio."],
  ["Quem clica em enviar é você", "A extensão preenche os campos, mas nunca clica em “enviar candidatura”, nunca resolve captcha e nunca faz login por você."],
  ["Seus dados", "Você pode exportar o histórico em CSV e apagar tudo com um clique em Configurações. Envios antigos são apagados automaticamente depois de 30 dias."],
];

export default function ComoFunciona() {
  return (
    <>
      <PageTitle title="Como a plataforma funciona">O que ela faz, o que ela não faz e por quê.</PageTitle>
      <div className="space-y-4 max-w-3xl">
        {ITEMS.map(([t, d]) => (
          <section key={t} className="surface p-5"><h2 className="text-lg font-bold mb-1">{t}</h2><p>{d}</p></section>
        ))}
      </div>
    </>
  );
}
