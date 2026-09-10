alter table public.pecas
add column if not exists data_venda_ts timestamptz;

create or replace function public.normalizar_data_venda_peca(p_data_venda text)
returns timestamptz
language plpgsql
immutable
set search_path = ''
as $$
declare
    v_data text;
begin
    if p_data_venda is null then
        return null;
    end if;

    v_data := btrim(p_data_venda);

    if v_data = '' then
        return null;
    end if;

    -- ISO 8601 UTC
    if v_data ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$' then
        return v_data::timestamptz;
    end if;

    -- Legado BR com vírgula
    if v_data ~ '^\d{2}/\d{2}/\d{4}, \d{2}:\d{2}:\d{2}$' then
        return
            to_timestamp(
                v_data,
                'DD/MM/YYYY, HH24:MI:SS'
            )::timestamp
            at time zone 'America/Sao_Paulo';
    end if;

    -- Legado BR sem vírgula
    if v_data ~ '^\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}$' then
        return
            to_timestamp(
                v_data,
                'DD/MM/YYYY HH24:MI:SS'
            )::timestamp
            at time zone 'America/Sao_Paulo';
    end if;

    raise exception
        using
            errcode = '22007',
            message = format(
                'Formato de data_venda não suportado: %s',
                p_data_venda
            );
end;
$$;

revoke all on function public.normalizar_data_venda_peca(text) from public;
revoke all on function public.normalizar_data_venda_peca(text) from anon;
revoke all on function public.normalizar_data_venda_peca(text) from authenticated;
grant execute on function public.normalizar_data_venda_peca(text) to service_role;

update public.pecas
set data_venda_ts = public.normalizar_data_venda_peca(data_venda)
where data_venda is not null
  and data_venda_ts is null;

create or replace function public.sync_pecas_data_venda_ts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    new.data_venda_ts :=
        public.normalizar_data_venda_peca(new.data_venda);

    return new;
end;
$$;

revoke all on function public.sync_pecas_data_venda_ts() from public;
revoke all on function public.sync_pecas_data_venda_ts() from anon;
revoke all on function public.sync_pecas_data_venda_ts() from authenticated;
grant execute on function public.sync_pecas_data_venda_ts() to service_role;

drop trigger if exists trg_pecas_data_venda_ts
on public.pecas;

create trigger trg_pecas_data_venda_ts
before insert or update of data_venda
on public.pecas
for each row
execute function public.sync_pecas_data_venda_ts();

create index if not exists idx_pecas_empresa_data_venda_ts
on public.pecas (empresa_id, data_venda_ts);
