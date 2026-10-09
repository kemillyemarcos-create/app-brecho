import { useEffect, useRef } from "react";
import { ArrowLeft, ImageOff, ShieldCheck } from "lucide-react";

export default function ProductDetail({ produto, fotoDetalhe, fotoSelecionada, obterUrlFoto,
  onFotoChange, onVoltar, preco, children }) {
  const title = useRef(null);
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [produto.publicacao_id]);
  return <main className="kc-store-container kc-store-detail">
    <div className="kc-store-breadcrumb"><button type="button" className="kc-store-text-button" onClick={onVoltar}><ArrowLeft size={16} aria-hidden="true" />Voltar ao garimpo</button><span>{produto.categoria || "Peças"} / {produto.nome}</span></div>
    <div className="kc-store-detail-grid">
      <div className="kc-store-gallery">
        <div className="kc-store-detail-image">{fotoDetalhe ? <img src={fotoDetalhe} alt={produto.nome} fetchPriority="high" /> : <span className="kc-store-image-empty"><ImageOff aria-hidden="true" />Imagem indisponível</span>}</div>
        {(produto.fotos || []).length > 0 && <div className="kc-store-thumbnails" aria-label="Fotos da peça">
          {produto.fotos.map((foto, index) => <button key={foto.storage_path} type="button" onClick={() => onFotoChange(foto.storage_path)} aria-label={`Ver foto ${index + 1} de ${produto.nome}`} aria-pressed={(fotoSelecionada || produto.foto_principal) === foto.storage_path}>
            <img src={obterUrlFoto(foto.storage_path)} alt={`Vista ${index + 1} de ${produto.nome}`} loading="lazy" />
          </button>)}
        </div>}
      </div>
      <section className="kc-store-detail-info">
        <p className="kc-store-eyebrow">PEÇA ÚNICA</p><p className="kc-store-detail-brand">{produto.marca}</p>
        <h1 tabIndex={-1} ref={title}>{produto.nome}</h1><p className="kc-store-detail-price">{preco}</p>
        <div className="kc-store-attributes">{produto.tamanho && <span>Tamanho <strong>{produto.tamanho}</strong></span>}{produto.condicao && <span>Condição <strong>{produto.condicao.replaceAll("_", " ")}</strong></span>}</div>
        {children}
        <p className="kc-store-assurance"><ShieldCheck size={16} aria-hidden="true" />Pagamento seguro pelo Mercado Pago</p>
        {produto.descricao && <div className="kc-store-detail-copy"><h2>Descrição</h2><p>{produto.descricao}</p></div>}
        {produto.obs && <div className="kc-store-detail-copy"><h2>Detalhes da peça</h2><p>{produto.obs}</p></div>}
      </section>
    </div>
  </main>;
}
