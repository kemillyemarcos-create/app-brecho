-- ============================================================================
-- SaaS / RLS multi-tenant para notas e nota_itens
-- ============================================================================

-- Remove policies permissivas legadas.
drop policy if exists "Authenticated pode acessar notas"
  on public.notas;

drop policy if exists "Authenticated pode acessar nota_itens"
  on public.nota_itens;

-- Notas: acesso somente para usuários ativos da mesma empresa.
create policy notas_tenant_all
on public.notas
for all
to authenticated
using (
  public.usuario_empresa_ativo(empresa_id)
)
with check (
  public.usuario_empresa_ativo(empresa_id)
);

-- Itens da nota: mesma regra de isolamento por empresa.
create policy nota_itens_tenant_all
on public.nota_itens
for all
to authenticated
using (
  public.usuario_empresa_ativo(empresa_id)
)
with check (
  public.usuario_empresa_ativo(empresa_id)
);
