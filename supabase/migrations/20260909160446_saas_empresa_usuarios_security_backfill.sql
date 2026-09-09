-- ============================================================
-- SaaS: memberships por empresa
-- Mantém usuarios.empresa_id/perfil durante a transição.
-- ============================================================

-- 1. Backfill dos usuários atuais.
-- ADMIN atual passa a PROPRIETARIO no primeiro vínculo da empresa.
-- OPERADOR permanece OPERADOR.
insert into public.empresa_usuarios (
  empresa_id,
  usuario_id,
  perfil,
  ativo
)
select
  u.empresa_id,
  u.id,
  case
    when upper(coalesce(u.perfil, '')) = 'ADMIN'
      then 'PROPRIETARIO'
    else 'OPERADOR'
  end,
  u.ativo
from public.usuarios u
where u.empresa_id is not null
on conflict (empresa_id, usuario_id) do nothing;


-- 2. Helper: usuário autenticado possui membership ativo?
create or replace function public.usuario_membro_empresa(
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
    from public.empresa_usuarios eu
    join public.usuarios u
      on u.id = eu.usuario_id
    where u.auth_user_id = auth.uid()
      and u.ativo = true
      and eu.empresa_id = p_empresa_id
      and eu.ativo = true
  );
$$;


-- 3. Helper: usuário autenticado administra a empresa?
create or replace function public.usuario_admin_empresa_membership(
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
    from public.empresa_usuarios eu
    join public.usuarios u
      on u.id = eu.usuario_id
    where u.auth_user_id = auth.uid()
      and u.ativo = true
      and eu.empresa_id = p_empresa_id
      and eu.ativo = true
      and eu.perfil in ('PROPRIETARIO', 'ADMIN')
  );
$$;


-- 4. Helpers não devem ficar executáveis anonimamente.
revoke all on function public.usuario_membro_empresa(uuid) from public;
revoke all on function public.usuario_membro_empresa(uuid) from anon;
grant execute on function public.usuario_membro_empresa(uuid) to authenticated;

revoke all on function public.usuario_admin_empresa_membership(uuid) from public;
revoke all on function public.usuario_admin_empresa_membership(uuid) from anon;
grant execute on function public.usuario_admin_empresa_membership(uuid) to authenticated;


-- 5. Policies iniciais.
-- Todo membro ativo pode enxergar memberships da própria empresa.
create policy empresa_usuarios_select_membro
on public.empresa_usuarios
for select
to authenticated
using (
  public.usuario_membro_empresa(empresa_id)
);

-- Somente proprietário/admin pode alterar memberships.
create policy empresa_usuarios_insert_admin
on public.empresa_usuarios
for insert
to authenticated
with check (
  public.usuario_admin_empresa_membership(empresa_id)
);

create policy empresa_usuarios_update_admin
on public.empresa_usuarios
for update
to authenticated
using (
  public.usuario_admin_empresa_membership(empresa_id)
)
with check (
  public.usuario_admin_empresa_membership(empresa_id)
);

create policy empresa_usuarios_delete_admin
on public.empresa_usuarios
for delete
to authenticated
using (
  public.usuario_admin_empresa_membership(empresa_id)
);
