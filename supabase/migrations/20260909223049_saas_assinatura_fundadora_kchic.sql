-- ============================================================
-- SaaS - Assinatura fundadora K.Chic
-- Etapa 8
--
-- K.Chic:
--   plano completo
--   status active
--   sem trial
--   sem gateway
--   sem vencimento enquanto tenant fundador
-- ============================================================

with plano_completo as (
  select id
  from public.planos
  where codigo = 'completo'
    and ativo = true
  limit 1
),
nova_assinatura as (
  insert into public.assinaturas (
    empresa_id,
    plano_id,
    status,
    trial_started_at,
    trial_ends_at,
    grace_ends_at,
    current_period_started_at,
    current_period_ends_at,
    cancel_at_period_end,
    canceled_at,
    gateway,
    gateway_customer_id,
    gateway_subscription_id
  )
  select
    '1e5eb600-b3aa-4e4a-9734-bf723b193964'::uuid,
    plano_completo.id,
    'active',
    null,
    null,
    null,
    now(),
    null,
    false,
    null,
    null,
    null,
    null
  from plano_completo
  returning id, empresa_id
)

insert into public.assinatura_eventos (
  empresa_id,
  assinatura_id,
  tipo,
  origem,
  dados
)
select
  empresa_id,
  id,
  'ASSINATURA_FUNDADORA_CRIADA',
  'sistema',
  jsonb_build_object(
    'plano_codigo', 'completo',
    'status', 'active',
    'tenant', 'K.Chic'
  )
from nova_assinatura;
