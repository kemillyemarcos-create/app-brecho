import { ImageOff, Check } from "lucide-react";
export default function ProductCard({ produto, fotoUrl, preco, estaNaSacola, onAbrir }) {
  return <article className="kc-store-product-card">
    <button type="button" className="kc-store-product-link" onClick={() => onAbrir(produto)} aria-label={`Ver ${produto.nome}`}>
      <div className="kc-store-product-image">
        {fotoUrl ? <img src={fotoUrl} alt={produto.nome} loading="lazy" decoding="async" /> : <span className="kc-store-image-empty"><ImageOff aria-hidden="true" />Imagem indisponível</span>}
        {produto.condicao && <span className="kc-store-condition">{produto.condicao.replaceAll("_", " ")}</span>}
      </div>
      <div className="kc-store-product-caption"><p className="kc-store-eyebrow">{produto.marca || "SELEÇÃO K.CHIC"}</p><h3>{produto.nome}</h3>
        <p className="kc-store-muted">{[produto.tamanho && `Tam. ${produto.tamanho}`, produto.condicao?.replaceAll("_", " ")].filter(Boolean).join(" · ")}</p>
        <p className="kc-store-price">{preco}</p>
        {estaNaSacola && <span className="kc-store-in-bag"><Check size={13} aria-hidden="true" />Na sacola</span>}
      </div>
    </button>
  </article>;
}
