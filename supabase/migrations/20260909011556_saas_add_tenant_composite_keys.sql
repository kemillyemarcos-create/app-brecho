-- ============================================================
-- SaaS Fase 2
-- Integridade relacional tenant-aware
--
-- Objetivo:
-- 1. Permitir referências por (empresa_id, id)
-- 2. Impedir relações entre registros de empresas diferentes
--
-- IMPORTANTE:
-- - não altera RLS
-- - não altera dados
-- - não torna empresa_id NOT NULL
-- - não remove FKs legadas
-- - preserva CASCADE onde já existia
--
-- EXCLUÍDOS DESTA ETAPA:
-- pedido_envio_sacolinhas -> sacolinhas_live
--   Existem 5 vínculos históricos órfãos.
--
-- nota_itens.cliente_id -> clientes
--   Tipos incompatíveis: uuid x text.
--
-- whatsapp_contatos.cliente_id -> clientes
--   Tipos incompatíveis: uuid x text.
-- ============================================================


-- ============================================================
-- 1. CHAVES COMPOSTAS NAS ENTIDADES REFERENCIADAS
-- ============================================================

alter table public.clientes
  add constraint clientes_empresa_id_id_key
  unique (empresa_id, id);

alter table public.lives
  add constraint lives_empresa_id_id_key
  unique (empresa_id, id);

alter table public.pecas
  add constraint pecas_empresa_id_id_key
  unique (empresa_id, id);

alter table public.sacolinhas_live
  add constraint sacolinhas_live_empresa_id_id_key
  unique (empresa_id, id);

alter table public.pedidos_envio
  add constraint pedidos_envio_empresa_id_id_key
  unique (empresa_id, id);

alter table public.notas
  add constraint notas_empresa_id_id_key
  unique (empresa_id, id);

alter table public.whatsapp_contatos
  add constraint whatsapp_contatos_empresa_id_id_key
  unique (empresa_id, id);

alter table public.whatsapp_conversas
  add constraint whatsapp_conversas_empresa_id_id_key
  unique (empresa_id, id);


-- ============================================================
-- 2. VENDAS
-- ============================================================

alter table public.vendas_live
  add constraint vendas_live_empresa_live_fkey
  foreign key (empresa_id, live_id)
  references public.lives (empresa_id, id)
  on update no action
  on delete no action;

alter table public.vendas_live
  add constraint vendas_live_empresa_peca_fkey
  foreign key (empresa_id, peca_id)
  references public.pecas (empresa_id, id)
  on update no action
  on delete no action;

alter table public.vendas_live
  add constraint vendas_live_empresa_cliente_fkey
  foreign key (empresa_id, cliente_id)
  references public.clientes (empresa_id, id)
  on update no action
  on delete no action;

alter table public.vendas_live
  add constraint vendas_live_empresa_sacolinha_fkey
  foreign key (empresa_id, sacolinha_id)
  references public.sacolinhas_live (empresa_id, id)
  on update no action
  on delete no action;


-- ============================================================
-- 3. SACOLINHAS
-- ============================================================

alter table public.sacolinhas_live
  add constraint sacolinhas_live_empresa_live_fkey
  foreign key (empresa_id, live_id)
  references public.lives (empresa_id, id)
  on update no action
  on delete no action;

alter table public.sacolinhas_live
  add constraint sacolinhas_live_empresa_cliente_fkey
  foreign key (empresa_id, cliente_id)
  references public.clientes (empresa_id, id)
  on update no action
  on delete no action;


-- ============================================================
-- 4. EXPEDIÇÃO
-- ============================================================

alter table public.pedidos_envio
  add constraint pedidos_envio_empresa_cliente_fkey
  foreign key (empresa_id, cliente_id)
  references public.clientes (empresa_id, id)
  on update no action
  on delete no action;

alter table public.pedido_envio_sacolinhas
  add constraint pedido_envio_sacolinhas_empresa_pedido_fkey
  foreign key (empresa_id, pedido_envio_id)
  references public.pedidos_envio (empresa_id, id)
  on update no action
  on delete no action;


-- ============================================================
-- 5. CLIENTES / ESTOQUE / VIP / PAGAMENTOS
-- ============================================================

alter table public.pecas
  add constraint pecas_empresa_cliente_fkey
  foreign key (empresa_id, cliente_id)
  references public.clientes (empresa_id, id)
  on update no action
  on delete no action;

alter table public.clientes_pagamento
  add constraint clientes_pagamento_empresa_cliente_fkey
  foreign key (empresa_id, cliente_id)
  references public.clientes (empresa_id, id)
  on update no action
  on delete no action;

alter table public.clientes_grupo_vip
  add constraint clientes_grupo_vip_empresa_cliente_fkey
  foreign key (empresa_id, cliente_id)
  references public.clientes (empresa_id, id)
  on update no action
  on delete no action;


-- ============================================================
-- 6. NOTAS
-- Preserva o ON DELETE CASCADE da FK existente.
-- ============================================================

alter table public.nota_itens
  add constraint nota_itens_empresa_nota_fkey
  foreign key (empresa_id, nota_id)
  references public.notas (empresa_id, id)
  on update no action
  on delete cascade;


-- ============================================================
-- 7. WHATSAPP
-- Preserva ON DELETE CASCADE das FKs existentes.
-- ============================================================

alter table public.whatsapp_conversas
  add constraint whatsapp_conversas_empresa_contato_fkey
  foreign key (empresa_id, contato_id)
  references public.whatsapp_contatos (empresa_id, id)
  on update no action
  on delete cascade;

alter table public.whatsapp_mensagens
  add constraint whatsapp_mensagens_empresa_contato_fkey
  foreign key (empresa_id, contato_id)
  references public.whatsapp_contatos (empresa_id, id)
  on update no action
  on delete cascade;

alter table public.whatsapp_mensagens
  add constraint whatsapp_mensagens_empresa_conversa_fkey
  foreign key (empresa_id, conversa_id)
  references public.whatsapp_conversas (empresa_id, id)
  on update no action
  on delete cascade;

-- ============================================================
-- Fim da migration.
-- ============================================================
