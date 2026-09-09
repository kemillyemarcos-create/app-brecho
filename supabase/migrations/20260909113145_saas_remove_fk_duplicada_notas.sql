-- SaaS multi-tenant
-- Remove a FK antiga e redundante entre nota_itens e notas.
--
-- Mantemos:
--   nota_itens_empresa_nota_fkey
--   (empresa_id, nota_id) -> notas(empresa_id, id)
--   ON DELETE CASCADE
--
-- Removemos:
--   nota_itens_nota_id_fkey
--   (nota_id) -> notas(id)
--
-- Isso elimina a ambiguidade de relacionamento no PostgREST
-- sem perder a integridade referencial tenant-aware.

ALTER TABLE public.nota_itens
  DROP CONSTRAINT nota_itens_nota_id_fkey;
