import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

const classesStatus = { pendente_pagamento: 'kc-lg-badge-pendente', pago: 'kc-lg-badge-pago', expirado: 'kc-lg-badge-expirado', cancelado: 'kc-lg-badge-cancelado', reembolsado: 'kc-lg-badge-reembolsado' };
import { dataHora, filtrarPedidos, itensPedido, moeda, rotuloPagamento, rotuloPedido } from './gestaoLoja';

export function LojaPedidoDetalhe({ pedido }) {
  return <div className="kc-lg-detalhe">
    <h4>Detalhes do pedido</h4>
    <dl className="kc-lg-dados">
      <div><dt>Cliente</dt><dd>{pedido.cliente_nome || 'Cliente não informado'}</dd></div>
      <div><dt>Status do pedido</dt><dd>{rotuloPedido(pedido.status)}</dd></div>
      <div><dt>Status do pagamento</dt><dd>{rotuloPagamento(pedido.pagamento_status)}</dd></div>
      <div><dt>Criado em</dt><dd>{dataHora(pedido.criado_em)}</dd></div>
      {pedido.pago_em && <div><dt>Confirmado em</dt><dd>{dataHora(pedido.pago_em)}</dd></div>}
      <div><dt>Valor total</dt><dd>{moeda(pedido.total)}</dd></div>
    </dl>
    {pedido.pagamento_status === 'paid' && pedido.status !== 'pago' && <p className="kc-lg-alerta" role="alert">{pedido.status === 'expirado'
      ? 'Pagamento recebido após o encerramento do pedido. A venda não foi confirmada automaticamente.'
      : 'Pagamento recebido sem confirmação automática da venda. Verifique a situação antes de entregar.'}</p>}
    <h4>Peças do pedido</h4>
    <ul className="kc-lg-itens">{itensPedido(pedido).map((item, i) => <li key={`${item.peca_id}:${i}`}><span>{item.nome}<small>Código da peça: {item.peca_id}</small></span><strong>{moeda(item.preco)}</strong></li>)}</ul>
    <p className="kc-lg-identificador">Identificador do pedido<br /><span>{pedido.pedido_id}</span></p>
  </div>;
}
export function LojaPedidoLinha({ pedido }) {
  const [aberto, setAberto] = useState(false);
  return <article className="kc-lg-pedido">
    <div className="kc-lg-pedido-linha">
      <div className="kc-lg-pedido-cliente"><h3>{pedido.cliente_nome || 'Cliente não informado'}</h3><p>{itensPedido(pedido).map(i => i.nome).join(' · ') || 'Peças não informadas'}</p></div>
      <strong className="kc-lg-valor">{moeda(pedido.total)}</strong>
      <div><span className={`kc-lg-badge ${classesStatus[pedido.status] || ''}`}>{rotuloPedido(pedido.status)}</span><time dateTime={pedido.criado_em || undefined}>{dataHora(pedido.criado_em)}</time></div>
      <button type="button" className="kc-lg-link" aria-expanded={aberto} onClick={() => setAberto(v => !v)}>{aberto ? 'Fechar pedido ↑' : 'Ver pedido →'}</button>
    </div>
    {aberto && <LojaPedidoDetalhe pedido={pedido} />}
  </article>;
}
export default function LojaPedidosLista({ pedidos, carregando, erro, onAtualizar }) {
  const [filtro, setFiltro] = useState('todos');
  const filtrados = filtrarPedidos(pedidos, filtro);
  return <section className="kc-lg-pedidos" aria-labelledby="kc-lg-pedidos-titulo">
    <div className="kc-lg-titulo-linha"><div><h2 id="kc-lg-pedidos-titulo">Pedidos</h2><p>Os 100 pedidos mais recentes da loja. Os filtros consideram o status do pedido.</p></div><button type="button" className="kc-lg-link kc-lg-atualizar" onClick={onAtualizar} disabled={carregando} aria-busy={carregando}><RefreshCw size={14} aria-hidden="true" />Atualizar pedidos</button></div>
    <div className="kc-lg-filtros" role="group" aria-label="Filtrar pedidos">{[['todos','Todos'],['pendente_pagamento','Aguardando pagamento'],['pago','Pagos'],['expirado','Expirados']].map(([valor, texto]) => <button key={valor} type="button" aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}>{texto}</button>)}</div>
    {carregando ? <p className="kc-lg-vazio" role="status">Carregando pedidos…</p> : erro ? <p className="kc-lg-alerta" role="alert">{erro}</p> : filtrados.length ? filtrados.map(p => <LojaPedidoLinha key={p.pedido_id} pedido={p} />) : <p className="kc-lg-vazio">{pedidos.length ? 'Nenhum pedido neste filtro.' : 'Sua loja ainda não tem pedidos neste recorte.'}</p>}
  </section>;
}
