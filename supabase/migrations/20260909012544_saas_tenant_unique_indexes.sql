-- ============================================================
-- SaaS Fase 2
-- Unicidades tenant-aware
--
-- Objetivo:
-- substituir regras globais de unicidade por regras isoladas
-- por empresa.
--
-- Estratégia:
-- 1. criar primeiro o novo índice UNIQUE tenant-aware
-- 2. remover depois o índice/constraint global antigo
--
-- Não altera:
-- - dados
-- - RLS
-- - PKs
-- - FKs tenant-aware
-- - NOT NULL
-- ============================================================


-- ============================================================
-- 1. CLIENTES
-- CPF deve ser único dentro da empresa, não globalmente.
-- ============================================================

create unique index clientes_empresa_cpf_unique
  on public.clientes (empresa_id, cpf);

drop index public.clientes_cpf_unique;


-- ============================================================
-- 2. CLIENTES GRUPO VIP
-- Mantém exatamente as condições parciais existentes,
-- adicionando empresa_id ao escopo da unicidade.
-- ============================================================

create unique index clientes_grupo_vip_empresa_cliente_id_unique
  on public.clientes_grupo_vip (empresa_id, cliente_id)
  where cliente_id is not null;

drop index public.clientes_grupo_vip_cliente_id_unique;


create unique index clientes_grupo_vip_empresa_nome_chave_historico_unique
  on public.clientes_grupo_vip (empresa_id, nome_chave)
  where cliente_id is null;

drop index public.clientes_grupo_vip_nome_chave_historico_unique;


-- ============================================================
-- 3. VENDAS LIVE
-- Uma peça continua podendo aparecer somente uma vez por live,
-- mas a regra passa a ser explicitamente tenant-aware.
-- ============================================================

create unique index idx_vendas_live_empresa_live_peca_unique
  on public.vendas_live (empresa_id, live_id, peca_id)
  where live_id is not null
    and peca_id is not null;

drop index public.idx_vendas_live_live_peca_unique;


-- ============================================================
-- 4. WHATSAPP CONFIGURAÇÕES
-- Nome da configuração passa a ser único por empresa.
--
-- ATENÇÃO:
-- whatsapp_configuracoes_nome_unique foi identificado como
-- UNIQUE CONSTRAINT, portanto deve ser removido via
-- ALTER TABLE ... DROP CONSTRAINT, e não DROP INDEX.
-- ============================================================

create unique index whatsapp_configuracoes_empresa_nome_unique
  on public.whatsapp_configuracoes (empresa_id, nome);

alter table public.whatsapp_configuracoes
  drop constraint whatsapp_configuracoes_nome_unique;


-- ============================================================
-- 5. WHATSAPP CONTATOS
-- O mesmo telefone poderá existir em empresas diferentes.
--
-- ATENÇÃO:
-- whatsapp_contatos_telefone_normalizado_unique foi identificado
-- como UNIQUE CONSTRAINT.
-- ============================================================

create unique index whatsapp_contatos_empresa_telefone_normalizado_unique
  on public.whatsapp_contatos (empresa_id, telefone_normalizado);

alter table public.whatsapp_contatos
  drop constraint whatsapp_contatos_telefone_normalizado_unique;


-- ============================================================
-- Fim da migration.
-- ============================================================
