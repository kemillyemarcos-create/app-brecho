import { createElement } from "react";
import { Gem, ShieldCheck, Sparkles } from "lucide-react";
export default function StoreBenefits() {
  return <section className="kc-store-benefits" aria-label="Por que escolher K.Chic"><div className="kc-store-container">
    {[[Gem, "PEÇAS ÚNICAS", "Cada achado é selecionado individualmente."], [ShieldCheck, "COMPRA SEGURA", "Pagamento processado com segurança."], [Sparkles, "CURADORIA K.CHIC", "Peças selecionadas com olhar de estilo e oportunidade."]].map(([Icon, title, description]) =>
      <div key={title}>{createElement(Icon, { size: 27, strokeWidth: 1.2, "aria-hidden": true })}<div><h2>{title}</h2><p>{description}</p></div></div>)}
  </div></section>;
}
