-- ============================================================
-- SaaS Fase 3
-- Helpers centrais para RLS multi-tenant
--
-- Objetivo:
-- Resolver a empresa e o nível de acesso do usuário autenticado
-- através de auth.uid(), sem depender do e-mail do JWT.
--
-- IMPORTANTE:
-- - não altera nenhuma policy RLS nesta migration
-- - não altera dados
-- - não altera tabelas
-- - SECURITY DEFINER permite consultar public.usuarios sem
--   depender das policies da própria tabela usuarios
-- - search_path vazio evita resolução insegura de objetos
-- ============================================================


-- ============================================================
-- 1. EMPRESA ATIVA DO USUÁRIO ATUAL
--
-- Retorna empresa_id apenas se:
-- - auth_user_id = auth.uid()
-- - usuário estiver ativo
--
-- Retorna NULL caso não exista vínculo ativo.
-- ============================================================

create or replace function public.usuario_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.empresa_id
  from public.usuarios u
  where u.auth_user_id = auth.uid()
    and u.ativo = true
  limit 1;
$$;


-- ============================================================
-- 2. USUÁRIO ATIVO NA EMPRESA INFORMADA
--
-- Será usado principalmente em policies SELECT/INSERT/UPDATE/
-- DELETE das tabelas tenantizadas.
-- ============================================================

create or replace function public.usuario_empresa_ativo(
  p_empresa_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = auth.uid()
      and u.empresa_id = p_empresa_id
      and u.ativo = true
  );
$$;


-- ============================================================
-- 3. ADMIN ATIVO NA EMPRESA INFORMADA
--
-- Será utilizado nas operações administrativas.
-- ============================================================

create or replace function public.usuario_empresa_admin(
  p_empresa_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.auth_user_id = auth.uid()
      and u.empresa_id = p_empresa_id
      and u.ativo = true
      and upper(coalesce(u.perfil, '')) = 'ADMIN'
  );
$$;


-- ============================================================
-- 4. PERMISSÕES DAS FUNÇÕES
--
-- Não ficam executáveis pelo papel PUBLIC/anon.
-- authenticated pode utilizá-las nas policies e consultas
-- autenticadas.
-- ============================================================

revoke all on function public.usuario_empresa_id() from public;
revoke all on function public.usuario_empresa_ativo(uuid) from public;
revoke all on function public.usuario_empresa_admin(uuid) from public;

grant execute on function public.usuario_empresa_id()
  to authenticated;

grant execute on function public.usuario_empresa_ativo(uuid)
  to authenticated;

grant execute on function public.usuario_empresa_admin(uuid)
  to authenticated;

-- ============================================================
-- Fim da migration.
-- ============================================================
