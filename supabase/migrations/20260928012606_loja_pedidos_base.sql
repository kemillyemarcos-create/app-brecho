-- ============================================================================
-- Loja Online
-- Base estrutural de pedidos e itens do pedido.
--
-- Nesta etapa:
-- - não converte carrinho;
-- - não processa pagamento;
-- - não altera estoque;
-- - apenas cria as estruturas persistentes do pedido.
-- ============================================================================


-- ============================================================================
-- PEDIDOS
-- ============================================================================

create table public.pedidos_loja (
  id uuid primary key default gen_random_uuid(),

  empresa_id uuid not null,
  carrinho_id uuid not null,
  cliente_id text not null,

  -- Somente o hash do token público do pedido é persistido.
  token_publico_hash bytea not null,

  status text not null default 'pendente_pagamento',

  -- Snapshot dos dados do cliente no momento do checkout.
  cliente_nome text not null,
  cliente_cpf text not null,
  cliente_telefone text not null,

  forma_entrega text not null default 'retirada',

  subtotal numeric(12,2) not null,
  valor_frete numeric(12,2) not null default 0,
  total numeric(12,2) not null,

  pagamento_expira_em timestamptz not null,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  pago_em timestamptz,
  cancelado_em timestamptz,
  expirado_em timestamptz,
  reembolsado_em timestamptz,

  constraint pedidos_loja_empresa_fkey
    foreign key (empresa_id)
    references public.empresas(id)
    on delete cascade,

  constraint pedidos_loja_empresa_carrinho_fkey
    foreign key (empresa_id, carrinho_id)
    references public.loja_carrinhos(empresa_id, id)
    on delete no action,

  constraint pedidos_loja_empresa_cliente_fkey
    foreign key (empresa_id, cliente_id)
    references public.clientes(empresa_id, id)
    on delete no action,

  constraint pedidos_loja_token_hash_check
    check (octet_length(token_publico_hash) = 32),

  constraint pedidos_loja_status_check
    check (
      status in (
        'pendente_pagamento',
        'pago',
        'expirado',
        'cancelado',
        'reembolsado'
      )
    ),

  constraint pedidos_loja_forma_entrega_check
    check (
      forma_entrega in (
        'retirada',
        'envio'
      )
    ),

  constraint pedidos_loja_cliente_nome_check
    check (btrim(cliente_nome) <> ''),

  constraint pedidos_loja_cliente_cpf_check
    check (cliente_cpf ~ '^[0-9]{11}$'),

  constraint pedidos_loja_cliente_telefone_check
    check (cliente_telefone ~ '^[0-9]{10,11}$'),

  constraint pedidos_loja_valores_check
    check (
      subtotal >= 0
      and valor_frete >= 0
      and total >= 0
      and total = subtotal + valor_frete
    ),

  constraint pedidos_loja_pagamento_expira_check
    check (pagamento_expira_em > criado_em),

  constraint pedidos_loja_status_datas_check
    check (
      (status <> 'pago' or pago_em is not null)
      and
      (status <> 'cancelado' or cancelado_em is not null)
      and
      (status <> 'expirado' or expirado_em is not null)
      and
      (
        status <> 'reembolsado'
        or (
          pago_em is not null
          and reembolsado_em is not null
        )
      )
    ),

  constraint pedidos_loja_empresa_id_id_key
    unique (empresa_id, id),

  constraint pedidos_loja_empresa_carrinho_key
    unique (empresa_id, carrinho_id),

  constraint pedidos_loja_token_publico_hash_key
    unique (token_publico_hash)
);

create index pedidos_loja_empresa_status_criado_idx
  on public.pedidos_loja (
    empresa_id,
    status,
    criado_em desc
  );

create index pedidos_loja_pagamento_expira_idx
  on public.pedidos_loja (
    pagamento_expira_em
  )
  where status = 'pendente_pagamento';


-- ============================================================================
-- ITENS DO PEDIDO
-- ============================================================================

create table public.pedido_itens_loja (
  id uuid primary key default gen_random_uuid(),

  empresa_id uuid not null,
  pedido_id uuid not null,
  publicacao_id uuid not null,
  peca_id text not null,

  -- Snapshot comercial no momento do checkout.
  nome text not null,
  preco numeric(12,2) not null,
  marca text,
  categoria text,
  tamanho text,
  condicao text,
  descricao text,
  obs text,
  foto_principal text,

  criado_em timestamptz not null default now(),

  constraint pedido_itens_loja_empresa_fkey
    foreign key (empresa_id)
    references public.empresas(id)
    on delete cascade,

  constraint pedido_itens_loja_empresa_pedido_fkey
    foreign key (empresa_id, pedido_id)
    references public.pedidos_loja(empresa_id, id)
    on delete cascade,

  constraint pedido_itens_loja_empresa_publicacao_fkey
    foreign key (empresa_id, publicacao_id)
    references public.loja_publicacoes(empresa_id, id)
    on delete no action,

  constraint pedido_itens_loja_empresa_peca_fkey
    foreign key (empresa_id, peca_id)
    references public.pecas(empresa_id, id)
    on delete no action,

  constraint pedido_itens_loja_nome_check
    check (btrim(nome) <> ''),

  constraint pedido_itens_loja_preco_check
    check (preco > 0),

  constraint pedido_itens_loja_empresa_pedido_publicacao_key
    unique (empresa_id, pedido_id, publicacao_id)
);

create index pedido_itens_loja_empresa_pedido_idx
  on public.pedido_itens_loja (
    empresa_id,
    pedido_id
  );


-- ============================================================================
-- SEGURANÇA
-- ============================================================================

alter table public.pedidos_loja
  enable row level security;

alter table public.pedido_itens_loja
  enable row level security;

revoke all on table public.pedidos_loja
  from anon, authenticated;

revoke all on table public.pedido_itens_loja
  from anon, authenticated;


comment on table public.pedidos_loja
is 'Pedidos da Loja Online. Mantém snapshots do cliente, valores e prazo do pagamento.';

comment on table public.pedido_itens_loja
is 'Snapshots dos itens pertencentes aos pedidos da Loja Online.';
