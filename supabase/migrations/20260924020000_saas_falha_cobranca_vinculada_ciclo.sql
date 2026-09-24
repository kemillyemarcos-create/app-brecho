-- A5: identidade externa e ciclo tipado. Sem defaults ou backfill.
alter table public.assinatura_eventos
  add column external_source text,
  add column external_event_id text,
  add column external_charge_id text,
  add column billing_period_started_at timestamptz,
  add column billing_period_ends_at timestamptz;

create unique index ux_assinatura_eventos_external_event
on public.assinatura_eventos(external_source, external_event_id)
where external_source is not null and external_event_id is not null;

alter table public.assinaturas
  add column grace_period_started_at timestamptz,
  add column grace_period_ends_at timestamptz,
  add constraint assinaturas_grace_ciclo_check check (
    grace_period_started_at is null or grace_period_ends_at is null
    or grace_period_ends_at >= grace_period_started_at
  );

comment on column public.assinaturas.grace_period_started_at
is 'Início do ciclo comercial cuja cobrança falhou; não é o início da tolerância.';
comment on column public.assinaturas.grace_period_ends_at
is 'Fim do ciclo comercial cuja cobrança falhou; grace_ends_at continua sendo o fim da tolerância.';

-- O overload sem identidade de ciclo não pode ser usado pelo backend.
revoke all on function public.iniciar_grace_period_assinatura(uuid, text, jsonb)
from public, anon, authenticated, service_role;

create or replace function public.iniciar_grace_period_assinatura(
  p_assinatura_id uuid,
  p_periodo_inicio timestamptz,
  p_periodo_fim timestamptz,
  p_external_source text,
  p_external_event_id text,
  p_external_charge_id text default null,
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
  v_evento public.assinatura_eventos%rowtype;
  v_source text;
  v_event_id text;
  v_charge_id text;
  v_origem text;
  v_dados jsonb;
  v_tipo text;
  v_motivo text;
  v_alterada boolean := false;
  v_idempotente boolean := false;
  v_grace_ends_at timestamptz;
begin
  if p_assinatura_id is null then
    raise exception 'Assinatura não informada.' using errcode = '22004';
  end if;
  if p_periodo_inicio is null or p_periodo_fim is null
     or not isfinite(p_periodo_inicio) or not isfinite(p_periodo_fim)
     or p_periodo_fim <= p_periodo_inicio then
    raise exception 'Ciclo comercial inválido.' using errcode = '22023';
  end if;

  v_source := nullif(btrim(p_external_source), '');
  v_event_id := nullif(btrim(p_external_event_id), '');
  v_charge_id := nullif(btrim(p_external_charge_id), '');
  if v_source is null or v_event_id is null
     or (p_external_charge_id is not null and v_charge_id is null) then
    raise exception 'Identificadores externos não podem ser vazios.' using errcode = '22023';
  end if;
  v_origem := lower(nullif(btrim(p_origem), ''));
  if v_origem is null or v_origem not in ('sistema', 'usuario', 'admin', 'gateway') then
    raise exception 'Origem de evento inválida.' using errcode = '22023';
  end if;
  if p_dados is not null and jsonb_typeof(p_dados) <> 'object' then
    raise exception 'Dados do evento devem ser um objeto JSON.' using errcode = '22023';
  end if;

  v_dados := coalesce(p_dados, '{}'::jsonb);

  -- Mesma ordem em todas as chamadas: chave externa, depois assinatura.
  -- Serializa inclusive reutilização da chave em assinaturas diferentes.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    jsonb_build_array('billing_failure', v_source, v_event_id)::text, 0
  ));

  select a.* into v_assinatura
  from public.assinaturas a where a.id = p_assinatura_id for update;
  if not found then
    raise exception 'Assinatura não encontrada.' using errcode = 'P0002';
  end if;

  select e.* into v_evento
  from public.assinatura_eventos e
  where e.external_source = v_source and e.external_event_id = v_event_id;
  if found then
    -- A mesma chave exige identidade, origem e entrada externa equivalentes.
    if v_evento.assinatura_id is distinct from p_assinatura_id
       or v_evento.billing_period_started_at is distinct from p_periodo_inicio
       or v_evento.billing_period_ends_at is distinct from p_periodo_fim
       or v_evento.external_charge_id is distinct from v_charge_id
       or v_evento.origem is distinct from v_origem
       or (v_evento.dados -> 'entrada_externa') is distinct from v_dados then
      raise exception 'Evento externo já registrado com identidade diferente.' using errcode = '22023';
    end if;
    return jsonb_build_object(
      'alterada', false, 'idempotente', true, 'evento_id', v_evento.id,
      'assinatura_id', v_assinatura.id, 'empresa_id', v_assinatura.empresa_id,
      'status', v_assinatura.status, 'motivo', 'evento_ja_processado'
    );
  end if;

  -- Não inferir cobrança para fundadora, trial ou legado sem origem comprovada.
  if v_assinatura.status = 'trialing'
     or v_assinatura.billing_anchor_at is null
     or v_assinatura.periodicidade is null then
    raise exception 'Assinatura sem ciclo pago comprovável.' using errcode = '22023';
  end if;
  if p_periodo_fim <> public.calcular_fim_periodo_assinatura(
    v_assinatura.billing_anchor_at, p_periodo_inicio, v_assinatura.periodicidade
  ) then
    raise exception 'Ciclo da falha incompatível com a âncora comercial.' using errcode = '22023';
  end if;

  -- O período corrente contém o ciclo cobrado, ou já é posterior a ele.
  if v_assinatura.current_period_started_at is not null
     and v_assinatura.current_period_ends_at is not null
     and isfinite(v_assinatura.current_period_started_at)
     and isfinite(v_assinatura.current_period_ends_at)
     and v_assinatura.current_period_ends_at > v_assinatura.current_period_started_at
     and (
       (v_assinatura.current_period_started_at <= p_periodo_inicio
        and v_assinatura.current_period_ends_at >= p_periodo_fim)
       or v_assinatura.current_period_started_at >= p_periodo_fim
     ) then
    v_tipo := 'falha_cobranca_ignorada_obsoleta';
    v_motivo := 'ciclo_ja_coberto';
  else
    if v_assinatura.current_period_ends_at is null
       or not isfinite(v_assinatura.current_period_ends_at)
       or p_periodo_inicio <> v_assinatura.current_period_ends_at then
      raise exception 'Falha deve corresponder exatamente ao próximo ciclo não pago.' using errcode = '22023';
    end if;
    if p_periodo_inicio > now() then
      raise exception 'Não é permitido iniciar grace para ciclo futuro.' using errcode = '22023';
    end if;

    if v_assinatura.status = 'grace_period' then
      if v_assinatura.grace_period_started_at is distinct from p_periodo_inicio
         or v_assinatura.grace_period_ends_at is distinct from p_periodo_fim then
        raise exception 'Grace existente pertence a ciclo diferente ou não identificado.' using errcode = '22023';
      end if;
      v_tipo := 'falha_cobranca_ignorada_grace_existente';
      v_motivo := 'grace_ja_aberto_para_ciclo';
      v_idempotente := true;
    elsif v_assinatura.status = 'active' then
      if not public.transicao_status_assinatura_permitida('active', 'grace_period') then
        raise exception 'Transição para grace period não permitida.' using errcode = '22023';
      end if;
      -- Sete dias no calendário UTC do ciclo; nunca a partir da entrega.
      v_grace_ends_at := ((p_periodo_inicio at time zone 'UTC') + interval '7 days') at time zone 'UTC';
      update public.assinaturas
      set status = 'grace_period', grace_ends_at = v_grace_ends_at,
          grace_period_started_at = p_periodo_inicio,
          grace_period_ends_at = p_periodo_fim
      where id = v_assinatura.id;
      v_tipo := 'grace_period_iniciado';
      v_motivo := 'falha_ciclo_nao_pago';
      v_alterada := true;
    else
      raise exception 'Estado atual não permite iniciar grace period.' using errcode = '22023';
    end if;
  end if;

  -- Também persiste eventos ignorados: nova entrega da mesma chave é no-op.
  insert into public.assinatura_eventos (
    empresa_id, assinatura_id, tipo, origem, dados,
    external_source, external_event_id, external_charge_id,
    billing_period_started_at, billing_period_ends_at
  ) values (
    v_assinatura.empresa_id, v_assinatura.id, v_tipo, v_origem,
    v_dados || jsonb_build_object(
      'entrada_externa', v_dados,
      'status_anterior', v_assinatura.status,
      'novo_status', case when v_alterada then 'grace_period' else v_assinatura.status end,
      'motivo', v_motivo, 'grace_dias', 7,
      'grace_ends_at', case when v_alterada then v_grace_ends_at else v_assinatura.grace_ends_at end,
      'external_source', v_source, 'external_event_id', v_event_id,
      'external_charge_id', v_charge_id,
      'billing_period_started_at', p_periodo_inicio, 'billing_period_ends_at', p_periodo_fim
    ),
    v_source, v_event_id, v_charge_id, p_periodo_inicio, p_periodo_fim
  ) returning * into v_evento;

  return jsonb_build_object(
    'alterada', v_alterada, 'idempotente', v_idempotente,
    'ignorada', not v_alterada, 'motivo', v_motivo,
    'evento_id', v_evento.id, 'assinatura_id', v_assinatura.id,
    'empresa_id', v_assinatura.empresa_id,
    'status', case when v_alterada then 'grace_period' else v_assinatura.status end,
    'grace_ends_at', case when v_alterada then v_grace_ends_at else v_assinatura.grace_ends_at end
  );
end;
$$;

revoke all on function public.iniciar_grace_period_assinatura(uuid, timestamptz, timestamptz, text, text, text, text, jsonb)
from public, anon, authenticated;
grant execute on function public.iniciar_grace_period_assinatura(uuid, timestamptz, timestamptz, text, text, text, text, jsonb)
to service_role;


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

  if p_dados is not null and jsonb_typeof(p_dados) <> 'object' then
    raise exception 'Dados do evento devem ser um objeto JSON.' using errcode = '22023';
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
    grace_ends_at = null,
    grace_period_started_at = null,
    grace_period_ends_at = null
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

create or replace function public.encerrar_grace_period_assinatura(
  p_assinatura_id uuid,
  p_origem text default 'sistema',
  p_dados jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assinatura public.assinaturas%rowtype;
  v_origem text;
  v_dados jsonb;
begin
  if p_assinatura_id is null then
    raise exception 'Assinatura não informada.'
      using errcode = '22004';
  end if;

  v_origem := lower(nullif(btrim(p_origem), ''));

  if v_origem is null
     or v_origem not in ('sistema', 'admin', 'gateway') then
    raise exception 'Origem de evento inválida.'
      using errcode = '22023';
  end if;

  if p_dados is not null and jsonb_typeof(p_dados) <> 'object' then
    raise exception 'Dados do evento devem ser um objeto JSON.' using errcode = '22023';
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

  -- Reexecução segura por scheduler/webhook.
  if v_assinatura.status = 'past_due' then
    return jsonb_build_object(
      'alterada', false,
      'idempotente', true,
      'assinatura_id', v_assinatura.id,
      'empresa_id', v_assinatura.empresa_id,
      'status', v_assinatura.status,
      'grace_ends_at', v_assinatura.grace_ends_at
    );
  end if;

  if v_assinatura.status <> 'grace_period' then
    raise exception
      'Assinatura não está em grace period.'
      using errcode = '22023';
  end if;

  if v_assinatura.grace_ends_at is null then
    raise exception
      'Grace period sem data de término configurada.'
      using errcode = '22023';
  end if;

  if v_assinatura.grace_ends_at >= now() then
    raise exception
      'Grace period ainda está vigente.'
      using errcode = '22023';
  end if;

  if v_assinatura.grace_period_started_at is null
     or v_assinatura.grace_period_ends_at is null
     or not isfinite(v_assinatura.grace_period_started_at)
     or not isfinite(v_assinatura.grace_period_ends_at)
     or not isfinite(v_assinatura.grace_ends_at)
     or v_assinatura.grace_period_ends_at <= v_assinatura.grace_period_started_at
     or v_assinatura.billing_anchor_at is null
     or v_assinatura.periodicidade is null then
    raise exception 'Grace sem associação comercial válida.' using errcode = '22023';
  end if;

  if v_assinatura.grace_period_ends_at <> public.calcular_fim_periodo_assinatura(
    v_assinatura.billing_anchor_at, v_assinatura.grace_period_started_at, v_assinatura.periodicidade
  ) then
    raise exception 'Ciclo associado ao grace incompatível com a âncora.' using errcode = '22023';
  end if;

  if v_assinatura.current_period_started_at is not null
     and v_assinatura.current_period_ends_at is not null
     and isfinite(v_assinatura.current_period_started_at)
     and isfinite(v_assinatura.current_period_ends_at)
     and v_assinatura.current_period_ends_at > v_assinatura.current_period_started_at
     and (
       (v_assinatura.current_period_started_at <= v_assinatura.grace_period_started_at
        and v_assinatura.current_period_ends_at >= v_assinatura.grace_period_ends_at)
       or v_assinatura.current_period_started_at >= v_assinatura.grace_period_ends_at
     ) then
    -- Não reativar automaticamente registros inconsistentes; não degradar.
    return jsonb_build_object(
      'alterada', false, 'idempotente', true, 'motivo', 'ciclo_ja_coberto',
      'assinatura_id', v_assinatura.id, 'empresa_id', v_assinatura.empresa_id,
      'status', v_assinatura.status
    );
  end if;

  if v_assinatura.current_period_ends_at is null
     or v_assinatura.current_period_ends_at <> v_assinatura.grace_period_started_at
     or v_assinatura.grace_ends_at <> (
       ((v_assinatura.grace_period_started_at at time zone 'UTC') + interval '7 days') at time zone 'UTC'
     ) then
    raise exception 'Grace inconsistente com o ciclo não pago.' using errcode = '22023';
  end if;

  if not public.transicao_status_assinatura_permitida(
    'grace_period',
    'past_due'
  ) then
    raise exception
      'Transição grace_period -> past_due não permitida.'
      using errcode = '22023';
  end if;

  update public.assinaturas
  set status = 'past_due'
  where id = v_assinatura.id;

  insert into public.assinatura_eventos (
    empresa_id,
    assinatura_id,
    tipo,
    origem,
    dados, billing_period_started_at, billing_period_ends_at
  )
  values (
    v_assinatura.empresa_id,
    v_assinatura.id,
    'grace_period_encerrado_sem_pagamento',
    v_origem,
    v_dados || jsonb_build_object(
      'status_anterior', 'grace_period',
      'novo_status', 'past_due',
      'grace_ends_at', v_assinatura.grace_ends_at,
      'billing_period_started_at', v_assinatura.grace_period_started_at,
      'billing_period_ends_at', v_assinatura.grace_period_ends_at
    ),
    v_assinatura.grace_period_started_at, v_assinatura.grace_period_ends_at
  );

  return jsonb_build_object(
    'alterada', true,
    'idempotente', false,
    'assinatura_id', v_assinatura.id,
    'empresa_id', v_assinatura.empresa_id,
    'status_anterior', 'grace_period',
    'status_atual', 'past_due',
    'grace_ends_at', v_assinatura.grace_ends_at
  );
end;
$$;

revoke all on function public.encerrar_grace_period_assinatura(
  uuid,
  text,
  jsonb
) from public;

revoke all on function public.encerrar_grace_period_assinatura(
  uuid,
  text,
  jsonb
) from anon;

revoke all on function public.encerrar_grace_period_assinatura(
  uuid,
  text,
  jsonb
) from authenticated;

grant execute on function public.encerrar_grace_period_assinatura(
  uuid,
  text,
  jsonb
) to service_role;

comment on function public.encerrar_grace_period_assinatura(
  uuid,
  text,
  jsonb
)
is 'Encerra grace period vencido sem pagamento, movendo a assinatura para past_due e bloqueando o acesso operacional. Uso exclusivo do backend/service_role.';

create or replace function public.transicionar_status_assinatura(
  p_assinatura_id uuid,
  p_novo_status text,
  p_origem text default 'sistema',
  p_dados jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assinatura public.assinaturas%rowtype;
  v_status_atual text;
  v_novo_status text;
  v_origem text;
  v_dados jsonb;
begin
  if p_assinatura_id is null then
    raise exception 'Assinatura não informada.'
      using errcode = '22004';
  end if;

  v_novo_status := lower(nullif(btrim(p_novo_status), ''));
  v_origem := lower(nullif(btrim(p_origem), ''));

  if v_novo_status is null then
    raise exception 'Novo status não informado.'
      using errcode = '22023';
  end if;

  if v_novo_status not in (
    'trialing',
    'active',
    'past_due',
    'grace_period',
    'canceled',
    'expired',
    'suspended'
  ) then
    raise exception 'Status de assinatura inválido: %.', v_novo_status
      using errcode = '22023';
  end if;

  -- Entradas em active, grace_period e past_due exigem fluxos especializados, mesmo em reexecuções.
  if v_novo_status in ('active', 'grace_period', 'past_due') then
    raise exception
      'Transição para active, grace_period ou past_due exige fluxo especializado de billing da assinatura.'
      using errcode = '22023';
  end if;

  if v_origem is null or v_origem not in (
    'sistema',
    'usuario',
    'admin',
    'gateway'
  ) then
    raise exception 'Origem de evento inválida.'
      using errcode = '22023';
  end if;

  if p_dados is not null and jsonb_typeof(p_dados) <> 'object' then
    raise exception 'Dados do evento devem ser um objeto JSON.' using errcode = '22023';
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

  v_status_atual := v_assinatura.status;

  if not public.transicao_status_assinatura_permitida(
    v_status_atual,
    v_novo_status
  ) then
    raise exception
      'Transição de assinatura não permitida: % -> %.',
      v_status_atual,
      v_novo_status
      using errcode = '22023';
  end if;

  -- Idempotência para eventos repetidos do gateway/backend.
  if v_status_atual = v_novo_status then
    return jsonb_build_object(
      'alterada', false,
      'idempotente', true,
      'assinatura_id', v_assinatura.id,
      'empresa_id', v_assinatura.empresa_id,
      'status_anterior', v_status_atual,
      'status_atual', v_status_atual
    );
  end if;

  update public.assinaturas
  set
    status = v_novo_status,
    canceled_at = case
      when v_novo_status = 'canceled'
        then coalesce(canceled_at, now())
      else canceled_at
    end
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
    'assinatura_status_alterado',
    v_origem,
    v_dados || jsonb_build_object(
      'status_anterior', v_status_atual,
      'novo_status', v_novo_status
    )
  );

  return jsonb_build_object(
    'alterada', true,
    'idempotente', false,
    'assinatura_id', v_assinatura.id,
    'empresa_id', v_assinatura.empresa_id,
    'status_anterior', v_status_atual,
    'status_atual', v_novo_status
  );
end;
$$;

revoke all on function public.transicionar_status_assinatura(
  uuid,
  text,
  text,
  jsonb
) from public;

revoke all on function public.transicionar_status_assinatura(
  uuid,
  text,
  text,
  jsonb
) from anon;

revoke all on function public.transicionar_status_assinatura(
  uuid,
  text,
  text,
  jsonb
) from authenticated;

grant execute on function public.transicionar_status_assinatura(
  uuid,
  text,
  text,
  jsonb
) to service_role;

comment on function public.transicionar_status_assinatura(
  uuid,
  text,
  text,
  jsonb
)
is 'Executa transição controlada do status da assinatura e registra auditoria. Entradas em active, grace_period e past_due exigem fluxos especializados de billing da assinatura. Uso exclusivo do backend/service_role.';
