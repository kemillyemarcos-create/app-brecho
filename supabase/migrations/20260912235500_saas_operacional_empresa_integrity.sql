-- ============================================================================
-- SaaS / Integridade estrutural do tenant operacional
--
-- Objetivos:
-- 1. Tornar empresa_id obrigatório nas tabelas operacionais.
-- 2. Garantir FK direta de empresa_id para public.empresas(id).
-- 3. Impedir registros operacionais sem tenant válido.
-- 4. Manter dados operacionais vinculados ao ciclo de vida da empresa
--    através de ON DELETE CASCADE.
--
-- Pré-validação realizada:
-- - 0 registros com empresa_id nulo
-- - 0 registros com empresa_id órfão
-- ============================================================================

-- ============================================================================
-- NOT NULL
-- clientes_pagamento já possui empresa_id NOT NULL.
-- ============================================================================

alter table public.clientes
  alter column empresa_id set not null;

alter table public.clientes_grupo_vip
  alter column empresa_id set not null;

alter table public.lives
  alter column empresa_id set not null;

alter table public.nota_itens
  alter column empresa_id set not null;

alter table public.notas
  alter column empresa_id set not null;

alter table public.pecas
  alter column empresa_id set not null;

alter table public.pedido_envio_sacolinhas
  alter column empresa_id set not null;

alter table public.pedidos_envio
  alter column empresa_id set not null;

alter table public.sacolinhas_live
  alter column empresa_id set not null;

alter table public.vendas_live
  alter column empresa_id set not null;


-- ============================================================================
-- FOREIGN KEYS → empresas(id)
-- ============================================================================

alter table public.clientes
  add constraint clientes_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;

alter table public.clientes_grupo_vip
  add constraint clientes_grupo_vip_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;

alter table public.clientes_pagamento
  add constraint clientes_pagamento_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;

alter table public.lives
  add constraint lives_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;

alter table public.nota_itens
  add constraint nota_itens_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;

alter table public.notas
  add constraint notas_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;

alter table public.pecas
  add constraint pecas_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;

alter table public.pedido_envio_sacolinhas
  add constraint pedido_envio_sacolinhas_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;

alter table public.pedidos_envio
  add constraint pedidos_envio_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;

alter table public.sacolinhas_live
  add constraint sacolinhas_live_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;

alter table public.vendas_live
  add constraint vendas_live_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;
