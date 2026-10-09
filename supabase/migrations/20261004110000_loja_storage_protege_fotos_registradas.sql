-- ============================================================================
-- LOJA / STORAGE
-- Protege a integridade entre storage.objects e loja_publicacao_fotos.
--
-- Regras:
-- 1. objetos de loja-produtos não podem ser alterados/movidos diretamente;
-- 2. exclusão física só é permitida quando o objeto já não está registrado
--    na galeria da publicação;
-- 3. a publicação precisa continuar em rascunho e pertencer à empresa
--    operacional do usuário.
-- ============================================================================


-- Não existe fluxo ativo que necessite UPDATE/move/rename de objetos.
-- Sem policy de UPDATE, authenticated não pode alterar diretamente o objeto.
drop policy if exists "loja produtos atualizar" on storage.objects;


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

  and not exists (
    select 1
    from public.loja_publicacao_fotos lpf
    where lpf.storage_path = storage.objects.name
      and lpf.empresa_id::text =
          (storage.foldername(storage.objects.name))[1]
      and lpf.publicacao_id::text =
          (storage.foldername(storage.objects.name))[2]
  )
);


comment on policy "loja produtos excluir" on storage.objects
is 'Permite excluir fisicamente apenas objeto órfão de publicação rascunho da própria empresa; fotos ainda registradas na galeria ficam protegidas.';
