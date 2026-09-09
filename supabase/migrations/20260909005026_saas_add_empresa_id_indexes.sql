-- ============================================================
-- SaaS Fase 1
-- Índices básicos de tenant
--
-- Objetivo:
-- Criar índices simples em empresa_id para preparar
-- consultas, filtros, RLS e Realtime tenant-aware.
--
-- IMPORTANTE:
-- - nenhum índice é UNIQUE nesta etapa
-- - nenhuma FK é criada
-- - nenhuma policy RLS é alterada
-- - nenhum dado é modificado
-- ============================================================

create index if not exists idx_clientes_empresa_id
  on public.clientes (empresa_id);

create index if not exists idx_clientes_grupo_vip_empresa_id
  on public.clientes_grupo_vip (empresa_id);

create index if not exists idx_clientes_pagamento_empresa_id
  on public.clientes_pagamento (empresa_id);

create index if not exists idx_lives_empresa_id
  on public.lives (empresa_id);

create index if not exists idx_nota_itens_empresa_id
  on public.nota_itens (empresa_id);

create index if not exists idx_notas_empresa_id
  on public.notas (empresa_id);

create index if not exists idx_pecas_empresa_id
  on public.pecas (empresa_id);

create index if not exists idx_pedido_envio_sacolinhas_empresa_id
  on public.pedido_envio_sacolinhas (empresa_id);

create index if not exists idx_pedidos_envio_empresa_id
  on public.pedidos_envio (empresa_id);

create index if not exists idx_sacolinhas_live_empresa_id
  on public.sacolinhas_live (empresa_id);

create index if not exists idx_vendas_live_empresa_id
  on public.vendas_live (empresa_id);

create index if not exists idx_whatsapp_configuracoes_empresa_id
  on public.whatsapp_configuracoes (empresa_id);

create index if not exists idx_whatsapp_contatos_empresa_id
  on public.whatsapp_contatos (empresa_id);

create index if not exists idx_whatsapp_conversas_empresa_id
  on public.whatsapp_conversas (empresa_id);

create index if not exists idx_whatsapp_mensagens_empresa_id
  on public.whatsapp_mensagens (empresa_id);

create index if not exists idx_whatsapp_webhook_eventos_empresa_id
  on public.whatsapp_webhook_eventos (empresa_id);

-- ============================================================
-- Total:
-- 16 índices simples por empresa_id.
-- ============================================================
