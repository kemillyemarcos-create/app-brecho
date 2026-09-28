-- LOJA — BASE DE CARRINHOS E LOCK TEMPORÁRIO DE ITENS

create table public.loja_carrinhos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,

  -- Nunca armazenar o token público em texto puro.
  -- A futura RPC armazenará SHA-256 do token opaco entregue ao navegador.
  token_hash bytea not null,

  status text not null default 'ativo',
  finalizado_em timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint loja_carrinhos_empresa_fk
    foreign key (empresa_id)
    references public.empresas(id)
    on delete cascade,

  constraint loja_carrinhos_token_hash_tamanho_ck
    check (octet_length(token_hash) = 32),

  constraint loja_carrinhos_status_ck
    check (status in ('ativo', 'convertido')),

  constraint loja_carrinhos_finalizacao_ck
    check (
      (status = 'ativo' and finalizado_em is null)
      or
      (status = 'convertido' and finalizado_em is not null)
    ),

  constraint loja_carrinhos_token_hash_uk
    unique (token_hash),

  constraint loja_carrinhos_empresa_id_id_uk
    unique (empresa_id, id)
);


create table public.loja_carrinho_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  carrinho_id uuid not null,
  publicacao_id uuid not null,

  -- O lock sempre será calculado pelo banco.
  adicionado_em timestamptz not null,
  expira_em timestamptz not null,

  created_at timestamptz not null default now(),

  constraint loja_carrinho_itens_empresa_fk
    foreign key (empresa_id)
    references public.empresas(id)
    on delete cascade,

  constraint loja_carrinho_itens_carrinho_fk
    foreign key (empresa_id, carrinho_id)
    references public.loja_carrinhos(empresa_id, id)
    on delete cascade,

  constraint loja_carrinho_itens_publicacao_fk
    foreign key (empresa_id, publicacao_id)
    references public.loja_publicacoes(empresa_id, id)
    on delete cascade,

  constraint loja_carrinho_itens_expiracao_ck
    check (
      expira_em = adicionado_em + interval '10 minutes'
    ),

  -- Uma publicação possui no máximo um lock de carrinho.
  -- Locks expirados serão reaproveitados atomicamente pelas RPCs.
  constraint loja_carrinho_itens_publicacao_uk
    unique (empresa_id, publicacao_id)
);


create index loja_carrinhos_empresa_status_idx
  on public.loja_carrinhos (
    empresa_id,
    status,
    created_at desc
  );


create index loja_carrinho_itens_carrinho_idx
  on public.loja_carrinho_itens (
    empresa_id,
    carrinho_id,
    expira_em
  );


create index loja_carrinho_itens_expiracao_idx
  on public.loja_carrinho_itens (
    expira_em
  );


alter table public.loja_carrinhos
  enable row level security;

alter table public.loja_carrinho_itens
  enable row level security;


-- Nenhuma leitura ou escrita direta pelo frontend.
-- O acesso público será exclusivamente por RPCs SECURITY DEFINER
-- que validarão empresa + token opaco do carrinho.
revoke all on public.loja_carrinhos
  from anon, authenticated;

revoke all on public.loja_carrinho_itens
  from anon, authenticated;


comment on table public.loja_carrinhos
is 'Carrinho anônimo da Loja. Armazena somente hash SHA-256 do token público; acesso do frontend ocorre exclusivamente por RPCs controladas.';

comment on column public.loja_carrinhos.token_hash
is 'SHA-256 do token opaco do carrinho. O token original nunca é persistido no banco.';

comment on table public.loja_carrinho_itens
is 'Locks temporários Store x Store. Cada publicação possui no máximo um lock; expiração e reassociação são controladas server-side.';

comment on column public.loja_carrinho_itens.expira_em
is 'Fim absoluto do lock temporário. Não deve ser renovado automaticamente pelo frontend.';
