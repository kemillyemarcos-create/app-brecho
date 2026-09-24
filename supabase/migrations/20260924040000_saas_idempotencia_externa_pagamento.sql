-- A7: identidade externa do sucesso de pagamento, sem backfill ou novo schema.
-- external_source deve identificar um namespace estável suficiente:
-- provedor + ambiente + conta/merchant. Formato não imposto nesta etapa.
-- Origem é obrigatória no novo overload: 7..9 argumentos, contra 4..6 no antigo.
-- A5 permanece inalterado: pode reconhecer genericamente uma chave de pagamento
-- como replay se os campos que compara coincidirem, mas nunca reaplica a falha.
revoke all on function public.confirmar_pagamento_assinatura(
  uuid, text, timestamptz, timestamptz, text, jsonb
) from public, anon, authenticated, service_role;

create or replace function public.confirmar_pagamento_assinatura(
  p_assinatura_id uuid,
  p_periodicidade text,
  p_periodo_inicio timestamptz,
  p_periodo_fim timestamptz,
  p_external_source text,
  p_external_event_id text,
  p_origem text,
  p_external_charge_id text default null,
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
  v_source text;
  v_event_id text;
  v_charge_id text;
  v_evento public.assinatura_eventos%rowtype;
  v_evento_id uuid;

  v_anchor_at timestamptz;
  v_periodo_fim_esperado timestamptz;
  v_eh_renovacao boolean := false;
  v_aplicar_downgrade boolean := false;

  v_plano_anterior_id uuid;
  v_plano_atual_id uuid;
  v_plano_atual_ordem integer;
  v_plano_pendente_ordem integer;
  v_plano_pendente_ativo boolean;

  v_limite_usuarios bigint;
  v_tipo_limite text;
  v_ativos_antes bigint;
  v_ativos_depois bigint;
  v_proprietarios_ativos bigint;
  v_desativados uuid[] := array[]::uuid[];
  v_total_desativados bigint;
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

  if not isfinite(p_periodo_inicio) or not isfinite(p_periodo_fim)
     or p_periodo_fim <= p_periodo_inicio then
    raise exception 'Período de cobrança inválido.'
      using errcode = '22023';
  end if;

  if v_origem is null
     or v_origem not in ('sistema', 'admin', 'gateway') then
    raise exception 'Origem de evento inválida.'
      using errcode = '22023';
  end if;

  if p_dados is not null and jsonb_typeof(p_dados) <> 'object' then
    raise exception 'Dados do evento devem ser um objeto JSON.' using errcode = '22023';
  end if;

  v_dados := coalesce(p_dados, '{}'::jsonb);

  v_source := nullif(btrim(p_external_source), '');
  v_event_id := nullif(btrim(p_external_event_id), '');
  v_charge_id := nullif(btrim(p_external_charge_id), '');
  if v_source is null or v_event_id is null
     or (p_external_charge_id is not null and v_charge_id is null) then
    raise exception 'Identificadores externos não podem ser vazios.' using errcode = '22023';
  end if;

  -- Fórmula EXATAMENTE igual à A5, inclusive o prefixo histórico.
  -- Sucesso e falha disputando a mesma identidade precisam do mesmo lock.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    jsonb_build_array('billing_failure', v_source, v_event_id)::text, 0
  ));

  select a.*
    into v_assinatura
  from public.assinaturas a
  where a.id = p_assinatura_id
  for update;

  if not found then
    raise exception 'Assinatura não encontrada.'
      using errcode = 'P0002';
  end if;

  select e.* into v_evento
  from public.assinatura_eventos e
  where e.external_source = v_source and e.external_event_id = v_event_id;

  if found then
    if v_evento.tipo is null or v_evento.tipo not in (
         'pagamento_assinatura_confirmado', 'pagamento_assinatura_ignorado_obsoleto'
       )
       or v_evento.assinatura_id is distinct from p_assinatura_id
       or v_evento.billing_period_started_at is distinct from p_periodo_inicio
       or v_evento.billing_period_ends_at is distinct from p_periodo_fim
       or v_evento.external_charge_id is distinct from v_charge_id
       or (v_evento.dados ->> 'periodicidade') is distinct from v_periodicidade
       or v_evento.origem is distinct from v_origem
       or (v_evento.dados -> 'entrada_externa') is distinct from v_dados then
      raise exception 'Evento externo já registrado com identidade ou operação diferente.'
        using errcode = '22023';
    end if;
    -- Reconhecer processamento anterior nunca restaura estado/plano/grace.
    return jsonb_build_object(
      'alterada', false, 'idempotente', true,
      'ignorada', v_evento.tipo = 'pagamento_assinatura_ignorado_obsoleto',
      'motivo', 'evento_ja_processado', 'evento_id', v_evento.id,
      'assinatura_id', v_assinatura.id, 'empresa_id', v_assinatura.empresa_id,
      'status', v_assinatura.status, 'plano_id', v_assinatura.plano_id,
      'proximo_plano_id', v_assinatura.proximo_plano_id,
      'periodicidade', v_assinatura.periodicidade,
      'current_period_started_at', v_assinatura.current_period_started_at,
      'current_period_ends_at', v_assinatura.current_period_ends_at
    );
  end if;

  -- Sem inferir pagamento a partir de trial ou legado sem âncora comprovada.
  -- Estados posteriores (inclusive canceled/grace/past_due) não apagam cobertura.
  if v_assinatura.status <> 'trialing'
     and v_assinatura.billing_anchor_at is not null
     and v_assinatura.periodicidade is not null
     and v_assinatura.current_period_started_at is not null
     and v_assinatura.current_period_ends_at is not null
     and isfinite(v_assinatura.current_period_started_at)
     and isfinite(v_assinatura.current_period_ends_at)
     and v_assinatura.current_period_ends_at > v_assinatura.current_period_started_at
     and (
       (v_assinatura.current_period_started_at <= p_periodo_inicio
        and v_assinatura.current_period_ends_at >= p_periodo_fim)
       or v_assinatura.current_period_started_at >= p_periodo_fim
     ) then
    -- Cobertura não autoriza períodos arbitrários nem periodicidade divergente.
    if v_periodicidade is distinct from v_assinatura.periodicidade then
      raise exception 'Periodicidade do pagamento incompatível com a assinatura.'
        using errcode = '22023';
    end if;
    if p_periodo_fim <> public.calcular_fim_periodo_assinatura(
      v_assinatura.billing_anchor_at, p_periodo_inicio, v_periodicidade
    ) then
      raise exception 'Ciclo do pagamento incompatível com a âncora comercial.'
        using errcode = '22023';
    end if;

    insert into public.assinatura_eventos (
      empresa_id, assinatura_id, tipo, origem, dados,
      external_source, external_event_id, external_charge_id,
      billing_period_started_at, billing_period_ends_at
    ) values (
      v_assinatura.empresa_id, v_assinatura.id,
      'pagamento_assinatura_ignorado_obsoleto', v_origem,
      v_dados || jsonb_build_object(
        'entrada_externa', v_dados,
        'operacao', 'confirmar_pagamento_assinatura',
        'periodicidade', v_periodicidade, 'origem', v_origem,
        'periodo_inicio', p_periodo_inicio, 'periodo_fim', p_periodo_fim,
        'external_source', v_source, 'external_event_id', v_event_id,
        'external_charge_id', v_charge_id,
        'status_anterior', v_assinatura.status, 'novo_status', v_assinatura.status,
        'motivo', 'ciclo_ja_coberto'
      ),
      v_source, v_event_id, v_charge_id, p_periodo_inicio, p_periodo_fim
    ) returning id into v_evento_id;

    return jsonb_build_object(
      'alterada', false, 'idempotente', false, 'ignorada', true,
      'motivo', 'ciclo_ja_coberto', 'evento_id', v_evento_id,
      'assinatura_id', v_assinatura.id, 'empresa_id', v_assinatura.empresa_id,
      'status', v_assinatura.status,
      'current_period_started_at', v_assinatura.current_period_started_at,
      'current_period_ends_at', v_assinatura.current_period_ends_at
    );
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

    -- A6: apenas depois de A3, cancelamento, hierarquia e guarda temporal A4.
    -- Contagens após espera precisam de snapshots atualizados por comando.
    if current_setting('transaction_isolation') <> 'read committed' then
      raise exception 'Conformidade do downgrade exige isolamento READ COMMITTED.'
        using errcode = '22023';
    end if;

    -- Mesma chave usada por enforce_empresa_usuarios_maximos.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_assinatura.empresa_id::text, 0)
    );

    -- UPDATE de reativação pode já deter a linha antes de aguardar o advisory
    -- lock do trigger. Nunca esperar por essa linha mantendo o advisory lock:
    -- NOWAIT devolve 55P03 e reverte a chamada inteira, permitindo retry externo.
    -- Inclui inativos para estabilizar perfil/prioridade e reativações existentes.
    perform eu.id
    from public.empresa_usuarios eu
    where eu.empresa_id = v_assinatura.empresa_id
    order by eu.id
    for update of eu nowait;

    select pr.tipo, pr.valor_inteiro
      into v_tipo_limite, v_limite_usuarios
    from public.plano_recursos pr
    where pr.plano_id = v_assinatura.proximo_plano_id
      and pr.recurso = 'usuarios_maximos'
    for share of pr;

    if not found or v_tipo_limite is distinct from 'integer'
       or v_limite_usuarios is null or v_limite_usuarios < 1 then
      raise exception 'Plano destino sem limite de usuários válido.'
        using errcode = '22023';
    end if;

    select count(*), count(*) filter (where eu.perfil = 'PROPRIETARIO')
      into v_ativos_antes, v_proprietarios_ativos
    from public.empresa_usuarios eu
    where eu.empresa_id = v_assinatura.empresa_id and eu.ativo is true;

    -- Não inventar proprietário para dados legados inconsistentes.
    if v_proprietarios_ativos = 0 then
      raise exception 'Downgrade exige ao menos um proprietário ativo.'
        using errcode = '22023';
    end if;

    if v_ativos_antes > v_limite_usuarios then
      select coalesce(array_agg(r.id order by r.posicao), array[]::uuid[])
        into v_desativados
      from (
        select eu.id, row_number() over (
          order by
            case eu.perfil when 'PROPRIETARIO' then 0 when 'ADMIN' then 1 else 2 end,
            eu.prioridade_retencao asc nulls last,
            eu.created_at asc,
            eu.id asc
        ) as posicao
        from public.empresa_usuarios eu
        where eu.empresa_id = v_assinatura.empresa_id and eu.ativo is true
      ) r
      where r.posicao > v_limite_usuarios;

      update public.empresa_usuarios
      set ativo = false
      where empresa_id = v_assinatura.empresa_id
        and id = any(v_desativados) and ativo is true;
      get diagnostics v_total_desativados = row_count;

      if v_total_desativados <> v_ativos_antes - v_limite_usuarios then
        raise exception 'Quantidade de memberships desativados inconsistente.'
          using errcode = '22023';
      end if;
    end if;

    select count(*), count(*) filter (where eu.perfil = 'PROPRIETARIO')
      into v_ativos_depois, v_proprietarios_ativos
    from public.empresa_usuarios eu
    where eu.empresa_id = v_assinatura.empresa_id and eu.ativo is true;

    if v_ativos_depois <> least(v_ativos_antes, v_limite_usuarios)
       or v_proprietarios_ativos = 0 then
      raise exception 'Conformidade de memberships não preservou limite e proprietário.'
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
    grace_ends_at = null,
    grace_period_started_at = null,
    grace_period_ends_at = null
  where id = v_assinatura.id;

  insert into public.assinatura_eventos (
    empresa_id,
    assinatura_id,
    tipo,
    origem,
    dados,
    external_source, external_event_id, external_charge_id,
    billing_period_started_at, billing_period_ends_at
  )
  values (
    v_assinatura.empresa_id,
    v_assinatura.id,
    'pagamento_assinatura_confirmado',
    v_origem,
    v_dados || jsonb_build_object(
      'entrada_externa', v_dados,
      'operacao', 'confirmar_pagamento_assinatura',
      'origem', v_origem,
      'external_source', v_source, 'external_event_id', v_event_id,
      'external_charge_id', v_charge_id,
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
    ),
    v_source, v_event_id, v_charge_id, p_periodo_inicio, p_periodo_fim
  ) returning id into v_evento_id;

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

  if cardinality(v_desativados) > 0 then
    insert into public.assinatura_eventos (
      empresa_id, assinatura_id, tipo, origem, dados
    ) values (
      v_assinatura.empresa_id, v_assinatura.id,
      'memberships_desativados_por_downgrade', v_origem,
      jsonb_build_object(
        'empresa_id', v_assinatura.empresa_id,
        'assinatura_id', v_assinatura.id,
        'plano_anterior_id', v_plano_anterior_id,
        'novo_plano_id', v_plano_atual_id,
        'limite_novo', v_limite_usuarios,
        'ativos_antes', v_ativos_antes,
        'ativos_depois', v_ativos_depois,
        'membership_ids_desativados', to_jsonb(v_desativados)
      )
    );
  end if;

  return jsonb_build_object(
    'evento_id', v_evento_id,
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
  uuid, text, timestamptz, timestamptz, text, text, text, text, jsonb
) from public, anon, authenticated;

grant execute on function public.confirmar_pagamento_assinatura(
  uuid, text, timestamptz, timestamptz, text, text, text, text, jsonb
) to service_role;

comment on function public.confirmar_pagamento_assinatura(
  uuid, text, timestamptz, timestamptz, text, text, text, text, jsonb
)
is 'Confirma pagamento com identidade externa imutável e auditoria de ciclos obsoletos. Preserva A3–A6. external_source deve distinguir provedor/ambiente/conta. Uso exclusivo do backend/service_role.';
