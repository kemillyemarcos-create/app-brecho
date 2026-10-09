create or replace function public.loja_registrar_checkout_pagamento(
  p_pagamento_id uuid,
  p_provider_checkout_id text
)
returns table (
  pagamento_id uuid,
  provider text,
  provider_checkout_id text,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_checkout_id text;
  v_pagamento public.pagamentos_loja%rowtype;
begin
  v_checkout_id :=
    btrim(coalesce(p_provider_checkout_id, ''));

  if v_checkout_id = '' then
    raise exception
      'Identificador do checkout obrigatório.'
      using errcode = '22023';
  end if;

  select pg.*
    into v_pagamento
  from public.pagamentos_loja pg
  where pg.id = p_pagamento_id
  for update;

  if not found then
    raise exception
      'Pagamento não encontrado.'
      using errcode = 'P0002';
  end if;

  if v_pagamento.provider <> 'mercado_pago' then
    raise exception
      'Pagamento não pertence ao Mercado Pago.'
      using errcode = '22023';
  end if;

  if v_pagamento.status not in (
    'pending',
    'authorized'
  ) then
    raise exception
      'Pagamento não está disponível para registrar checkout.'
      using errcode = '22023';
  end if;

  if v_pagamento.provider_checkout_id is not null then
    if v_pagamento.provider_checkout_id <> v_checkout_id then
      raise exception
        'Pagamento já possui outro checkout registrado.'
        using errcode = '23505';
    end if;

    return query
    select
      v_pagamento.id,
      v_pagamento.provider,
      v_pagamento.provider_checkout_id,
      v_pagamento.status;

    return;
  end if;

  update public.pagamentos_loja pg
  set
    provider_checkout_id = v_checkout_id,
    updated_at = clock_timestamp()
  where pg.id = v_pagamento.id
  returning *
  into v_pagamento;

  return query
  select
    v_pagamento.id,
    v_pagamento.provider,
    v_pagamento.provider_checkout_id,
    v_pagamento.status;
end;
$$;

revoke execute
on function public.loja_registrar_checkout_pagamento(uuid, text)
from public;

revoke execute
on function public.loja_registrar_checkout_pagamento(uuid, text)
from anon;

revoke execute
on function public.loja_registrar_checkout_pagamento(uuid, text)
from authenticated;

grant execute
on function public.loja_registrar_checkout_pagamento(uuid, text)
to service_role;

comment on function public.loja_registrar_checkout_pagamento(uuid, text)
is 'Registra de forma idempotente o identificador do checkout do Mercado Pago em pagamento pending/authorized. Uso exclusivo via service_role.';
