-- ============================================================
-- SaaS: finaliza migração do vínculo usuário <-> empresa
--
-- Fonte canônica:
--   empresa_usuarios.empresa_id
--   empresa_usuarios.perfil
--
-- 1. Migra policies do Storage para memberships
-- 2. Remove empresa_id/perfil legados de usuarios
-- ============================================================

-- ------------------------------------------------------------
-- Storage: identidade visual por empresa
-- Estrutura esperada:
-- identidade-empresas/<empresa_id>/arquivo
-- ------------------------------------------------------------

drop policy if exists "identidade empresa selecionar"
on storage.objects;

create policy "identidade empresa selecionar"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'identidade-empresas'
  and exists (
    select 1
    from public.empresa_usuarios eu
    join public.usuarios u
      on u.id = eu.usuario_id
    where u.auth_user_id = auth.uid()
      and u.ativo = true
      and eu.ativo = true
      and eu.empresa_id::text =
          (storage.foldername(objects.name))[1]
  )
);


drop policy if exists "identidade empresa inserir"
on storage.objects;

create policy "identidade empresa inserir"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'identidade-empresas'
  and exists (
    select 1
    from public.empresa_usuarios eu
    join public.usuarios u
      on u.id = eu.usuario_id
    where u.auth_user_id = auth.uid()
      and u.ativo = true
      and eu.ativo = true
      and eu.perfil in ('PROPRIETARIO', 'ADMIN')
      and eu.empresa_id::text =
          (storage.foldername(objects.name))[1]
  )
);


drop policy if exists "identidade empresa atualizar"
on storage.objects;

create policy "identidade empresa atualizar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'identidade-empresas'
  and exists (
    select 1
    from public.empresa_usuarios eu
    join public.usuarios u
      on u.id = eu.usuario_id
    where u.auth_user_id = auth.uid()
      and u.ativo = true
      and eu.ativo = true
      and eu.perfil in ('PROPRIETARIO', 'ADMIN')
      and eu.empresa_id::text =
          (storage.foldername(objects.name))[1]
  )
)
with check (
  bucket_id = 'identidade-empresas'
  and exists (
    select 1
    from public.empresa_usuarios eu
    join public.usuarios u
      on u.id = eu.usuario_id
    where u.auth_user_id = auth.uid()
      and u.ativo = true
      and eu.ativo = true
      and eu.perfil in ('PROPRIETARIO', 'ADMIN')
      and eu.empresa_id::text =
          (storage.foldername(objects.name))[1]
  )
);


drop policy if exists "identidade empresa excluir"
on storage.objects;

create policy "identidade empresa excluir"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'identidade-empresas'
  and exists (
    select 1
    from public.empresa_usuarios eu
    join public.usuarios u
      on u.id = eu.usuario_id
    where u.auth_user_id = auth.uid()
      and u.ativo = true
      and eu.ativo = true
      and eu.perfil in ('PROPRIETARIO', 'ADMIN')
      and eu.empresa_id::text =
          (storage.foldername(objects.name))[1]
  )
);


-- ------------------------------------------------------------
-- usuarios permanece como identidade interna.
-- Empresa e perfil passam a existir somente em empresa_usuarios.
-- ------------------------------------------------------------

alter table public.usuarios
  drop column if exists empresa_id,
  drop column if exists perfil;
