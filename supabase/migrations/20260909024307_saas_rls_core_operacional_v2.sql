-- ============================================================
-- SaaS Fase 3
-- RLS v2 - núcleo operacional
--
-- Tabelas:
-- - pecas
-- - lives
-- - sacolinhas_live
-- - vendas_live
--
-- IMPORTANTE:
-- Esta migration só deverá ser aplicada depois que os fluxos
-- de escrita destas tabelas enviarem empresa_id corretamente.
-- ============================================================


-- ============================================================
-- PECAS
-- ============================================================

drop policy if exists pecas_authenticated_all
  on public.pecas;

create policy pecas_tenant_all
  on public.pecas
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
-- LIVES
-- ============================================================

drop policy if exists lives_authenticated_all
  on public.lives;

create policy lives_tenant_all
  on public.lives
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
-- SACOLINHAS LIVE
-- ============================================================

drop policy if exists sacolinhas_live_authenticated_all
  on public.sacolinhas_live;

create policy sacolinhas_live_tenant_all
  on public.sacolinhas_live
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
-- VENDAS LIVE
-- ============================================================

drop policy if exists vendas_live_authenticated_all
  on public.vendas_live;

create policy vendas_live_tenant_all
  on public.vendas_live
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
