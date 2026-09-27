create or replace function public.loja_consultar_carrinho(
  p_empresa_id uuid,
  p_token text
)
returns table (
  carrinho_id uuid,
  publicacao_id uuid,
  slug text,
  nome text,
  preco text,
  marca text,
  categoria text,
  tamanho text,
  condicao text,
  descricao text,
  foto_principal text,
  adicionado_em timestamptz,
  expira_em timestamptz,
  segundos_restantes integer,
  quantidade_itens integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_carrinho_id uuid;
  v_token_hash bytea;
  v_agora timestamptz;
begin
  if p_empresa_id is null then
    raise exception 'Empresa inválida.';
  end if;

  if p_token is null
     or btrim(p_token) !~ '^[0-9a-f]{64}$' then
    raise exception 'Token de carrinho inválido.';
  end if;

  v_token_hash := extensions.digest(btrim(p_token), 'sha256');

  select lc.id
    into v_carrinho_id
  from public.loja_carrinhos lc
  where lc.empresa_id = p_empresa_id
    and lc.token_hash = v_token_hash
    and lc.status = 'ativo'
  for update;

  if v_carrinho_id is null then
    raise exception 'Carrinho inválido.';
  end if;

  v_agora := clock_timestamp();

  -- Remove locks vencidos e itens que deixaram de estar disponíveis.
  delete from public.loja_carrinho_itens lci
  where lci.empresa_id = p_empresa_id
    and lci.carrinho_id = v_carrinho_id
    and (
      lci.expira_em <= v_agora
      or not exists (
        select 1
        from public.loja_publicacoes lp
        join public.pecas p
          on p.empresa_id = lp.empresa_id
         and p.id = lp.peca_id
        where lp.empresa_id = lci.empresa_id
          and lp.id = lci.publicacao_id
          and lp.publicada is true
          and p.vendido is false
      )
    );

  return query
  select
    lci.carrinho_id,
    lp.id as publicacao_id,
    lp.slug,
    p.nome,
    p.venda as preco,
    lp.marca,
    lp.categoria,
    lp.tamanho,
    lp.condicao,
    lp.descricao,
    foto.storage_path as foto_principal,
    lci.adicionado_em,
    lci.expira_em,
    greatest(
      floor(extract(epoch from (lci.expira_em - v_agora))),
      0
    )::integer as segundos_restantes,
    count(*) over ()::integer as quantidade_itens
  from public.loja_carrinho_itens lci
  join public.loja_publicacoes lp
    on lp.empresa_id = lci.empresa_id
   and lp.id = lci.publicacao_id
  join public.pecas p
    on p.empresa_id = lp.empresa_id
   and p.id = lp.peca_id
  left join public.loja_publicacao_fotos foto
    on foto.empresa_id = lp.empresa_id
   and foto.publicacao_id = lp.id
   and foto.principal is true
  where lci.empresa_id = p_empresa_id
    and lci.carrinho_id = v_carrinho_id
    and lci.expira_em > v_agora
    and lp.publicada is true
    and p.vendido is false
  order by lci.adicionado_em, lci.id;
end;
$$;

revoke execute on function public.loja_consultar_carrinho(uuid, text) from public;
revoke execute on function public.loja_consultar_carrinho(uuid, text) from anon;
revoke execute on function public.loja_consultar_carrinho(uuid, text) from authenticated;

grant execute
on function public.loja_consultar_carrinho(uuid, text)
to service_role;

comment on function public.loja_consultar_carrinho(uuid, text)
is 'Consulta interna do carrinho da Loja Online. Valida token, remove locks vencidos ou itens indisponíveis e retorna somente itens válidos. Uso exclusivo via service_role.';
