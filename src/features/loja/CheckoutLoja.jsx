import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function CheckoutLoja({ empresaSlug, tokenCarrinho, onFechar }) {
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
  return <section role="dialog" aria-modal="true" aria-label="Finalizar compra" style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#fff', padding: 24, overflowY: 'auto' }}>
    <div style={{ maxWidth: 480, margin: 'auto' }}>
      <button type="button" onClick={onFechar}>Voltar à loja</button>
      <h2>Finalizar compra</h2>
      <p>Entrega: retirada combinada com a loja. Frete: R$ 0,00.</p>
      {pedido && <p>Pedido {pedido.pedidoId}<br />Total: {Number(pedido.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
      {estado && <p role="status">{estado.status === 'pago' ? 'Pagamento confirmado. A loja recebeu seu pedido.' : estado.pagamento_status === 'paid' ? 'Pagamento recebido após o prazo. Entre em contato com a loja antes de retirar.' : estado.status === 'expirado' ? 'Prazo do pedido encerrado. Se você já pagou, consulte a loja antes de pagar novamente.' : 'Aguardando confirmação oficial do pagamento.'}</p>}
      {!encerrado && <form onSubmit={iniciar} style={{ display: 'grid', gap: 12 }}>
        {!pedido && <>
          <label>Nome completo<input name="nome" required maxLength={160} autoComplete="name" style={{ display: 'block', width: '100%' }} /></label>
          <label>CPF<input name="cpf" required inputMode="numeric" maxLength={14} pattern="[0-9.\-]{11,14}" style={{ display: 'block', width: '100%' }} /></label>
          <label>Telefone com DDD<input name="telefone" required type="tel" maxLength={30} autoComplete="tel" style={{ display: 'block', width: '100%' }} /></label>
        </>}
        <button disabled={ocupado || (!pedido && !tokenCarrinho)}>{ocupado ? 'Preparando pagamento…' : 'Preparar pagamento seguro'}</button>
      </form>}
      {url && !encerrado && <p><a href={url} target="_blank" rel="noopener noreferrer">Abrir Mercado Pago para pagar</a><br />Após pagar, volte a esta página para acompanhar a confirmação.</p>}
      {pedido && <button type="button" onClick={() => setAtualizacao(v => v + 1)}>Consultar confirmação</button>}
      {encerrado && <button type="button" onClick={encerrar}>Encerrar acompanhamento e voltar à loja</button>}
      {erro && <p role="alert">{erro}</p>}
    </div>
  </section>;
}
