// Este vínculo seleciona o acompanhamento local, não autoriza operações.
// Pedido e sacola continuam validados por capability tokens no servidor.
export function restaurarPedido(storage, empresaSlug, tokenCarrinho) {
  let pedido;
  try {
    pedido = JSON.parse(storage.getItem(`loja:pedido:${empresaSlug}`) || 'null');
  } catch {
    return null;
  }
  if (!pedido || !/^[0-9a-f]{64}$/.test(pedido.pedidoToken || '')) return null;
  // Sem sacola atual, permite acompanhar inclusive pedidos de sessões antigas.
  if (!tokenCarrinho) return pedido;
  // Registros legados sem vínculo não devem assumir a identidade de uma sacola.
  // Repetir o checkout da mesma sacola recupera o mesmo pedido pela RPC idempotente.
  return pedido.tokenCarrinho === tokenCarrinho ? pedido : null;
}

export function limparAcompanhamento(session, local, empresaSlug, pedido, tokenCarrinho) {
  const chave = `loja:pedido:${empresaSlug}`;
  // Uma outra aba pode ter iniciado uma nova sacola desde a abertura da tela.
  const salvo = JSON.parse(session.getItem(chave) || 'null');
  if (salvo?.pedidoToken === pedido?.pedidoToken) session.removeItem(chave);
  const chaveCarrinho = `loja:carrinho:${empresaSlug}`;
  if (tokenCarrinho && local.getItem(chaveCarrinho) === tokenCarrinho) local.removeItem(chaveCarrinho);
}
