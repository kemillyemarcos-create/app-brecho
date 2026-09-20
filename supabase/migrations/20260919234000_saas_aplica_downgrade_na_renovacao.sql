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

  v_eh_renovacao boolean := false;
  v_aplicar_downgrade boolean := false;

  v_plano_anterior_id uuid;
  v_plano_atual_id uuid;
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

  /*
   * Idempotência: o mesmo pagamento/webhook já foi aplicado.
   */
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
      'plano_id', v_assinatura.plano_id,
      'proximo_plano_id', v_assinatura.proximo_plano_id,
      'periodicidade', v_assinatura.periodicidade,
      'current_period_started_at', v_assinatura.current_period_started_at,
      'current_period_ends_at', v_assinatura.current_period_ends_at
    );
  end if;

  /*
   * Proteção contra webhook antigo ou fora de ordem.
   * Depois que existe um período mais novo, não permitimos regredir
   * current_period_ends_at.
   */
  if v_assinatura.current_period_ends_at is not null
     and p_periodo_fim <= v_assinatura.current_period_ends_at then
    raise exception
      'Período informado não é posterior ao período atualmente registrado.'
      using errcode = '22023';
  end if;

  /*
   * Consideramos renovação quando o novo ciclo começa na data ou depois
   * do término do ciclo anteriormente registrado.
   */
  v_eh_renovacao :=
    v_assinatura.current_period_ends_at is not null
    and p_periodo_inicio >= v_assinatura.current_period_ends_at;

  /*
   * Cancelamento agendado vence sobre uma tentativa de renovação.
   * O backend/gateway não deve criar novo ciclo após o término contratado.
   */
  if v_eh_renovacao
     and v_assinatura.cancel_at_period_end then
    raise exception
      'Assinatura possui cancelamento agendado para o fim do período.'
      using errcode = '22023';
  end if;

  /*
   * Downgrade pendente só é consumido quando a renovação é efetivamente
   * confirmada. Falha de cobrança/grace period não troca o plano antes disso.
   */
  v_aplicar_downgrade :=
    v_eh_renovacao
    and v_assinatura.proximo_plano_id is not null;

  v_plano_anterior_id := v_assinatura.plano_id;

  if v_aplicar_downgrade then
    v_plano_atual_id := v_assinatura.proximo_plano_id;
  else
    v_plano_atual_id := v_assinatura.plano_id;
  end if;

  update public.assinaturas
  set
    status = 'active',
    plano_id = v_plano_atual_id,
    proximo_plano_id = case
      when v_aplicar_downgrade then null
      else proximo_plano_id
    end,
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
      'plano_anterior_id', v_plano_anterior_id,
      'plano_atual_id', v_plano_atual_id,
      'periodicidade', v_periodicidade,
      'periodo_inicio', p_periodo_inicio,
      'periodo_fim', p_periodo_fim,
      'renovacao', v_eh_renovacao,
      'downgrade_aplicado', v_aplicar_downgrade
    )
  );

  if v_aplicar_downgrade then
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
      'downgrade_plano_aplicado',
      v_origem,
      v_dados || jsonb_build_object(
        'plano_anterior_id', v_plano_anterior_id,
        'novo_plano_id', v_plano_atual_id,
        'efetivo_em', p_periodo_inicio,
        'periodo_fim', p_periodo_fim
      )
    );
  end if;

  return jsonb_build_object(
    'alterada', true,
    'idempotente', false,
    'assinatura_id', v_assinatura.id,
    'empresa_id', v_assinatura.empresa_id,
    'status_anterior', v_assinatura.status,
    'status_atual', 'active',
    'plano_anterior_id', v_plano_anterior_id,
    'plano_atual_id', v_plano_atual_id,
    'downgrade_aplicado', v_aplicar_downgrade,
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
is 'Confirma pagamento ou renovação, impede regressão de período, respeita cancelamento agendado e aplica downgrade pendente somente na renovação efetivamente confirmada. Uso exclusivo do backend/service_role.';
