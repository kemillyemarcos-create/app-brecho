-- LOJA — BLOQUEIA ALTERAÇÃO DE ARQUIVOS DE PRODUTOS PUBLICADOS
--
-- Produto publicado deve ter suas fotos imutáveis.
-- Para alterar imagens, a publicação precisa ser despublicada primeiro.
--
-- Estrutura obrigatória do caminho:
-- <empresa_id>/<publicacao_id>/<arquivo>

drop policy if exists "loja produtos inserir" on storage.objects;

create policy "loja produtos inserir"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'loja-produtos'
  and cardinality(storage.foldername(storage.objects.name)) = 2
  and exists (
    select 1
    from public.loja_publicacoes lp
    where lp.empresa_id::text =
          (storage.foldername(storage.objects.name))[1]
      and lp.id::text =
          (storage.foldername(storage.objects.name))[2]
      and lp.publicada is false
      and public.usuario_empresa_operacional_ativo(lp.empresa_id)
  )
);


drop policy if exists "loja produtos atualizar" on storage.objects;

create policy "loja produtos atualizar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'loja-produtos'
  and cardinality(storage.foldername(storage.objects.name)) = 2
  and exists (
    select 1
    from public.loja_publicacoes lp
    where lp.empresa_id::text =
          (storage.foldername(storage.objects.name))[1]
      and lp.id::text =
          (storage.foldername(storage.objects.name))[2]
      and lp.publicada is false
      and public.usuario_empresa_operacional_ativo(lp.empresa_id)
  )
)
with check (
  bucket_id = 'loja-produtos'
  and cardinality(storage.foldername(storage.objects.name)) = 2
  and exists (
    select 1
    from public.loja_publicacoes lp
    where lp.empresa_id::text =
          (storage.foldername(storage.objects.name))[1]
      and lp.id::text =
          (storage.foldername(storage.objects.name))[2]
      and lp.publicada is false
      and public.usuario_empresa_operacional_ativo(lp.empresa_id)
  )
);


drop policy if exists "loja produtos excluir" on storage.objects;

create policy "loja produtos excluir"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'loja-produtos'
  and cardinality(storage.foldername(storage.objects.name)) = 2
  and exists (
    select 1
    from public.loja_publicacoes lp
    where lp.empresa_id::text =
          (storage.foldername(storage.objects.name))[1]
      and lp.id::text =
          (storage.foldername(storage.objects.name))[2]
      and lp.publicada is false
      and public.usuario_empresa_operacional_ativo(lp.empresa_id)
  )
);

comment on policy "loja produtos inserir" on storage.objects
is 'Permite upload somente em publicação rascunho da própria empresa e no caminho empresa/publicacao/arquivo.';

comment on policy "loja produtos atualizar" on storage.objects
is 'Permite alterar objeto somente enquanto a publicação estiver em rascunho e pertencer à empresa operacional do usuário.';

comment on policy "loja produtos excluir" on storage.objects
is 'Permite excluir objeto somente enquanto a publicação estiver em rascunho e pertencer à empresa operacional do usuário.';
