-- SaaS / WhatsApp
-- Leitor backend-only da credencial Meta armazenada no Supabase Vault.
--
-- Segurança:
-- - SECURITY DEFINER para permitir leitura controlada do schema vault;
-- - não aceita secret_id arbitrário;
-- - resolve o secret exclusivamente através da configuração WhatsApp
--   pertencente à empresa informada;
-- - PUBLIC, anon e authenticated não podem executar;
-- - somente service_role recebe EXECUTE.

create or replace function public.whatsapp_resolver_access_token_backend(
  p_empresa_id uuid,
  p_configuracao_id uuid
)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, vault
as $$
  select ds.decrypted_secret
  from public.whatsapp_configuracoes wc
  join vault.decrypted_secrets ds
    on ds.id = wc.access_token_secret_id
  where wc.id = p_configuracao_id
    and wc.empresa_id = p_empresa_id
    and wc.access_token_secret_id is not null
  limit 1;
$$;

revoke all on function public.whatsapp_resolver_access_token_backend(uuid, uuid)
from public;

revoke all on function public.whatsapp_resolver_access_token_backend(uuid, uuid)
from anon;

revoke all on function public.whatsapp_resolver_access_token_backend(uuid, uuid)
from authenticated;

grant execute on function public.whatsapp_resolver_access_token_backend(uuid, uuid)
to service_role;

comment on function public.whatsapp_resolver_access_token_backend(uuid, uuid) is
  'Backend-only: resolve o access token Meta no Supabase Vault somente quando a configuração WhatsApp pertence à empresa informada. Execução restrita ao service_role.';
