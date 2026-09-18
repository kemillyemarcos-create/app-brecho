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
is 'Executa transição controlada do status da assinatura e registra auditoria. Uso exclusivo do backend/service_role.';
