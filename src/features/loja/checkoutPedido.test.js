import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CheckoutLoja from './CheckoutLoja';
vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }));
import { restaurarPedido, limparAcompanhamento } from './checkoutPedido';

function storage(entries = {}) {
  const data = new Map(Object.entries(entries));
  return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) };
}
const slug = 'loja-teste';
const chave = `loja:pedido:${slug}`;
const chaveCarrinho = `loja:carrinho:${slug}`;
const tokenA = 'a'.repeat(64), tokenB = 'b'.repeat(64);
const pedido = { pedidoToken: 'c'.repeat(64), pedidoId: 'pedido-antigo', total: 50, tokenCarrinho: tokenA };
const session = (p = pedido) => storage({ [chave]: JSON.stringify(p) });

describe('recuperação do checkout por sacola', () => {
  it('nova sacola não restaura pedido antigo, mesmo na mesma loja/aba', () => {
    const s = session();
    expect(restaurarPedido(s, slug, tokenB)).toBeNull();
    expect(JSON.parse(s.getItem(chave))).toEqual(pedido); // Não apaga acompanhamento implicitamente.
  });
  it('mesma sacola retoma pedido após retorno da loja ou falha no pagamento', () => {
    expect(restaurarPedido(session(), slug, tokenA)).toEqual(pedido);
  });
  it('registro legado sem vínculo não assume a identidade da sacola atual', () => {
    const {tokenCarrinho, ...legado} = pedido;
    expect(restaurarPedido(session(legado), slug, tokenB)).toBeNull();
    expect(restaurarPedido(session(legado), slug, tokenA)).toBeNull();
    expect(restaurarPedido(session(legado), slug, null)).toEqual(legado);
  });
  it('sem sacola preserva acompanhamento do pedido convertido', () => {
    expect(restaurarPedido(session(), slug, null)).toEqual(pedido);
  });
  it('isola o pedido por loja', () => {
    expect(restaurarPedido(session(), 'outra-loja', tokenA)).toBeNull();
  });
  it.each(['{', 'null', '{}', '[]', '"texto"'])('storage inválido %s não restaura pedido', value => {
    expect(restaurarPedido(storage({[chave]:value}), slug, tokenA)).toBeNull();
  });
  it('encerrar -> nova sacola -> checkout começa sem pedido e salva novo vínculo', () => {
    const s = session(), l = storage({[chaveCarrinho]:tokenA});
    limparAcompanhamento(s,l,slug,pedido,tokenA);
    expect(s.getItem(chave)).toBeNull();
    expect(l.getItem(chaveCarrinho)).toBeNull();
    l.setItem(chaveCarrinho,tokenB);
    expect(restaurarPedido(s,slug,tokenB)).toBeNull();
    const novo = {...pedido,pedidoId:'novo',pedidoToken:'d'.repeat(64),tokenCarrinho:tokenB};
    s.setItem(chave,JSON.stringify(novo));
    expect(restaurarPedido(s,slug,tokenB)).toEqual(novo);
    expect(restaurarPedido(s,slug,tokenA)).toBeNull();
  });
  it('encerrar acompanhamento antigo não remove sacola iniciada em outra aba', () => {
    const s=session(), l=storage({[chaveCarrinho]:tokenB});
    limparAcompanhamento(s,l,slug,pedido,tokenA);
    expect(l.getItem(chaveCarrinho)).toBe(tokenB);
  });
  it('encerrar não remove outro pedido salvo posteriormente', () => {
    const novo={...pedido,pedidoToken:'d'.repeat(64)};
    const s=session(novo);
    limparAcompanhamento(s,storage(),slug,pedido,null);
    expect(JSON.parse(s.getItem(chave))).toEqual(novo);
  });
});

// Renderiza o componente real: prova que não é apenas a função auxiliar
// que rejeita o pedido antigo antes da consulta ao backend.

afterEach(() => vi.unstubAllGlobals());
function renderCheckout(tokenCarrinho) {
  return renderToStaticMarkup(createElement(CheckoutLoja, {
    empresaSlug: slug, tokenCarrinho, resumoSacola: {itens:[]},
    formatarPreco: v => String(v), obterUrlFoto: v => v,
  }));
}
it('componente abre formulário da sacola nova, sem resumo do pedido anterior', () => {
  vi.stubGlobal('sessionStorage', session());
  const html = renderCheckout(tokenB);
  expect(html).toContain('Seus dados');
  expect(html).toContain('Resumo da sacola');
  expect(html).not.toContain('pedido-antigo');
});
it('componente retoma acompanhamento da mesma sacola sem pedir dados novamente', () => {
  vi.stubGlobal('sessionStorage', session());
  const html = renderCheckout(tokenA);
  expect(html).toContain('pedido-antigo');
  expect(html).not.toContain('Seus dados');
});
it('componente começa sem pedido depois de encerrar acompanhamento', () => {
  const s=session();
  limparAcompanhamento(s,storage({[chaveCarrinho]:tokenA}),slug,pedido,tokenA);
  vi.stubGlobal('sessionStorage',s);
  expect(renderCheckout(tokenB)).toContain('Seus dados');
});
