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
