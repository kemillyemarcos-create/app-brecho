-- ============================================================
-- SaaS - RPC de contexto da assinatura
-- ============================================================

create or replace function public.obter_contexto_assinatura(
  p_empresa_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_assinatura public.assinaturas%rowtype;
  v_plano public.planos%rowtype;
  v_recursos jsonb;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.'
      using errcode = '42501';
  end if;

  if p_empresa_id is null then
    raise exception 'Empresa não informada.'
      using errcode = '22004';
  end if;

  if not public.usuario_membro_empresa(p_empresa_id) then
    raise exception 'Usuário sem acesso à empresa informada.'
      using errcode = '42501';
  end if;

  select a.*
    into v_assinatura
  from public.assinaturas a
  where a.empresa_id = p_empresa_id
    and a.status in (
      'trialing',
      'active',
      'past_due',
      'grace_period',
      'suspended'
    )
  limit 1;

  if not found then
    return jsonb_build_object(
      'empresa_id', p_empresa_id,
      'possui_assinatura', false,
      'assinatura', null,
      'plano', null,
      'recursos', '{}'::jsonb
    );
  end if;

  select p.*
    into strict v_plano
  from public.planos p
  where p.id = v_assinatura.plano_id;

  select coalesce(
    jsonb_object_agg(
      pr.recurso,
      case pr.tipo
        when 'boolean' then
          jsonb_build_object(
            'tipo', pr.tipo,
            'valor', to_jsonb(pr.valor_boolean)
          )
        when 'integer' then
          jsonb_build_object(
            'tipo', pr.tipo,
            'valor', to_jsonb(pr.valor_inteiro)
          )
        when 'text' then
          jsonb_build_object(
            'tipo', pr.tipo,
            'valor', to_jsonb(pr.valor_texto)
          )
        when 'unlimited' then
          jsonb_build_object(
            'tipo', pr.tipo,
            'valor', null
          )
      end
    ),
    '{}'::jsonb
  )
  into v_recursos
  from public.plano_recursos pr
  where pr.plano_id = v_plano.id;

  return jsonb_build_object(
    'empresa_id', p_empresa_id,
    'possui_assinatura', true,
    'assinatura', jsonb_build_object(
      'id', v_assinatura.id,
      'status', v_assinatura.status,
      'trial_started_at', v_assinatura.trial_started_at,
      'trial_ends_at', v_assinatura.trial_ends_at,
      'grace_ends_at', v_assinatura.grace_ends_at,
      'current_period_started_at', v_assinatura.current_period_started_at,
      'current_period_ends_at', v_assinatura.current_period_ends_at,
      'cancel_at_period_end', v_assinatura.cancel_at_period_end,
      'canceled_at', v_assinatura.canceled_at
    ),
    'plano', jsonb_build_object(
      'id', v_plano.id,
      'codigo', v_plano.codigo,
      'nome', v_plano.nome,
      'descricao', v_plano.descricao,
      'trial_dias_padrao', v_plano.trial_dias_padrao,
      'ativo', v_plano.ativo
    ),
    'recursos', v_recursos
  );
end;
$function$;

revoke all
on function public.obter_contexto_assinatura(uuid)
from public;

grant execute
on function public.obter_contexto_assinatura(uuid)
to authenticated, service_role;
