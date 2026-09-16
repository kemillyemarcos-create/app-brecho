create or replace function public.assinatura_empresa_operacional_ativa(
    p_empresa_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.assinaturas a
        where a.empresa_id = p_empresa_id
          and (
              (
                  a.status = 'trialing'
                  and a.trial_ends_at is not null
                  and a.trial_ends_at >= now()
              )
              or
              (
                  a.status = 'active'
                  and (
                      a.current_period_ends_at is null
                      or a.current_period_ends_at >= now()
                  )
              )
              or
              (
                  a.status = 'grace_period'
                  and a.grace_ends_at is not null
                  and a.grace_ends_at >= now()
              )
          )
    );
$$;

revoke all on function public.assinatura_empresa_operacional_ativa(uuid) from public;
revoke all on function public.assinatura_empresa_operacional_ativa(uuid) from anon;
revoke all on function public.assinatura_empresa_operacional_ativa(uuid) from authenticated;
grant execute on function public.assinatura_empresa_operacional_ativa(uuid) to service_role;
