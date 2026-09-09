-- ============================================================================
-- SaaS / Segurança da tabela public.usuarios
--
-- Objetivos:
-- 1. Garantir vínculo 1:1 entre auth.users e public.usuarios.
-- 2. Impedir leitura global da tabela por usuários autenticados.
-- 3. Impedir alteração de campos sensíveis como empresa_id, perfil e ativo.
-- 4. Manter apenas a atualização legítima de ultimo_acesso pelo frontend.
-- ============================================================================

-- Remove as policies permissivas legadas.
drop policy if exists usuarios_select_auth
  on public.usuarios;

drop policy if exists usuarios_update_ultimo_acesso
  on public.usuarios;

-- Cada usuário autenticado pode consultar somente seu próprio cadastro interno.
create policy usuarios_select_proprio
on public.usuarios
for select
to authenticated
using (
  auth_user_id = auth.uid()
);

-- A policy restringe a linha que pode ser atualizada.
-- As colunas permitidas são restringidas pelos GRANTs abaixo.
create policy usuarios_update_proprio
on public.usuarios
for update
to authenticated
using (
  auth_user_id = auth.uid()
)
with check (
  auth_user_id = auth.uid()
);

-- Remove privilégios amplos do papel authenticated.
revoke insert on table public.usuarios from authenticated;
revoke delete on table public.usuarios from authenticated;
revoke update on table public.usuarios from authenticated;

-- Mantém leitura, que será filtrada pela RLS.
grant select on table public.usuarios to authenticated;

-- O frontend atual só precisa atualizar esta coluna.
grant update (ultimo_acesso)
on table public.usuarios
to authenticated;
