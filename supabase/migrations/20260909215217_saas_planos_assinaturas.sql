-- ============================================================
-- SaaS - Planos, recursos e assinaturas
-- Etapa 8
-- ============================================================

-- ------------------------------------------------------------
-- Função genérica para updated_at
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- PLANOS
-- Catálogo comercial do SaaS.
-- Não depende de gateway de pagamento.
-- ============================================================

create table public.planos (
  id uuid primary key default gen_random_uuid(),

  codigo text not null,
  nome text not null,
  descricao text,

  preco_mensal numeric(12,2),
  preco_anual numeric(12,2),

  moeda text not null default 'BRL',

  trial_dias_padrao integer not null default 30,

  ativo boolean not null default true,
  publico boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint planos_codigo_unique
    unique (codigo),

  constraint planos_codigo_check
    check (
      codigo = lower(codigo)
      and codigo ~ '^[a-z0-9][a-z0-9_-]*$'
    ),

  constraint planos_preco_mensal_check
    check (
      preco_mensal is null
      or preco_mensal >= 0
    ),

  constraint planos_preco_anual_check
    check (
      preco_anual is null
      or preco_anual >= 0
    ),

  constraint planos_trial_dias_check
    check (trial_dias_padrao >= 0)
);


create trigger trg_planos_updated_at
before update on public.planos
for each row
execute function public.set_updated_at();


-- ============================================================
-- PLANO_RECURSOS
-- Capabilities e limites configuráveis de cada plano.
--
-- Exemplos:
-- assistente_ia          -> boolean
-- whatsapp               -> boolean
-- usuarios_maximos       -> integer
-- pecas_estoque_maximas  -> integer
-- ============================================================

create table public.plano_recursos (
  id uuid primary key default gen_random_uuid(),

  plano_id uuid not null,

  recurso text not null,
  tipo text not null,

  valor_boolean boolean,
  valor_inteiro bigint,
  valor_texto text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint plano_recursos_plano_fkey
    foreign key (plano_id)
    references public.planos(id)
    on delete cascade,

  constraint plano_recursos_plano_recurso_unique
    unique (plano_id, recurso),

  constraint plano_recursos_tipo_check
    check (
      tipo = any (
        array[
          'boolean'::text,
          'integer'::text,
          'text'::text
        ]
      )
    ),

  constraint plano_recursos_valor_check
    check (
      (
        tipo = 'boolean'
        and valor_boolean is not null
        and valor_inteiro is null
        and valor_texto is null
      )
      or
      (
        tipo = 'integer'
        and valor_boolean is null
        and valor_inteiro is not null
        and valor_texto is null
      )
      or
      (
        tipo = 'text'
        and valor_boolean is null
        and valor_inteiro is null
        and valor_texto is not null
      )
    )
);


create index idx_plano_recursos_plano_id
  on public.plano_recursos(plano_id);


create trigger trg_plano_recursos_updated_at
before update on public.plano_recursos
for each row
execute function public.set_updated_at();


-- ============================================================
-- ASSINATURAS
--
-- Guarda o estado atual de cada ciclo de assinatura.
-- Uma empresa pode possuir assinaturas históricas,
-- mas apenas uma assinatura corrente por vez.
--
-- O trial pertence à assinatura, não ao plano.
-- Isso permite conceder 30, 40, 60 dias etc.
-- ============================================================

create table public.assinaturas (
  id uuid primary key default gen_random_uuid(),

  empresa_id uuid not null,
  plano_id uuid not null,

  status text not null default 'trialing',

  trial_started_at timestamptz,
  trial_ends_at timestamptz,

  grace_ends_at timestamptz,

  current_period_started_at timestamptz,
  current_period_ends_at timestamptz,

  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,

  gateway text,
  gateway_customer_id text,
  gateway_subscription_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint assinaturas_empresa_fkey
    foreign key (empresa_id)
    references public.empresas(id)
    on delete restrict,

  constraint assinaturas_plano_fkey
    foreign key (plano_id)
    references public.planos(id)
    on delete restrict,

  constraint assinaturas_status_check
    check (
      status = any (
        array[
          'trialing'::text,
          'active'::text,
          'past_due'::text,
          'grace_period'::text,
          'canceled'::text,
          'expired'::text,
          'suspended'::text
        ]
      )
    ),

  constraint assinaturas_trial_periodo_check
    check (
      trial_started_at is null
      or trial_ends_at is null
      or trial_ends_at >= trial_started_at
    ),

  constraint assinaturas_periodo_check
    check (
      current_period_started_at is null
      or current_period_ends_at is null
      or current_period_ends_at >= current_period_started_at
    )
);


create index idx_assinaturas_empresa_id
  on public.assinaturas(empresa_id);

create index idx_assinaturas_plano_id
  on public.assinaturas(plano_id);

create index idx_assinaturas_status
  on public.assinaturas(status);


-- Apenas uma assinatura corrente por empresa.
-- canceled e expired permanecem como histórico.

create unique index ux_assinaturas_empresa_corrente
  on public.assinaturas(empresa_id)
  where status in (
    'trialing',
    'active',
    'past_due',
    'grace_period',
    'suspended'
  );


-- Evita associação acidental da mesma assinatura externa
-- mais de uma vez no mesmo gateway.

create unique index ux_assinaturas_gateway_subscription
  on public.assinaturas(gateway, gateway_subscription_id)
  where gateway is not null
    and gateway_subscription_id is not null;


create trigger trg_assinaturas_updated_at
before update on public.assinaturas
for each row
execute function public.set_updated_at();


-- ============================================================
-- ASSINATURA_EVENTOS
--
-- Histórico append-only de eventos relevantes.
-- Sem updated_at propositalmente.
-- ============================================================

create table public.assinatura_eventos (
  id uuid primary key default gen_random_uuid(),

  empresa_id uuid not null,
  assinatura_id uuid not null,

  tipo text not null,
  origem text not null default 'sistema',

  dados jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint assinatura_eventos_empresa_fkey
    foreign key (empresa_id)
    references public.empresas(id)
    on delete restrict,

  constraint assinatura_eventos_assinatura_fkey
    foreign key (assinatura_id)
    references public.assinaturas(id)
    on delete restrict,

  constraint assinatura_eventos_origem_check
    check (
      origem = any (
        array[
          'sistema'::text,
          'usuario'::text,
          'admin'::text,
          'gateway'::text
        ]
      )
    )
);


create index idx_assinatura_eventos_empresa_id
  on public.assinatura_eventos(empresa_id);

create index idx_assinatura_eventos_assinatura_id
  on public.assinatura_eventos(assinatura_id);

create index idx_assinatura_eventos_created_at
  on public.assinatura_eventos(created_at desc);


-- ============================================================
-- RLS
--
-- Nesta primeira migration apenas habilitamos RLS.
-- As policies serão criadas separadamente após auditoria.
-- Nenhuma regra de acesso será assumida nesta etapa.
-- ============================================================

alter table public.planos
  enable row level security;

alter table public.plano_recursos
  enable row level security;

alter table public.assinaturas
  enable row level security;

alter table public.assinatura_eventos
  enable row level security;
