-- ============================================================
-- SaaS - Enforcement do limite de usuários por plano
--
-- Recurso:
--   usuarios_maximos
--
-- Regras:
-- - conta apenas memberships ativas;
-- - valida INSERT de membership ativa;
-- - valida reativação de membership inativa;
-- - não interfere em desativação ou alteração de perfil;
-- - fail-closed quando assinatura/recurso não estiver válido;
-- - serializa alterações por empresa para evitar concorrência.
-- ============================================================


-- ============================================================
-- 1. Função interna: resolve usuarios_maximos da empresa
-- ============================================================

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
      'past_due',
      'grace_period',
      'suspended'
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


-- Função exclusivamente interna/backend.
revoke all
on function public.resolver_usuarios_maximos_empresa(uuid)
from public, anon, authenticated;

grant execute
on function public.resolver_usuarios_maximos_empresa(uuid)
to service_role;


-- ============================================================
-- 2. Trigger: protege limite de memberships ativas
-- ============================================================

create or replace function public.enforce_empresa_usuarios_maximos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_limite bigint;
  v_ativos bigint;
begin
  -- INSERT inativo não consome vaga.
  if tg_op = 'INSERT' and new.ativo is not true then
    return new;
  end if;

  -- UPDATE só precisa validar quando:
  --   - empresa mudou e a membership permanece ativa; ou
  --   - membership passou de inativa para ativa.
  if tg_op = 'UPDATE' then
    if not (
      new.ativo is true
      and (
        old.ativo is distinct from true
        or new.empresa_id is distinct from old.empresa_id
      )
    ) then
      return new;
    end if;
  end if;

  -- Serializa inclusões/reativações para a mesma empresa
  -- durante a transação atual.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.empresa_id::text, 0)
  );

  v_limite :=
    public.resolver_usuarios_maximos_empresa(new.empresa_id);

  select count(*)
    into v_ativos
  from public.empresa_usuarios eu
  where eu.empresa_id = new.empresa_id
    and eu.ativo is true
    and (
      tg_op <> 'UPDATE'
      or eu.id <> old.id
    );

  if v_ativos >= v_limite then
    raise exception
      'Limite de usuários ativos atingido para esta empresa (% de %).',
      v_ativos,
      v_limite
      using errcode = 'P0001';
  end if;

  return new;
end;
$function$;


revoke all
on function public.enforce_empresa_usuarios_maximos()
from public, anon, authenticated;

grant execute
on function public.enforce_empresa_usuarios_maximos()
to service_role;


-- ============================================================
-- 3. Trigger
-- ============================================================

drop trigger if exists trg_empresa_usuarios_maximos
on public.empresa_usuarios;

create trigger trg_empresa_usuarios_maximos
before insert or update
on public.empresa_usuarios
for each row
execute function public.enforce_empresa_usuarios_maximos();
