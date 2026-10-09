export const itensPedidoLoja = pedido => Array.isArray(pedido.itens) ? pedido.itens : [];

export function resumirPedidosLoja(pedidos) {
    return pedidos.reduce((resumo, pedido) => {
        if (pedido.status === 'pago') {
            resumo.pagos += 1;
            resumo.pecas += itensPedidoLoja(pedido).length;
            resumo.faturamento += Number(pedido.total) || 0;
        }
        return resumo;
    }, { pagos: 0, pecas: 0, faturamento: 0 });
}

const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function filtrarPedidosLoja(pedidos, busca) {
    const termo = normalizar(busca).trim();
    return pedidos.filter(pedido => {
        if (pedido.status !== 'pago') return false;
        return !termo || [pedido.cliente_nome, pedido.pedido_id,
            ...itensPedidoLoja(pedido).flatMap(item => [item.peca_id, item.nome]),
        ].some(valor => normalizar(valor).includes(termo));
    });
}

export async function consultarPedidosLoja(empresaId, rpc) {
    if (!empresaId) return [];
    const { data, error } = await rpc('loja_painel_pedidos', { p_empresa_id: empresaId });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
}
