-- ============================================================================
-- SaaS / RLS multi-tenant para empresas e configuracoes_empresa
-- ============================================================================

-- --------------------------------------------------------------------------
-- public.empresas
-- --------------------------------------------------------------------------

drop policy if exists empresas_select_usuario_empresa
  on public.empresas;

drop policy if exists empresas_update_admin
  on public.empresas;

create policy empresas_select_usuario_empresa
on public.empresas
for select
to authenticated
using (
  public.usuario_empresa_ativo(id)
);

create policy empresas_update_admin
on public.empresas
for update
to authenticated
using (
  public.usuario_empresa_admin(id)
)
with check (
  public.usuario_empresa_admin(id)
);

-- --------------------------------------------------------------------------
-- public.configuracoes_empresa
-- --------------------------------------------------------------------------

drop policy if exists config_empresa_select_usuario_empresa
  on public.configuracoes_empresa;

drop policy if exists config_empresa_insert_admin
  on public.configuracoes_empresa;

drop policy if exists config_empresa_update_admin
  on public.configuracoes_empresa;

create policy config_empresa_select_usuario_empresa
on public.configuracoes_empresa
for select
to authenticated
using (
  public.usuario_empresa_ativo(empresa_id)
);

create policy config_empresa_insert_admin
on public.configuracoes_empresa
for insert
to authenticated
with check (
  public.usuario_empresa_admin(empresa_id)
);

create policy config_empresa_update_admin
on public.configuracoes_empresa
for update
to authenticated
using (
  public.usuario_empresa_admin(empresa_id)
)
with check (
  public.usuario_empresa_admin(empresa_id)
);
