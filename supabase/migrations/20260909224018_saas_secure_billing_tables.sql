-- ============================================================
-- SaaS - Segurança das tabelas de billing
-- Etapa 8
--
-- Defesa em profundidade:
-- - RLS já está habilitado
-- - authenticated não deve escrever diretamente
-- - service_role permanece como camada administrativa/backend
-- ============================================================

revoke insert, update, delete, truncate
on table public.planos
from authenticated;

revoke insert, update, delete, truncate
on table public.plano_recursos
from authenticated;

revoke insert, update, delete, truncate
on table public.assinaturas
from authenticated;

revoke insert, update, delete, truncate
on table public.assinatura_eventos
from authenticated;
