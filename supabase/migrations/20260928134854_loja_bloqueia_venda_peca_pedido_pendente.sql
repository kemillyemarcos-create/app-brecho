-- ============================================================================
-- Loja Online
-- Impede que uma peça seja marcada como vendida enquanto estiver vinculada
-- a um pedido da Loja ainda pendente de pagamento e dentro do prazo.
--
-- Essa proteção vale para qualquer origem da venda, inclusive Live.
-- ============================================================================

create or replace function public.loja_bloquear_venda_peca_pedido_pendente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Só interessa a transição de disponível -> vendida.
  if coalesce(old.vendido, false) is false
     and new.vendido is true then

    if exists (
      select 1
      from public.pedido_itens_loja pil
      join public.pedidos_loja pl
        on pl.empresa_id = pil.empresa_id
       and pl.id = pil.pedido_id
      where pil.empresa_id = new.empresa_id
        and pil.peca_id = new.id
        and pl.status = 'pendente_pagamento'
        and pl.pagamento_expira_em > clock_timestamp()
    ) then
      raise exception
        'Peça reservada por pedido da Loja aguardando pagamento.'
        using errcode = '55P03';
    end if;
  end if;

  return new;
end;
$$;

revoke all
on function public.loja_bloquear_venda_peca_pedido_pendente()
from public;

revoke execute
on function public.loja_bloquear_venda_peca_pedido_pendente()
from anon;

revoke execute
on function public.loja_bloquear_venda_peca_pedido_pendente()
from authenticated;

revoke execute
on function public.loja_bloquear_venda_peca_pedido_pendente()
from service_role;

create index if not exists pedido_itens_loja_empresa_peca_idx
on public.pedido_itens_loja (
  empresa_id,
  peca_id
);

drop trigger if exists trg_loja_bloqueia_venda_peca_pedido_pendente
on public.pecas;

create trigger trg_loja_bloqueia_venda_peca_pedido_pendente
before update of vendido
on public.pecas
for each row
when (
  old.vendido is distinct from new.vendido
)
execute function public.loja_bloquear_venda_peca_pedido_pendente();

comment on function public.loja_bloquear_venda_peca_pedido_pendente()
is 'Bloqueia a transição de pecas.vendido=false para true enquanto existir pedido da Loja pendente de pagamento e não expirado para a mesma peça.';

comment on trigger trg_loja_bloqueia_venda_peca_pedido_pendente
on public.pecas
is 'Proteção contra dupla venda entre Loja Online e demais canais, incluindo Live.';
