-- ============================================================
-- SaaS Fase 2
-- Backfill K.Chic como tenant #1
--
-- Empresa:
-- K.Chic
-- empresa_id:
-- 1e5eb600-b3aa-4e4a-9734-bf723b193964
--
-- Objetivo:
-- Associar todos os dados legados existentes à empresa K.Chic.
--
-- IMPORTANTE:
-- - somente registros com empresa_id IS NULL são alterados
-- - migration idempotente
-- - nenhuma policy RLS é alterada
-- - nenhuma FK é criada
-- - nenhuma coluna vira NOT NULL nesta etapa
-- ============================================================

update public.clientes
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

update public.clientes_grupo_vip
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

update public.clientes_pagamento
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

update public.lives
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

update public.nota_itens
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

update public.notas
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

update public.pecas
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

update public.pedido_envio_sacolinhas
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

update public.pedidos_envio
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

update public.sacolinhas_live
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

update public.vendas_live
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

update public.whatsapp_configuracoes
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

update public.whatsapp_contatos
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

update public.whatsapp_conversas
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

update public.whatsapp_mensagens
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

update public.whatsapp_webhook_eventos
set empresa_id = '1e5eb600-b3aa-4e4a-9734-bf723b193964'
where empresa_id is null;

-- ============================================================
-- Total esperado no estado auditado antes da migration:
-- 12.832 registros atualizados.
-- ============================================================
