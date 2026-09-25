-- A8: integridade de novas escritas e auditoria append-only.
-- NOT VALID preserva o histórico; validação retroativa será uma etapa separada.
alter table public.assinaturas
  add constraint assinaturas_id_empresa_key unique (id, empresa_id);

alter table public.assinatura_eventos
  add constraint assinatura_eventos_assinatura_empresa_fkey
    foreign key (assinatura_id, empresa_id)
    references public.assinaturas(id, empresa_id)
    on delete restrict
    not valid,
  add constraint assinatura_eventos_dados_objeto_check
    check (jsonb_typeof(dados) = 'object') not valid;

-- Sem elevação de privilégio: o trigger apenas rejeita a operação.
-- Owner/superuser ainda pode desabilitar/remover proteções administrativamente.
create function public.impedir_mutacao_assinatura_eventos()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'assinatura_eventos é append-only'
    using errcode = '55000';
end;
$$;

revoke all on function public.impedir_mutacao_assinatura_eventos()
from public, anon, authenticated, service_role;

-- STATEMENT também bloqueia comandos sem linhas e suporta TRUNCATE.
-- INSERT simples e ON CONFLICT DO NOTHING não são bloqueados.
create trigger trg_assinatura_eventos_append_only
before update or delete or truncate on public.assinatura_eventos
for each statement
execute function public.impedir_mutacao_assinatura_eventos();

revoke update, delete, truncate on table public.assinatura_eventos
from public, anon, authenticated, service_role;

-- RPCs: somente validação de JSON adicionada; lógica e ACLs preservadas.
create or replace function public.definir_cancelamento_fim_periodo(
  p_assinatura_id uuid,
  p_cancelar boolean,
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

  if p_cancelar is null then
    raise exception 'Opção de cancelamento não informada.'
      using errcode = '22004';
  end if;

  v_origem := lower(nullif(btrim(p_origem), ''));

  if v_origem is null
     or v_origem not in ('sistema', 'usuario', 'admin', 'gateway') then
    raise exception 'Origem de evento inválida.'
      using errcode = '22023';
  end if;

  if p_dados is not null and jsonb_typeof(p_dados) <> 'object' then
    raise exception 'Dados do evento devem ser um objeto JSON.'
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

  if v_assinatura.status in ('canceled', 'expired') then
    raise exception
      'Assinatura histórica não permite alterar cancelamento no fim do período.'
      using errcode = '22023';
  end if;

  if p_cancelar
     and v_assinatura.current_period_ends_at is null then
    raise exception
      'Assinatura sem término de período não pode ter cancelamento agendado.'
      using errcode = '22023';
  end if;

  if v_assinatura.cancel_at_period_end = p_cancelar then
    return jsonb_build_object(
      'alterada', false,
      'idempotente', true,
      'assinatura_id', v_assinatura.id,
      'empresa_id', v_assinatura.empresa_id,
      'status', v_assinatura.status,
      'cancel_at_period_end', v_assinatura.cancel_at_period_end,
      'current_period_ends_at', v_assinatura.current_period_ends_at
    );
  end if;

  update public.assinaturas
  set cancel_at_period_end = p_cancelar
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
    case
      when p_cancelar
        then 'cancelamento_fim_periodo_agendado'
      else 'cancelamento_fim_periodo_removido'
    end,
    v_origem,
    v_dados || jsonb_build_object(
      'status', v_assinatura.status,
      'cancel_at_period_end', p_cancelar,
      'current_period_ends_at', v_assinatura.current_period_ends_at
    )
  );

  return jsonb_build_object(
    'alterada', true,
    'idempotente', false,
    'assinatura_id', v_assinatura.id,
    'empresa_id', v_assinatura.empresa_id,
    'status', v_assinatura.status,
    'cancel_at_period_end', p_cancelar,
    'current_period_ends_at', v_assinatura.current_period_ends_at
  );
end;
$$;

revoke all on function public.definir_cancelamento_fim_periodo(
  uuid,
  boolean,
  text,
  jsonb
) from public;

revoke all on function public.definir_cancelamento_fim_periodo(
  uuid,
  boolean,
  text,
  jsonb
) from anon;

revoke all on function public.definir_cancelamento_fim_periodo(
  uuid,
  boolean,
  text,
  jsonb
) from authenticated;

grant execute on function public.definir_cancelamento_fim_periodo(
  uuid,
  boolean,
  text,
  jsonb
) to service_role;

comment on function public.definir_cancelamento_fim_periodo(
  uuid,
  boolean,
  text,
  jsonb
)
is 'Agenda ou remove cancelamento no fim do período vigente. Não encerra a assinatura imediatamente. Uso exclusivo do backend/service_role.';


create or replace function public.agendar_downgrade_assinatura(
  p_assinatura_id uuid,
  p_novo_plano_id uuid,
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

  v_plano_atual_codigo text;
  v_plano_atual_ordem integer;

  v_novo_plano_codigo text;
  v_novo_plano_ordem integer;
  v_novo_plano_ativo boolean;

  v_origem text;
  v_dados jsonb;
begin
  if p_assinatura_id is null then
    raise exception 'Assinatura não informada.'
      using errcode = '22004';
  end if;

  if p_novo_plano_id is null then
    raise exception 'Novo plano não informado.'
      using errcode = '22004';
  end if;

  v_origem := lower(nullif(btrim(p_origem), ''));

  if v_origem is null
     or v_origem not in ('sistema', 'usuario', 'admin', 'gateway') then
    raise exception 'Origem de evento inválida.'
      using errcode = '22023';
  end if;

  if p_dados is not null and jsonb_typeof(p_dados) <> 'object' then
    raise exception 'Dados do evento devem ser um objeto JSON.'
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

  if v_assinatura.status in ('canceled', 'expired') then
    raise exception 'Assinatura histórica não permite agendar downgrade.'
      using errcode = '22023';
  end if;

  if v_assinatura.cancel_at_period_end then
    raise exception
      'Não é possível agendar downgrade enquanto houver cancelamento no fim do período.'
      using errcode = '22023';
  end if;

  if v_assinatura.current_period_ends_at is null then
    raise exception
      'Assinatura sem término de período não permite agendar downgrade.'
      using errcode = '22023';
  end if;

  select
    p.codigo,
    p.ordem_comercial
  into
    v_plano_atual_codigo,
    v_plano_atual_ordem
  from public.planos p
  where p.id = v_assinatura.plano_id;

  if v_plano_atual_ordem is null then
    raise exception
      'Plano atual sem hierarquia comercial configurada.'
      using errcode = '22023';
  end if;

  select
    p.codigo,
    p.ordem_comercial,
    p.ativo
  into
    v_novo_plano_codigo,
    v_novo_plano_ordem,
    v_novo_plano_ativo
  from public.planos p
  where p.id = p_novo_plano_id;

  if not found then
    raise exception 'Novo plano não encontrado.'
      using errcode = 'P0002';
  end if;

  if v_novo_plano_ativo is not true then
    raise exception 'Novo plano não está ativo.'
      using errcode = '22023';
  end if;

  if v_novo_plano_ordem is null then
    raise exception
      'Novo plano sem hierarquia comercial configurada.'
      using errcode = '22023';
  end if;

  if p_novo_plano_id = v_assinatura.plano_id then
    raise exception 'Novo plano é igual ao plano atual.'
      using errcode = '22023';
  end if;

  if v_novo_plano_ordem >= v_plano_atual_ordem then
    raise exception
      'A operação informada não é downgrade.'
      using errcode = '22023';
  end if;

  if v_assinatura.proximo_plano_id = p_novo_plano_id then
    return jsonb_build_object(
      'alterada', false,
      'idempotente', true,
      'assinatura_id', v_assinatura.id,
      'empresa_id', v_assinatura.empresa_id,
      'plano_atual_id', v_assinatura.plano_id,
      'proximo_plano_id', v_assinatura.proximo_plano_id,
      'efetivo_em', v_assinatura.current_period_ends_at
    );
  end if;

  update public.assinaturas
  set proximo_plano_id = p_novo_plano_id
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
    'downgrade_plano_agendado',
    v_origem,
    v_dados || jsonb_build_object(
      'plano_atual_id', v_assinatura.plano_id,
      'plano_atual_codigo', v_plano_atual_codigo,
      'novo_plano_id', p_novo_plano_id,
      'novo_plano_codigo', v_novo_plano_codigo,
      'efetivo_em', v_assinatura.current_period_ends_at
    )
  );

  return jsonb_build_object(
    'alterada', true,
    'idempotente', false,
    'assinatura_id', v_assinatura.id,
    'empresa_id', v_assinatura.empresa_id,
    'plano_atual_id', v_assinatura.plano_id,
    'plano_atual_codigo', v_plano_atual_codigo,
    'proximo_plano_id', p_novo_plano_id,
    'proximo_plano_codigo', v_novo_plano_codigo,
    'efetivo_em', v_assinatura.current_period_ends_at
  );
end;
$$;

revoke all on function public.agendar_downgrade_assinatura(
  uuid,
  uuid,
  text,
  jsonb
) from public;

revoke all on function public.agendar_downgrade_assinatura(
  uuid,
  uuid,
  text,
  jsonb
) from anon;

revoke all on function public.agendar_downgrade_assinatura(
  uuid,
  uuid,
  text,
  jsonb
) from authenticated;

grant execute on function public.agendar_downgrade_assinatura(
  uuid,
  uuid,
  text,
  jsonb
) to service_role;

comment on function public.agendar_downgrade_assinatura(
  uuid,
  uuid,
  text,
  jsonb
)
is 'Agenda downgrade para o fim do período vigente, preservando o plano atual até a próxima renovação. Uso exclusivo do backend/service_role.';


create or replace function public.aplicar_upgrade_assinatura(
  p_assinatura_id uuid,
  p_novo_plano_id uuid,
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

  v_plano_atual_codigo text;
  v_plano_atual_ordem integer;

  v_novo_plano_codigo text;
  v_novo_plano_ordem integer;
  v_novo_plano_ativo boolean;

  v_downgrade_pendente_id uuid;

  v_origem text;
  v_dados jsonb;
begin
  if p_assinatura_id is null then
    raise exception 'Assinatura não informada.'
      using errcode = '22004';
  end if;

  if p_novo_plano_id is null then
    raise exception 'Novo plano não informado.'
      using errcode = '22004';
  end if;

  v_origem := lower(nullif(btrim(p_origem), ''));

  if v_origem is null
     or v_origem not in ('sistema', 'usuario', 'admin', 'gateway') then
    raise exception 'Origem de evento inválida.'
      using errcode = '22023';
  end if;

  if p_dados is not null and jsonb_typeof(p_dados) <> 'object' then
    raise exception 'Dados do evento devem ser um objeto JSON.'
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

  if v_assinatura.status in ('canceled', 'expired') then
    raise exception 'Assinatura histórica não permite upgrade.'
      using errcode = '22023';
  end if;

  select
    p.codigo,
    p.ordem_comercial
  into
    v_plano_atual_codigo,
    v_plano_atual_ordem
  from public.planos p
  where p.id = v_assinatura.plano_id;

  if v_plano_atual_ordem is null then
    raise exception 'Plano atual sem hierarquia comercial configurada.'
      using errcode = '22023';
  end if;

  select
    p.codigo,
    p.ordem_comercial,
    p.ativo
  into
    v_novo_plano_codigo,
    v_novo_plano_ordem,
    v_novo_plano_ativo
  from public.planos p
  where p.id = p_novo_plano_id;

  if not found then
    raise exception 'Novo plano não encontrado.'
      using errcode = 'P0002';
  end if;

  if v_novo_plano_ativo is not true then
    raise exception 'Novo plano não está ativo.'
      using errcode = '22023';
  end if;

  if v_novo_plano_ordem is null then
    raise exception 'Novo plano sem hierarquia comercial configurada.'
      using errcode = '22023';
  end if;

  if p_novo_plano_id = v_assinatura.plano_id then
    raise exception 'Novo plano é igual ao plano atual.'
      using errcode = '22023';
  end if;

  if v_novo_plano_ordem <= v_plano_atual_ordem then
    raise exception 'A operação informada não é upgrade.'
      using errcode = '22023';
  end if;

  v_downgrade_pendente_id := v_assinatura.proximo_plano_id;

  update public.assinaturas
  set
    plano_id = p_novo_plano_id,
    proximo_plano_id = null
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
    'upgrade_plano_aplicado',
    v_origem,
    v_dados || jsonb_build_object(
      'plano_anterior_id', v_assinatura.plano_id,
      'plano_anterior_codigo', v_plano_atual_codigo,
      'novo_plano_id', p_novo_plano_id,
      'novo_plano_codigo', v_novo_plano_codigo,
      'downgrade_pendente_cancelado_id', v_downgrade_pendente_id
    )
  );

  return jsonb_build_object(
    'alterada', true,
    'assinatura_id', v_assinatura.id,
    'empresa_id', v_assinatura.empresa_id,
    'plano_anterior_id', v_assinatura.plano_id,
    'plano_anterior_codigo', v_plano_atual_codigo,
    'plano_atual_id', p_novo_plano_id,
    'plano_atual_codigo', v_novo_plano_codigo,
    'downgrade_pendente_cancelado_id', v_downgrade_pendente_id
  );
end;
$$;

revoke all on function public.aplicar_upgrade_assinatura(
  uuid,
  uuid,
  text,
  jsonb
) from public;

revoke all on function public.aplicar_upgrade_assinatura(
  uuid,
  uuid,
  text,
  jsonb
) from anon;

revoke all on function public.aplicar_upgrade_assinatura(
  uuid,
  uuid,
  text,
  jsonb
) from authenticated;

grant execute on function public.aplicar_upgrade_assinatura(
  uuid,
  uuid,
  text,
  jsonb
) to service_role;

comment on function public.aplicar_upgrade_assinatura(
  uuid,
  uuid,
  text,
  jsonb
)
is 'Aplica upgrade de plano imediatamente e remove eventual downgrade pendente. A cobrança proporcional é responsabilidade da camada de billing/gateway. Uso exclusivo do backend/service_role.';


create or replace function public.efetivar_cancelamento_fim_periodo(
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
    raise exception 'Dados do evento devem ser um objeto JSON.'
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

  if v_assinatura.status = 'canceled' then
    return jsonb_build_object(
      'alterada', false,
      'idempotente', true,
      'assinatura_id', v_assinatura.id,
      'empresa_id', v_assinatura.empresa_id,
      'status', v_assinatura.status,
      'canceled_at', v_assinatura.canceled_at
    );
  end if;

  if v_assinatura.status = 'expired' then
    raise exception
      'Assinatura expirada não pode ter cancelamento no fim do período efetivado.'
      using errcode = '22023';
  end if;

  if v_assinatura.cancel_at_period_end is not true then
    raise exception
      'Assinatura não possui cancelamento agendado para o fim do período.'
      using errcode = '22023';
  end if;

  if v_assinatura.current_period_ends_at is null then
    raise exception
      'Assinatura sem término de período não pode ter cancelamento efetivado.'
      using errcode = '22023';
  end if;

  if v_assinatura.current_period_ends_at > now() then
    raise exception
      'Período vigente ainda não terminou.'
      using errcode = '22023';
  end if;

  if not public.transicao_status_assinatura_permitida(
    v_assinatura.status,
    'canceled'
  ) then
    raise exception
      'Transição para canceled não permitida a partir de %.',
      v_assinatura.status
      using errcode = '22023';
  end if;

  update public.assinaturas
  set
    status = 'canceled',
    canceled_at = coalesce(canceled_at, v_assinatura.current_period_ends_at),
    cancel_at_period_end = false,
    proximo_plano_id = null,
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
    'cancelamento_fim_periodo_efetivado',
    v_origem,
    v_dados || jsonb_build_object(
      'status_anterior', v_assinatura.status,
      'novo_status', 'canceled',
      'periodo_encerrado_em', v_assinatura.current_period_ends_at,
      'plano_id', v_assinatura.plano_id,
      'proximo_plano_id_descartado', v_assinatura.proximo_plano_id
    )
  );

  return jsonb_build_object(
    'alterada', true,
    'idempotente', false,
    'assinatura_id', v_assinatura.id,
    'empresa_id', v_assinatura.empresa_id,
    'status_anterior', v_assinatura.status,
    'status_atual', 'canceled',
    'canceled_at', (
      select a.canceled_at
      from public.assinaturas a
      where a.id = v_assinatura.id
    )
  );
end;
$$;

revoke all on function public.efetivar_cancelamento_fim_periodo(
  uuid,
  text,
  jsonb
) from public;

revoke all on function public.efetivar_cancelamento_fim_periodo(
  uuid,
  text,
  jsonb
) from anon;

revoke all on function public.efetivar_cancelamento_fim_periodo(
  uuid,
  text,
  jsonb
) from authenticated;

grant execute on function public.efetivar_cancelamento_fim_periodo(
  uuid,
  text,
  jsonb
) to service_role;

comment on function public.efetivar_cancelamento_fim_periodo(
  uuid,
  text,
  jsonb
)
is 'Efetiva cancelamento previamente agendado após o término do período vigente, encerra a assinatura e limpa ações pendentes. Uso exclusivo do backend/service_role.';


create or replace function public.expirar_trial_vencido(
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
     or v_origem not in ('sistema', 'admin') then
    raise exception 'Origem de evento inválida.'
      using errcode = '22023';
  end if;

  if p_dados is not null and jsonb_typeof(p_dados) <> 'object' then
    raise exception 'Dados do evento devem ser um objeto JSON.'
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

  if v_assinatura.status = 'expired' then
    return jsonb_build_object(
      'alterada', false,
      'idempotente', true,
      'assinatura_id', v_assinatura.id,
      'empresa_id', v_assinatura.empresa_id,
      'status', v_assinatura.status,
      'trial_ends_at', v_assinatura.trial_ends_at
    );
  end if;

  if v_assinatura.status <> 'trialing' then
    raise exception
      'Somente assinatura em trialing pode ser expirada por término de trial.'
      using errcode = '22023';
  end if;

  if v_assinatura.trial_ends_at is null then
    raise exception
      'Assinatura em trial sem data de término.'
      using errcode = '22023';
  end if;

  if v_assinatura.trial_ends_at > now() then
    raise exception
      'Trial ainda não terminou.'
      using errcode = '22023';
  end if;

  if not public.transicao_status_assinatura_permitida(
    v_assinatura.status,
    'expired'
  ) then
    raise exception
      'Transição para expired não permitida a partir de %.',
      v_assinatura.status
      using errcode = '22023';
  end if;

  update public.assinaturas
  set
    status = 'expired',
    cancel_at_period_end = false,
    proximo_plano_id = null,
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
    'trial_expirado',
    v_origem,
    v_dados || jsonb_build_object(
      'status_anterior', v_assinatura.status,
      'novo_status', 'expired',
      'trial_ends_at', v_assinatura.trial_ends_at
    )
  );

  return jsonb_build_object(
    'alterada', true,
    'idempotente', false,
    'assinatura_id', v_assinatura.id,
    'empresa_id', v_assinatura.empresa_id,
    'status_anterior', v_assinatura.status,
    'status_atual', 'expired',
    'trial_ends_at', v_assinatura.trial_ends_at
  );
end;
$$;

revoke all on function public.expirar_trial_vencido(
  uuid,
  text,
  jsonb
) from public;

revoke all on function public.expirar_trial_vencido(
  uuid,
  text,
  jsonb
) from anon;

revoke all on function public.expirar_trial_vencido(
  uuid,
  text,
  jsonb
) from authenticated;

grant execute on function public.expirar_trial_vencido(
  uuid,
  text,
  jsonb
) to service_role;

comment on function public.expirar_trial_vencido(
  uuid,
  text,
  jsonb
)
is 'Efetiva a expiração de um trial após trial_ends_at, registra auditoria e limpa ações pendentes. Uso exclusivo do backend/service_role.';
