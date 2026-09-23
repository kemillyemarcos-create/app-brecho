create or replace function public.transicao_status_assinatura_permitida(
  p_status_atual text,
  p_novo_status text
)
returns boolean
language sql
immutable
security definer
set search_path = ''
as $$
  select case
    when p_status_atual is null or p_novo_status is null then false
    when p_status_atual = p_novo_status then true

    when p_status_atual = 'trialing'
      and p_novo_status in (
        'active',
        'past_due',
        'canceled',
        'expired',
        'suspended'
      )
      then true

    when p_status_atual = 'active'
      and p_novo_status in (
        'past_due',
        'grace_period',
        'canceled',
        'suspended'
      )
      then true

    when p_status_atual = 'past_due'
      and p_novo_status in (
        'active',
        'canceled',
        'suspended'
      )
      then true

    when p_status_atual = 'grace_period'
      and p_novo_status in (
        'active',
        'past_due',
        'canceled',
        'suspended'
      )
      then true

    when p_status_atual = 'suspended'
      and p_novo_status in (
        'active',
        'canceled'
      )
      then true

    when p_status_atual in ('canceled', 'expired')
      then false

    else false
  end;
$$;

revoke all on function public.transicao_status_assinatura_permitida(text, text)
from public;

revoke all on function public.transicao_status_assinatura_permitida(text, text)
from anon;

revoke all on function public.transicao_status_assinatura_permitida(text, text)
from authenticated;

grant execute on function public.transicao_status_assinatura_permitida(text, text)
to service_role;

comment on function public.transicao_status_assinatura_permitida(text, text)
is 'Valida transições permitidas entre estados de assinatura. Uso exclusivo do backend/service_role.';

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

  -- Entradas em active e grace exigem fluxos especializados, mesmo em reexecuções.
  if v_novo_status in ('active', 'grace_period') then
    raise exception
      'Transição para active ou grace_period exige fluxo especializado de billing da assinatura.'
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
is 'Executa transição controlada do status da assinatura e registra auditoria. Entradas em active e grace_period exigem fluxos especializados de billing da assinatura. Uso exclusivo do backend/service_role.';

create or replace function public.iniciar_grace_period_assinatura(
  p_assinatura_id uuid,
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
  v_origem text;
  v_dados jsonb;
  v_grace_ends_at timestamptz;
begin
  if p_assinatura_id is null then
    raise exception 'Assinatura não informada.'
      using errcode = '22004';
  end if;

  v_origem := lower(nullif(btrim(p_origem), ''));

  if v_origem is null
     or v_origem not in ('sistema', 'usuario', 'admin', 'gateway') then
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

  -- Reexecução preserva o prazo, inclusive vencido ou nulo.
  if v_assinatura.status = 'grace_period' then
    return jsonb_build_object(
      'alterada', false,
      'idempotente', true,
      'assinatura_id', v_assinatura.id,
      'empresa_id', v_assinatura.empresa_id,
      'status', v_assinatura.status,
      'grace_ends_at', v_assinatura.grace_ends_at
    );
  end if;

  if v_assinatura.status <> 'active' then
    raise exception
      'Somente assinatura active pode iniciar grace period.'
      using errcode = '22023';
  end if;

  if not public.transicao_status_assinatura_permitida(
    v_assinatura.status,
    'grace_period'
  ) then
    raise exception
      'Transição para grace period não permitida a partir de %.',
      v_assinatura.status
      using errcode = '22023';
  end if;

  v_grace_ends_at := now() + interval '7 days';

  update public.assinaturas
  set
    status = 'grace_period',
    grace_ends_at = v_grace_ends_at
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
    'grace_period_iniciado',
    v_origem,
    v_dados || jsonb_build_object(
      'status_anterior', v_assinatura.status,
      'novo_status', 'grace_period',
      'grace_dias', 7,
      'grace_ends_at', v_grace_ends_at
    )
  );

  return jsonb_build_object(
    'alterada', true,
    'idempotente', false,
    'assinatura_id', v_assinatura.id,
    'empresa_id', v_assinatura.empresa_id,
    'status_anterior', v_assinatura.status,
    'status_atual', 'grace_period',
    'grace_ends_at', v_grace_ends_at
  );
end;
$$;

revoke all on function public.iniciar_grace_period_assinatura(
  uuid,
  text,
  jsonb
) from public;

revoke all on function public.iniciar_grace_period_assinatura(
  uuid,
  text,
  jsonb
) from anon;

revoke all on function public.iniciar_grace_period_assinatura(
  uuid,
  text,
  jsonb
) from authenticated;

grant execute on function public.iniciar_grace_period_assinatura(
  uuid,
  text,
  jsonb
) to service_role;

comment on function public.iniciar_grace_period_assinatura(
  uuid,
  text,
  jsonb
)
is 'Inicia grace period de 7 dias somente a partir de active. Reexecuções em grace_period preservam o prazo, inclusive vencido ou nulo. Uso exclusivo do backend/service_role.';
