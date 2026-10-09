create or replace function public.loja_remover_foto(
  p_empresa_id uuid,
  p_publicacao_id uuid,
  p_foto_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_publicacao public.loja_publicacoes%rowtype;
  v_foto public.loja_publicacao_fotos%rowtype;
  v_storage_path text;
begin
  if p_empresa_id is null then
    raise exception 'Empresa não informada.'
      using errcode = '22004';
  end if;

  if p_publicacao_id is null then
    raise exception 'Publicação não informada.'
      using errcode = '22004';
  end if;

  if p_foto_id is null then
    raise exception 'Foto não informada.'
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

  if v_publicacao.publicada is true then
    raise exception 'Produto publicado deve ser despublicado antes de alterar fotos.'
      using errcode = '22023';
  end if;

  select lpf.*
    into v_foto
  from public.loja_publicacao_fotos lpf
  where lpf.id = p_foto_id
    and lpf.empresa_id = p_empresa_id
    and lpf.publicacao_id = p_publicacao_id
  for update;

  if not found then
    raise exception 'Foto não encontrada.'
      using errcode = 'P0002';
  end if;

  v_storage_path := v_foto.storage_path;

  delete from public.loja_publicacao_fotos
  where id = v_foto.id;

  -- Move temporariamente as ordens para uma faixa livre para evitar
  -- conflito com UNIQUE (publicacao_id, ordem) durante a compactação.
  update public.loja_publicacao_fotos
  set ordem = ordem + 1000
  where empresa_id = p_empresa_id
    and publicacao_id = p_publicacao_id;

  with ordenadas as (
    select
      id,
      row_number() over (
        order by ordem, created_at, id
      )::integer as nova_ordem
    from public.loja_publicacao_fotos
    where empresa_id = p_empresa_id
      and publicacao_id = p_publicacao_id
  )
  update public.loja_publicacao_fotos lpf
  set ordem = o.nova_ordem
  from ordenadas o
  where lpf.id = o.id;

  if v_foto.principal is true then
    update public.loja_publicacao_fotos
    set principal = false
    where empresa_id = p_empresa_id
      and publicacao_id = p_publicacao_id
      and principal = true;

    update public.loja_publicacao_fotos
    set principal = true
    where id = (
      select id
      from public.loja_publicacao_fotos
      where empresa_id = p_empresa_id
        and publicacao_id = p_publicacao_id
      order by ordem, created_at, id
      limit 1
    );
  end if;

  return v_storage_path;
end;
$$;

revoke all on function public.loja_remover_foto(
  uuid, uuid, uuid
) from public, anon;

grant execute on function public.loja_remover_foto(
  uuid, uuid, uuid
) to authenticated;

comment on function public.loja_remover_foto(
  uuid, uuid, uuid
)
is 'Remove o registro de uma foto de publicação em rascunho, recompõe a ordem e promove nova capa quando necessário. Retorna storage_path para remoção posterior do objeto no bucket.';
