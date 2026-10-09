-- ============================================================================
-- Loja Online - Base de pagamentos
--
-- Domínio completamente separado do billing do SaaS.
-- Não contém credenciais, dados completos de cartão ou payload bruto.
-- ============================================================================

create table public.pagamentos_loja (
  id uuid primary key default gen_random_uuid(),

  empresa_id uuid not null,
  pedido_id uuid not null,

  provider text not null,
  provider_payment_id text,
  provider_checkout_id text,

  metodo text,

  status text not null default 'pending',

  valor numeric(12,2) not null,
  moeda text not null default 'BRL',

  paid_at timestamptz,
  failed_at timestamptz,
  canceled_at timestamptz,
  refunded_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pagamentos_loja_empresa_fk
    foreign key (empresa_id)
    references public.empresas(id)
    on delete cascade,

  constraint pagamentos_loja_pedido_fk
    foreign key (empresa_id, pedido_id)
    references public.pedidos_loja(empresa_id, id)
    on delete restrict,

  constraint pagamentos_loja_empresa_id_id_uk
    unique (empresa_id, id),

  constraint pagamentos_loja_provider_valido_ck
    check (btrim(provider) <> ''),

  constraint pagamentos_loja_provider_payment_id_ck
    check (
      provider_payment_id is null
      or btrim(provider_payment_id) <> ''
    ),

  constraint pagamentos_loja_provider_checkout_id_ck
    check (
      provider_checkout_id is null
      or btrim(provider_checkout_id) <> ''
    ),

  constraint pagamentos_loja_metodo_ck
    check (
      metodo is null
      or btrim(metodo) <> ''
    ),

  constraint pagamentos_loja_status_ck
    check (
      status in (
        'pending',
        'authorized',
        'paid',
        'failed',
        'canceled',
        'refunded',
        'partially_refunded'
      )
    ),

  constraint pagamentos_loja_valor_ck
    check (valor > 0),

  constraint pagamentos_loja_moeda_ck
    check (
      moeda ~ '^[A-Z]{3}$'
    ),

  constraint pagamentos_loja_datas_status_ck
    check (
      (
        status in ('pending', 'authorized')
        and paid_at is null
        and failed_at is null
        and canceled_at is null
        and refunded_at is null
      )
      or
      (
        status = 'paid'
        and paid_at is not null
        and failed_at is null
        and canceled_at is null
        and refunded_at is null
      )
      or
      (
        status = 'failed'
        and paid_at is null
        and failed_at is not null
        and canceled_at is null
        and refunded_at is null
      )
      or
      (
        status = 'canceled'
        and paid_at is null
        and failed_at is null
        and canceled_at is not null
        and refunded_at is null
      )
      or
      (
        status in ('refunded', 'partially_refunded')
        and paid_at is not null
        and failed_at is null
        and canceled_at is null
        and refunded_at is not null
      )
    ),

  constraint pagamentos_loja_updated_at_ck
    check (updated_at >= created_at)
);

create unique index pagamentos_loja_provider_payment_uidx
on public.pagamentos_loja (
  empresa_id,
  provider,
  provider_payment_id
)
where provider_payment_id is not null;

create unique index pagamentos_loja_provider_checkout_uidx
on public.pagamentos_loja (
  empresa_id,
  provider,
  provider_checkout_id
)
where provider_checkout_id is not null;

-- Um pedido pode ter novas tentativas depois de falha/cancelamento,
-- mas não pode manter dois pagamentos economicamente ativos ao mesmo tempo.
create unique index pagamentos_loja_pedido_ativo_uidx
on public.pagamentos_loja (
  empresa_id,
  pedido_id
)
where status in (
  'pending',
  'authorized',
  'paid',
  'refunded',
  'partially_refunded'
);

create index pagamentos_loja_empresa_pedido_idx
on public.pagamentos_loja (
  empresa_id,
  pedido_id,
  created_at desc
);

create index pagamentos_loja_empresa_status_idx
on public.pagamentos_loja (
  empresa_id,
  status,
  created_at desc
);


-- ============================================================================
-- Eventos recebidos do gateway
--
-- Armazena metadados seguros e hash do payload.
-- Payload bruto e secrets não pertencem a esta tabela.
-- ============================================================================

create table public.pagamento_eventos_loja (
  id uuid primary key default gen_random_uuid(),

  empresa_id uuid not null,
  pagamento_id uuid,

  provider text not null,
  provider_event_id text,
  event_type text not null,

  payload_hash bytea not null,

  status text not null default 'received',

  received_at timestamptz not null default now(),
  processed_at timestamptz,

  error_code text,

  created_at timestamptz not null default now(),

  constraint pagamento_eventos_loja_empresa_fk
    foreign key (empresa_id)
    references public.empresas(id)
    on delete cascade,

  constraint pagamento_eventos_loja_pagamento_fk
    foreign key (empresa_id, pagamento_id)
    references public.pagamentos_loja(empresa_id, id)
    on delete restrict,

  constraint pagamento_eventos_loja_empresa_id_id_uk
    unique (empresa_id, id),

  constraint pagamento_eventos_loja_provider_ck
    check (btrim(provider) <> ''),

  constraint pagamento_eventos_loja_provider_event_id_ck
    check (
      provider_event_id is null
      or btrim(provider_event_id) <> ''
    ),

  constraint pagamento_eventos_loja_event_type_ck
    check (btrim(event_type) <> ''),

  constraint pagamento_eventos_loja_payload_hash_ck
    check (octet_length(payload_hash) = 32),

  constraint pagamento_eventos_loja_status_ck
    check (
      status in (
        'received',
        'processed',
        'ignored',
        'failed'
      )
    ),

  constraint pagamento_eventos_loja_processamento_ck
    check (
      (
        status = 'received'
        and processed_at is null
        and error_code is null
      )
      or
      (
        status in ('processed', 'ignored')
        and processed_at is not null
        and error_code is null
      )
      or
      (
        status = 'failed'
        and processed_at is not null
      )
    )
);

-- Idempotência do webhook quando o provedor fornece identificador de evento.
create unique index pagamento_eventos_loja_provider_event_uidx
on public.pagamento_eventos_loja (
  empresa_id,
  provider,
  provider_event_id
)
where provider_event_id is not null;

create index pagamento_eventos_loja_pagamento_idx
on public.pagamento_eventos_loja (
  empresa_id,
  pagamento_id,
  received_at desc
);

create index pagamento_eventos_loja_status_idx
on public.pagamento_eventos_loja (
  empresa_id,
  status,
  received_at desc
);


-- ============================================================================
-- RLS / superfície de acesso
-- ============================================================================

alter table public.pagamentos_loja
enable row level security;

alter table public.pagamento_eventos_loja
enable row level security;

revoke all
on table public.pagamentos_loja
from anon, authenticated;

revoke all
on table public.pagamento_eventos_loja
from anon, authenticated;

comment on table public.pagamentos_loja
is 'Pagamentos avulsos da Loja Online, separados do domínio de billing do SaaS. Não armazena dados completos de cartão, CVV ou secrets de gateway.';

comment on table public.pagamento_eventos_loja
is 'Eventos seguros e idempotentes de pagamento da Loja. Armazena identificadores e hash do payload, não o payload bruto nem secrets.';
