-- ============================================================================
-- SaaS / WhatsApp
-- Remove FKs legadas simples que ficaram duplicadas após a criação
-- das relações compostas tenant-aware.
--
-- Mantidas:
--   whatsapp_conversas (empresa_id, contato_id)
--     -> whatsapp_contatos (empresa_id, id)
--
--   whatsapp_mensagens (empresa_id, contato_id)
--     -> whatsapp_contatos (empresa_id, id)
--
--   whatsapp_mensagens (empresa_id, conversa_id)
--     -> whatsapp_conversas (empresa_id, id)
--
-- ON DELETE CASCADE permanece preservado pelas FKs compostas.
-- ============================================================================

alter table public.whatsapp_conversas
  drop constraint whatsapp_conversas_contato_id_fkey;

alter table public.whatsapp_mensagens
  drop constraint whatsapp_mensagens_contato_id_fkey;

alter table public.whatsapp_mensagens
  drop constraint whatsapp_mensagens_conversa_id_fkey;
