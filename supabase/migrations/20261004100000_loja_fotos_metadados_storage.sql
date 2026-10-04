-- ============================================================================
-- LOJA / FOTOS
-- Usa os metadados reais do Storage como fonte de verdade para MIME e tamanho.
-- Também completa metadados históricos ausentes na galeria.
-- ============================================================================

update public.loja_publicacao_fotos lpf
set
  mime_type = coalesce(
    lpf.mime_type,
    o.metadata ->> 'mimetype'
  ),
  tamanho_bytes = coalesce(
    lpf.tamanho_bytes,
    case
      when (o.metadata ->> 'size') ~ '^[0-9]+$'
        then (o.metadata ->> 'size')::bigint
      else null
    end
  )
from storage.objects o
where o.bucket_id = 'loja-produtos'
  and o.name = lpf.storage_path
  and (
    lpf.mime_type is null
    or lpf.tamanho_bytes is null
  );


create or replace function public.loja_adicionar_foto(
  p_empresa_id uuid,
  p_publicacao_id uuid,
  p_storage_path text,
  p_mime_type text default null,
  p_tamanho_bytes bigint default null,
  p_principal boolean default false
)
returns public.loja_publicacao_fotos
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_publicacao public.loja_publicacoes%rowtype;
  v_foto public.loja_publicacao_fotos%rowtype;
  v_quantidade integer;
  v_proxima_ordem integer;
  v_principal boolean;
  v_storage_mime text;
  v_storage_tamanho bigint;
begin
  if p_empresa_id is null then
    raise exception 'Empresa não informada.'
      using errcode = '22004';
  end if;

  if p_publicacao_id is null then
    raise exception 'Publicação não informada.'
      using errcode = '22004';
  end if;

  if nullif(btrim(p_storage_path), '') is null then
    raise exception 'Caminho da foto não informado.'
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

  select
    nullif(o.metadata ->> 'mimetype', ''),
    case
      when (o.metadata ->> 'size') ~ '^[0-9]+$'
        then (o.metadata ->> 'size')::bigint
      else null
    end
  into
    v_storage_mime,
    v_storage_tamanho
  from storage.objects o
  where o.bucket_id = 'loja-produtos'
    and o.name = btrim(p_storage_path)
    and cardinality(storage.foldername(o.name)) = 2
    and (storage.foldername(o.name))[1] = p_empresa_id::text
    and (storage.foldername(o.name))[2] = p_publicacao_id::text;

  if not found then
    raise exception 'Arquivo da foto não encontrado no Storage da publicação.'
      using errcode = 'P0002';
  end if;

  if v_storage_mime is null
     or v_storage_mime not in (
       'image/jpeg',
       'image/png',
       'image/webp'
     ) then
    raise exception 'Tipo de imagem não permitido.'
      using errcode = '22023';
  end if;

  if v_storage_tamanho is null
     or v_storage_tamanho < 0
     or v_storage_tamanho > 10485760 then
    raise exception 'Tamanho da imagem inválido.'
      using errcode = '22023';
  end if;

  if p_mime_type is not null
     and btrim(p_mime_type) <> v_storage_mime then
    raise exception 'Tipo da imagem diverge do arquivo armazenado.'
      using errcode = '22023';
  end if;

  if p_tamanho_bytes is not null
     and p_tamanho_bytes <> v_storage_tamanho then
    raise exception 'Tamanho da imagem diverge do arquivo armazenado.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.loja_publicacao_fotos lpf
    where lpf.publicacao_id = p_publicacao_id
      and lpf.storage_path = btrim(p_storage_path)
  ) then
    raise exception 'Foto já registrada nesta publicação.'
      using errcode = '23505';
  end if;

  select
    count(*)::integer,
    coalesce(max(lpf.ordem), 0) + 1
  into
    v_quantidade,
    v_proxima_ordem
  from public.loja_publicacao_fotos lpf
  where lpf.empresa_id = p_empresa_id
    and lpf.publicacao_id = p_publicacao_id;

  if v_quantidade >= 10 then
    raise exception 'A publicação permite no máximo 10 fotos.'
      using errcode = '22023';
  end if;

  v_principal := (v_quantidade = 0) or coalesce(p_principal, false);

  if v_principal and v_quantidade > 0 then
    update public.loja_publicacao_fotos
    set principal = false
    where empresa_id = p_empresa_id
      and publicacao_id = p_publicacao_id
      and principal = true;
  end if;

  insert into public.loja_publicacao_fotos (
    empresa_id,
    publicacao_id,
    storage_path,
    ordem,
    principal,
    mime_type,
    tamanho_bytes
  )
  values (
    p_empresa_id,
    p_publicacao_id,
    btrim(p_storage_path),
    v_proxima_ordem,
    v_principal,
    v_storage_mime,
    v_storage_tamanho
  )
  returning *
  into v_foto;

  return v_foto;
end;
$$;

revoke all on function public.loja_adicionar_foto(
  uuid, uuid, text, text, bigint, boolean
) from public, anon;

grant execute on function public.loja_adicionar_foto(
  uuid, uuid, text, text, bigint, boolean
) to authenticated;

comment on function public.loja_adicionar_foto(
  uuid, uuid, text, text, bigint, boolean
)
is 'Registra foto existente no bucket loja-produtos usando MIME e tamanho reais do Storage como fonte de verdade.';
