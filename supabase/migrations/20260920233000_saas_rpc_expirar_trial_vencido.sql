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
