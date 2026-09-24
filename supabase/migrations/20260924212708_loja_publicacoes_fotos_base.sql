create table if not exists public.loja_publicacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  peca_id text not null,

  slug text not null,

  marca text,
  categoria text,
  tamanho text,
  condicao text,
  descricao text,

  publicada boolean not null default false,
  publicada_em timestamptz,
  despublicada_em timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint loja_publicacoes_empresa_fkey
    foreign key (empresa_id)
    references public.empresas(id)
    on delete cascade,

  constraint loja_publicacoes_peca_fkey
    foreign key (empresa_id, peca_id)
    references public.pecas(empresa_id, id)
    on delete restrict,

  constraint loja_publicacoes_empresa_peca_unique
    unique (empresa_id, peca_id),

  constraint loja_publicacoes_empresa_slug_unique
    unique (empresa_id, slug),

  constraint loja_publicacoes_empresa_id_id_unique
    unique (empresa_id, id),

  constraint loja_publicacoes_slug_check
    check (btrim(slug) <> ''),

  constraint loja_publicacoes_marca_check
    check (marca is null or btrim(marca) <> ''),

  constraint loja_publicacoes_tamanho_check
    check (tamanho is null or btrim(tamanho) <> ''),

  constraint loja_publicacoes_descricao_check
    check (descricao is null or btrim(descricao) <> ''),

  constraint loja_publicacoes_condicao_check
    check (
      condicao is null
      or condicao in (
        'novo_com_etiqueta',
        'novo_sem_etiqueta',
        'excelente',
        'muito_bom',
        'bom',
        'sinais_de_uso'
      )
    ),

  constraint loja_publicacoes_categoria_check
    check (
      categoria is null
      or categoria in (
        'blusas',
        'camisas',
        'calcas',
        'shorts',
        'saias',
        'vestidos',
        'jaquetas',
        'casacos',
        'moletons',
        'tricots',
        'conjuntos',
        'macacoes',
        'calcados',
        'bolsas',
        'acessorios',
        'moda_infantil',
        'outros'
      )
    )
);

create index if not exists loja_publicacoes_empresa_publicada_idx
  on public.loja_publicacoes (empresa_id, publicada);

create index if not exists loja_publicacoes_empresa_created_at_idx
  on public.loja_publicacoes (empresa_id, created_at desc);

create index if not exists loja_publicacoes_marca_idx
  on public.loja_publicacoes (empresa_id, marca);

create index if not exists loja_publicacoes_categoria_idx
  on public.loja_publicacoes (empresa_id, categoria);

create index if not exists loja_publicacoes_tamanho_idx
  on public.loja_publicacoes (empresa_id, tamanho);

create index if not exists loja_publicacoes_condicao_idx
  on public.loja_publicacoes (empresa_id, condicao);


create table if not exists public.loja_publicacao_fotos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  publicacao_id uuid not null,

  storage_path text not null,
  ordem integer not null,
  principal boolean not null default false,

  mime_type text,
  tamanho_bytes bigint,

  created_at timestamptz not null default now(),

  constraint loja_publicacao_fotos_empresa_fkey
    foreign key (empresa_id)
    references public.empresas(id)
    on delete cascade,

  constraint loja_publicacao_fotos_publicacao_fkey
    foreign key (empresa_id, publicacao_id)
    references public.loja_publicacoes(empresa_id, id)
    on delete cascade,

  constraint loja_publicacao_fotos_ordem_check
    check (ordem >= 1),

  constraint loja_publicacao_fotos_storage_path_check
    check (btrim(storage_path) <> ''),

  constraint loja_publicacao_fotos_tamanho_bytes_check
    check (tamanho_bytes is null or tamanho_bytes >= 0),

  constraint loja_publicacao_fotos_publicacao_ordem_unique
    unique (publicacao_id, ordem)
);

create index if not exists loja_publicacao_fotos_empresa_publicacao_idx
  on public.loja_publicacao_fotos (empresa_id, publicacao_id);

create unique index if not exists loja_publicacao_fotos_principal_unique
  on public.loja_publicacao_fotos (publicacao_id)
  where principal = true;

-- =========================================================
-- RLS — ADMINISTRAÇÃO DA LOJA
-- =========================================================

alter table public.loja_publicacoes
  enable row level security;

alter table public.loja_publicacao_fotos
  enable row level security;


create policy loja_publicacoes_tenant_all
on public.loja_publicacoes
for all
to authenticated
using (
  public.usuario_empresa_operacional_ativo(empresa_id)
)
with check (
  public.usuario_empresa_operacional_ativo(empresa_id)
);


create policy loja_publicacao_fotos_tenant_all
on public.loja_publicacao_fotos
for all
to authenticated
using (
  public.usuario_empresa_operacional_ativo(empresa_id)
)
with check (
  public.usuario_empresa_operacional_ativo(empresa_id)
);
