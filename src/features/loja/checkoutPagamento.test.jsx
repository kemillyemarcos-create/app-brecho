import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CheckoutPagamento from './CheckoutPagamento';
import CheckoutLoja from './CheckoutLoja';
import { redirecionarPagamento } from './checkoutNavegacao';
vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }));

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const render = fase => renderToStaticMarkup(<CheckoutPagamento fase={fase} />);
const principais = html => (html.match(/class="kc-store-primary /g) || []).length;
it('CTA inicial único e sem mensagem antecipada de confirmação', () => {
  const html = render('inicial');
  expect(principais(html)).toBe(1);
  expect(html).toContain('Ir para pagamento seguro');
  expect(html).not.toContain('Abrir Mercado Pago');
  expect(html).not.toContain('Aguardando confirmação');
});
it('loading desabilita o único botão, sem oferecer fallback antecipado', () => {
  const html = render('abrindo');
  expect(principais(html)).toBe(1);
  expect(html).toContain('disabled=""');
  expect(html).toContain('Abrindo ambiente seguro do Mercado Pago...');
  expect(html).not.toContain('Ir para pagamento seguro');
  expect(html).not.toContain('Abrir Mercado Pago</button>');
});
it('fallback substitui o CTA inicial e explica como voltar', () => {
  const html = render('fallback');
  expect(principais(html)).toBe(1);
  expect(html).toContain('Pagamento pronto');
  expect(html).toContain('Abrir Mercado Pago');
  expect(html).not.toContain('Ir para pagamento seguro');
  expect(html).toContain('volte a esta página');
});
it('retorno mostra acompanhamento e retomada secundária, sem dois CTAs', () => {
  const html = render('aguardando');
  expect(principais(html)).toBe(0);
  expect(html).toContain('Aguardando confirmação do pagamento.');
  expect(html).toContain('Não concluiu o pagamento? Tentar novamente');
});
it('componente completo restaura retorno, mantém consulta e não exibe CTA inicial', () => {
  vi.stubGlobal('sessionStorage', {getItem: () => JSON.stringify({pedidoToken:'a'.repeat(64),pedidoId:'pedido',total:29,pagamentoAberto:true})});
  const html = renderToStaticMarkup(<CheckoutLoja empresaSlug="teste" resumoSacola={{itens:[]}} />);
  expect(html).toContain('Consultar confirmação');
  expect(html).toContain('Aguardando confirmação do pagamento.');
  expect(html).not.toContain('Ir para pagamento seguro');
});
function ambiente() {
  vi.useFakeTimers();
  const listeners = new Map();
  const navegador = {location:{assign:vi.fn()},
    addEventListener:(evento,fn) => listeners.set(evento,fn),
    removeEventListener:evento => listeners.delete(evento)};
  const documento = {visibilityState:'visible'};
  const onSaida=vi.fn(), onRetorno=vi.fn(), onFallback=vi.fn();
  const opcoes={destino:'https://www.mercadopago.com.br/checkout',navegador,documento,onSaida,onRetorno,onFallback};
  return {...opcoes,listeners,iniciar:() => redirecionarPagamento(opcoes)};
}
describe('navegação automática sem popup', () => {
  it('usa mesma aba imediatamente e oferece fallback só após espera visível', () => {
    const a=ambiente(); a.iniciar();
    expect(a.navegador.location.assign).toHaveBeenCalledExactlyOnceWith(a.destino);
    expect(a.onFallback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(7999); expect(a.onFallback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(a.onFallback).toHaveBeenCalledOnce();
  });
  it('saída cancela fallback e retorno pelo histórico inicia acompanhamento', () => {
    const a=ambiente(); a.iniciar(); a.listeners.get('pagehide')();
    expect(a.onSaida).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(16000); expect(a.onFallback).not.toHaveBeenCalled();
    a.listeners.get('pageshow')(); expect(a.onRetorno).toHaveBeenCalledOnce();
    expect(a.listeners.size).toBe(0);
  });
  it('aba oculta não é confundida com falha de navegação', () => {
    const a=ambiente(); a.iniciar(); a.documento.visibilityState='hidden';
    vi.advanceTimersByTime(16000); expect(a.onFallback).not.toHaveBeenCalled();
    a.documento.visibilityState='visible'; vi.advanceTimersByTime(8000);
    expect(a.onFallback).toHaveBeenCalledOnce();
  });
  it('exceção de navegação oferece fallback sem lançar erro técnico', () => {
    const a=ambiente(); a.navegador.location.assign.mockImplementation(() => {throw Error('bloqueado');});
    expect(a.iniciar).not.toThrow(); expect(a.onFallback).toHaveBeenCalledOnce();
    expect(a.listeners.size).toBe(0);
  });
  it('desmontagem cancela timers e callbacks da sessão anterior', () => {
    const a=ambiente(); const limpar=a.iniciar(); limpar();
    vi.advanceTimersByTime(16000); expect(a.onFallback).not.toHaveBeenCalled();
    expect(a.listeners.size).toBe(0);
  });
});
