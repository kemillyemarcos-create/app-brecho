// A projeção Live permanece no hook; a origem Loja usa snapshots autorizados.
export function projetarPedidoLoja(pedido) {
  if (pedido.origem !== 'loja') return null;
  const itens = Array.isArray(pedido.itens_loja) ? pedido.itens_loja : [];
  const valorTotal = itens.reduce((total, item) => total + Number(item.valor_venda || 0), 0);
  return { ...pedido, itens, sacolinhas: [], quantidadeCalculada: itens.length,
    valorTotalPedido: valorTotal, valorTotal };
}

export function combinarOrigensExpedicao(pedidos, origens) {
  const porEnvio = new Map();
  for (const origem of origens) {
    if (!origem.pedido_envio_id || origem.origem !== 'loja' || porEnvio.has(origem.pedido_envio_id)) {
      throw new Error('Origem de expedição inválida ou duplicada.');
    }
    porEnvio.set(origem.pedido_envio_id, origem);
  }
  return pedidos.map(pedido => {
    const origem = porEnvio.get(pedido.id);
    if (!origem) return pedido;
    return { ...pedido, origem: 'loja', itens_loja: origem.itens_loja,
      destino_loja: origem.destino_loja };
  });
}
