import { ShieldCheck, LoaderCircle } from 'lucide-react';

export default function CheckoutPagamento({ fase, indisponivel, onAbrir, onRetomar }) {
  if (fase === 'aguardando') return <div className="kc-store-payment" role="status">
    <h2>Aguardando confirmação do pagamento.</h2>
    <p>Assim que o Mercado Pago confirmar, atualizaremos seu pedido automaticamente.</p>
    <button type="button" className="kc-store-text-button" onClick={onRetomar}>Não concluiu o pagamento? Tentar novamente</button>
  </div>;
  if (fase === 'fallback') return <div className="kc-store-payment">
    <h2>Pagamento pronto</h2>
    <p>Seu pedido está reservado. Abra o Mercado Pago para concluir o pagamento.</p>
    <button type="button" className="kc-store-primary kc-store-payment-cta" onClick={onAbrir}><ShieldCheck size={18} aria-hidden="true" />Abrir Mercado Pago</button>
    <p className="kc-store-payment-note">Após o pagamento, volte a esta página para acompanhar a confirmação.</p>
  </div>;
  const abrindo = fase === 'abrindo';
  return <div className="kc-store-payment" aria-busy={abrindo}>
    <button type="submit" className="kc-store-primary kc-store-payment-cta" disabled={abrindo || indisponivel}>
      {abrindo ? <LoaderCircle className="kc-store-payment-spinner" size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
      {abrindo ? 'Abrindo ambiente seguro do Mercado Pago...' : 'Ir para pagamento seguro'}
    </button>
    <p className="kc-store-payment-note" role="status">{abrindo ? 'Seu pedido está reservado por tempo limitado.' : 'Você será redirecionada ao Mercado Pago para concluir o pagamento.'}</p>
  </div>;
}
