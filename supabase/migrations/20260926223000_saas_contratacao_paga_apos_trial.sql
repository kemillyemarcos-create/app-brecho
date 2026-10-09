-- Timestamp canônico nullable, sem default/backfill: eventos A7 anteriores
-- continuam com NULL independentemente de chaves arbitrárias em dados.
alter table public.assinatura_eventos
  add column pagamento_efetivado_at timestamptz;

-- A10: contratação pós-trial e correção temporal de pagamento comprovado.
-- Somente service_role recebe os fluxos financeiros. O timestamp é atestado
-- pelo backend; esta migration não verifica assinaturas criptográficas de gateway.
-- Uma cobrança estável é obrigatória na contratação pós-trial, sem fallback inventado.
create unique index ux_assinatura_eventos_contratacao_charge
on public.assinatura_eventos(external_source, external_charge_id)
where tipo = 'assinatura_paga_contratada_apos_trial'
  and external_source is not null and external_charge_id is not null;

create unique index ux_assinatura_eventos_contratacao_trial
on public.assinatura_eventos((dados ->> 'assinatura_trial_id'))
where tipo = 'assinatura_paga_contratada_apos_trial';

-- Falha fechada para legado ambíguo. Não infere trial a partir de NULLs.
-- Exige evento do onboarding e, quando expired, expiração especializada.
create function public.validar_trial_antecedente_pagamento(p_assinatura_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a public.assinaturas%rowtype;
begin
  select * into v_a from public.assinaturas where id = p_assinatura_id;
  if not found then
    raise exception 'Assinatura antecedente inexistente.' using errcode = '22023';
  end if;
  if v_a.status not in ('trialing', 'expired')
     or v_a.trial_started_at is null or v_a.trial_ends_at is null
     or not isfinite(v_a.trial_started_at) or not isfinite(v_a.trial_ends_at)
     or v_a.trial_ends_at <= v_a.trial_started_at
     or v_a.current_period_started_at is distinct from v_a.trial_started_at
     or v_a.current_period_ends_at is distinct from v_a.trial_ends_at
     or v_a.billing_anchor_at is not null or v_a.periodicidade is not null
     or v_a.canceled_at is not null or v_a.cancel_at_period_end
     or coalesce((
       select e.tipo = 'cancelamento_fim_periodo_agendado'
       from public.assinatura_eventos e
       where e.assinatura_id = v_a.id
         and e.tipo in ('cancelamento_fim_periodo_agendado','cancelamento_fim_periodo_removido')
       order by e.created_at desc, e.id desc limit 1
     ), false)
     or not exists (
       select 1 from public.assinatura_eventos e
       where e.assinatura_id = v_a.id and e.empresa_id = v_a.empresa_id
         and e.tipo = 'trial_iniciado' and e.origem = 'sistema'
     )
     or exists (
       select 1 from public.assinatura_eventos e
       where e.assinatura_id = v_a.id and (
         e.tipo in ('pagamento_assinatura_confirmado',
                    'pagamento_assinatura_ignorado_obsoleto',
                    'assinatura_paga_contratada_apos_trial',
                    'trial_expiracao_corrigida_por_pagamento',
                    'cancelamento_fim_periodo_efetivado')
         or (e.tipo = 'assinatura_status_alterado'
             and e.dados ->> 'novo_status' is distinct from 'trialing')
       )
     ) then
    raise exception 'Antecedente não comprova trial sem contrato pago ou possui causa ambígua.'
      using errcode = '22023';
  end if;
  if v_a.status = 'expired' and not exists (
    select 1 from public.assinatura_eventos e
    where e.assinatura_id = v_a.id and e.empresa_id = v_a.empresa_id
      and e.tipo = 'trial_expirado' and e.origem in ('sistema', 'admin')
      and e.dados ->> 'status_anterior' = 'trialing'
      and e.dados ->> 'novo_status' = 'expired'
      and (e.dados ->> 'trial_ends_at')::timestamptz = v_a.trial_ends_at
  ) then
    raise exception 'Expired sem comprovação de expiração deste trial.' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public.validar_trial_antecedente_pagamento(uuid)
from public, anon, authenticated, service_role;

create or replace function public.confirmar_pagamento_assinatura(
  p_assinatura_id uuid,
  p_periodicidade text,
  p_periodo_inicio timestamptz,
  p_periodo_fim timestamptz,
  p_external_source text,
  p_external_event_id text,
  p_origem text,
  p_external_charge_id text,
  p_dados jsonb,
  p_pagamento_efetivado_at timestamptz
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
  v_empresa_id uuid;
  v_correcao_trial boolean := false;

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

  if p_pagamento_efetivado_at is not null and (
    not isfinite(p_pagamento_efetivado_at) or p_pagamento_efetivado_at > clock_timestamp()
  ) then
    raise exception 'Timestamp efetivo de pagamento inválido ou futuro.' using errcode = '22023';
  end if;

  -- Fórmula EXATAMENTE igual à A5, inclusive o prefixo histórico.
  -- Sucesso e falha disputando a mesma identidade precisam do mesmo lock.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    jsonb_build_array('billing_failure', v_source, v_event_id)::text, 0
  ));

  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Fluxo financeiro exige READ COMMITTED.' using errcode = '22023';
  end if;
  select empresa_id into v_empresa_id from public.assinaturas where id = p_assinatura_id;
  if not found then
    raise exception 'Assinatura não encontrada.' using errcode = 'P0002';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    jsonb_build_array('billing_contratacao', v_empresa_id)::text, 0
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

  if v_assinatura.empresa_id is distinct from v_empresa_id then
    raise exception 'Empresa da assinatura alterada concorrentemente.' using errcode = '22023';
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
       or (v_evento.dados -> 'entrada_externa') is distinct from v_dados
       or v_evento.pagamento_efetivado_at is distinct from p_pagamento_efetivado_at then
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
      billing_period_started_at, billing_period_ends_at, pagamento_efetivado_at
    ) values (
      v_assinatura.empresa_id, v_assinatura.id,
      'pagamento_assinatura_ignorado_obsoleto', v_origem,
      v_dados || jsonb_build_object(
        'entrada_externa', v_dados,
        'operacao', 'confirmar_pagamento_assinatura',
        'pagamento_efetivado_at', p_pagamento_efetivado_at,
        'periodicidade', v_periodicidade, 'origem', v_origem,
        'periodo_inicio', p_periodo_inicio, 'periodo_fim', p_periodo_fim,
        'external_source', v_source, 'external_event_id', v_event_id,
        'external_charge_id', v_charge_id,
        'status_anterior', v_assinatura.status, 'novo_status', v_assinatura.status,
        'motivo', 'ciclo_ja_coberto'
      ),
      v_source, v_event_id, v_charge_id, p_periodo_inicio, p_periodo_fim, p_pagamento_efetivado_at
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

  -- Exceção financeira local; não modifica a matriz genérica.
  if v_assinatura.status in ('trialing', 'expired') then
    if p_pagamento_efetivado_at is null then
      raise exception 'Primeiro pagamento de trial exige timestamp efetivo no overload de dez argumentos.'
        using errcode = '22023';
    end if;
    perform public.validar_trial_antecedente_pagamento(v_assinatura.id);
    if p_pagamento_efetivado_at < v_assinatura.trial_started_at then
      raise exception 'Pagamento antecede o trial informado.' using errcode = '22023';
    end if;
    if p_pagamento_efetivado_at > v_assinatura.trial_ends_at then
      raise exception 'Pagamento posterior ao trial exige contratar_assinatura_paga_apos_trial.'
        using errcode = '22023';
    end if;
    if exists (
      select 1 from public.assinaturas a
      where a.empresa_id = v_assinatura.empresa_id and a.id <> v_assinatura.id
        and (a.status in ('trialing','active','past_due','grace_period','suspended')
             or (a.created_at, a.id) > (v_assinatura.created_at, v_assinatura.id))
    ) then
      raise exception 'Outra assinatura corrente ou posterior impede correção do trial.' using errcode = '22023';
    end if;
    v_correcao_trial := v_assinatura.status = 'expired';
  end if;

  if v_assinatura.status in ('canceled', 'expired', 'suspended') and not v_correcao_trial then
    raise exception
      'Estado atual da assinatura não permite confirmação de pagamento.'
      using errcode = '22023';
  end if;

  if not v_correcao_trial and not public.transicao_status_assinatura_permitida(
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
  if v_assinatura.status = 'trialing' or v_correcao_trial then
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
    billing_period_started_at, billing_period_ends_at, pagamento_efetivado_at
  )
  values (
    v_assinatura.empresa_id,
    v_assinatura.id,
    'pagamento_assinatura_confirmado',
    v_origem,
    v_dados || jsonb_build_object(
      'entrada_externa', v_dados,
      'operacao', 'confirmar_pagamento_assinatura',
        'pagamento_efetivado_at', p_pagamento_efetivado_at,
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
    v_source, v_event_id, v_charge_id, p_periodo_inicio, p_periodo_fim, p_pagamento_efetivado_at
  ) returning id into v_evento_id;

  if v_correcao_trial then
    -- Identidade externa tipada pertence somente ao evento financeiro principal.
    insert into public.assinatura_eventos(empresa_id, assinatura_id, tipo, origem, dados)
    values (v_assinatura.empresa_id, v_assinatura.id,
      'trial_expiracao_corrigida_por_pagamento', v_origem,
      jsonb_build_object(
        'status_anterior', 'expired', 'novo_status', 'active',
        'trial_ends_at', v_assinatura.trial_ends_at,
        'pagamento_efetivado_at', p_pagamento_efetivado_at,
        'external_source', v_source, 'external_event_id', v_event_id,
        'external_charge_id', v_charge_id, 'pagamento_evento_id', v_evento_id,
        'periodo_inicio', p_periodo_inicio, 'periodo_fim', p_periodo_fim,
        'motivo', 'pagamento_efetivado_durante_trial_confirmado_tardiamente'
      ));
  end if;

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
  uuid,text,timestamptz,timestamptz,text,text,text,text,jsonb,timestamptz
) from public, anon, authenticated;
grant execute on function public.confirmar_pagamento_assinatura(
  uuid,text,timestamptz,timestamptz,text,text,text,text,jsonb,timestamptz
) to service_role;

-- Compatibilidade explícita: renovação e replay legado preservados.
-- Trial requer timestamp confiável; não assumir now() nem inferir do período.
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
returns jsonb language sql security definer set search_path = ''
as $$
  select public.confirmar_pagamento_assinatura(
    p_assinatura_id,p_periodicidade,p_periodo_inicio,p_periodo_fim,
    p_external_source,p_external_event_id,p_origem,p_external_charge_id,p_dados,
    null::timestamptz
  );
$$;
revoke all on function public.confirmar_pagamento_assinatura(
  uuid,text,timestamptz,timestamptz,text,text,text,text,jsonb
) from public, anon, authenticated;
grant execute on function public.confirmar_pagamento_assinatura(
  uuid,text,timestamptz,timestamptz,text,text,text,text,jsonb
) to service_role;
-- Overload pré-A7 continua revogado.
revoke all on function public.confirmar_pagamento_assinatura(
  uuid,text,timestamptz,timestamptz,text,jsonb
) from public, anon, authenticated, service_role;

-- Dez parâmetros obrigatórios: chamadas financeiras precisam fornecer identidade
-- e timestamp efetivo explicitamente. p_dados SQL NULL é normalizado para {}.
create function public.contratar_assinatura_paga_apos_trial(
  p_empresa_id uuid,
  p_assinatura_trial_id uuid,
  p_plano_id uuid,
  p_periodicidade text,
  p_contratacao_efetiva_at timestamptz,
  p_external_source text,
  p_external_event_id text,
  p_external_charge_id text,
  p_origem text,
  p_dados jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trial public.assinaturas%rowtype;
  v_evento public.assinatura_eventos%rowtype;
  v_source text := nullif(btrim(p_external_source), '');
  v_event_id text := nullif(btrim(p_external_event_id), '');
  v_charge_id text := nullif(btrim(p_external_charge_id), '');
  v_periodicidade text := lower(nullif(btrim(p_periodicidade), ''));
  v_origem text := lower(nullif(btrim(p_origem), ''));
  v_dados jsonb := coalesce(p_dados, '{}'::jsonb);
  v_agora timestamptz;
  v_fim timestamptz;
  v_nova_id uuid;
  v_evento_id uuid;
  v_limite_usuarios bigint;
  v_tipo_limite text;
  v_ativos_antes bigint;
  v_ativos_depois bigint;
  v_proprietarios_ativos bigint;
  v_desativados uuid[] := array[]::uuid[];
  v_total_desativados bigint;
begin
  if p_empresa_id is null or p_assinatura_trial_id is null or p_plano_id is null then
    raise exception 'Empresa, trial e plano são obrigatórios.' using errcode = '22004';
  end if;
  if v_source is null or v_event_id is null or v_charge_id is null then
    raise exception 'Source, evento e cobrança estável são obrigatórios.' using errcode = '22023';
  end if;
  if v_periodicidade is null or v_periodicidade not in ('mensal','anual')
     or v_origem is null or v_origem not in ('sistema','admin','gateway')
     or jsonb_typeof(v_dados) <> 'object' then
    raise exception 'Periodicidade, origem ou dados inválidos.' using errcode = '22023';
  end if;
  if p_contratacao_efetiva_at is null or not isfinite(p_contratacao_efetiva_at)
     or p_contratacao_efetiva_at > clock_timestamp() then
    raise exception 'Timestamp efetivo inválido ou futuro.' using errcode = '22023';
  end if;
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Contratação exige READ COMMITTED.' using errcode = '22023';
  end if;

  -- Fórmula compartilhada com A5/A7, inclusive prefixo e seed.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    jsonb_build_array('billing_failure', v_source, v_event_id)::text, 0
  ));
  select * into v_evento from public.assinatura_eventos
  where external_source = v_source and external_event_id = v_event_id;
  if found then
    if v_evento.tipo is distinct from 'assinatura_paga_contratada_apos_trial'
       or v_evento.empresa_id is distinct from p_empresa_id
       or v_evento.external_charge_id is distinct from v_charge_id
       or v_evento.origem is distinct from v_origem
       or (v_evento.dados ->> 'assinatura_trial_id') is distinct from p_assinatura_trial_id::text
       or (v_evento.dados ->> 'plano_id') is distinct from p_plano_id::text
       or (v_evento.dados ->> 'periodicidade') is distinct from v_periodicidade
       or v_evento.pagamento_efetivado_at is distinct from p_contratacao_efetiva_at
       or v_evento.billing_period_started_at is distinct from p_contratacao_efetiva_at
       or v_evento.billing_period_ends_at is distinct from public.calcular_fim_periodo_assinatura(
         p_contratacao_efetiva_at, p_contratacao_efetiva_at, v_periodicidade)
       or (v_evento.dados -> 'entrada_externa') is distinct from v_dados then
      raise exception 'Evento externo já registrado com identidade ou operação diferente.' using errcode = '22023';
    end if;
    return jsonb_build_object('alterada',false,'idempotente',true,
      'assinatura_id',v_evento.assinatura_id,'evento_id',v_evento.id,
      'empresa_id',v_evento.empresa_id,
      'current_period_started_at',v_evento.billing_period_started_at,
      'current_period_ends_at',v_evento.billing_period_ends_at);
  end if;

  -- Cobrança serializada inclusive quando reapresentada para outra empresa.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    jsonb_build_array('billing_contratacao_charge',v_source,v_charge_id)::text,0
  ));
  if exists (select 1 from public.assinatura_eventos
    where tipo = 'assinatura_paga_contratada_apos_trial'
      and external_source = v_source and external_charge_id = v_charge_id) then
    raise exception 'Cobrança já utilizada em contratação pós-trial.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    jsonb_build_array('billing_contratacao',p_empresa_id)::text,0
  ));
  perform 1 from public.empresas where id = p_empresa_id and ativo is true for share;
  if not found then
    raise exception 'Empresa inexistente ou inativa.' using errcode = '22023';
  end if;
  select * into v_trial from public.assinaturas
  where id = p_assinatura_trial_id and empresa_id = p_empresa_id for update;
  if not found then
    raise exception 'Trial não pertence à empresa.' using errcode = '22023';
  end if;
  v_agora := clock_timestamp();
  perform public.validar_trial_antecedente_pagamento(v_trial.id);
  if v_trial.trial_ends_at > v_agora
     or p_contratacao_efetiva_at <= v_trial.trial_ends_at then
    raise exception 'Contratação pós-trial exige pagamento posterior ao término do trial.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.assinaturas a
    where a.empresa_id = p_empresa_id and a.id <> v_trial.id
      and (a.status in ('trialing','active','past_due','grace_period','suspended')
           or (a.created_at,a.id) > (v_trial.created_at,v_trial.id))
  ) then
    raise exception 'Outra assinatura corrente ou posterior impede esta contratação.' using errcode = '22023';
  end if;
  if exists (select 1 from public.assinatura_eventos
    where tipo = 'assinatura_paga_contratada_apos_trial'
      and dados ->> 'assinatura_trial_id' = v_trial.id::text) then
    raise exception 'Trial antecedente já utilizado em contratação.' using errcode = '22023';
  end if;

  perform 1 from public.planos where id = p_plano_id and ativo is true for share;
  if not found then
    raise exception 'Plano inexistente ou inativo.' using errcode = '22023';
  end if;
  v_fim := public.calcular_fim_periodo_assinatura(
    p_contratacao_efetiva_at,p_contratacao_efetiva_at,v_periodicidade);

  if v_trial.status = 'trialing' then
    -- Mesmo efeito da expiração especializada, com instante pós-lock.
    -- Não usa now() de uma transação iniciada antes do término do trial.
    update public.assinaturas
    set status='expired', cancel_at_period_end=false, proximo_plano_id=null, grace_ends_at=null
    where id=v_trial.id;
    insert into public.assinatura_eventos(empresa_id,assinatura_id,tipo,origem,dados)
    values(p_empresa_id,v_trial.id,'trial_expirado','sistema',jsonb_build_object(
      'status_anterior','trialing','novo_status','expired','trial_ends_at',v_trial.trial_ends_at,
      'motivo','expiracao_atomica_antes_de_contratacao_paga'));
  end if;

  -- O índice de uma corrente permanece como última defesa contra escritores
  -- que não adotem o advisory. Qualquer erro desfaz também a expiração acima.
  insert into public.assinaturas(
    empresa_id,plano_id,status,trial_started_at,trial_ends_at,
    grace_ends_at,grace_period_started_at,grace_period_ends_at,
    proximo_plano_id,cancel_at_period_end,canceled_at,periodicidade,
    billing_anchor_at,current_period_started_at,current_period_ends_at
  ) values (
    p_empresa_id,p_plano_id,'active',null,null,null,null,null,null,false,null,
    v_periodicidade,p_contratacao_efetiva_at,p_contratacao_efetiva_at,v_fim
  ) returning id into v_nova_id;

  -- A6 não expõe helper de conformidade. Política e locks reproduzidos abaixo;
  -- nenhuma alteração à RPC A6, identidades ou prioridade dos memberships.
    -- A6: apenas depois de A3, cancelamento, hierarquia e guarda temporal A4.
    -- Contagens após espera precisam de snapshots atualizados por comando.
    if current_setting('transaction_isolation') <> 'read committed' then
      raise exception 'Conformidade do downgrade exige isolamento READ COMMITTED.'
        using errcode = '22023';
    end if;

    -- Mesma chave usada por enforce_empresa_usuarios_maximos.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(p_empresa_id::text, 0)
    );

    -- UPDATE de reativação pode já deter a linha antes de aguardar o advisory
    -- lock do trigger. Nunca esperar por essa linha mantendo o advisory lock:
    -- NOWAIT devolve 55P03 e reverte a chamada inteira, permitindo retry externo.
    -- Inclui inativos para estabilizar perfil/prioridade e reativações existentes.
    perform eu.id
    from public.empresa_usuarios eu
    where eu.empresa_id = p_empresa_id
    order by eu.id
    for update of eu nowait;

    select pr.tipo, pr.valor_inteiro
      into v_tipo_limite, v_limite_usuarios
    from public.plano_recursos pr
    where pr.plano_id = p_plano_id
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
    where eu.empresa_id = p_empresa_id and eu.ativo is true;

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
        where eu.empresa_id = p_empresa_id and eu.ativo is true
      ) r
      where r.posicao > v_limite_usuarios;

      update public.empresa_usuarios
      set ativo = false
      where empresa_id = p_empresa_id
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
    where eu.empresa_id = p_empresa_id and eu.ativo is true;

    if v_ativos_depois <> least(v_ativos_antes, v_limite_usuarios)
       or v_proprietarios_ativos = 0 then
      raise exception 'Conformidade de memberships não preservou limite e proprietário.'
        using errcode = '22023';
    end if;



  insert into public.assinatura_eventos(
    empresa_id,assinatura_id,tipo,origem,dados,
    external_source,external_event_id,external_charge_id,
    billing_period_started_at,billing_period_ends_at,pagamento_efetivado_at
  ) values (
    p_empresa_id,v_nova_id,'assinatura_paga_contratada_apos_trial',v_origem,
    v_dados || jsonb_build_object(
      'entrada_externa',v_dados,'operacao','contratar_assinatura_paga_apos_trial',
      'empresa_id',p_empresa_id,'assinatura_trial_id',v_trial.id,'assinatura_id',v_nova_id,
      'plano_id',p_plano_id,'periodicidade',v_periodicidade,
      'contratacao_efetiva_at',p_contratacao_efetiva_at,'billing_anchor_at',p_contratacao_efetiva_at,
      'periodo_inicio',p_contratacao_efetiva_at,'periodo_fim',v_fim,
      'external_source',v_source,'external_event_id',v_event_id,'external_charge_id',v_charge_id,
      'origem',v_origem,'novo_status','active'
    ),v_source,v_event_id,v_charge_id,p_contratacao_efetiva_at,v_fim,p_contratacao_efetiva_at
  ) returning id into v_evento_id;

  if cardinality(v_desativados)>0 then
    insert into public.assinatura_eventos(empresa_id,assinatura_id,tipo,origem,dados)
    values(p_empresa_id,v_nova_id,'memberships_desativados_por_contratacao',v_origem,
      jsonb_build_object('empresa_id',p_empresa_id,'assinatura_id',v_nova_id,
        'plano_id',p_plano_id,'limite_novo',v_limite_usuarios,
        'ativos_antes',v_ativos_antes,'ativos_depois',v_ativos_depois,
        'membership_ids_desativados',to_jsonb(v_desativados)));
  end if;
  return jsonb_build_object('alterada',true,'idempotente',false,
    'assinatura_id',v_nova_id,'assinatura_trial_id',v_trial.id,'empresa_id',p_empresa_id,
    'evento_id',v_evento_id,'status','active','plano_id',p_plano_id,
    'periodicidade',v_periodicidade,'billing_anchor_at',p_contratacao_efetiva_at,
    'current_period_started_at',p_contratacao_efetiva_at,'current_period_ends_at',v_fim);
end;
$$;
revoke all on function public.contratar_assinatura_paga_apos_trial(
  uuid,uuid,uuid,text,timestamptz,text,text,text,text,jsonb
) from public,anon,authenticated;
grant execute on function public.contratar_assinatura_paga_apos_trial(
  uuid,uuid,uuid,text,timestamptz,text,text,text,text,jsonb
) to service_role;
