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

  if v_assinatura.status in ('canceled', 'expired', 'suspended') then
    raise exception
      'Estado atual da assinatura não permite iniciar grace period.'
      using errcode = '22023';
  end if;

  if v_assinatura.status = 'trialing' then
    raise exception
      'Trial não entra em grace period de renovação.'
      using errcode = '22023';
  end if;

  if v_assinatura.status = 'grace_period'
     and v_assinatura.grace_ends_at is not null
     and v_assinatura.grace_ends_at >= now() then
    return jsonb_build_object(
      'alterada', false,
      'idempotente', true,
      'assinatura_id', v_assinatura.id,
      'empresa_id', v_assinatura.empresa_id,
      'status', v_assinatura.status,
      'grace_ends_at', v_assinatura.grace_ends_at
    );
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
is 'Inicia grace period fixo de 7 dias após falha de renovação, mantendo acesso operacional durante o período. Uso exclusivo do backend/service_role.';
