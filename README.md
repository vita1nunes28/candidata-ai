# Candidata.ai

Plataforma para encontrar vagas, gerar candidaturas fiéis ao currículo e enviá-las pelo e-mail do próprio candidato, com uma extensão de Chrome que preenche formulários (o envio final é sempre da pessoa).

Custo de operação: **zero** (Vercel Hobby + Supabase Free + Gemini camada gratuita + Adzuna gratuita).

---

## Sumário

1. [O que tem aqui](#1-o-que-tem-aqui)
2. [Rodar no seu computador](#2-rodar-no-seu-computador)
3. [Supabase (banco, login e arquivos)](#3-supabase)
4. [Gemini (IA gratuita)](#4-gemini)
5. [Google Cloud (login com Google + Gmail)](#5-google-cloud)
6. [Azure / Entra ID (login com Microsoft + Outlook)](#6-azure--entra-id)
7. [Adzuna (busca de vagas)](#7-adzuna)
8. [Deploy na Vercel](#8-deploy-na-vercel)
9. [Ativar o disparo dos envios agendados](#9-disparo-dos-envios-agendados)
10. [Extensão do Chrome](#10-extensão-do-chrome)
11. [Antes de usar de verdade (LGPD)](#11-antes-de-usar-de-verdade)
12. [Limitações conhecidas e decisões](#12-limitações-e-decisões)
13. [Como o código está organizado](#13-organização-do-código)

---

## 1. O que tem aqui

| Pasta | Conteúdo |
|---|---|
| `app/` | Telas (Next.js) e rotas de API |
| `lib/` | Regras: IA, fontes de vagas, e-mail, criptografia, agendamento |
| `extension/` | Extensão do Chrome (JavaScript puro, sem build) |
| `supabase/migrations/` | SQL do banco: `001_init.sql` (estrutura) e `002_disparo.sql` (agendamento) |
| `public/guia/` | Ilustrações do passo a passo de instalação |
| `tests/` | Testes automáticos (`npm test`) |

> Sobre o "monorepo": simplifiquei para **um repositório só**. O site fica na raiz e a extensão na pasta `extension/`. Você não precisa saber nada de monorepo.

---

## 2. Rodar no seu computador

Pré-requisito: [Node.js 20 ou 22](https://nodejs.org) instalado.

```bash
npm install
cp .env.example .env.local     # depois preencha os valores (seções 3 a 7)
npm run dev                    # abre em http://localhost:3000
npm test                       # roda os testes
```

Gerar as chaves internas (no terminal; no Windows use o Git Bash):

```bash
openssl rand -base64 32   # → ENCRYPTION_KEY
openssl rand -hex 24      # → CRON_SECRET
```

---

## 3. Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) → **New project**. Escolha a região **South America (São Paulo)** e guarde a senha do banco.
2. Menu lateral **SQL Editor** → **New query** → cole todo o conteúdo de `supabase/migrations/001_init.sql` → **Run**. Deve aparecer "Success".
3. **Project Settings → API**: copie
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (**secreta**, nunca coloque no navegador nem no GitHub)
4. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (depois troque pelo endereço da Vercel)
   - Redirect URLs: adicione `http://localhost:3000/auth/callback` e, depois do deploy, `https://SEU-APP.vercel.app/auth/callback`
5. **Authentication → Providers**: `Email` já vem ligado. Google e Azure você liga nas seções 5 e 6.

---

## 4. Gemini

1. Acesse [aistudio.google.com](https://aistudio.google.com) com sua conta Google.
2. **Get API key → Create API key**. Copie para `GEMINI_API_KEY`.
3. `GEMINI_MODEL` já vem como `gemini-2.5-flash`. Se o Google lançar um modelo Flash mais novo, basta trocar aqui.

Na camada gratuita o Google pode usar o conteúdo enviado para melhorar os produtos dele. Por isso o código **nunca** envia contato, salário, autorização de trabalho e dados de diversidade (veja `lib/privacy.ts`), e isso está explicado ao usuário no consentimento.

O limite de gerações por usuário por dia está em `DAILY_GENERATION_LIMIT` (padrão 30). Se o Google devolver "limite atingido", a tela mostra uma mensagem clara em vez de erro.

---

## 5. Google Cloud

Um mesmo projeto serve para o **login com Google** e para o **Gmail**.

### 5.1 Criar o projeto e ligar a Gmail API
1. [console.cloud.google.com](https://console.cloud.google.com) → seletor de projetos (topo) → **Novo projeto** → nome "Candidata" → **Criar**.
2. Menu **APIs e serviços → Biblioteca** → procure **Gmail API** → **Ativar**.

### 5.2 Tela de consentimento
1. Menu **Google Auth Platform** (ou "APIs e serviços → Tela de permissão OAuth") → **Começar**.
2. Nome do app: `Candidata.ai`; e-mail de suporte: o seu.
3. Público: **Externo** (qualquer pessoa com conta Google).
4. Contato: seu e-mail → aceite a política → **Criar**.
5. **Branding**: preencha página inicial (`https://SEU-APP.vercel.app`), política de privacidade (`/privacidade`) e termos (`/termos`). Em **Domínios autorizados** adicione `vercel.app` (ou seu domínio).
6. **Acesso a dados → Adicionar ou remover escopos**: marque `.../auth/userinfo.email`, `openid`, `.../auth/gmail.compose` e `.../auth/gmail.send` → **Atualizar** → **Salvar**.
7. **Público → Publicar app → Confirmar**. O status precisa ficar **"Em produção"**.
   - **Não deixe em "Teste"**: nesse modo os acessos expiram em 7 dias e o usuário teria de reconectar toda semana.
   - Sem verificação, o app aceita até **100 usuários** e mostra o aviso "O Google não verificou este app". A plataforma já explica ao usuário como passar por ele (Avançado → Acessar Candidata.ai).

### 5.3 Credenciais
1. **Clientes → Criar cliente** → tipo **Aplicativo da Web** → nome "Candidata web".
2. **URIs de redirecionamento autorizados** (adicione todos):
   - `https://SEU-PROJETO.supabase.co/auth/v1/callback` (login)
   - `http://localhost:3000/api/oauth/gmail/callback` (Gmail, local)
   - `https://SEU-APP.vercel.app/api/oauth/gmail/callback` (Gmail, produção)
3. **Criar** → copie o ID e a chave secreta para `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
4. No Supabase: **Authentication → Providers → Google** → ligue, cole o mesmo ID e chave → **Save**.

---

## 6. Azure / Entra ID

1. [portal.azure.com](https://portal.azure.com) (uma conta Microsoft pessoal gratuita serve) → procure **Microsoft Entra ID** → **Registros de aplicativo → Novo registro**.
2. Nome: `Candidata.ai`. Tipos de conta: **"Contas em qualquer diretório organizacional e contas pessoais da Microsoft"** (aceita Outlook.com, Hotmail e contas de empresa).
3. URI de redirecionamento: plataforma **Web**, `https://SEU-APP.vercel.app/api/oauth/outlook/callback` → **Registrar**.
4. **Autenticação → Adicionar URI**: inclua também `http://localhost:3000/api/oauth/outlook/callback` e `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
5. **Certificados e segredos → Novo segredo do cliente** → validade 24 meses → copie o **Valor** (aparece uma vez só) para `MICROSOFT_CLIENT_SECRET`. Anote na agenda a data de expiração.
6. **Visão geral**: copie o **ID do aplicativo (cliente)** para `MICROSOFT_CLIENT_ID`.
7. **Permissões de API → Adicionar → Microsoft Graph → Permissões delegadas**: `openid`, `email`, `offline_access`, `User.Read`, `Mail.ReadWrite`, `Mail.Send` → **Adicionar**.
8. No Supabase: **Authentication → Providers → Azure** → ligue, cole ID e segredo, e em *Azure Tenant URL* use `https://login.microsoftonline.com/common` → **Save**.

Contas de empresa podem exigir que o administrador de TI aprove o app. Contas pessoais funcionam direto.

---

## 7. Adzuna

1. [developer.adzuna.com](https://developer.adzuna.com) → **Register** → confirme o e-mail.
2. No painel, copie **Application ID** e **Application Key** para `ADZUNA_APP_ID` e `ADZUNA_APP_KEY`.

A Adzuna devolve a descrição resumida; o link leva à vaga completa. Para Greenhouse e Lever não há chave: o usuário cadastra as empresas em **Configurações** (ex.: `greenhouse:nubank`).

---

## 8. Deploy na Vercel

1. Suba o código para um repositório **privado** no GitHub (o `.gitignore` já impede subir `.env.local`).
2. [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório.
3. Em **Environment Variables**, cole todas as variáveis do `.env.local`, trocando `NEXT_PUBLIC_APP_URL` pelo endereço final (ex.: `https://candidata.vercel.app`).
4. **Deploy**. Depois:
   - volte ao Supabase (seção 3, item 4) e troque o Site URL e as Redirect URLs para o endereço da Vercel;
   - confira se as URIs de produção estão no Google (5.3) e no Azure (6).

O plano Hobby da Vercel é para uso não comercial. Ao abrir a plataforma ao público, migre para o Pro.

---

## 9. Disparo dos envios agendados

Os envios saem em **2 janelas por dia** por usuário (padrão 9h e 14h, cada um escolhe as suas em Configurações).

Como funciona, de forma enxuta: o próprio Supabase faz **uma checagem levíssima por hora** (só um índice no banco). **Só se houver envio vencido** ele chama o app. Ou seja, o servidor só é acordado nas janelas em que há algo para enviar. Cada chamada envia com intervalo aleatório de 2 a 6 segundos; o que não couber sai na checagem seguinte.

1. Supabase → **Database → Extensions** → ative **pg_cron** e **pg_net**.
2. Abra `supabase/migrations/002_disparo.sql`, troque `https://SEU-APP.vercel.app` e `SEU_CRON_SECRET` (o mesmo `CRON_SECRET` da Vercel).
3. **SQL Editor** → cole → **Run**.
4. Para conferir: **Integrations → Cron** (ou `select * from cron.job;`) mostra os jobs `candidata-disparo` e `candidata-limpeza`.

Proteções já incluídas: limite diário por usuário (padrão 20), bloqueio de envio duplicado para o mesmo e-mail e vaga, uma nova tentativa automática em erro temporário, cancelamento e reagendamento antes do envio, e confirmação explícita antes de ativar o modo automático.

---

## 10. Extensão do Chrome

- O arquivo para download já está em `public/candidata-extensao.zip`. A página **Instalar extensão** da plataforma tem o passo a passo visual para leigos.
- Ao mudar algo na pasta `extension/`:
  1. aumente `version` em `extension/manifest.json` **e** `EXTENSION_VERSION` em `lib/version.ts` (o painel avisa os usuários da nova versão);
  2. rode `npm run zip:extension`;
  3. faça commit e deploy.
- As ilustrações do guia estão em `public/guia/*.svg`. Para trocar por prints reais, salve imagens com os mesmos nomes (ou mude o caminho em `app/extensao/page.tsx`).
- Para incorporar o vídeo, edite o bloco "Vídeo" em `app/extensao/page.tsx`.

Comportamento por site:

| Site | O que a extensão faz |
|---|---|
| Gupy, Greenhouse, Lever, Workday, formulários em geral | Preenche campos objetivos, gera respostas abertas, anexa o CV quando o site permite, destaca preenchidos (verde) e pendentes (amarelo) |
| LinkedIn | Só painel com respostas para copiar (os termos do LinkedIn proíbem automação) |
| Todos | Nunca clica em enviar, não resolve captcha, não faz login, não marca caixas de termos/LGPD |

Teste local: `npm run dev`, instale a extensão, conecte em **Instalar extensão → Conectar minha conta** e abra `/teste-formulario`.

---

## 11. Antes de usar de verdade

- Em `app/privacidade/page.tsx`, troque `[Responsável]` e `[contato]` pelos seus dados.
- A política já inclui a cláusula de **Uso Limitado** exigida pelo Google para apps que usam a Gmail API.
- O usuário pode exportar o histórico (CSV) e apagar tudo com um clique em **Configurações**; a exclusão também revoga o acesso ao Gmail.

---

## 12. Limitações e decisões

| Tema | Decisão |
|---|---|
| LinkedIn | Sem preenchimento automático; só painel de cópia |
| Gupy | Sem busca automática; importação pelo link da vaga |
| LinkedIn/Indeed/Glassdoor como fonte | Não são lidos; o usuário pode colar a descrição |
| E-mail de RH | Só o publicado na vaga, com a origem registrada |
| IA | Gemini gratuito; dados sensíveis nunca saem do sistema |
| Gmail sem verificação | Até 100 usuários, com aviso explicado na tela. Abrir ao público exige verificação e auditoria (CASA) |
| Agendamento | 2 janelas por dia, com hora escolhida pelo usuário |
| Microsoft | Não tem revogação por token: ao desconectar, o token é apagado; o usuário pode remover o app em account.microsoft.com → Privacidade → Apps |

---

## 13. Organização do código

Interfaces que permitem trocar peças sem reescrever:

- `lib/llm/types.ts` → `LLMClient` (hoje Gemini; trocar por outra IA = um arquivo novo)
- `lib/jobs/types.ts` → `JobSource` (nova fonte de vagas = um arquivo + registrar em `lib/jobs/index.ts`)
- `lib/email/types.ts` → `EmailProvider` (Gmail e Outlook hoje; Nylas/Unipile no futuro)

Segurança: tokens criptografados com AES-256-GCM (`lib/crypto.ts`), RLS em todas as tabelas (cada usuário só vê o que é dele), a coluna do token nem chega ao navegador, segredos só em variáveis de ambiente, logs sem conteúdo pessoal (`lib/http.ts`).
