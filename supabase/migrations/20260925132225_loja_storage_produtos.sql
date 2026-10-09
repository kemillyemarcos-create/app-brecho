-- =========================================================
-- LOJA — STORAGE DE FOTOS DOS PRODUTOS
-- =========================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'loja-produtos',
  'loja-produtos',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- =========================================================
-- POLICIES
-- Caminho obrigatório:
-- <empresa_id>/<publicacao_id>/<arquivo>
-- =========================================================

drop policy if exists "loja produtos selecionar"
on storage.objects;

create policy "loja produtos selecionar"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'loja-produtos'
  and exists (
    select 1
    from public.loja_publicacoes lp
    where lp.empresa_id::text =
      (storage.foldername(storage.objects.name))[1]
      and lp.id::text =
      (storage.foldername(storage.objects.name))[2]
      and public.usuario_empresa_operacional_ativo(lp.empresa_id)
  )
);


drop policy if exists "loja produtos inserir"
on storage.objects;

create policy "loja produtos inserir"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'loja-produtos'
  and exists (
    select 1
    from public.loja_publicacoes lp
    where lp.empresa_id::text =
      (storage.foldername(storage.objects.name))[1]
      and lp.id::text =
      (storage.foldername(storage.objects.name))[2]
      and public.usuario_empresa_operacional_ativo(lp.empresa_id)
  )
);


drop policy if exists "loja produtos atualizar"
on storage.objects;

create policy "loja produtos atualizar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'loja-produtos'
  and exists (
    select 1
    from public.loja_publicacoes lp
    where lp.empresa_id::text =
      (storage.foldername(storage.objects.name))[1]
      and lp.id::text =
      (storage.foldername(storage.objects.name))[2]
      and public.usuario_empresa_operacional_ativo(lp.empresa_id)
  )
)
with check (
  bucket_id = 'loja-produtos'
  and exists (
    select 1
    from public.loja_publicacoes lp
    where lp.empresa_id::text =
      (storage.foldername(storage.objects.name))[1]
      and lp.id::text =
      (storage.foldername(storage.objects.name))[2]
      and public.usuario_empresa_operacional_ativo(lp.empresa_id)
  )
);


drop policy if exists "loja produtos excluir"
on storage.objects;

create policy "loja produtos excluir"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'loja-produtos'
  and exists (
    select 1
    from public.loja_publicacoes lp
    where lp.empresa_id::text =
      (storage.foldername(storage.objects.name))[1]
      and lp.id::text =
      (storage.foldername(storage.objects.name))[2]
      and public.usuario_empresa_operacional_ativo(lp.empresa_id)
  )
);
