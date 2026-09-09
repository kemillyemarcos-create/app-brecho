-- ============================================================
-- SaaS - Planos comerciais iniciais
-- Etapa 8
--
-- Planos:
--   essencial
--   profissional
--   completo
--
-- Trial padrão:
--   30 dias para todos
--
-- Preços:
--   ainda não definidos
-- ============================================================

with plano_essencial as (
  insert into public.planos (
    codigo,
    nome,
    descricao,
    preco_mensal,
    preco_anual,
    moeda,
    trial_dias_padrao,
    ativo,
    publico
  )
  values (
    'essencial',
    'Essencial',
    'Plano para operações individuais que precisam organizar estoque, clientes, vendas, lives, expedição e faturamento.',
    null,
    null,
    'BRL',
    30,
    true,
    true
  )
  returning id
),
plano_profissional as (
  insert into public.planos (
    codigo,
    nome,
    descricao,
    preco_mensal,
    preco_anual,
    moeda,
    trial_dias_padrao,
    ativo,
    publico
  )
  values (
    'profissional',
    'Profissional',
    'Plano para brechós com equipe e necessidade de maior acesso ao histórico operacional e financeiro.',
    null,
    null,
    'BRL',
    30,
    true,
    true
  )
  returning id
),
plano_completo as (
  insert into public.planos (
    codigo,
    nome,
    descricao,
    preco_mensal,
    preco_anual,
    moeda,
    trial_dias_padrao,
    ativo,
    publico
  )
  values (
    'completo',
    'Completo',
    'Plano para operações maiores, com mais acessos e histórico completo de faturamento.',
    null,
    null,
    'BRL',
    30,
    true,
    true
  )
  returning id
)

insert into public.plano_recursos (
  plano_id,
  recurso,
  tipo,
  valor_inteiro
)
select
  id,
  'usuarios_maximos',
  'integer',
  1
from plano_essencial

union all

select
  id,
  'faturamento_historico_dias',
  'integer',
  90
from plano_essencial

union all

select
  id,
  'usuarios_maximos',
  'integer',
  3
from plano_profissional

union all

select
  id,
  'faturamento_historico_dias',
  'integer',
  120
from plano_profissional

union all

select
  id,
  'usuarios_maximos',
  'integer',
  5
from plano_completo
;


insert into public.plano_recursos (
  plano_id,
  recurso,
  tipo
)
select
  id,
  'faturamento_historico_dias',
  'unlimited'
from public.planos
where codigo = 'completo';
