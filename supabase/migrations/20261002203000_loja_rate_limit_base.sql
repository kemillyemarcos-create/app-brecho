-- ============================================================================
-- Loja Online — base de rate limit / antiabuso
--
-- Infraestrutura interna para limitar chamadas públicas feitas pelas Edge
-- Functions da Loja. Não armazena IP bruto: a origem deve chegar já derivada
-- por HMAC-SHA-256 na camada server-side.
-- ============================================================================

create table public.loja_rate_limits (
  empresa_id uuid not null,
  escopo text not null,
  origem_hash bytea not null,
  janela_inicio timestamptz not null,
  contador integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint loja_rate_limits_empresa_fk
    foreign key (empresa_id)
    references public.empresas(id)
    on delete cascade,

  constraint loja_rate_limits_origem_hash_ck
    check (octet_length(origem_hash) = 32),

  constraint loja_rate_limits_escopo_ck
    check (
      btrim(escopo) <> ''
      and length(escopo) <= 80
    ),

  constraint loja_rate_limits_contador_ck
    check (contador > 0),

  constraint loja_rate_limits_pk
    primary key (
      empresa_id,
      escopo,
      origem_hash,
      janela_inicio
    )
);

create index loja_rate_limits_updated_at_idx
on public.loja_rate_limits (
  updated_at
);

alter table public.loja_rate_limits
enable row level security;

revoke all
on table public.loja_rate_limits
from anon, authenticated;

comment on table public.loja_rate_limits
is 'Contadores internos de antiabuso da Loja Online. Armazena somente identificador de origem derivado por HMAC, nunca IP bruto.';


-- ============================================================================
-- Consumo atômico de limite
-- ============================================================================

create or replace function public.loja_consumir_rate_limit(
  p_empresa_id uuid,
  p_escopo text,
  p_origem_hash bytea,
  p_janela_segundos integer,
  p_limite integer
)
returns table (
  permitido boolean,
  contador integer,
  limite integer,
  reset_em timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agora timestamptz;
  v_janela_inicio timestamptz;
  v_contador integer;
begin
  if p_empresa_id is null then
    raise exception 'Empresa não informada.'
      using errcode = '22004';
  end if;

  if p_escopo is null
     or btrim(p_escopo) = ''
     or length(btrim(p_escopo)) > 80 then
    raise exception 'Escopo de rate limit inválido.'
      using errcode = '22023';
  end if;

  if p_origem_hash is null
     or octet_length(p_origem_hash) <> 32 then
    raise exception 'Identificador de origem inválido.'
      using errcode = '22023';
  end if;

  if p_janela_segundos is null
     or p_janela_segundos < 1
     or p_janela_segundos > 86400 then
    raise exception 'Janela de rate limit inválida.'
      using errcode = '22023';
  end if;

  if p_limite is null
     or p_limite < 1
     or p_limite > 10000 then
    raise exception 'Limite de rate limit inválido.'
      using errcode = '22023';
  end if;

  v_agora := clock_timestamp();

  v_janela_inicio :=
    to_timestamp(
      floor(
        extract(epoch from v_agora)
        / p_janela_segundos
      ) * p_janela_segundos
    );

  insert into public.loja_rate_limits (
    empresa_id,
    escopo,
    origem_hash,
    janela_inicio,
    contador,
    created_at,
    updated_at
  )
  values (
    p_empresa_id,
    btrim(p_escopo),
    p_origem_hash,
    v_janela_inicio,
    1,
    v_agora,
    v_agora
  )
  on conflict (
    empresa_id,
    escopo,
    origem_hash,
    janela_inicio
  )
  do update
  set
    contador =
      public.loja_rate_limits.contador + 1,
    updated_at = excluded.updated_at
  returning public.loja_rate_limits.contador
  into v_contador;

  return query
  select
    v_contador <= p_limite,
    v_contador,
    p_limite,
    v_janela_inicio
      + make_interval(secs => p_janela_segundos);
end;
$$;

revoke execute
on function public.loja_consumir_rate_limit(
  uuid,
  text,
  bytea,
  integer,
  integer
)
from public;

revoke execute
on function public.loja_consumir_rate_limit(
  uuid,
  text,
  bytea,
  integer,
  integer
)
from anon;

revoke execute
on function public.loja_consumir_rate_limit(
  uuid,
  text,
  bytea,
  integer,
  integer
)
from authenticated;

grant execute
on function public.loja_consumir_rate_limit(
  uuid,
  text,
  bytea,
  integer,
  integer
)
to service_role;

comment on function public.loja_consumir_rate_limit(
  uuid,
  text,
  bytea,
  integer,
  integer
)
is 'Consome atomicamente uma cota de rate limit da Loja. Uso exclusivo server-side via service_role.';
