import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import useExpedicaoMemo from './useExpedicaoMemo';

function projetar(props) {
  function Probe() {
    const result = useExpedicaoMemo(props);
    return createElement("script", { type: "application/json",
      dangerouslySetInnerHTML: { __html: JSON.stringify(result) } });
  }
  const html = renderToStaticMarkup(createElement(Probe));
  return JSON.parse(html.slice(html.indexOf(">") + 1, html.lastIndexOf("</script>")));
}

describe('Expedição compartilhada: Live e Loja', () => {
  const props = {
    todasVendasLive: [{ id: 'v1', peca_id: 'PL', sacolinha_id: 's1', valor_venda: 10, status_pagamento: 'pago' }],
    sacolinhasLive: [{ id: 's1', status: 'enviada' }],
    pedidoEnvioSacolinhas: [{ pedido_envio_id: 'ENV-L', sacolinha_id: 's1' }],
    pedidosEnvio: [
      { id: 'ENV-L', status: 'enviado' },
      { id: 'ENV-O', origem: 'loja', status: 'enviado', enviado_em: '2026-10-07T10:00:00Z',
        destino_loja: { cep: '01001000' }, itens_loja: [{ id: 'loja:i1', peca_id: 'PO', valor_venda: 20 }] },
    ],
  };
  it('preserva histórico de cada origem e contabiliza as peças expedidas', () => {
    const result = projetar(props);
    expect(result.pecaIdsEnviados).toEqual(['PL', 'PO']);
    expect(result.pedidosEnvioConcluidos).toHaveLength(2);
    expect(result.pedidosEnvioConcluidos[0].sacolinhas[0].id).toBe('s1');
    expect(result.pedidosEnvioConcluidos[1]).toMatchObject({ origem: 'loja', quantidadeCalculada: 1,
      valorTotalPedido: 20, sacolinhas: [], destino_loja: { cep: '01001000' } });
    expect(result.pedidosEnvioConcluidos[1].itens[0].id).toBe('loja:i1');
  });
  it('pedido Loja em montagem não torna sua peça expedida', () => {
    const result = projetar({ ...props, pedidosEnvio: props.pedidosEnvio.map(p => p.origem === 'loja' ? { ...p, status: 'montagem' } : p) });
    expect(result.pecaIdsEnviados).toEqual(['PL']);
    expect(result.pedidosEnvioEmMontagem[0].id).toBe('ENV-O');
  });
  it('Loja vazia permanece com quantidade zero sem absorver sacolinha Live', () => {
    const result = projetar({ ...props, pedidosEnvio: [{ id: 'ENV-L', origem: 'loja', status: 'montagem', itens_loja: [] }] });
    expect(result.pedidosEnvioEmMontagem[0]).toMatchObject({ quantidadeCalculada: 0, sacolinhas: [], itens: [] });
  });
});
