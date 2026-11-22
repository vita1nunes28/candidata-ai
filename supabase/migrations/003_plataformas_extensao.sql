-- Plataformas que o candidato autoriza a extensão a buscar (LinkedIn, Gupy, Catho, InfoJobs, Vagas.com).
-- A busca roda no próprio navegador do candidato, usando a sessão logada dele — não é scraping do lado do servidor.
alter table public.settings add column if not exists job_platforms jsonb not null default '[]'::jsonb;
