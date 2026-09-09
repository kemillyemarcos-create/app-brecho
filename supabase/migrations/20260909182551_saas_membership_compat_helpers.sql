-- ============================================================
-- SaaS: compatibilidade dos helpers antigos com memberships
-- Mantém os nomes usados pelas policies existentes.
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
  select public.usuario_membro_empresa(p_empresa_id);
$$;

create or replace function public.usuario_empresa_admin(
  p_empresa_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.usuario_admin_empresa_membership(p_empresa_id);
$$;

revoke all on function public.usuario_empresa_ativo(uuid) from public;
revoke all on function public.usuario_empresa_ativo(uuid) from anon;
grant execute on function public.usuario_empresa_ativo(uuid) to authenticated;

revoke all on function public.usuario_empresa_admin(uuid) from public;
revoke all on function public.usuario_empresa_admin(uuid) from anon;
grant execute on function public.usuario_empresa_admin(uuid) to authenticated;
