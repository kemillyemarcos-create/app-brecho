export const statusPedido = { pendente_pagamento: 'Aguardando pagamento', pago: 'Pago', expirado: 'Expirado', cancelado: 'Cancelado', reembolsado: 'Reembolsado' };
export const statusPagamento = { pending: 'Aguardando pagamento', authorized: 'Autorizado', paid: 'Pago', failed: 'Falhou', canceled: 'Cancelado', refunded: 'Reembolsado', partially_refunded: 'Parcialmente reembolsado' };
export const rotuloPedido = status => statusPedido[status] || 'Status indisponível';
export const rotuloPagamento = status => !status ? 'Não iniciado' : statusPagamento[status] || 'Status indisponível';
export const itensPedido = pedido => Array.isArray(pedido.itens) ? pedido.itens : [];
export const moeda = valor => Number.isFinite(Number(valor)) ? Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
export function dataHora(valor) {
  const data = valor ? new Date(valor) : null;
  return data && !Number.isNaN(data.getTime()) ? data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data não informada';
}
export function linkLoja(slug) {
  if (typeof slug !== 'string' || !slug.trim()) return null;
  return `/?${new URLSearchParams({ loja: 'online', empresa: slug.trim() })}`;
}
export function filtrarPedidos(pedidos, filtro) {
  return filtro === 'todos' ? pedidos : pedidos.filter(p => p.status === filtro);
}
export function resumoPedidos(pedidos) {
  return {
    aguardando: pedidos.filter(p => p.status === 'pendente_pagamento').length,
    pagos: pedidos.filter(p => p.status === 'pago').length,
    expirados: pedidos.filter(p => p.status === 'expirado').length,
  };
}
