import { describe, expect, it } from 'vitest';
import { combinarOrigensExpedicao, projetarPedidoLoja } from './expedicaoLoja';
import { clienteJaTemPedidoAtivo, pedidoEstaEnviado } from './expedicaoRules';

const id = 'loja:123e4567-e89b-42d3-a456-426614174000';
const item = Object.freeze({ id, pedido_item_id: id.slice(5), peca_id: 'PEC-1', valor_venda: '12.50' });
const origem = Object.freeze({ pedido_envio_id: 'ENV-1', origem: 'loja',
  itens_loja: Object.freeze([item]), destino_loja: Object.freeze({ cep: '01001000' }) });

describe('projeção Loja no ERP', () => {
  it('preserva IDs fornecidos pelo backend, sem prefixo duplo ou peca_id', () => {
    const p = projetarPedidoLoja({ ...origem, id: 'ENV-1' });
    expect(p.itens[0].id).toBe(id);
    expect(p.itens).toBe(origem.itens_loja);
    expect(p.sacolinhas).toEqual([]);
    expect(p.quantidadeCalculada).toBe(1);
  });
  it('soma valores numéricos e decimais do contrato', () => {
    const p = projetarPedidoLoja({ origem: 'loja', itens_loja: [item, { id: 'loja:2', valor_venda: 7.5 }] });
    expect(p.valorTotalPedido).toBe(20);
    expect(p.valorTotal).toBe(20);
    expect(p.quantidadeCalculada).toBe(2);
  });
  it.each([[], undefined, null])('pedido sem itens não fabrica quantidade: %s', itens_loja => {
    expect(projetarPedidoLoja({ origem: 'loja', itens_loja, quantidade_esperada: 3 }))
      .toMatchObject({ itens: [], quantidadeCalculada: 0, valorTotalPedido: 0, sacolinhas: [] });
  });
  it('não projeta Live como Loja', () => {
    expect(projetarPedidoLoja({ id: 'live', itens_loja: [item] })).toBeNull();
    expect(projetarPedidoLoja({ origem: 'live' })).toBeNull();
  });
  it('não modifica pedido nem itens de entrada', () => {
    const pedido = Object.freeze({ ...origem, id: 'ENV-1', sacolinhas: Object.freeze(['legado']) });
    const p = projetarPedidoLoja(pedido);
    expect(p).not.toBe(pedido);
    expect(pedido.sacolinhas).toEqual(['legado']);
    expect(pedido).not.toHaveProperty('quantidadeCalculada');
    expect(item.id).toBe(id);
  });
});

describe('combinação das origens', () => {
  it('mistura Live e Loja mantendo Live e ordem intactos', () => {
    const live = Object.freeze({ id: 'LIVE-1', sacolinhas: ['s1'] });
    const loja = Object.freeze({ id: 'ENV-1', status: 'montagem' });
    const pedidos = Object.freeze([live, loja]);
    const result = combinarOrigensExpedicao(pedidos, Object.freeze([origem]));
    expect(result[0]).toBe(live);
    expect(result[1]).toMatchObject({ id: 'ENV-1', origem: 'loja' });
    expect(loja).not.toHaveProperty('origem');
  });
  it('copia somente projeção: não sobrescreve identidade/status/rastreio/tenant', () => {
    const pedido = { id: 'ENV-1', empresa_id: 'a', cliente_id: 'c', status: 'enviado', codigo_rastreio: 'teste' };
    const [result] = combinarOrigensExpedicao([pedido], [{ ...origem, id: 'outro', empresa_id: 'b',
      cliente_id: 'x', status: 'montagem', codigo_rastreio: 'x' }]);
    expect(result).toMatchObject(pedido);
  });
  it('ignora origem sem pai correspondente', () => {
    const live = { id: 'LIVE-1' };
    expect(combinarOrigensExpedicao([live], [origem])).toEqual([live]);
  });
  it('rejeita colisão de origem em vez de escolher última silenciosamente', () => {
    expect(() => combinarOrigensExpedicao([{ id: 'ENV-1' }], [origem, origem])).toThrow('duplicada');
  });
  it.each([{ ...origem, origem: 'live' }, { ...origem, pedido_envio_id: null }])('rejeita origem inválida', invalid => {
    expect(() => combinarOrigensExpedicao([], [invalid])).toThrow('inválida');
  });
  it('mantém itens/destino/data de envio no histórico Loja', () => {
    const [pedido] = combinarOrigensExpedicao([{ id: 'ENV-1', status: 'enviado', enviado_em: '2026-10-07T10:00:00Z' }], [origem]);
    const result = projetarPedidoLoja(pedido);
    expect(pedidoEstaEnviado(result)).toBe(true);
    expect(result).toMatchObject({ enviado_em: pedido.enviado_em, destino_loja: origem.destino_loja, itens: [item] });
  });
  it('pedido Loja não interfere na verificação de Live quando separado por origem', () => {
    const pedidos = [{ cliente_nome: 'Teste', status: 'montagem', origem: 'loja' }];
    expect(clienteJaTemPedidoAtivo('Teste', pedidos.filter(p => p.origem !== 'loja'))).toBe(false);
    pedidos.push({ cliente_nome: 'Teste', status: 'montagem' });
    expect(clienteJaTemPedidoAtivo('Teste', pedidos.filter(p => p.origem !== 'loja'))).toBe(true);
  });
});
