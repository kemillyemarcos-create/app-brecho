-- ============================================================================
-- Loja Online — rate limit recebe hash hexadecimal
--
-- Alinha a RPC ao padrão já usado pelo webhook:
-- a Edge Function envia SHA/HMAC em hexadecimal de 64 caracteres e o banco
-- converte internamente para bytea.
-- ============================================================================

drop function if exists public.loja_consumir_rate_limit(
  uuid,
  text,
  bytea,
  integer,
  integer
);

create or replace function public.loja_consumir_rate_limit(
  p_empresa_id uuid,
  p_escopo text,
  p_origem_hash_hex text,
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
  v_origem_hash bytea;
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

  if p_origem_hash_hex is null
     or p_origem_hash_hex !~ '^[0-9a-fA-F]{64}$' then
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

  v_origem_hash :=
    decode(
      lower(p_origem_hash_hex),
      'hex'
    );

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
    v_origem_hash,
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
  text,
  integer,
  integer
)
from public;

revoke execute
on function public.loja_consumir_rate_limit(
  uuid,
  text,
  text,
  integer,
  integer
)
from anon;

revoke execute
on function public.loja_consumir_rate_limit(
  uuid,
  text,
  text,
  integer,
  integer
)
from authenticated;

grant execute
on function public.loja_consumir_rate_limit(
  uuid,
  text,
  text,
  integer,
  integer
)
to service_role;

comment on function public.loja_consumir_rate_limit(
  uuid,
  text,
  text,
  integer,
  integer
)
is 'Consome atomicamente uma cota de rate limit da Loja usando identificador de origem em hexadecimal. Uso exclusivo server-side via service_role.';
