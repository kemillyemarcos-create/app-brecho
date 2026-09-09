-- ============================================================================
-- SaaS / Segurança das tabelas internas do WhatsApp
--
-- Estas tabelas são operadas pelas Edge Functions com service_role.
-- O frontend autenticado não acessa nenhuma delas diretamente.
-- Portanto, removemos privilégios diretos de authenticated.
-- ============================================================================

revoke all privileges
on table public.whatsapp_configuracoes
from authenticated;

revoke all privileges
on table public.whatsapp_contatos
from authenticated;

revoke all privileges
on table public.whatsapp_conversas
from authenticated;

revoke all privileges
on table public.whatsapp_mensagens
from authenticated;

revoke all privileges
on table public.whatsapp_webhook_eventos
from authenticated;
