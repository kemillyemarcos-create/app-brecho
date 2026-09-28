revoke execute on function public.loja_adicionar_item_carrinho(
  uuid, uuid, text
) from public;

revoke execute on function public.loja_adicionar_item_carrinho(
  uuid, uuid, text
) from anon;

revoke execute on function public.loja_adicionar_item_carrinho(
  uuid, uuid, text
) from authenticated;

grant execute on function public.loja_adicionar_item_carrinho(
  uuid, uuid, text
) to service_role;

comment on function public.loja_adicionar_item_carrinho(
  uuid, uuid, text
)
is 'RPC interna da Loja. Execução restrita a service_role; acesso público deve ocorrer por camada server-side/Edge Function com rate limit e bot protection.';
