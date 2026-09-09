-- ============================================================
-- SaaS Fase 3
-- RLS v2 piloto: clientes
--
-- Objetivo:
-- substituir a policy global permissiva por isolamento real
-- baseado em empresa_id + auth.uid().
--
-- Regra:
-- usuário autenticado e ativo somente pode acessar registros
-- pertencentes à sua própria empresa.
-- ============================================================

drop policy if exists clientes_authenticated_all
  on public.clientes;

create policy clientes_tenant_all
  on public.clientes
  as permissive
  for all
  to authenticated
  using (
    public.usuario_empresa_ativo(empresa_id)
  )
  with check (
    public.usuario_empresa_ativo(empresa_id)
  );

-- ============================================================
-- Fim da migration.
-- ============================================================
