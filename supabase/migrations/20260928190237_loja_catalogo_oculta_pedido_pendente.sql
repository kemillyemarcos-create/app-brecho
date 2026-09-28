create or replace function public.loja_catalogo_publico(
  p_empresa_id uuid,
  p_slug text default null,
  p_categoria text default null,
  p_marca text default null,
  p_tamanho text default null,
  p_limite integer default 24,
  p_offset integer default 0
)
returns table (
  publicacao_id uuid,
  slug text,
  nome text,
  preco text,
  obs text,
  marca text,
  categoria text,
  tamanho text,
  condicao text,
  descricao text,
  foto_principal text,
  fotos jsonb,
  publicada_em timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_empresa_id is null then
    raise exception 'Empresa não informada.'
      using errcode = '22004';
  end if;

  if p_limite is null
     or p_limite < 1
     or p_limite > 100 then
    raise exception 'Limite deve estar entre 1 e 100.'
      using errcode = '22023';
  end if;

  if p_offset is null
     or p_offset < 0 then
    raise exception 'Offset inválido.'
      using errcode = '22023';
  end if;

  return query
  select
    lp.id as publicacao_id,
    lp.slug,
    p.nome,
    p.venda as preco,
    p.obs,
    lp.marca,
    lp.categoria,
    lp.tamanho,
    lp.condicao,
    lp.descricao,

    (
      select lpf.storage_path
      from public.loja_publicacao_fotos lpf
      where lpf.empresa_id = lp.empresa_id
        and lpf.publicacao_id = lp.id
        and lpf.principal is true
      order by lpf.ordem, lpf.created_at, lpf.id
      limit 1
    ) as foto_principal,

    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'storage_path', lpf.storage_path,
            'ordem', lpf.ordem,
            'principal', lpf.principal
          )
          order by lpf.ordem, lpf.created_at, lpf.id
        )
        from public.loja_publicacao_fotos lpf
        where lpf.empresa_id = lp.empresa_id
          and lpf.publicacao_id = lp.id
      ),
      '[]'::jsonb
    ) as fotos,

    lp.publicada_em

  from public.loja_publicacoes lp

  join public.pecas p
    on p.empresa_id = lp.empresa_id
   and p.id = lp.peca_id

  where lp.empresa_id = p_empresa_id
    and lp.publicada is true
    and p.vendido is false

    and not exists (
      select 1
      from public.pedido_itens_loja pil
      join public.pedidos_loja pl
        on pl.empresa_id = pil.empresa_id
       and pl.id = pil.pedido_id
      where pil.empresa_id = lp.empresa_id
        and pil.peca_id = lp.peca_id
        and pl.status = 'pendente_pagamento'
        and pl.pagamento_expira_em > statement_timestamp()
    )

    and exists (
      select 1
      from public.loja_publicacao_fotos lpf
      where lpf.empresa_id = lp.empresa_id
        and lpf.publicacao_id = lp.id
        and lpf.principal is true
        and exists (
          select 1
          from storage.objects o
          where o.bucket_id = 'loja-produtos'
            and o.name = lpf.storage_path
            and cardinality(storage.foldername(o.name)) = 2
            and (storage.foldername(o.name))[1] = lp.empresa_id::text
            and (storage.foldername(o.name))[2] = lp.id::text
        )
    )

    and (
      nullif(btrim(p_slug), '') is null
      or lp.slug = btrim(p_slug)
    )

    and (
      nullif(btrim(p_categoria), '') is null
      or lp.categoria = btrim(p_categoria)
    )

    and (
      nullif(btrim(p_marca), '') is null
      or lower(lp.marca) = lower(btrim(p_marca))
    )

    and (
      nullif(btrim(p_tamanho), '') is null
      or lower(lp.tamanho) = lower(btrim(p_tamanho))
    )

  order by
    lp.publicada_em desc nulls last,
    lp.created_at desc,
    lp.id

  limit p_limite
  offset p_offset;
end;
$$;

revoke all on function public.loja_catalogo_publico(
  uuid, text, text, text, text, integer, integer
) from public;

grant execute on function public.loja_catalogo_publico(
  uuid, text, text, text, text, integer, integer
) to anon, authenticated;

comment on function public.loja_catalogo_publico(
  uuid, text, text, text, text, integer, integer
)
is 'Expõe catálogo público controlado da Loja. Retorna somente produtos publicados, não vendidos e sem pedido pendente de pagamento válido, com campos comerciais e fotos, sem liberar acesso direto à tabela pecas.';
