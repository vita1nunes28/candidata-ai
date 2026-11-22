-- Candidata.ai: estrutura inicial do banco
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run

create extension if not exists pgcrypto;

-- ---------- Perfil ----------
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  city text,
  links jsonb not null default '{}'::jsonb,           -- {linkedin, portfolio, github}
  summary text,
  experiences jsonb not null default '[]'::jsonb,     -- [{company, role, start, end, achievements[]}]
  education jsonb not null default '[]'::jsonb,
  skills text[] not null default '{}',
  tools text[] not null default '{}',
  languages jsonb not null default '[]'::jsonb,       -- [{language, level}]
  certifications text[] not null default '{}',
  salary_clt numeric,
  salary_pj numeric,
  availability text,
  work_modes text[] not null default '{}',            -- presencial | hibrido | remoto
  accepts_relocation boolean,
  work_authorization text,
  diversity jsonb not null default '{}'::jsonb,       -- {gender, race, pcd}; ausente = prefiro não informar
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.cv_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Principal',
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  raw_text text,
  structured_json jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.cv_versions(user_id);

-- ---------- Vagas ----------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,                 -- adzuna | greenhouse | lever | url
  external_id text,
  dedup_key text not null unique,       -- hash(empresa+título+local)
  title text not null,
  company text,
  location text,
  work_mode text,
  posted_at timestamptz,
  url text not null,
  description text,
  hr_email text,
  hr_email_source_url text,             -- onde o e-mail foi publicado
  fetched_at timestamptz not null default now()
);

create table public.user_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  fit_score int,
  fit_reason text,
  status text not null default 'salva', -- resultado | salva | gerada | enviada | formulario | resposta | descartada
  cv_version_id uuid references public.cv_versions(id) on delete set null,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);
create index on public.user_jobs(user_id, status);

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_job_id uuid not null references public.user_jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cache_key text not null,
  subject text not null,
  body text not null,
  fit_points jsonb not null default '[]'::jsonb,
  answer_kit jsonb not null default '[]'::jsonb,
  alerts jsonb not null default '[]'::jsonb,
  edited boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.generations(user_job_id);
create index on public.generations(cache_key);

-- ---------- E-mail ----------
create table public.email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,               -- gmail | outlook
  email text not null,
  scopes text[] not null default '{}',
  refresh_token_enc text not null,      -- AES-256-GCM
  status text not null default 'ok',    -- ok | revogado
  created_at timestamptz not null default now(),
  unique (user_id, provider, email)
);

create table public.send_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_job_id uuid not null references public.user_jobs(id) on delete cascade,
  account_id uuid not null references public.email_accounts(id) on delete cascade,
  to_email text not null,
  mode text not null,                   -- rascunho | agendado
  run_at timestamptz,                   -- só no modo agendado
  status text not null default 'agendado', -- rascunho_criado | agendado | enviando | enviado | erro | cancelado
  attempts int not null default 0,
  last_error text,
  provider_msg_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
-- bloqueia envio duplicado para o mesmo e-mail e vaga
create unique index send_queue_no_dup on public.send_queue(user_id, user_job_id, lower(to_email))
  where status in ('agendado','enviado');
-- índice leve que o disparo consulta
create index send_queue_due on public.send_queue(run_at) where status = 'agendado';

-- ---------- Configurações e uso ----------
create table public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_send_limit int not null default 20,
  send_hour_1 int not null default 9 check (send_hour_1 between 0 and 23),
  send_hour_2 int not null default 14 check (send_hour_2 between 0 and 23),
  timezone text not null default 'America/Sao_Paulo',
  auto_send_enabled boolean not null default false,
  answer_char_limit int not null default 600,
  company_boards jsonb not null default '[]'::jsonb, -- [{ats: greenhouse|lever, slug}]
  updated_at timestamptz not null default now()
);

create table public.usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  generations int not null default 0,
  sends int not null default 0,
  primary key (user_id, day)
);

create table public.ext_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  ext_version text,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,                   -- termos | cv | email | ia
  version text not null,
  accepted_at timestamptz not null default now()
);

-- ---------- Contadores atômicos ----------
create or replace function public.bump_usage(p_user uuid, p_field text, p_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into usage(user_id, day) values (p_user, current_date) on conflict do nothing;
  if p_field = 'generations' then
    update usage set generations = generations + 1
      where user_id = p_user and day = current_date and generations < p_limit returning generations into v;
  else
    update usage set sends = sends + 1
      where user_id = p_user and day = current_date and sends < p_limit returning sends into v;
  end if;
  return v is not null;
end $$;
revoke execute on function public.bump_usage from anon, authenticated;

-- ---------- RLS: cada usuário só vê o que é dele ----------
alter table public.profiles enable row level security;
alter table public.cv_versions enable row level security;
alter table public.jobs enable row level security;
alter table public.user_jobs enable row level security;
alter table public.generations enable row level security;
alter table public.email_accounts enable row level security;
alter table public.send_queue enable row level security;
alter table public.settings enable row level security;
alter table public.usage enable row level security;
alter table public.ext_tokens enable row level security;
alter table public.consents enable row level security;

create policy own on public.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on public.cv_versions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on public.user_jobs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on public.generations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on public.send_queue for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on public.settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_read on public.usage for select using (user_id = auth.uid());
create policy own on public.consents for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- tokens nunca são lidos pelo navegador: só nome/status
create policy own_read on public.email_accounts for select using (user_id = auth.uid());
create policy own_delete on public.email_accounts for delete using (user_id = auth.uid());
create policy own_read on public.ext_tokens for select using (user_id = auth.uid());
create policy own_delete on public.ext_tokens for delete using (user_id = auth.uid());
-- vagas são públicas para leitura de quem está logado; escrita só pelo servidor
create policy read_jobs on public.jobs for select to authenticated using (true);

-- esconde a coluna do token até de quem tem acesso de leitura
revoke select on public.email_accounts from authenticated, anon;
grant select (id, user_id, provider, email, scopes, status, created_at) on public.email_accounts to authenticated;

-- ---------- Storage do CV (bucket privado) ----------
insert into storage.buckets (id, name, public) values ('cvs', 'cvs', false) on conflict do nothing;
create policy cv_own_read on storage.objects for select
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy cv_own_write on storage.objects for insert
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy cv_own_delete on storage.objects for delete
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Limpeza (retenção mínima) ----------
create or replace function public.cleanup_old() returns void language sql security definer as $$
  delete from public.send_queue where status in ('enviado','cancelado') and created_at < now() - interval '30 days';
  delete from public.jobs j where fetched_at < now() - interval '60 days'
    and not exists (select 1 from public.user_jobs u where u.job_id = j.id);
  delete from public.usage where day < current_date - 60;
$$;
