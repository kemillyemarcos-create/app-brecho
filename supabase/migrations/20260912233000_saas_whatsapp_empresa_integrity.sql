-- ============================================================================
-- SaaS / WhatsApp
-- Integridade referencial do tenant
--
-- Objetivos:
-- 1. Tornar empresa_id obrigatório em todas as tabelas WhatsApp.
-- 2. Garantir que todo registro WhatsApp pertença a uma empresa existente.
-- 3. Manter o comportamento operacional do módulo com ON DELETE CASCADE.
--
-- Pré-validação realizada:
-- - 0 registros com empresa_id nulo
-- - 0 registros com empresa_id órfão
-- ============================================================================

alter table public.whatsapp_configuracoes
  alter column empresa_id set not null;

alter table public.whatsapp_contatos
  alter column empresa_id set not null;

alter table public.whatsapp_conversas
  alter column empresa_id set not null;

alter table public.whatsapp_mensagens
  alter column empresa_id set not null;

alter table public.whatsapp_webhook_eventos
  alter column empresa_id set not null;


alter table public.whatsapp_configuracoes
  add constraint whatsapp_configuracoes_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;

alter table public.whatsapp_contatos
  add constraint whatsapp_contatos_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;

alter table public.whatsapp_conversas
  add constraint whatsapp_conversas_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;

alter table public.whatsapp_mensagens
  add constraint whatsapp_mensagens_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;

alter table public.whatsapp_webhook_eventos
  add constraint whatsapp_webhook_eventos_empresa_fkey
  foreign key (empresa_id)
  references public.empresas(id)
  on delete cascade;
