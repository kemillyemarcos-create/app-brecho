alter table public.pecas
add column if not exists data_cadastro_ts timestamptz;

create or replace function public.normalizar_data_cadastro_peca(
    p_valor text
)
returns timestamptz
language plpgsql
immutable
set search_path = ''
as $$
begin
    if p_valor is null
       or btrim(p_valor) = '' then
        return null;
    end if;

    if p_valor ~ '^\d{4}-\d{2}-\d{2}T' then
        return p_valor::timestamptz;
    end if;

    if p_valor ~
       '^\d{2}/\d{2}/\d{4}, \d{2}:\d{2}:\d{2}$' then
        return
            to_timestamp(
                p_valor,
                'DD/MM/YYYY, HH24:MI:SS'
            )::timestamp
            at time zone 'America/Sao_Paulo';
    end if;

    if p_valor ~
       '^\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}$' then
        return
            to_timestamp(
                p_valor,
                'DD/MM/YYYY HH24:MI:SS'
            )::timestamp
            at time zone 'America/Sao_Paulo';
    end if;

    raise exception
        using
            errcode = '22007',
            message = format(
                'Formato de data_cadastro não suportado: %s',
                p_valor
            );
end;
$$;

revoke all
on function public.normalizar_data_cadastro_peca(text)
from public;

revoke all
on function public.normalizar_data_cadastro_peca(text)
from anon;

revoke all
on function public.normalizar_data_cadastro_peca(text)
from authenticated;

grant execute
on function public.normalizar_data_cadastro_peca(text)
to service_role;

update public.pecas
set data_cadastro_ts =
    public.normalizar_data_cadastro_peca(data_cadastro)
where data_cadastro is not null
  and btrim(data_cadastro) <> ''
  and data_cadastro_ts is null;

create or replace function public.sync_pecas_data_cadastro_ts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    new.data_cadastro_ts :=
        public.normalizar_data_cadastro_peca(
            new.data_cadastro
        );

    return new;
end;
$$;

revoke all
on function public.sync_pecas_data_cadastro_ts()
from public;

revoke all
on function public.sync_pecas_data_cadastro_ts()
from anon;

revoke all
on function public.sync_pecas_data_cadastro_ts()
from authenticated;

grant execute
on function public.sync_pecas_data_cadastro_ts()
to service_role;

drop trigger if exists trg_pecas_data_cadastro_ts
on public.pecas;

create trigger trg_pecas_data_cadastro_ts
before insert or update of data_cadastro
on public.pecas
for each row
execute function public.sync_pecas_data_cadastro_ts();

create index if not exists idx_pecas_empresa_data_cadastro_ts
on public.pecas (
    empresa_id,
    data_cadastro_ts desc
);
