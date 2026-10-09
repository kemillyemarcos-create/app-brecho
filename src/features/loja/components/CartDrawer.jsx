import { useEffect, useRef } from "react";
import { X, ShoppingBag, ImageOff, ArrowRight } from "lucide-react";

export default function CartDrawer({ sacola, carregando, erro, total, obterUrlFoto,
  formatarPreco, formatarTempo, onRemover, onFechar, onCheckout }) {
  const panel = useRef(null);
  const closeButton = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  function keyDown(event) {
    if (event.key === "Escape") onFechar();
    if (event.key !== "Tab") return;
    const controls = [...panel.current.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]')];
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  return <div className="kc-store-cart-overlay" onClick={event => { if (event.target === event.currentTarget) onFechar(); }}>
    <aside ref={panel} className="kc-store-cart" role="dialog" aria-modal="true" aria-labelledby="kc-cart-title" onKeyDown={keyDown}>
      <header><div><p className="kc-store-eyebrow">SEUS ACHADOS</p><h2 id="kc-cart-title">Sua sacola <span>({sacola.quantidadeItens})</span></h2></div><button ref={closeButton} className="kc-store-action" type="button" aria-label="Fechar sacola" onClick={onFechar}><X size={22} aria-hidden="true" /></button></header>
      <div className="kc-store-cart-content">
        {sacola.itens.length === 0 ? <div className="kc-store-empty"><ShoppingBag size={40} strokeWidth={1} aria-hidden="true" /><h3>Sua sacola está vazia</h3><p>Escolha uma peça para reservar por alguns minutos.</p><button className="kc-store-primary" type="button" onClick={onFechar}>CONTINUAR GARIMPANDO</button></div> : sacola.itens.map(item => {
          const fotoUrl = obterUrlFoto(item.fotoPrincipal);
          return <article className="kc-store-cart-item" key={item.publicacaoId}>
            <div className="kc-store-cart-photo">{fotoUrl ? <img src={fotoUrl} alt={item.nome} loading="lazy" /> : <ImageOff aria-label="Imagem indisponível" />}</div>
            <div><p className="kc-store-eyebrow">{item.marca || "K.Chic"}</p><h3>{item.nome}</h3><p className="kc-store-muted">{item.tamanho ? `Tam. ${item.tamanho}` : ""}</p><strong>{formatarPreco(item.preco)}</strong>
              <div className="kc-store-cart-item-actions"><span>Reserva · {formatarTempo(item.segundosRestantes)}</span><button type="button" className="kc-store-text-button" aria-label={`Remover ${item.nome}`} onClick={() => onRemover(item.publicacaoId)} disabled={carregando}>Remover</button></div>
            </div>
          </article>;
        })}
        {erro && <p role="alert" className="kc-store-error">{erro}</p>}
      </div>
      <footer>{sacola.itens.length > 0 && <><div className="kc-store-cart-total"><span>Subtotal</span><strong>{formatarPreco(total)}</strong></div><button className="kc-store-primary" type="button" disabled={carregando || sacola.itens.length === 0} onClick={onCheckout}>FINALIZAR COMPRA <ArrowRight size={17} aria-hidden="true" /></button><p className="kc-store-muted">Pagamento seguro pelo Mercado Pago. Retirada combinada com a loja.</p></>}
        <button type="button" className="kc-store-text-button" onClick={onCheckout}>Acompanhar meu pedido</button>
      </footer>
    </aside>
  </div>;
}
