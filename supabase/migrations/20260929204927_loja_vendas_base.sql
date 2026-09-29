create unique index if not exists pedido_itens_loja_empresa_id_id_uk
  on public.pedido_itens_loja (
    empresa_id,
    id
  );

create table if not exists public.vendas_loja (
  id uuid primary key default gen_random_uuid(),

  empresa_id uuid not null,
  pedido_id uuid not null,
  pedido_item_id uuid not null,
  pagamento_id uuid not null,

  peca_id text not null,
  cliente_id text not null,

  nome_peca text not null,
  valor_venda numeric(12,2) not null,
  custo_peca numeric(12,2),

  status text not null default 'confirmada',

  vendida_em timestamptz not null default now(),
  reembolsada_em timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vendas_loja_empresa_fk
    foreign key (empresa_id)
    references public.empresas(id)
    on delete cascade,

  constraint vendas_loja_empresa_pedido_fk
    foreign key (empresa_id, pedido_id)
    references public.pedidos_loja(empresa_id, id)
    on delete restrict,

  constraint vendas_loja_empresa_pagamento_fk
    foreign key (empresa_id, pagamento_id)
    references public.pagamentos_loja(empresa_id, id)
    on delete restrict,

  constraint vendas_loja_empresa_item_fk
    foreign key (empresa_id, pedido_item_id)
    references public.pedido_itens_loja(empresa_id, id)
    on delete restrict,

  constraint vendas_loja_empresa_peca_fk
    foreign key (empresa_id, peca_id)
    references public.pecas(empresa_id, id)
    on delete restrict,

  constraint vendas_loja_empresa_cliente_fk
    foreign key (empresa_id, cliente_id)
    references public.clientes(empresa_id, id)
    on delete restrict,

  constraint vendas_loja_nome_peca_ck
    check (btrim(nome_peca) <> ''),

  constraint vendas_loja_valor_venda_ck
    check (valor_venda > 0),

  constraint vendas_loja_custo_peca_ck
    check (
      custo_peca is null
      or custo_peca >= 0
    ),

  constraint vendas_loja_status_ck
    check (
      status in (
        'confirmada',
        'reembolsada'
      )
    ),

  constraint vendas_loja_status_datas_ck
    check (
      (
        status = 'confirmada'
        and reembolsada_em is null
      )
      or
      (
        status = 'reembolsada'
        and reembolsada_em is not null
      )
    ),

  constraint vendas_loja_updated_at_ck
    check (updated_at >= created_at),

  constraint vendas_loja_empresa_id_uk
    unique (empresa_id, id),

  constraint vendas_loja_empresa_item_uk
    unique (empresa_id, pedido_item_id),

  constraint vendas_loja_empresa_peca_uk
    unique (empresa_id, peca_id)
);

create index if not exists vendas_loja_empresa_pedido_idx
  on public.vendas_loja (
    empresa_id,
    pedido_id,
    vendida_em desc
  );

create index if not exists vendas_loja_empresa_cliente_idx
  on public.vendas_loja (
    empresa_id,
    cliente_id,
    vendida_em desc
  );

create index if not exists vendas_loja_empresa_status_idx
  on public.vendas_loja (
    empresa_id,
    status,
    vendida_em desc
  );

alter table public.vendas_loja
  enable row level security;

revoke all
on table public.vendas_loja
from anon;

revoke all
on table public.vendas_loja
from authenticated;

comment on table public.vendas_loja
is 'Registro comercial das vendas originadas pela Loja Online. Separado de vendas_live. Uma linha por item/peça confirmada.';

comment on column public.vendas_loja.pagamento_id
is 'Pagamento da Loja que confirmou a venda.';

comment on column public.vendas_loja.pedido_item_id
is 'Snapshot/item do pedido que originou esta venda.';

comment on column public.vendas_loja.peca_id
is 'Peça física do ERP. UNIQUE por empresa para impedir venda duplicada pela Loja.';
