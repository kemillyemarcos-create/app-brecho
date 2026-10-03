create extension if not exists pg_cron;

do $$
declare
  v_job_id bigint;
begin
  select jobid
    into v_job_id
  from cron.job
  where jobname = 'loja-rate-limit-cleanup'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'loja-rate-limit-cleanup',
    '17 3 * * *',
    $cron$
      delete from public.loja_rate_limits
      where updated_at < now() - interval '7 days';
    $cron$
  );
end
$$;

comment on table public.loja_rate_limits is
  'Controle interno de rate limit da loja. Armazena somente HMAC SHA-256 da origem, nunca IP bruto. Registros antigos são removidos automaticamente após 7 dias.';
