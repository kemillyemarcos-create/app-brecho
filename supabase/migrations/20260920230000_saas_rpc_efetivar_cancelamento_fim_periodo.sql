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
