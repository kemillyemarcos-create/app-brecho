-- ============================================================
-- SaaS - Normalização temporal de vendas_live
--
-- Mantém data_hora (text) por compatibilidade com o legado
-- e adiciona data_hora_ts (timestamptz) como data canônica.
--
-- Formatos históricos suportados:
--   DD/MM/YYYY, HH24:MI:SS
--   ISO 8601 UTC
-- ============================================================


-- ============================================================
-- 1. Coluna temporal canônica
-- ============================================================

alter table public.vendas_live
add column if not exists data_hora_ts timestamptz;


-- ============================================================
-- 2. Função de conversão segura
-- ============================================================

create or replace function public.normalizar_data_hora_venda(
  p_data_hora text
)
returns timestamptz
language plpgsql
immutable
set search_path = ''
as $function$
begin
  if p_data_hora is null or pg_catalog.btrim(p_data_hora) = '' then
    return null;
  end if;

  -- ISO 8601 UTC:
  -- 2026-09-10T02:47:25.171Z
  if p_data_hora ~
     '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$'
  then
    return p_data_hora::timestamptz;
  end if;

  -- Formato legado brasileiro:
  -- 28/03/2026, 23:43:04
  --
  -- O horário legado representa America/Sao_Paulo.
  if p_data_hora ~
     '^\d{2}/\d{2}/\d{4}, \d{2}:\d{2}:\d{2}$'
  then
    return (
      pg_catalog.to_timestamp(
        p_data_hora,
        'DD/MM/YYYY, HH24:MI:SS'
      )::timestamp
      at time zone 'America/Sao_Paulo'
    );
  end if;

  raise exception
    'Formato de data_hora não suportado: %',
    p_data_hora
    using errcode = '22007';
end;
$function$;


revoke all
on function public.normalizar_data_hora_venda(text)
from public, anon, authenticated;

grant execute
on function public.normalizar_data_hora_venda(text)
to service_role;


-- ============================================================
-- 3. Backfill do histórico existente
-- ============================================================

update public.vendas_live
set data_hora_ts =
  public.normalizar_data_hora_venda(data_hora)
where data_hora_ts is null
  and data_hora is not null;


-- ============================================================
-- 4. Trigger para novas vendas e alterações futuras
-- ============================================================

create or replace function public.sync_vendas_live_data_hora_ts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  new.data_hora_ts :=
    public.normalizar_data_hora_venda(new.data_hora);

  return new;
end;
$function$;


revoke all
on function public.sync_vendas_live_data_hora_ts()
from public, anon, authenticated;

grant execute
on function public.sync_vendas_live_data_hora_ts()
to service_role;


drop trigger if exists trg_vendas_live_data_hora_ts
on public.vendas_live;

create trigger trg_vendas_live_data_hora_ts
before insert or update of data_hora
on public.vendas_live
for each row
execute function public.sync_vendas_live_data_hora_ts();


-- ============================================================
-- 5. Índice para consultas SaaS por empresa + período
-- ============================================================

create index if not exists idx_vendas_live_empresa_data_hora_ts
on public.vendas_live (empresa_id, data_hora_ts);
