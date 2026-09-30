create or replace function public.loja_finalizar_evento_pagamento(
  p_evento_id uuid,
  p_status text,
  p_error_code text default null
)
returns table (
  evento_id uuid,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento public.pagamento_eventos_loja%rowtype;
  v_status text;
  v_error_code text;
  v_agora timestamptz := clock_timestamp();
begin
  v_status :=
    lower(
      btrim(
        coalesce(
          p_status,
          ''
        )
      )
    );

  if v_status not in (
    'processed',
    'ignored',
    'failed'
  ) then
    raise exception
      'Status final do evento inválido.'
      using errcode = '22023';
  end if;

  v_error_code :=
    nullif(
      btrim(
        coalesce(
          p_error_code,
          ''
        )
      ),
      ''
    );

  if
    v_status in (
      'processed',
      'ignored'
    )
    and v_error_code is not null
  then
    raise exception
      'Eventos processed/ignored não podem ter error_code.'
      using errcode = '22023';
  end if;

  select pe.*
    into v_evento
  from public.pagamento_eventos_loja pe
  where pe.id = p_evento_id
  for update;

  if not found then
    raise exception
      'Evento de pagamento não encontrado.'
      using errcode = 'P0002';
  end if;

  if v_evento.provider <> 'mercado_pago' then
    raise exception
      'Evento não pertence ao Mercado Pago.'
      using errcode = '22023';
  end if;

  if v_evento.status = v_status then
    if
      v_status = 'failed'
      and v_evento.error_code is distinct from v_error_code
    then
      raise exception
        'Evento já finalizado com outro error_code.'
        using errcode = '23505';
    end if;

    return query
    select
      v_evento.id,
      v_evento.status;

    return;
  end if;

  if v_evento.status <> 'received' then
    raise exception
      'Evento já foi finalizado com outro status.'
      using errcode = '23505';
  end if;

  update public.pagamento_eventos_loja pe
  set
    status = v_status,
    processed_at = v_agora,
    error_code =
      case
        when v_status = 'failed'
          then v_error_code
        else null
      end
  where pe.id = v_evento.id
  returning *
    into v_evento;

  return query
  select
    v_evento.id,
    v_evento.status;
end;
$$;

revoke execute
on function public.loja_finalizar_evento_pagamento(uuid, text, text)
from public;

revoke execute
on function public.loja_finalizar_evento_pagamento(uuid, text, text)
from anon;

revoke execute
on function public.loja_finalizar_evento_pagamento(uuid, text, text)
from authenticated;

grant execute
on function public.loja_finalizar_evento_pagamento(uuid, text, text)
to service_role;

comment on function public.loja_finalizar_evento_pagamento(uuid, text, text)
is 'Finaliza evento autenticado do Mercado Pago como processed, ignored ou failed. Uso exclusivo via service_role.';
