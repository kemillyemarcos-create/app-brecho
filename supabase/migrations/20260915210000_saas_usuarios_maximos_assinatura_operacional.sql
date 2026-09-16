create or replace function public.resolver_usuarios_maximos_empresa(
  p_empresa_id uuid
)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_tipo text;
  v_valor bigint;
begin
  if p_empresa_id is null then
    raise exception 'Empresa não informada.'
      using errcode = '22004';
  end if;

  if not public.assinatura_empresa_operacional_ativa(p_empresa_id) then
    raise exception 'Assinatura sem acesso operacional vigente.'
      using errcode = '42501';
  end if;

  select
    pr.tipo,
    pr.valor_inteiro
  into
    v_tipo,
    v_valor
  from public.assinaturas a
  join public.planos p
    on p.id = a.plano_id
  join public.plano_recursos pr
    on pr.plano_id = p.id
   and pr.recurso = 'usuarios_maximos'
  where a.empresa_id = p_empresa_id
    and a.status in (
      'trialing',
      'active',
      'grace_period'
    )
  limit 1;

  if not found then
    raise exception 'Limite de usuários não configurado para a empresa.'
      using errcode = 'P0001';
  end if;

  if v_tipo <> 'integer'
     or v_valor is null
     or v_valor < 1 then
    raise exception 'Configuração inválida do recurso usuarios_maximos.'
      using errcode = 'P0001';
  end if;

  return v_valor;
end;
$function$;

revoke all
on function public.resolver_usuarios_maximos_empresa(uuid)
from public, anon, authenticated;

grant execute
on function public.resolver_usuarios_maximos_empresa(uuid)
to service_role;
