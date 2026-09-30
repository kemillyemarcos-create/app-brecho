create or replace function public.loja_registrar_evento_pagamento(
  p_pagamento_id uuid,
  p_provider_event_id text,
  p_event_type text,
  p_payload_hash_hex text
)
returns table (
  evento_id uuid,
  resultado text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pagamento public.pagamentos_loja%rowtype;
  v_evento public.pagamento_eventos_loja%rowtype;

  v_provider_event_id text;
  v_event_type text;
  v_payload_hash bytea;

  v_inserido boolean := false;
begin
  ---------------------------------------------------------------------------
  -- ENTRADAS
  ---------------------------------------------------------------------------

  v_provider_event_id :=
    nullif(
      btrim(
        coalesce(
          p_provider_event_id,
          ''
        )
      ),
      ''
    );

  if v_provider_event_id is null then
    raise exception
      'Identificador do evento obrigatório.'
      using errcode = '22023';
  end if;

  v_event_type :=
    nullif(
      btrim(
        coalesce(
          p_event_type,
          ''
        )
      ),
      ''
    );

  if v_event_type is null then
    raise exception
      'Tipo do evento obrigatório.'
      using errcode = '22023';
  end if;

  if
    p_payload_hash_hex is null
    or
    p_payload_hash_hex !~ '^[0-9a-fA-F]{64}$'
  then
    raise exception
      'Hash do payload inválido.'
      using errcode = '22023';
  end if;

  v_payload_hash :=
    decode(
      lower(p_payload_hash_hex),
      'hex'
    );

  ---------------------------------------------------------------------------
  -- PAGAMENTO
  --
  -- O lock também serializa notificações concorrentes do mesmo pagamento.
  ---------------------------------------------------------------------------

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

  ---------------------------------------------------------------------------
  -- PRIMEIRO RECEBIMENTO
  ---------------------------------------------------------------------------

  insert into public.pagamento_eventos_loja (
    empresa_id,
    pagamento_id,
    provider,
    provider_event_id,
    event_type,
    payload_hash,
    status
  )
  values (
    v_pagamento.empresa_id,
    v_pagamento.id,
    'mercado_pago',
    v_provider_event_id,
    v_event_type,
    v_payload_hash,
    'received'
  )
  on conflict (
    empresa_id,
    provider,
    provider_event_id
  )
  where provider_event_id is not null
  do nothing
  returning *
    into v_evento;

  v_inserido := found;

  if v_inserido then
    return query
    select
      v_evento.id,
      'registrado'::text;

    return;
  end if;

  ---------------------------------------------------------------------------
  -- EVENTO JÁ EXISTENTE
  ---------------------------------------------------------------------------

  select pe.*
    into v_evento
  from public.pagamento_eventos_loja pe
  where pe.empresa_id = v_pagamento.empresa_id
    and pe.provider = 'mercado_pago'
    and pe.provider_event_id = v_provider_event_id
  for update;

  if not found then
    raise exception
      'Não foi possível recuperar o evento idempotente.'
      using errcode = 'P0001';
  end if;

  if v_evento.pagamento_id is distinct from v_pagamento.id then
    raise exception
      'Evento do provedor já associado a outro pagamento.'
      using errcode = '23505';
  end if;

  if v_evento.event_type <> v_event_type then
    raise exception
      'Evento repetido com tipo diferente.'
      using errcode = '23505';
  end if;

  if v_evento.payload_hash <> v_payload_hash then
    raise exception
      'Evento repetido com payload diferente.'
      using errcode = '23505';
  end if;

  ---------------------------------------------------------------------------
  -- JÁ FINALIZADO
  ---------------------------------------------------------------------------

  if v_evento.status in (
    'processed',
    'ignored'
  ) then
    return query
    select
      v_evento.id,
      'ja_finalizado'::text;

    return;
  end if;

  ---------------------------------------------------------------------------
  -- RECEIVED
  --
  -- Houve reentrega enquanto ainda não estava finalizado.
  -- Permite continuar o processamento normalmente.
  ---------------------------------------------------------------------------

  if v_evento.status = 'received' then
    return query
    select
      v_evento.id,
      'reprocessar'::text;

    return;
  end if;

  ---------------------------------------------------------------------------
  -- FAILED
  --
  -- Nova entrega válida do mesmo evento reabre o processamento.
  ---------------------------------------------------------------------------

  if v_evento.status = 'failed' then
    update public.pagamento_eventos_loja pe
    set
      status = 'received',
      processed_at = null,
      error_code = null
    where pe.id = v_evento.id
    returning *
      into v_evento;

    return query
    select
      v_evento.id,
      'retry_reaberto'::text;

    return;
  end if;

  raise exception
    'Estado do evento de pagamento não suportado.'
    using errcode = '22023';
end;
$$;

revoke execute
on function public.loja_registrar_evento_pagamento(uuid, text, text, text)
from public;

revoke execute
on function public.loja_registrar_evento_pagamento(uuid, text, text, text)
from anon;

revoke execute
on function public.loja_registrar_evento_pagamento(uuid, text, text, text)
from authenticated;

grant execute
on function public.loja_registrar_evento_pagamento(uuid, text, text, text)
to service_role;

comment on function public.loja_registrar_evento_pagamento(uuid, text, text, text)
is 'Registra evento autenticado do Mercado Pago com idempotência atômica e suporte seguro a reentrega/retry. Eventos processed/ignored não são reprocessados; received continua; failed pode voltar para received. Uso exclusivo via service_role.';
