export default function StoreFooter({ onAcompanharPedido }) {
  return <footer className="kc-store-footer"><div className="kc-store-container kc-store-footer-grid">
    <div><p className="kc-store-name">K.CHIC</p><p className="kc-store-outlet">OUTLET</p><p>Peças únicas. Novas possibilidades.</p></div>
    <div><h2>ATENDIMENTO</h2><button type="button" className="kc-store-text-button" onClick={onAcompanharPedido}>Acompanhar pedido</button></div>
    <div><h2>INFORMAÇÕES</h2><a href="#sobre-kchic">Sobre a K.Chic</a><a href="#nosso-garimpo">Nosso garimpo</a></div>
  </div><div className="kc-store-container kc-store-copyright">© {new Date().getFullYear()} K.Chic Outlet. Todos os direitos reservados.</div></footer>;
}
