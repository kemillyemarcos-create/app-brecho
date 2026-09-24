-- A6: conformidade de memberships somente na renovação com downgrade efetivo.
-- Sem backfill, sem alteração dos memberships existentes durante a migration.
alter table public.empresa_usuarios
  add column prioridade_retencao integer;

comment on column public.empresa_usuarios.prioridade_retencao
is 'Prioridade manual de retenção dentro do mesmo perfil: menor valor primeiro; NULL usa antiguidade após os priorizados. Alterável apenas por proprietário ativo da empresa.';

-- INVOKER é intencional: current_user identifica a autoridade SQL que fez o
-- DML, não o dono de uma função de trigger SECURITY DEFINER. O onboarding
-- provisionar_empresa_trial é SECURITY DEFINER OWNER postgres; seu INSERT
-- continua confiável. authenticated não consegue assumir esses papéis.
-- Nenhuma flag/GUC de cliente ou ausência de proprietário autoriza bootstrap.
create or replace function public.proteger_identidade_membership()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_backend_confiavel boolean := current_user in ('postgres', 'service_role');
  v_empresa_id uuid;
  v_exige_proprietario boolean := false;
  v_remove_proprietario boolean := false;
  v_proprietario_autorizado boolean;
begin
  if tg_op = 'INSERT' then
    -- Ignora timestamp arbitrário inclusive em INSERT de backend.
    new.created_at := statement_timestamp();
    v_empresa_id := new.empresa_id;
    v_exige_proprietario :=
      (new.perfil = 'PROPRIETARIO' and not v_backend_confiavel)
      or new.prioridade_retencao is not null;
    if not v_exige_proprietario then
      return new;
    end if;
  else
    v_empresa_id := old.empresa_id;
    if tg_op = 'UPDATE' then
      if new.id is distinct from old.id
         or new.empresa_id is distinct from old.empresa_id
         or new.usuario_id is distinct from old.usuario_id then
        raise exception 'Identidade do membership é imutável; crie um novo vínculo.'
          using errcode = '42501';
      end if;
      if new.created_at is distinct from old.created_at then
        raise exception 'Antiguidade do membership é imutável; use prioridade de retenção.'
          using errcode = '42501';
      end if;
      -- Mudança de perfil e prioridade exige identidade de proprietário,
      -- inclusive para backend; A6 altera somente ativo e não usa essa exceção.
      v_exige_proprietario := new.perfil is distinct from old.perfil
        or new.prioridade_retencao is distinct from old.prioridade_retencao
        or (old.perfil = 'PROPRIETARIO'
            and new.ativo is distinct from old.ativo and not v_backend_confiavel);
      v_remove_proprietario := old.perfil = 'PROPRIETARIO' and old.ativo is true
        and (new.perfil <> 'PROPRIETARIO' or new.ativo is not true);
    else
      -- DELETE também não pode servir como alternativa para remover o último.
      v_exige_proprietario := old.perfil = 'PROPRIETARIO' and not v_backend_confiavel;
      v_remove_proprietario := old.perfil = 'PROPRIETARIO' and old.ativo is true;
    end if;
    if not v_exige_proprietario and not v_remove_proprietario then
      if tg_op = 'DELETE' then return old; end if;
      return new;
    end if;
  end if;

  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Proteção de memberships exige isolamento READ COMMITTED.'
      using errcode = '22023';
  end if;

  -- Mesma serialização do limite e A6. O UPDATE já pode deter uma linha;
  -- não aguardar aqui segurando essa linha: conflito transiente exige retry.
  if not pg_catalog.pg_try_advisory_xact_lock(
    pg_catalog.hashtextextended(v_empresa_id::text, 0)
  ) then
    raise exception 'Membership em alteração concorrente; tente novamente.'
      using errcode = '55P03';
  end if;

  if v_exige_proprietario then
    select exists (
      select 1
      from public.empresa_usuarios eu
      join public.usuarios u on u.id = eu.usuario_id
      where u.auth_user_id = auth.uid()
        and u.ativo is true and eu.ativo is true
        and eu.perfil = 'PROPRIETARIO'
        and eu.empresa_id = v_empresa_id
    ) into v_proprietario_autorizado;
    if auth.uid() is null or not v_proprietario_autorizado then
      raise exception 'Operação exige proprietário ativo da própria empresa.'
        using errcode = '42501';
    end if;
  end if;

  if v_remove_proprietario and not exists (
    select 1 from public.empresa_usuarios eu
    where eu.empresa_id = v_empresa_id
      and eu.perfil = 'PROPRIETARIO' and eu.ativo is true
      and eu.id <> old.id
  ) then
    raise exception 'Não é permitido remover o último proprietário ativo da empresa.'
      using errcode = '22023';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Chamadas diretas não são necessárias: a função é acionada pelo trigger.
revoke all on function public.proteger_identidade_membership()
from public, anon, authenticated, service_role;

create trigger trg_empresa_usuarios_identidade
before insert or update or delete on public.empresa_usuarios
for each row execute function public.proteger_identidade_membership();

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
