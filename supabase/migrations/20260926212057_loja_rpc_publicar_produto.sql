create or replace function public.loja_publicar_produto(
  p_empresa_id uuid,
  p_publicacao_id uuid
)
returns public.loja_publicacoes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_publicacao public.loja_publicacoes%rowtype;
  v_peca public.pecas%rowtype;
  v_resultado public.loja_publicacoes%rowtype;
  v_preco_texto text;
  v_preco_numerico numeric;
  v_qtd_fotos integer;
  v_qtd_principais integer;
  v_qtd_fotos_storage integer;
begin
  if p_empresa_id is null then
    raise exception 'Empresa não informada.'
      using errcode = '22004';
  end if;

  if p_publicacao_id is null then
    raise exception 'Publicação não informada.'
      using errcode = '22004';
  end if;

  if not public.usuario_empresa_operacional_ativo(p_empresa_id) then
    raise exception 'Usuário sem acesso operacional à empresa.'
      using errcode = '42501';
  end if;

  select lp.*
    into v_publicacao
  from public.loja_publicacoes lp
  where lp.id = p_publicacao_id
    and lp.empresa_id = p_empresa_id
  for update;

  if not found then
    raise exception 'Publicação não encontrada.'
      using errcode = 'P0002';
  end if;

  select p.*
    into v_peca
  from public.pecas p
  where p.id = v_publicacao.peca_id
    and p.empresa_id = p_empresa_id
  for update;

  if not found then
    raise exception 'Peça vinculada à publicação não encontrada.'
      using errcode = 'P0002';
  end if;

  if v_peca.vendido is true then
    raise exception 'Peça já vendida não pode ser publicada na loja.'
      using errcode = '22023';
  end if;

  if nullif(btrim(v_peca.nome), '') is null then
    raise exception 'Nome da peça é obrigatório para publicação.'
      using errcode = '22023';
  end if;

  if nullif(btrim(v_peca.obs), '') is null then
    raise exception 'Observação da peça é obrigatória para publicação.'
      using errcode = '22023';
  end if;

  if nullif(btrim(v_publicacao.marca), '') is null then
    raise exception 'Marca é obrigatória para publicação.'
      using errcode = '22023';
  end if;

  if nullif(btrim(v_publicacao.categoria), '') is null then
    raise exception 'Categoria é obrigatória para publicação.'
      using errcode = '22023';
  end if;

  if nullif(btrim(v_publicacao.tamanho), '') is null then
    raise exception 'Tamanho é obrigatório para publicação.'
      using errcode = '22023';
  end if;

  if nullif(btrim(v_publicacao.condicao), '') is null then
    raise exception 'Condição é obrigatória para publicação.'
      using errcode = '22023';
  end if;

  if nullif(btrim(v_publicacao.descricao), '') is null then
    raise exception 'Descrição é obrigatória para publicação.'
      using errcode = '22023';
  end if;

  v_preco_texto := nullif(btrim(v_peca.venda), '');

  if v_preco_texto is null then
    raise exception 'Preço de venda é obrigatório para publicação.'
      using errcode = '22023';
  end if;

  begin
    v_preco_numerico :=
      replace(
        replace(
          replace(v_preco_texto, 'R$', ''),
          '.',
          ''
        ),
        ',',
        '.'
      )::numeric;
  exception
    when others then
      raise exception 'Preço de venda inválido para publicação.'
        using errcode = '22023';
  end;

  if v_preco_numerico <= 0 then
    raise exception 'Preço de venda deve ser maior que zero.'
      using errcode = '22023';
  end if;

  select
    count(*)::integer,
    count(*) filter (where lpf.principal is true)::integer,
    count(*) filter (
      where exists (
        select 1
        from storage.objects o
        where o.bucket_id = 'loja-produtos'
          and o.name = lpf.storage_path
          and cardinality(storage.foldername(o.name)) = 2
          and (storage.foldername(o.name))[1] = p_empresa_id::text
          and (storage.foldername(o.name))[2] = p_publicacao_id::text
      )
    )::integer
  into
    v_qtd_fotos,
    v_qtd_principais,
    v_qtd_fotos_storage
  from public.loja_publicacao_fotos lpf
  where lpf.empresa_id = p_empresa_id
    and lpf.publicacao_id = p_publicacao_id;

  if v_qtd_fotos < 1 then
    raise exception 'A publicação precisa ter pelo menos uma foto.'
      using errcode = '22023';
  end if;

  if v_qtd_fotos > 10 then
    raise exception 'A publicação permite no máximo 10 fotos.'
      using errcode = '22023';
  end if;

  if v_qtd_principais <> 1 then
    raise exception 'A publicação precisa ter exatamente uma foto principal.'
      using errcode = '22023';
  end if;

  if v_qtd_fotos_storage <> v_qtd_fotos then
    raise exception 'Uma ou mais fotos registradas não existem no Storage.'
      using errcode = '22023';
  end if;

  update public.loja_publicacoes
  set
    publicada = true,
    publicada_em = coalesce(publicada_em, now()),
    despublicada_em = null,
    updated_at = now()
  where id = p_publicacao_id
    and empresa_id = p_empresa_id
  returning *
  into v_resultado;

  return v_resultado;
end;
$$;

revoke all on function public.loja_publicar_produto(
  uuid, uuid
) from public, anon;

grant execute on function public.loja_publicar_produto(
  uuid, uuid
) to authenticated;

comment on function public.loja_publicar_produto(
  uuid, uuid
)
is 'Publica um produto da Loja após validar disponibilidade da peça, dados obrigatórios, preço de venda e existência de ao menos uma foto.';
