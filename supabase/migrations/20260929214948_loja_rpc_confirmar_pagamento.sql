create or replace function public.loja_confirmar_pagamento(
  p_pagamento_id uuid,
  p_provider_payment_id text,
  p_metodo text default null
)
returns table (
  resultado text,
  pedido_id uuid,
  pagamento_id uuid,
  status_pagamento text,
  status_pedido text,
  pagamento_tardio boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agora timestamptz := clock_timestamp();

  v_pagamento public.pagamentos_loja%rowtype;
  v_pedido public.pedidos_loja%rowtype;

  v_provider_payment_id text;
  v_metodo text;

  v_item record;
  v_peca public.pecas%rowtype;

  v_pagamento_tardio boolean := false;
  v_data_venda_texto text;
begin
  ---------------------------------------------------------------------------
  -- ENTRADAS
  ---------------------------------------------------------------------------

  v_provider_payment_id :=
    btrim(coalesce(p_provider_payment_id, ''));

  if v_provider_payment_id = '' then
    raise exception
      'Identificador do pagamento no provedor obrigatório.'
      using errcode = '22023';
  end if;

  v_metodo :=
    nullif(
      btrim(coalesce(p_metodo, '')),
      ''
    );

  ---------------------------------------------------------------------------
  -- PAGAMENTO
  ---------------------------------------------------------------------------

  select pg.*
    into v_pagamento
  from public.pagamentos_loja pg
  where pg.id = p_pagamento_id
  for update;

  if not found then
    raise exception
      'Pagamento não encontrado.'
      using errcode = 'P0002';
  end if;

  if v_pagamento.provider <> 'mercado_pago' then
    raise exception
      'Pagamento não pertence ao Mercado Pago.'
      using errcode = '22023';
  end if;

  ---------------------------------------------------------------------------
  -- IDEMPOTÊNCIA
  ---------------------------------------------------------------------------

  if v_pagamento.status = 'paid' then
    if
      v_pagamento.provider_payment_id is not null
      and
      v_pagamento.provider_payment_id <> v_provider_payment_id
    then
      raise exception
        'Pagamento já confirmado com outro identificador do provedor.'
        using errcode = '23505';
    end if;

    select pl.*
      into v_pedido
    from public.pedidos_loja pl
    where pl.empresa_id = v_pagamento.empresa_id
      and pl.id = v_pagamento.pedido_id;

    return query
    select
      'ja_confirmado'::text,
      v_pagamento.pedido_id,
      v_pagamento.id,
      v_pagamento.status,
      coalesce(v_pedido.status, 'desconhecido'),
      false;

    return;
  end if;

  if v_pagamento.status not in (
    'pending',
    'authorized'
  ) then
    raise exception
      'Pagamento não está disponível para confirmação.'
      using errcode = '22023';
  end if;

  if
    v_pagamento.provider_payment_id is not null
    and
    v_pagamento.provider_payment_id <> v_provider_payment_id
  then
    raise exception
      'Pagamento já possui outro identificador do provedor.'
      using errcode = '23505';
  end if;

  ---------------------------------------------------------------------------
  -- PEDIDO
  ---------------------------------------------------------------------------

  select pl.*
    into v_pedido
  from public.pedidos_loja pl
  where pl.empresa_id = v_pagamento.empresa_id
    and pl.id = v_pagamento.pedido_id
  for update;

  if not found then
    raise exception
      'Pedido do pagamento não encontrado.'
      using errcode = 'P0002';
  end if;

  ---------------------------------------------------------------------------
  -- PAGAMENTO TARDIO
  --
  -- Regra conservadora:
  -- se o webhook chegou depois de pagamento_expira_em, registramos o pagamento
  -- como pago, mas NÃO reabrimos reserva, NÃO criamos venda e NÃO baixamos peça.
  ---------------------------------------------------------------------------

  if
    v_pedido.status = 'pendente_pagamento'
    and
    v_pedido.pagamento_expira_em <= v_agora
  then
    v_pagamento_tardio := true;

    update public.pagamentos_loja pg
    set
      provider_payment_id = v_provider_payment_id,
      metodo = coalesce(v_metodo, pg.metodo),
      status = 'paid',
      paid_at = v_agora,
      failed_at = null,
      canceled_at = null,
      refunded_at = null,
      updated_at = v_agora
    where pg.id = v_pagamento.id;

    update public.pedidos_loja pl
    set
      status = 'expirado',
      expirado_em = coalesce(
        pl.expirado_em,
        v_agora
      ),
      atualizado_em = v_agora
    where pl.empresa_id = v_pedido.empresa_id
      and pl.id = v_pedido.id
      and pl.status = 'pendente_pagamento';

    return query
    select
      'pagamento_tardio'::text,
      v_pedido.id,
      v_pagamento.id,
      'paid'::text,
      'expirado'::text,
      true;

    return;
  end if;

  ---------------------------------------------------------------------------
  -- ESTADOS DO PEDIDO
  ---------------------------------------------------------------------------

  if v_pedido.status = 'pago' then
    update public.pagamentos_loja pg
    set
      provider_payment_id =
        coalesce(
          pg.provider_payment_id,
          v_provider_payment_id
        ),
      metodo =
        coalesce(
          v_metodo,
          pg.metodo
        ),
      status = 'paid',
      paid_at =
        coalesce(
          pg.paid_at,
          v_agora
        ),
      failed_at = null,
      canceled_at = null,
      refunded_at = null,
      updated_at = v_agora
    where pg.id = v_pagamento.id;

    return query
    select
      'ja_confirmado'::text,
      v_pedido.id,
      v_pagamento.id,
      'paid'::text,
      'pago'::text,
      false;

    return;
  end if;

  if v_pedido.status <> 'pendente_pagamento' then
    raise exception
      'Pedido não está disponível para confirmação automática.'
      using errcode = '22023';
  end if;

  ---------------------------------------------------------------------------
  -- LOCK DETERMINÍSTICO DOS ITENS / PEÇAS
  ---------------------------------------------------------------------------

  for v_item in
    select
      pil.id as pedido_item_id,
      pil.peca_id,
      pil.nome,
      pil.preco,
      pil.empresa_id,
      pil.pedido_id
    from public.pedido_itens_loja pil
    where pil.empresa_id = v_pedido.empresa_id
      and pil.pedido_id = v_pedido.id
    order by pil.peca_id
  loop
    select p.*
      into v_peca
    from public.pecas p
    where p.empresa_id = v_item.empresa_id
      and p.id = v_item.peca_id
    for update;

    if not found then
      raise exception
        'Peça do pedido não encontrada: %',
        v_item.peca_id
        using errcode = 'P0002';
    end if;

    if coalesce(v_peca.vendido, false) then
      raise exception
        'Peça já vendida: %',
        v_item.peca_id
        using errcode = '23505';
    end if;

    if exists (
      select 1
      from public.vendas_loja vl
      where vl.empresa_id = v_item.empresa_id
        and vl.peca_id = v_item.peca_id
    ) then
      raise exception
        'Venda da Loja já registrada para a peça: %',
        v_item.peca_id
        using errcode = '23505';
    end if;

    if exists (
      select 1
      from public.pedido_itens_loja pil2
      join public.pedidos_loja pl2
        on pl2.empresa_id = pil2.empresa_id
       and pl2.id = pil2.pedido_id
      where pil2.empresa_id = v_item.empresa_id
        and pil2.peca_id = v_item.peca_id
        and pl2.id <> v_pedido.id
        and pl2.status = 'pendente_pagamento'
        and pl2.pagamento_expira_em > v_agora
    ) then
      raise exception
        'Peça reservada por outro pedido ativo: %',
        v_item.peca_id
        using errcode = '55P03';
    end if;
  end loop;

  ---------------------------------------------------------------------------
  -- PRIMEIRO: PAGAMENTO + PEDIDO
  --
  -- O pedido precisa deixar de ser pendente antes de pecas.vendido=true,
  -- por causa do trigger trg_loja_bloqueia_venda_peca_pedido_pendente.
  ---------------------------------------------------------------------------

  update public.pagamentos_loja pg
  set
    provider_payment_id = v_provider_payment_id,
    metodo = coalesce(v_metodo, pg.metodo),
    status = 'paid',
    paid_at = v_agora,
    failed_at = null,
    canceled_at = null,
    refunded_at = null,
    updated_at = v_agora
  where pg.id = v_pagamento.id;

  update public.pedidos_loja pl
  set
    status = 'pago',
    pago_em = v_agora,
    atualizado_em = v_agora
  where pl.empresa_id = v_pedido.empresa_id
    and pl.id = v_pedido.id;

  ---------------------------------------------------------------------------
  -- VENDA + BAIXA DAS PEÇAS
  ---------------------------------------------------------------------------

  v_data_venda_texto :=
    to_char(
      v_agora at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    );

  for v_item in
    select
      pil.id as pedido_item_id,
      pil.peca_id,
      pil.nome,
      pil.preco,
      pil.empresa_id,
      pil.pedido_id
    from public.pedido_itens_loja pil
    where pil.empresa_id = v_pedido.empresa_id
      and pil.pedido_id = v_pedido.id
    order by pil.peca_id
  loop
    insert into public.vendas_loja (
      empresa_id,
      pedido_id,
      pedido_item_id,
      pagamento_id,
      peca_id,
      cliente_id,
      nome_peca,
      valor_venda,
      custo_peca,
      status,
      vendida_em,
      created_at,
      updated_at
    )
    values (
      v_pedido.empresa_id,
      v_pedido.id,
      v_item.pedido_item_id,
      v_pagamento.id,
      v_item.peca_id,
      v_pedido.cliente_id,
      v_item.nome,
      v_item.preco,
      null,
      'confirmada',
      v_agora,
      v_agora,
      v_agora
    );

    update public.pecas p
    set
      vendido = true,
      cliente = v_pedido.cliente_nome,
      cliente_id = v_pedido.cliente_id,
      data_venda = v_data_venda_texto,
      valor_venda_final = v_item.preco
    where p.empresa_id = v_pedido.empresa_id
      and p.id = v_item.peca_id
      and coalesce(p.vendido, false) = false;

    if not found then
      raise exception
        'Não foi possível baixar a peça: %',
        v_item.peca_id
        using errcode = '23505';
    end if;
  end loop;

  return query
  select
    'confirmado'::text,
    v_pedido.id,
    v_pagamento.id,
    'paid'::text,
    'pago'::text,
    false;
end;
$$;

revoke execute
on function public.loja_confirmar_pagamento(uuid, text, text)
from public;

revoke execute
on function public.loja_confirmar_pagamento(uuid, text, text)
from anon;

revoke execute
on function public.loja_confirmar_pagamento(uuid, text, text)
from authenticated;

grant execute
on function public.loja_confirmar_pagamento(uuid, text, text)
to service_role;

comment on function public.loja_confirmar_pagamento(uuid, text, text)
is 'Confirma atomicamente pagamento aprovado da Loja. Atualiza pagamento e pedido, registra vendas_loja e baixa pecas. Pagamentos tardios são registrados como paid e o pedido expira, sem venda automática. Uso exclusivo via service_role.';
