create or replace function public.loja_reordenar_fotos(
  p_empresa_id uuid,
  p_publicacao_id uuid,
  p_foto_ids uuid[]
)
returns setof public.loja_publicacao_fotos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_publicacao public.loja_publicacoes%rowtype;
  v_quantidade_atual integer;
  v_quantidade_recebida integer;
  v_quantidade_distinta integer;
begin
  if p_empresa_id is null then
    raise exception 'Empresa não informada.'
      using errcode = '22004';
  end if;

  if p_publicacao_id is null then
    raise exception 'Publicação não informada.'
      using errcode = '22004';
  end if;

  if p_foto_ids is null then
    raise exception 'Lista de fotos não informada.'
      using errcode = '22004';
  end if;

  v_quantidade_recebida := cardinality(p_foto_ids);

  if v_quantidade_recebida is null
     or v_quantidade_recebida < 1 then
    raise exception 'A lista de fotos não pode estar vazia.'
      using errcode = '22023';
  end if;

  if v_quantidade_recebida > 10 then
    raise exception 'A publicação permite no máximo 10 fotos.'
      using errcode = '22023';
  end if;

  if array_position(p_foto_ids, null) is not null then
    raise exception 'A lista de fotos contém identificador inválido.'
      using errcode = '22023';
  end if;

  select count(distinct x.id)::integer
    into v_quantidade_distinta
  from unnest(p_foto_ids) as x(id);

  if v_quantidade_distinta <> v_quantidade_recebida then
    raise exception 'A lista de fotos contém identificadores duplicados.'
      using errcode = '22023';
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

  if v_publicacao.publicada is true then
    raise exception 'Produto publicado deve ser despublicado antes de alterar fotos.'
      using errcode = '22023';
  end if;

  select count(*)::integer
    into v_quantidade_atual
  from public.loja_publicacao_fotos lpf
  where lpf.empresa_id = p_empresa_id
    and lpf.publicacao_id = p_publicacao_id;

  if v_quantidade_atual <> v_quantidade_recebida then
    raise exception 'A lista deve conter exatamente todas as fotos da publicação.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_foto_ids) as x(id)
    where not exists (
      select 1
      from public.loja_publicacao_fotos lpf
      where lpf.id = x.id
        and lpf.empresa_id = p_empresa_id
        and lpf.publicacao_id = p_publicacao_id
    )
  ) then
    raise exception 'A lista contém foto que não pertence à publicação.'
      using errcode = '22023';
  end if;

  -- Libera temporariamente a faixa 1..N para evitar conflito
  -- com UNIQUE (publicacao_id, ordem).
  update public.loja_publicacao_fotos
  set ordem = ordem + 1000
  where empresa_id = p_empresa_id
    and publicacao_id = p_publicacao_id;

  with nova_ordem as (
    select
      x.id,
      x.posicao::integer as ordem
    from unnest(p_foto_ids) with ordinality as x(id, posicao)
  )
  update public.loja_publicacao_fotos lpf
  set ordem = no.ordem
  from nova_ordem no
  where lpf.id = no.id
    and lpf.empresa_id = p_empresa_id
    and lpf.publicacao_id = p_publicacao_id;

  -- A primeira foto da nova ordem passa a ser a capa.
  update public.loja_publicacao_fotos
  set principal = false
  where empresa_id = p_empresa_id
    and publicacao_id = p_publicacao_id
    and principal = true;

  update public.loja_publicacao_fotos
  set principal = true
  where id = p_foto_ids[1]
    and empresa_id = p_empresa_id
    and publicacao_id = p_publicacao_id;

  return query
  select lpf.*
  from public.loja_publicacao_fotos lpf
  where lpf.empresa_id = p_empresa_id
    and lpf.publicacao_id = p_publicacao_id
  order by lpf.ordem;
end;
$$;

revoke all on function public.loja_reordenar_fotos(
  uuid, uuid, uuid[]
) from public, anon;

grant execute on function public.loja_reordenar_fotos(
  uuid, uuid, uuid[]
) to authenticated;

comment on function public.loja_reordenar_fotos(
  uuid, uuid, uuid[]
)
is 'Reordena todas as fotos de uma publicação em rascunho. A lista deve conter exatamente todos os IDs, sem duplicidades, e a primeira foto passa a ser a capa principal.';
