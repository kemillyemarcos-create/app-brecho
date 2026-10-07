import ProductCard from "./ProductCard";
export default function ProductGrid({ produtos, obterUrlFoto, formatarPreco, itensSacola, onAbrir, novidades = false }) {
  return <div className={`kc-store-product-grid${novidades ? " kc-store-new-grid" : ""}`}>
    {produtos.map(produto => <ProductCard key={produto.publicacao_id} produto={produto} fotoUrl={obterUrlFoto(produto.foto_principal)} preco={formatarPreco(produto.preco)} estaNaSacola={itensSacola.some(item => item.publicacaoId === produto.publicacao_id)} onAbrir={onAbrir} />)}
  </div>;
}
