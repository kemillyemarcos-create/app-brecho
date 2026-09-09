-- SaaS / WhatsApp
-- Referencia a credencial de acesso da Meta armazenada no Supabase Vault.
--
-- O token NÃO é armazenado em public.whatsapp_configuracoes.
-- Esta tabela guarda somente o UUID do secret correspondente no Vault.
--
-- Não criamos FK física para vault.secrets intencionalmente:
-- evitamos acoplamento direto entre o schema public e a implementação
-- interna da extensão supabase_vault.
--
-- A resolução e validação do secret devem ocorrer exclusivamente
-- no backend privilegiado.

alter table public.whatsapp_configuracoes
  add column if not exists access_token_secret_id uuid;

comment on column public.whatsapp_configuracoes.access_token_secret_id is
  'UUID do secret no Supabase Vault que contém o access token da Meta para esta configuração WhatsApp. Nunca armazenar o token diretamente nesta tabela.';

create index if not exists idx_whatsapp_configuracoes_access_token_secret_id
  on public.whatsapp_configuracoes (access_token_secret_id)
  where access_token_secret_id is not null;
