-- ============================================================
-- SaaS Fase 1
-- Fundação multi-tenant
--
-- Objetivo:
-- Adicionar empresa_id às tabelas operacionais que ainda
-- não possuem identificação explícita de tenant.
--
-- IMPORTANTE:
-- - empresa_id permanece NULL nesta migration.
-- - nenhum dado existente é alterado.
-- - nenhuma policy RLS é alterada.
-- - nenhuma FK é criada nesta etapa.
-- - nenhuma constraint existente é removida.
-- ============================================================


-- ------------------------------------------------------------
-- CLIENTES
-- ------------------------------------------------------------

alter table public.clientes
  add column if not exists empresa_id uuid;


-- ------------------------------------------------------------
-- CLIENTES / VIP / PAGAMENTOS
-- ------------------------------------------------------------

alter table public.clientes_grupo_vip
  add column if not exists empresa_id uuid;

alter table public.clientes_pagamento
  add column if not exists empresa_id uuid;


-- ------------------------------------------------------------
-- LIVES / ESTOQUE / VENDAS
-- ------------------------------------------------------------

alter table public.lives
  add column if not exists empresa_id uuid;

alter table public.pecas
  add column if not exists empresa_id uuid;

alter table public.sacolinhas_live
  add column if not exists empresa_id uuid;

alter table public.vendas_live
  add column if not exists empresa_id uuid;


-- ------------------------------------------------------------
-- EXPEDIÇÃO
-- ------------------------------------------------------------

alter table public.pedidos_envio
  add column if not exists empresa_id uuid;

alter table public.pedido_envio_sacolinhas
  add column if not exists empresa_id uuid;


-- ------------------------------------------------------------
-- NOTAS
-- ------------------------------------------------------------

alter table public.notas
  add column if not exists empresa_id uuid;

alter table public.nota_itens
  add column if not exists empresa_id uuid;


-- ------------------------------------------------------------
-- WHATSAPP
-- ------------------------------------------------------------

alter table public.whatsapp_configuracoes
  add column if not exists empresa_id uuid;

alter table public.whatsapp_contatos
  add column if not exists empresa_id uuid;

alter table public.whatsapp_conversas
  add column if not exists empresa_id uuid;

alter table public.whatsapp_mensagens
  add column if not exists empresa_id uuid;

alter table public.whatsapp_webhook_eventos
  add column if not exists empresa_id uuid;


-- ============================================================
-- Fim da migration.
--
-- Total:
-- 16 tabelas recebem empresa_id UUID nullable.
-- ============================================================
