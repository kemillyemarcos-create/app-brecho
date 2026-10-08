import { useId, useRef, useState } from "react";
import { PackageSearch, Search, ShoppingBag, X } from "lucide-react";

export default function StoreHeader({ busca, onBuscaChange, categorias, categoriaAtiva,
  onCategoriaChange, quantidadeSacola, onAbrirSacola, onAcompanharPedido, onHome }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchId = useId();
  const searchButton = useRef(null);
  function closeSearch() {
    setSearchOpen(false);
    searchButton.current?.focus();
  }
  return <>
    <div className="kc-store-promo">Marcas que você ama, por menos<span> • Peças únicas, garimpadas para você</span></div>
    <header className="kc-store-header">
      <div className="kc-store-header-main kc-store-container">
        <button ref={searchButton} className="kc-store-action kc-store-search-toggle" type="button"
          aria-label="Buscar peças" aria-expanded={searchOpen} aria-controls={searchId}
          onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)}>
          <Search size={21} strokeWidth={1.4} aria-hidden="true" /><span>Buscar{busca ? ` · ${busca}` : ""}</span>
        </button>
        <button type="button" className="kc-store-wordmark" onClick={onHome} aria-label="K.Chic Outlet — início">
          <span className="kc-store-name">K.CHIC</span><span className="kc-store-outlet">OUTLET</span>
        </button>
        <div className="kc-store-actions">
          <button className="kc-store-action" type="button" aria-label="Acompanhar pedido" title="Acompanhar pedido" onClick={onAcompanharPedido}>
            <PackageSearch size={21} strokeWidth={1.4} aria-hidden="true" /><span>Pedido</span>
          </button>
          <button className="kc-store-action kc-store-bag" type="button"
            aria-label={`Sacola com ${quantidadeSacola} ${quantidadeSacola === 1 ? "item" : "itens"}`} onClick={onAbrirSacola}>
            <ShoppingBag size={21} strokeWidth={1.4} aria-hidden="true" /><span>Sacola</span>
            {quantidadeSacola > 0 && <span className="kc-store-badge" aria-hidden="true">{quantidadeSacola > 99 ? "99+" : quantidadeSacola}</span>}
          </button>
        </div>
      </div>
      {searchOpen && <form id={searchId} role="search" className="kc-store-search kc-store-container"
        onSubmit={event => { event.preventDefault(); closeSearch(); document.getElementById("nosso-garimpo")?.scrollIntoView(); }}
        onKeyDown={event => { if (event.key === "Escape") closeSearch(); }}>
        <Search size={20} aria-hidden="true" />
        <input autoFocus type="search" aria-label="Buscar peças, marcas e categorias" placeholder="Buscar peças, marcas e categorias" value={busca} onChange={onBuscaChange} />
        <button type="submit" className="kc-store-text-button">Buscar</button>
        <button type="button" className="kc-store-action" aria-label="Fechar busca" onClick={closeSearch}><X size={20} aria-hidden="true" /></button>
      </form>}
      <nav className="kc-store-categories" aria-label="Categorias de peças"><div className="kc-store-categories-inner kc-store-container">
        <button className="kc-store-category" type="button" aria-pressed={categoriaAtiva === ""} onClick={() => onCategoriaChange("")}>Todos</button>
        {categorias.map(categoria => <button className="kc-store-category" key={categoria} type="button" aria-pressed={categoriaAtiva === categoria} onClick={() => onCategoriaChange(categoria)}>{categoria}</button>)}
      </div></nav>
    </header>
  </>;
}
