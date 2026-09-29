drop trigger if exists trg_vendas_loja_snapshot_custo_peca
  on public.vendas_loja;

create trigger trg_vendas_loja_snapshot_custo_peca
before insert on public.vendas_loja
for each row
execute function public.snapshot_custo_peca_venda();

comment on trigger trg_vendas_loja_snapshot_custo_peca
on public.vendas_loja
is 'Captura no INSERT o custo da peça para preservar o histórico da venda da Loja Online.';
