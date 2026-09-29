create or replace function public.loja_preparar_pagamento(
  p_pedido_token text
)
returns table (
  empresa_id uuid,
  pedido_id uuid,
  pagamento_id uuid,
  idempotency_key text,
  valor numeric,
  moeda text,
  cliente_nome text,
  cliente_cpf text,
  cliente_telefone text,
  pagamento_expira_em timestamptz,
  pagamento_status text,
  provider_payment_id text,
  provider_checkout_id text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_token_hash bytea;

  v_pedido public.pedidos_loja%rowtype;
  v_pagamento public.pagamentos_loja%rowtype;

  v_agora timestamptz;
begin
  ---------------------------------------------------------------------------
  -- TOKEN PÚBLICO DO PEDIDO
  ---------------------------------------------------------------------------

  v_token := btrim(coalesce(p_pedido_token, ''));

  if v_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Token do pedido inválido.'
      using errcode = '22023';
  end if;

  v_token_hash := extensions.digest(
    v_token,
    'sha256'
  );

  ---------------------------------------------------------------------------
  -- LOCALIZA E TRAVA O PEDIDO
  --
  -- token_publico_hash é globalmente único, então não dependemos de
  -- empresa_id informado pelo frontend.
  ---------------------------------------------------------------------------

  select pl.*
    into v_pedido
  from public.pedidos_loja pl
  where pl.token_publico_hash = v_token_hash
  for update;

  if not found then
    raise exception 'Pedido não encontrado.'
      using errcode = 'P0002';
  end if;

  v_agora := clock_timestamp();

  if v_pedido.status <> 'pendente_pagamento' then
    raise exception
      'Pedido não está disponível para pagamento.'
      using errcode = '22023';
  end if;

  if v_pedido.pagamento_expira_em <= v_agora then
    raise exception
      'Prazo de pagamento expirado.'
      using errcode = '22023';
  end if;

  if v_pedido.total <= 0 then
    raise exception
      'Valor do pedido inválido.'
      using errcode = '22023';
  end if;

  ---------------------------------------------------------------------------
  -- REUTILIZA PAGAMENTO ECONOMICAMENTE ATIVO
  --
  -- Isso mantém refresh/retry idempotente.
  ---------------------------------------------------------------------------

  select pg.*
    into v_pagamento
  from public.pagamentos_loja pg
  where pg.empresa_id = v_pedido.empresa_id
    and pg.pedido_id = v_pedido.id
    and pg.status in (
      'pending',
      'authorized',
      'paid',
      'refunded',
      'partially_refunded'
    )
  order by pg.created_at desc
  limit 1
  for update;

  if found then
    if v_pagamento.provider <> 'mercado_pago' then
      raise exception
        'Pedido já possui pagamento ativo em outro provedor.'
        using errcode = '22023';
    end if;

    return query
    select
      v_pedido.empresa_id,
      v_pedido.id,
      v_pagamento.id,
      v_pagamento.id::text,
      v_pagamento.valor,
      v_pagamento.moeda,
      v_pedido.cliente_nome,
      v_pedido.cliente_cpf,
      v_pedido.cliente_telefone,
      v_pedido.pagamento_expira_em,
      v_pagamento.status,
      v_pagamento.provider_payment_id,
      v_pagamento.provider_checkout_id;

    return;
  end if;

  ---------------------------------------------------------------------------
  -- CRIA NOVA TENTATIVA
  --
  -- O UUID do pagamento será usado como X-Idempotency-Key no Mercado Pago.
  ---------------------------------------------------------------------------

  insert into public.pagamentos_loja (
    empresa_id,
    pedido_id,
    provider,
    metodo,
    status,
    valor,
    moeda,
    created_at,
    updated_at
  )
  values (
    v_pedido.empresa_id,
    v_pedido.id,
    'mercado_pago',
    null,
    'pending',
    v_pedido.total,
    'BRL',
    v_agora,
    v_agora
  )
  returning *
  into v_pagamento;

  return query
  select
    v_pedido.empresa_id,
    v_pedido.id,
    v_pagamento.id,
    v_pagamento.id::text,
    v_pagamento.valor,
    v_pagamento.moeda,
    v_pedido.cliente_nome,
    v_pedido.cliente_cpf,
    v_pedido.cliente_telefone,
    v_pedido.pagamento_expira_em,
    v_pagamento.status,
    v_pagamento.provider_payment_id,
    v_pagamento.provider_checkout_id;
end;
$$;

revoke execute
on function public.loja_preparar_pagamento(text)
from public;

revoke execute
on function public.loja_preparar_pagamento(text)
from anon;

revoke execute
on function public.loja_preparar_pagamento(text)
from authenticated;

grant execute
on function public.loja_preparar_pagamento(text)
to service_role;

comment on function public.loja_preparar_pagamento(text)
is 'Prepara pagamento da Loja pelo token público forte do pedido. Valida pedido pendente e não expirado, reutiliza tentativa ativa do Mercado Pago ou cria nova tentativa pending. Uso exclusivo via service_role.';
