create or replace function public.confirmar_pagamento_assinatura(
  p_assinatura_id uuid,
  p_periodicidade text,
  p_periodo_inicio timestamptz,
  p_periodo_fim timestamptz,
  p_origem text default 'gateway',
  p_dados jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assinatura public.assinaturas%rowtype;
  v_periodicidade text;
  v_origem text;
  v_dados jsonb;
begin
  if p_assinatura_id is null then
    raise exception 'Assinatura não informada.'
      using errcode = '22004';
  end if;

  v_periodicidade := lower(nullif(btrim(p_periodicidade), ''));
  v_origem := lower(nullif(btrim(p_origem), ''));

  if v_periodicidade is null
     or v_periodicidade not in ('mensal', 'anual') then
    raise exception 'Periodicidade inválida.'
      using errcode = '22023';
  end if;

  if p_periodo_inicio is null or p_periodo_fim is null then
    raise exception 'Período de cobrança incompleto.'
      using errcode = '22004';
  end if;

  if p_periodo_fim <= p_periodo_inicio then
    raise exception 'Período de cobrança inválido.'
      using errcode = '22023';
  end if;

  if v_origem is null
     or v_origem not in ('sistema', 'admin', 'gateway') then
    raise exception 'Origem de evento inválida.'
      using errcode = '22023';
  end if;

  v_dados := coalesce(p_dados, '{}'::jsonb);

  select a.*
    into v_assinatura
  from public.assinaturas a
  where a.id = p_assinatura_id
  for update;

  if not found then
    raise exception 'Assinatura não encontrada.'
      using errcode = 'P0002';
  end if;

  if v_assinatura.status in ('canceled', 'expired', 'suspended') then
    raise exception
      'Estado atual da assinatura não permite confirmação de pagamento.'
      using errcode = '22023';
  end if;

  if not public.transicao_status_assinatura_permitida(
    v_assinatura.status,
    'active'
  ) then
    raise exception
      'Transição para active não permitida a partir de %.',
      v_assinatura.status
      using errcode = '22023';
  end if;

  if v_assinatura.status = 'active'
     and v_assinatura.periodicidade = v_periodicidade
     and v_assinatura.current_period_started_at = p_periodo_inicio
     and v_assinatura.current_period_ends_at = p_periodo_fim
     and v_assinatura.grace_ends_at is null then
    return jsonb_build_object(
      'alterada', false,
      'idempotente', true,
      'assinatura_id', v_assinatura.id,
      'empresa_id', v_assinatura.empresa_id,
      'status', v_assinatura.status,
      'periodicidade', v_assinatura.periodicidade,
      'current_period_started_at', v_assinatura.current_period_started_at,
      'current_period_ends_at', v_assinatura.current_period_ends_at
    );
  end if;

  update public.assinaturas
  set
    status = 'active',
    periodicidade = v_periodicidade,
    current_period_started_at = p_periodo_inicio,
    current_period_ends_at = p_periodo_fim,
    grace_ends_at = null
  where id = v_assinatura.id;

  insert into public.assinatura_eventos (
    empresa_id,
    assinatura_id,
    tipo,
    origem,
    dados
  )
  values (
    v_assinatura.empresa_id,
    v_assinatura.id,
    'pagamento_assinatura_confirmado',
    v_origem,
    v_dados || jsonb_build_object(
      'status_anterior', v_assinatura.status,
      'novo_status', 'active',
      'periodicidade', v_periodicidade,
      'periodo_inicio', p_periodo_inicio,
      'periodo_fim', p_periodo_fim
    )
  );

  return jsonb_build_object(
    'alterada', true,
    'idempotente', false,
    'assinatura_id', v_assinatura.id,
    'empresa_id', v_assinatura.empresa_id,
    'status_anterior', v_assinatura.status,
    'status_atual', 'active',
    'periodicidade', v_periodicidade,
    'current_period_started_at', p_periodo_inicio,
    'current_period_ends_at', p_periodo_fim
  );
end;
$$;

revoke all on function public.confirmar_pagamento_assinatura(
  uuid,
  text,
  timestamptz,
  timestamptz,
  text,
  jsonb
) from public;

revoke all on function public.confirmar_pagamento_assinatura(
  uuid,
  text,
  timestamptz,
  timestamptz,
  text,
  jsonb
) from anon;

revoke all on function public.confirmar_pagamento_assinatura(
  uuid,
  text,
  timestamptz,
  timestamptz,
  text,
  jsonb
) from authenticated;

grant execute on function public.confirmar_pagamento_assinatura(
  uuid,
  text,
  timestamptz,
  timestamptz,
  text,
  jsonb
) to service_role;

comment on function public.confirmar_pagamento_assinatura(
  uuid,
  text,
  timestamptz,
  timestamptz,
  text,
  jsonb
)
is 'Confirma pagamento ou renovação, ativa a assinatura, grava periodicidade e período vigente e limpa grace period. As datas são fornecidas pelo backend/gateway. Uso exclusivo do backend/service_role.';
