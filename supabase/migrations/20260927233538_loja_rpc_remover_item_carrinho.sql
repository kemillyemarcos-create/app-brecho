create or replace function public.loja_remover_item_carrinho(
  p_empresa_id uuid,
  p_publicacao_id uuid,
  p_token text
)
returns table (
  carrinho_id uuid,
  publicacao_id uuid,
  removido boolean,
  quantidade_itens integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_carrinho_id uuid;
  v_token_hash bytea;
  v_removido boolean := false;
  v_quantidade integer;
  v_agora timestamptz;
begin
  if p_empresa_id is null then
    raise exception 'Empresa não informada.'
      using errcode = '22004';
  end if;

  if p_publicacao_id is null then
    raise exception 'Publicação não informada.'
      using errcode = '22004';
  end if;

  if p_token is null
     or btrim(p_token) !~ '^[0-9a-f]{64}$' then
    raise exception 'Token de carrinho inválido.'
      using errcode = '22023';
  end if;

  v_token_hash := extensions.digest(
    btrim(p_token),
    'sha256'
  );

  select lc.id
    into v_carrinho_id
  from public.loja_carrinhos lc
  where lc.empresa_id = p_empresa_id
    and lc.token_hash = v_token_hash
    and lc.status = 'ativo'
  for update;

  if v_carrinho_id is null then
    raise exception 'Carrinho não encontrado ou finalizado.'
      using errcode = 'P0002';
  end if;

  v_agora := clock_timestamp();

  -- Limpa locks vencidos do próprio carrinho.
  delete from public.loja_carrinho_itens lci
  where lci.empresa_id = p_empresa_id
    and lci.carrinho_id = v_carrinho_id
    and lci.expira_em <= v_agora;

  -- Remove somente se o item pertencer a este carrinho.
  delete from public.loja_carrinho_itens lci
  where lci.empresa_id = p_empresa_id
    and lci.carrinho_id = v_carrinho_id
    and lci.publicacao_id = p_publicacao_id
  returning true
  into v_removido;

  v_removido := coalesce(v_removido, false);

  select count(*)::integer
    into v_quantidade
  from public.loja_carrinho_itens lci
  where lci.empresa_id = p_empresa_id
    and lci.carrinho_id = v_carrinho_id
    and lci.expira_em > v_agora;

  update public.loja_carrinhos
  set updated_at = v_agora
  where id = v_carrinho_id
    and empresa_id = p_empresa_id;

  return query
  select
    v_carrinho_id,
    p_publicacao_id,
    v_removido,
    v_quantidade;
end;
$$;

revoke execute
on function public.loja_remover_item_carrinho(uuid, uuid, text)
from public;

revoke execute
on function public.loja_remover_item_carrinho(uuid, uuid, text)
from anon;

revoke execute
on function public.loja_remover_item_carrinho(uuid, uuid, text)
from authenticated;

grant execute
on function public.loja_remover_item_carrinho(uuid, uuid, text)
to service_role;

comment on function public.loja_remover_item_carrinho(uuid, uuid, text)
is 'Remove item do carrinho anônimo validando empresa e token. Uso exclusivo via service_role.';
