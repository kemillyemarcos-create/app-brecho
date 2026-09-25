-- ============================================================================
-- SaaS / Performance RLS
-- Otimiza a política de peças evitando validar membership + assinatura
-- novamente para cada linha retornada.
-- ============================================================================

create or replace function public.usuario_empresas_operacionais()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select eu.empresa_id
  from public.empresa_usuarios eu
  join public.usuarios u
    on u.id = eu.usuario_id
  where u.auth_user_id = auth.uid()
    and u.ativo = true
    and eu.ativo = true
    and public.assinatura_empresa_operacional_ativa(eu.empresa_id);
$$;

revoke all
on function public.usuario_empresas_operacionais()
from public;

revoke all
on function public.usuario_empresas_operacionais()
from anon;

grant execute
on function public.usuario_empresas_operacionais()
to authenticated;

grant execute
on function public.usuario_empresas_operacionais()
to service_role;

comment on function public.usuario_empresas_operacionais() is
  'Retorna as empresas em que o usuário autenticado possui membership ativo e assinatura operacional vigente. Usada para evitar avaliação de RLS linha a linha.';

alter policy pecas_tenant_all
on public.pecas
using (
  empresa_id in (
    select public.usuario_empresas_operacionais()
  )
)
with check (
  empresa_id in (
    select public.usuario_empresas_operacionais()
  )
);
