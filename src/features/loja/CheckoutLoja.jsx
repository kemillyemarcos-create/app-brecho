import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import './styles/loja-publica.css';

export default function CheckoutLoja({ empresaSlug, tokenCarrinho, onFechar, resumoSacola, subtotal, formatarPreco, obterUrlFoto }) {
  const chave = `loja:pedido:${empresaSlug}`;
  const [pedido, setPedido] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(chave) || 'null'); } catch { return null; }
  });
  const [estado, setEstado] = useState(null);
  const [url, setUrl] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [atualizacao, setAtualizacao] = useState(0);

  useEffect(() => {
    if (!pedido?.pedidoToken) return;
    let ativo = true;
    let timer;
    let tentativas = 0;
    async function consultar() {
      const { data, error } = await supabase.functions.invoke('loja-checkout', {
        body: { operacao: 'consultar', empresaSlug, pedidoToken: pedido.pedidoToken },
      });
      if (!ativo) return;
      if (error || data?.erro) setErro('Não foi possível atualizar o pedido. Tente consultar novamente.');
      else { setEstado(data); setErro(''); }
      if (++tentativas < 60 && (!data || data.status === 'pendente_pagamento')) {
        timer = setTimeout(consultar, 10000);
      }
    }
    consultar();
    return () => { ativo = false; clearTimeout(timer); };
  }, [pedido, empresaSlug, atualizacao]);

  async function iniciar(event) {
    event.preventDefault();
    if (ocupado) return;
    setOcupado(true); setErro('');
    try {
      let atual = pedido;
      if (!atual) {
        const campos = new FormData(event.currentTarget);
        const { data, error } = await supabase.functions.invoke('loja-checkout', {
          body: { empresaSlug, token: tokenCarrinho, nome: campos.get('nome'), cpf: campos.get('cpf'), telefone: campos.get('telefone') },
        });
        if (error || data?.erro) throw new Error(data?.erro || 'Não foi possível criar o pedido. Verifique os dados e a reserva.');
        if (!data?.pedidoToken) throw new Error('Resposta do pedido inválida.');
        atual = { pedidoToken: data.pedidoToken, pedidoId: data.pedidoId, total: data.total };
        // Persistir antes de abrir o pagamento permite retomar após navegação.
        sessionStorage.setItem(chave, JSON.stringify(atual));
        setPedido(atual);
      }
      const { data, error } = await supabase.functions.invoke('mercado-pago-criar-checkout', {
        body: { pedidoToken: atual.pedidoToken },
      });
      if (error || data?.erro) throw new Error('Não foi possível abrir o pagamento. Seu pedido foi preservado para tentar novamente.');
      const destino = new URL(data.checkoutUrl);
      if (destino.protocol !== 'https:' || !(destino.hostname === 'mercadopago.com.br' || destino.hostname.endsWith('.mercadopago.com.br'))) {
        throw new Error('Endereço de pagamento inesperado.');
      }
      setUrl(destino.href);
    } catch (error) { setErro(error.message || 'Não foi possível iniciar o pagamento.'); }
    finally { setOcupado(false); }
  }

  function encerrar() {
    sessionStorage.removeItem(chave);
    localStorage.removeItem(`loja:carrinho:${empresaSlug}`);
    window.location.reload();
  }
  const encerrado = estado && estado.status !== 'pendente_pagamento';
  return <section className="kc-store kc-store-checkout" aria-label="Finalizar compra">
    <header className="kc-store-checkout-header kc-store-container"><button type="button" className="kc-store-text-button" onClick={onFechar}><ArrowLeft size={18} aria-hidden="true" />Voltar à loja</button><div className="kc-store-wordmark"><span className="kc-store-name">K.CHIC</span><span className="kc-store-outlet">OUTLET</span></div><span className="kc-store-assurance"><ShieldCheck size={18} aria-hidden="true" />Compra segura</span></header>
    <div className="kc-store-container kc-store-checkout-grid">
      <div><p className="kc-store-eyebrow">SEUS ACHADOS, QUASE SEUS</p><h1>Finalizar compra</h1>
        {estado && <p className="kc-store-checkout-status" role="status">{estado.status === 'pago' ? 'Pagamento confirmado. A loja recebeu seu pedido.' : estado.pagamento_status === 'paid' ? 'Pagamento recebido após o prazo. Entre em contato com a loja antes de retirar.' : estado.status === 'expirado' ? 'Prazo do pedido encerrado. Se você já pagou, consulte a loja antes de pagar novamente.' : 'Aguardando confirmação oficial do pagamento.'}</p>}
        {!encerrado && <form onSubmit={iniciar} className="kc-store-checkout-form">
          {!pedido && <><h2>Seus dados</h2><label>Nome completo<input name="nome" required maxLength={160} autoComplete="name" /></label><label>CPF<input name="cpf" required inputMode="numeric" maxLength={14} pattern="[0-9.\-]{11,14}" /></label><label>Telefone com DDD<input name="telefone" required type="tel" maxLength={30} autoComplete="tel" /></label></>}
          <button className="kc-store-primary" disabled={ocupado || (!pedido && !tokenCarrinho)}>{ocupado ? 'Preparando pagamento…' : 'Preparar pagamento seguro'}</button>
        </form>}
        {url && !encerrado && <div className="kc-store-checkout-status"><a className="kc-store-primary" href={url} target="_blank" rel="noopener noreferrer">Abrir Mercado Pago para pagar</a><p>Após pagar, volte a esta página para acompanhar a confirmação.</p></div>}
        {pedido && <button type="button" className="kc-store-text-button" onClick={() => setAtualizacao(v => v + 1)}>Consultar confirmação</button>}
        {encerrado && <button type="button" className="kc-store-text-button" onClick={encerrar}>Encerrar acompanhamento e voltar à loja</button>}
        {erro && <p className="kc-store-error" role="alert">{erro}</p>}
      </div>
      <aside className="kc-store-checkout-summary"><h2>Resumo {pedido ? 'do pedido' : 'da sacola'}</h2>
        {pedido ? <><p className="kc-store-order-id">Pedido {pedido.pedidoId}</p><div className="kc-store-cart-total"><span>Total</span><strong>{Number(pedido.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div></> : <>
          {resumoSacola?.itens.map(item => <article className="kc-store-summary-item" key={item.publicacaoId}>{item.fotoPrincipal && <img src={obterUrlFoto(item.fotoPrincipal)} alt={item.nome} loading="lazy" />}<div><p className="kc-store-eyebrow">{item.marca}</p><h3>{item.nome}</h3><p>{item.tamanho ? `Tam. ${item.tamanho}` : ''}</p><strong>{formatarPreco(item.preco)}</strong></div></article>)}
          {resumoSacola?.itens.length > 0 ? <div className="kc-store-cart-total"><span>Subtotal</span><strong>{formatarPreco(subtotal)}</strong></div> : <p className="kc-store-muted">Sua sacola está vazia. Selecione uma peça na loja para iniciar uma compra.</p>}
        </>}
        <p className="kc-store-delivery">Entrega: retirada combinada com a loja. Frete: R$ 0,00.</p>
        <p className="kc-store-assurance"><ShieldCheck size={18} aria-hidden="true" />Pagamento processado pelo Mercado Pago.</p>
      </aside>
    </div>
  </section>;
}
