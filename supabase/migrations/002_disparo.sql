-- Candidata.ai: disparo dos envios agendados
-- Rode DEPOIS do deploy na Vercel, trocando os dois valores marcados.
--
-- Como funciona (versão enxuta):
-- uma vez por hora o próprio Postgres faz uma checagem levíssima (um índice).
-- Só se existir envio vencido ele chama o app. Na prática o app é acordado
-- no máximo nas 2 janelas de envio de cada usuário — nas outras horas nada roda.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'candidata-disparo',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://SEU-APP.vercel.app/api/cron/dispatch',          -- << troque
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SEU_CRON_SECRET'                      -- << troque
    ),
    body := '{}'::jsonb
  )
  where exists (
    select 1 from public.send_queue where status = 'agendado' and run_at <= now()
  );
  $$
);

-- limpeza diária às 4h (UTC)
select cron.schedule('candidata-limpeza', '0 4 * * *', $$ select public.cleanup_old(); $$);
