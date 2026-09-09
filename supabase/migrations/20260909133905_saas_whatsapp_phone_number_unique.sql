-- ============================================================================
-- SaaS / WhatsApp
-- Garante que um mesmo phone_number_id da Meta pertença a apenas uma empresa.
--
-- A unicidade é parcial porque a configuração pode existir sem integração
-- ativa, mantendo phone_number_id = NULL.
-- ============================================================================

create unique index if not exists whatsapp_configuracoes_phone_number_id_unique
on public.whatsapp_configuracoes (phone_number_id)
where phone_number_id is not null;
