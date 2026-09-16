-- ============================================================
-- SaaS - Resolver recurso comercial da empresa
--
-- Centraliza a resolução de capabilities e limites do plano
-- contratado pela empresa.
--
-- Uso interno/backend apenas.
-- ============================================================

create or replace function public.resolver_recurso_empresa(
  p_empresa_id uuid,
  p_recurso text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_tipo text;
  v_valor_boolean boolean;
  v_valor_inteiro bigint;
  v_valor_texto text;
begin
  if p_empresa_id is null then
    raise exception 'Empresa não informada.'
      using errcode = '22004';
  end if;

  if nullif(btrim(p_recurso), '') is null then
    raise exception 'Recurso não informado.'
      using errcode = '22004';
  end if;

  if not public.assinatura_empresa_operacional_ativa(p_empresa_id) then
    raise exception 'Assinatura sem acesso operacional vigente.'
      using errcode = '42501';
  end if;

  select
    pr.tipo,
    pr.valor_boolean,
    pr.valor_inteiro,
    pr.valor_texto
  into
    v_tipo,
    v_valor_boolean,
    v_valor_inteiro,
    v_valor_texto
  from public.assinaturas a
  join public.planos p
    on p.id = a.plano_id
  join public.plano_recursos pr
    on pr.plano_id = p.id
   and pr.recurso = btrim(p_recurso)
  where a.empresa_id = p_empresa_id
    and a.status in (
      'trialing',
      'active',
      'grace_period'
    )
  limit 1;

  if not found then
    raise exception 'Recurso % não configurado para a empresa.', btrim(p_recurso)
      using errcode = 'P0001';
  end if;

  case v_tipo
    when 'boolean' then
      return jsonb_build_object(
        'tipo', v_tipo,
        'valor', to_jsonb(v_valor_boolean)
      );

    when 'integer' then
      return jsonb_build_object(
        'tipo', v_tipo,
        'valor', to_jsonb(v_valor_inteiro)
      );

    when 'text' then
      return jsonb_build_object(
        'tipo', v_tipo,
        'valor', to_jsonb(v_valor_texto)
      );

    when 'unlimited' then
      return jsonb_build_object(
        'tipo', v_tipo,
        'valor', null
      );

    else
      raise exception 'Tipo inválido do recurso %: %.', btrim(p_recurso), v_tipo
        using errcode = 'P0001';
  end case;
end;
$function$;

revoke all
on function public.resolver_recurso_empresa(uuid, text)
from public, anon, authenticated;

grant execute
on function public.resolver_recurso_empresa(uuid, text)
to service_role;
