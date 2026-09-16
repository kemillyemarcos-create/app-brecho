create or replace function public.usuario_empresa_operacional_ativo(
    p_empresa_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select
        public.usuario_membro_empresa(p_empresa_id)
        and public.assinatura_empresa_operacional_ativa(p_empresa_id);
$$;

revoke all on function public.usuario_empresa_operacional_ativo(uuid) from public;
revoke all on function public.usuario_empresa_operacional_ativo(uuid) from anon;
grant execute on function public.usuario_empresa_operacional_ativo(uuid) to authenticated;
grant execute on function public.usuario_empresa_operacional_ativo(uuid) to service_role;
