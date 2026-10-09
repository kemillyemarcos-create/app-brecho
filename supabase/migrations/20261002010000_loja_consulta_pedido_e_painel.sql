-- Leitura mínima por capability token; não confirma pagamento nem expõe PII.
create or replace function public.loja_consultar_pedido(p_empresa_id uuid, p_pedido_token text)
returns table (pedido_id uuid, status text, total numeric, pagamento_expira_em timestamptz, pago_em timestamptz, pagamento_status text)
language plpgsql security definer set search_path = '' as $$
begin
  if p_pedido_token is null or p_pedido_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Token do pedido inválido.' using errcode = '22023';
  end if;
  return query
  select p.id, case when p.status = 'pendente_pagamento' and p.pagamento_expira_em <= clock_timestamp()
    then 'expirado'::text else p.status end, p.total, p.pagamento_expira_em, p.pago_em,
    (select pg.status from public.pagamentos_loja pg where pg.empresa_id = p.empresa_id and pg.pedido_id = p.id order by pg.created_at desc limit 1)
  from public.pedidos_loja p
  where p.empresa_id = p_empresa_id and p.token_publico_hash = extensions.digest(p_pedido_token, 'sha256');
end;
$$;
revoke all on function public.loja_consultar_pedido(uuid, text) from public, anon, authenticated;
grant execute on function public.loja_consultar_pedido(uuid, text) to service_role;

-- Painel operacional tenant-aware, sem expor tokens ou CPF.
create or replace function public.loja_painel_pedidos(p_empresa_id uuid)
returns table (pedido_id uuid, cliente_nome text, status text, total numeric, criado_em timestamptz, pago_em timestamptz, pagamento_status text, itens jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  if public.usuario_empresa_operacional_ativo(p_empresa_id) is not true then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  return query
  select p.id, p.cliente_nome, p.status, p.total, p.criado_em, p.pago_em,
    (select pg.status from public.pagamentos_loja pg where pg.empresa_id = p.empresa_id and pg.pedido_id = p.id order by pg.created_at desc limit 1),
    coalesce((select jsonb_agg(jsonb_build_object('peca_id', i.peca_id, 'nome', i.nome, 'preco', i.preco))
      from public.pedido_itens_loja i where i.empresa_id = p.empresa_id and i.pedido_id = p.id), '[]'::jsonb)
  from public.pedidos_loja p where p.empresa_id = p_empresa_id order by p.criado_em desc limit 100;
end;
$$;
revoke all on function public.loja_painel_pedidos(uuid) from public, anon;
grant execute on function public.loja_painel_pedidos(uuid) to authenticated;
