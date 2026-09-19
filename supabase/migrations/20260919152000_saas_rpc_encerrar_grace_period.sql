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
    dados
  )
  values (
    v_assinatura.empresa_id,
    v_assinatura.id,
    'grace_period_encerrado_sem_pagamento',
    v_origem,
    v_dados || jsonb_build_object(
      'status_anterior', 'grace_period',
      'novo_status', 'past_due',
      'grace_ends_at', v_assinatura.grace_ends_at
    )
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
