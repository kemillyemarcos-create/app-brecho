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

  v_anchor_at timestamptz;
  v_periodo_fim_esperado timestamptz;
  v_eh_renovacao boolean := false;
  v_aplicar_downgrade boolean := false;

  v_plano_anterior_id uuid;
  v_plano_atual_id uuid;
  v_plano_atual_ordem integer;
  v_plano_pendente_ordem integer;
  v_plano_pendente_ativo boolean;
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

  v_anchor_at := v_assinatura.billing_anchor_at;

  -- Trial: a origem comercial é o término do benefício gratuito.
  if v_assinatura.status = 'trialing' then
    if v_assinatura.trial_ends_at is null then
      raise exception 'Trial sem data de término configurada.' using errcode = '22023';
    end if;
    if p_periodo_inicio <> v_assinatura.trial_ends_at then
      raise exception 'O primeiro ciclo pago deve começar exatamente no fim do trial.'
        using errcode = '22023';
    end if;
    if v_anchor_at is not null and v_anchor_at <> v_assinatura.trial_ends_at then
      raise exception 'Âncora existente incompatível com o trial.' using errcode = '22023';
    end if;
    v_anchor_at := v_assinatura.trial_ends_at;
    v_eh_renovacao := false;

  -- Suporte restrito ao primeiro ciclo sem trial, sem inferir origem de legado.
  -- A fundadora conhecida possui current_period_started_at e não entra aqui.
  elsif v_assinatura.status = 'active'
     and v_assinatura.trial_started_at is null
     and v_assinatura.trial_ends_at is null
     and v_assinatura.current_period_started_at is null
     and v_assinatura.current_period_ends_at is null
     and v_assinatura.periodicidade is null
     and v_anchor_at is null then
    v_anchor_at := p_periodo_inicio;
    v_eh_renovacao := false;
  else
    if v_anchor_at is null then
      raise exception 'Renovação sem âncora comercial comprovada.' using errcode = '22023';
    end if;
    if v_assinatura.current_period_ends_at is null then
      raise exception 'Renovação exige término do ciclo pago atual.' using errcode = '22023';
    end if;
    if p_periodo_inicio <> v_assinatura.current_period_ends_at then
      raise exception 'Renovação deve começar exatamente no término do ciclo atual.'
        using errcode = '22023';
    end if;
    -- Mudança de periodicidade exige contrato próprio, fora desta missão.
    if v_assinatura.periodicidade is distinct from v_periodicidade then
      raise exception 'Mudança de periodicidade não suportada neste fluxo.' using errcode = '22023';
    end if;
    v_eh_renovacao := true;
  end if;

  v_periodo_fim_esperado := public.calcular_fim_periodo_assinatura(
    v_anchor_at, p_periodo_inicio, v_periodicidade
  );
  if p_periodo_fim <> v_periodo_fim_esperado then
    raise exception 'Término do ciclo incompatível com a âncora e periodicidade.'
      using errcode = '22023';
  end if;

  -- Cancelamento impede criar o próximo ciclo, inclusive após o trial.
  -- Replay exato já retornou sem alteração antes desta guarda.
  if v_assinatura.cancel_at_period_end then
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
    -- Revalida o catálogo antes de tratar a pendência como downgrade real.
    -- SHARE preserva a hierarquia/atividade consultada até o fim da transação.
    select atual.ordem_comercial, pendente.ordem_comercial, pendente.ativo
      into v_plano_atual_ordem, v_plano_pendente_ordem, v_plano_pendente_ativo
    from public.planos atual
    join public.planos pendente on pendente.id = v_assinatura.proximo_plano_id
    where atual.id = v_assinatura.plano_id
    for share of atual, pendente;

    if not found
       or v_plano_atual_ordem is null
       or v_plano_pendente_ordem is null
       or v_plano_pendente_ativo is not true
       or v_plano_pendente_ordem >= v_plano_atual_ordem then
      raise exception 'Plano pendente não caracteriza downgrade comercial válido.'
        using errcode = '22023';
    end if;

    if p_periodo_inicio > now() then
      raise exception 'Downgrade agendado só pode ser efetivado no início do próximo período.'
        using errcode = '22023';
    end if;

    v_plano_atual_id := v_assinatura.proximo_plano_id;
  else
    v_plano_atual_id := v_assinatura.plano_id;
  end if;

  update public.assinaturas
  set
    status = 'active',
    billing_anchor_at = v_anchor_at,
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
      'billing_anchor_at', v_anchor_at,
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
is 'Confirma ciclo inicial ou renovação com âncora comercial durável, continuidade e limites de calendário UTC validados. Preserva idempotência, bloqueia cancelamento agendado e aplica downgrade somente na renovação. Uso exclusivo do backend/service_role.';
