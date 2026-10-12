begin;

-- Catálogo V2 aditivo. As RPCs anteriores e seus consumidores permanecem intactos.
-- Reversão: retornar frontend à V1 e remover somente estas três funções.
create schema if not exists internal;

create function internal.loja_catalogo_preco_v2(p_texto text)
returns numeric language plpgsql immutable set search_path = '' as $$
declare t text; n numeric;
begin
  t := replace(regexp_replace(replace(btrim(p_texto), chr(160), ''), '[[:space:]]+', '', 'g'), 'R$', '');
  if position(',' in t) > 0 then
    if t !~ '^[0-9]+(\.[0-9]{3})*(,[0-9]{1,2})?$' then return null; end if;
    t := replace(replace(t, '.', ''), ',', '.');
  elsif t !~ '^[0-9]+(\.[0-9]{1,2})?$' then return null;
  end if;
  n := t::numeric;
  return case when n > 0 then n else null end;
exception when invalid_text_representation or numeric_value_out_of_range then return null;
end;
$$;

create function internal.loja_catalogo_elegivel_v2(p_empresa_id uuid)
returns table(publicacao_id uuid, slug text, nome text, preco text, obs text,
 marca text, categoria text, tamanho text, condicao text, descricao text,
 foto_principal text, fotos jsonb, publicada_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.empresas e where e.id=p_empresa_id and e.ativo is true)
    or public.assinatura_empresa_operacional_ativa(p_empresa_id) is not true then return; end if;
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

;
end;
$$;

create function public.loja_catalogo_publico_por_slug_v2(
 p_empresa_slug text, p_busca text default null, p_categoria text default null,
 p_marca text default null, p_tamanho text default null, p_ordem text default 'recentes',
 p_limite integer default 24, p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare empresa uuid; resultado jsonb;
begin
  if p_limite is null or p_limite not between 1 and 100 or p_offset is null or p_offset < 0 then
    raise exception 'Paginação inválida.' using errcode='22023'; end if;
  if p_ordem is null or p_ordem not in ('recentes','menor-preco','maior-preco','nome') then
    raise exception 'Ordenação inválida.' using errcode='22023'; end if;
  if length(coalesce(p_busca,'')) > 300 then
    raise exception 'Busca muito longa.' using errcode='22023'; end if;
  select e.id into empresa from public.empresas e
    where e.slug_publico=lower(btrim(p_empresa_slug)) and e.ativo is true;
  if empresa is null or public.assinatura_empresa_operacional_ativa(empresa) is not true then
    return jsonb_build_object('produtos','[]'::jsonb,'tem_mais',false,
      'opcoes',jsonb_build_object('categorias','[]'::jsonb,'marcas','[]'::jsonb,'tamanhos','[]'::jsonb));
  end if;
  with elegiveis as materialized (
    select * from internal.loja_catalogo_elegivel_v2(empresa)
  ), filtrados as (
    select e.*, internal.loja_catalogo_preco_v2(e.preco) as preco_num from elegiveis e
    where (nullif(btrim(p_categoria),'') is null or e.categoria=btrim(p_categoria))
      and (nullif(btrim(p_marca),'') is null or lower(e.marca)=lower(btrim(p_marca)))
      and (nullif(btrim(p_tamanho),'') is null or lower(e.tamanho)=lower(btrim(p_tamanho)))
      and (nullif(btrim(p_busca),'') is null or strpos(lower(concat_ws(' ',e.nome,e.marca,e.categoria,e.tamanho,e.condicao,e.descricao,e.obs)),lower(btrim(p_busca))) > 0)
  ), lote as (
    select f.* from filtrados f
    order by
      case when p_ordem='menor-preco' then preco_num end asc nulls last,
      case when p_ordem='maior-preco' then preco_num end desc nulls last,
      case when p_ordem='nome' then lower(f.nome) end asc nulls last,
      case when p_ordem='recentes' then f.publicada_em end desc nulls last,
      f.publicacao_id
    limit (p_limite+1) offset p_offset
  ), numerados as (
    select l.*, row_number() over(order by
      case when p_ordem='menor-preco' then preco_num end asc nulls last,
      case when p_ordem='maior-preco' then preco_num end desc nulls last,
      case when p_ordem='nome' then lower(l.nome) end asc nulls last,
      case when p_ordem='recentes' then l.publicada_em end desc nulls last,
      l.publicacao_id) as pos from lote l
  )
  select jsonb_build_object(
    'produtos',coalesce((select jsonb_agg(to_jsonb(n)-'preco_num'-'pos' order by pos) from numerados n where pos<=p_limite),'[]'::jsonb),
    'tem_mais',(select count(*)>p_limite from lote),
    'opcoes',jsonb_build_object(
      'categorias',coalesce((select jsonb_agg(v order by v) from (select distinct categoria v from elegiveis where nullif(btrim(categoria),'') is not null) x),'[]'::jsonb),
      'marcas',coalesce((select jsonb_agg(v order by v) from (select distinct marca v from elegiveis where nullif(btrim(marca),'') is not null) x),'[]'::jsonb),
      'tamanhos',coalesce((select jsonb_agg(v order by v) from (select distinct tamanho v from elegiveis where nullif(btrim(tamanho),'') is not null) x),'[]'::jsonb)
    )) into resultado;
  return resultado;
end;
$$;
alter function internal.loja_catalogo_preco_v2(text) owner to postgres;
alter function internal.loja_catalogo_elegivel_v2(uuid) owner to postgres;
alter function public.loja_catalogo_publico_por_slug_v2(text,text,text,text,text,text,integer,integer) owner to postgres;
revoke all on function internal.loja_catalogo_preco_v2(text) from public,anon,authenticated,service_role;
revoke all on function internal.loja_catalogo_elegivel_v2(uuid) from public,anon,authenticated,service_role;
revoke all on function public.loja_catalogo_publico_por_slug_v2(text,text,text,text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.loja_catalogo_publico_por_slug_v2(text,text,text,text,text,text,integer,integer) to anon,authenticated;

commit;
