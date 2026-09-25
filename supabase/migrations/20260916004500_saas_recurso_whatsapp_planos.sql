-- ============================================================
-- SaaS - Recurso WhatsApp por plano
--
-- Essencial:      não inclui integração WhatsApp API
-- Profissional:   inclui integração WhatsApp API
-- Completo:       inclui integração WhatsApp API
--
-- O recurso controla somente a integração backend/API.
-- Atalhos locais whatsapp:// não dependem deste recurso.
-- ============================================================

insert into public.plano_recursos (
  plano_id,
  recurso,
  tipo,
  valor_boolean
)
select
  p.id,
  'whatsapp',
  'boolean',
  configuracao.valor
from public.planos p
join (
  values
    ('essencial'::text, false),
    ('profissional'::text, true),
    ('completo'::text, true)
) as configuracao(codigo, valor)
  on configuracao.codigo = p.codigo;
