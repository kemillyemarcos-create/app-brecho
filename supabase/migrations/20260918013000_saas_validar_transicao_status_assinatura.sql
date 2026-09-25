create or replace function public.transicao_status_assinatura_permitida(
  p_status_atual text,
  p_novo_status text
)
returns boolean
language sql
immutable
security definer
set search_path = ''
as $$
  select case
    when p_status_atual is null or p_novo_status is null then false
    when p_status_atual = p_novo_status then true

    when p_status_atual = 'trialing'
      and p_novo_status in (
        'active',
        'past_due',
        'canceled',
        'expired',
        'suspended'
      )
      then true

    when p_status_atual = 'active'
      and p_novo_status in (
        'past_due',
        'grace_period',
        'canceled',
        'suspended'
      )
      then true

    when p_status_atual = 'past_due'
      and p_novo_status in (
        'active',
        'grace_period',
        'canceled',
        'suspended'
      )
      then true

    when p_status_atual = 'grace_period'
      and p_novo_status in (
        'active',
        'past_due',
        'canceled',
        'suspended'
      )
      then true

    when p_status_atual = 'suspended'
      and p_novo_status in (
        'active',
        'canceled'
      )
      then true

    when p_status_atual in ('canceled', 'expired')
      then false

    else false
  end;
$$;

revoke all on function public.transicao_status_assinatura_permitida(text, text)
from public;

revoke all on function public.transicao_status_assinatura_permitida(text, text)
from anon;

revoke all on function public.transicao_status_assinatura_permitida(text, text)
from authenticated;

grant execute on function public.transicao_status_assinatura_permitida(text, text)
to service_role;

comment on function public.transicao_status_assinatura_permitida(text, text)
is 'Valida transições permitidas entre estados de assinatura. Uso exclusivo do backend/service_role.';
