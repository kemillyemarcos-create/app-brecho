import { ArrowUpRight } from "lucide-react";
export default function StoreHero({ produtos, obterUrlFoto, campaignImage, campaignAlt = "Campanha K.Chic" }) {
  const fotos = produtos.filter(produto => produto.foto_principal).slice(0, 2);
  return <section className="kc-store-hero" aria-labelledby="kc-hero-title">
    <div className="kc-store-hero-copy">
      <p className="kc-store-eyebrow">K.CHIC OUTLET / UMA NOVA FORMA DE GARIMPAR</p>
      <h1 id="kc-hero-title">MODA DE MARCA<br /><em>COM PREÇO<br />DE ACHADO</em></h1>
      <p>Peças únicas, selecionadas uma a uma.</p>
      <a className="kc-store-primary" href="#nosso-garimpo">GARIMPAR AGORA <ArrowUpRight size={18} aria-hidden="true" /></a>
      <span className="kc-store-hero-note">Um encontro entre estilo e oportunidade.</span>
    </div>
    <div className={`kc-store-hero-visual${campaignImage ? " kc-store-hero-campaign" : ""}`}>
      {campaignImage ? <img src={campaignImage} alt={campaignAlt} fetchPriority="high" /> : fotos.length ? fotos.map((produto, index) =>
        <figure key={produto.publicacao_id}><img src={obterUrlFoto(produto.foto_principal)} alt={produto.nome} fetchPriority={index === 0 ? "high" : "auto"} /><figcaption>{produto.marca || "SELEÇÃO K.CHIC"}<span>0{index + 1}</span></figcaption></figure>
      ) : <div className="kc-store-hero-monogram" aria-hidden="true">
          <span className="kc-store-hero-monogram-mark">K.</span>
          <span className="kc-store-hero-monogram-label">CURADORIA & ESTILO</span>
          <span className="kc-store-hero-monogram-line"></span>
          <span className="kc-store-hero-monogram-caption">PEÇAS ÚNICAS · MARCAS QUE VOCÊ AMA</span>
        </div>}
    </div>
  </section>;
}
