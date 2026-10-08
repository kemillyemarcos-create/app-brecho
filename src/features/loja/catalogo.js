export const TAMANHO_PAGINA_CATALOGO = 24;

export function mesclarProdutosCatalogo(atuais, novos) {
  const resultado = [];
  const ids = new Set();

  for (const produto of [
    ...(Array.isArray(atuais) ? atuais : []),
    ...(Array.isArray(novos) ? novos : []),
  ]) {
    const id = produto?.publicacao_id;

    if (!id || ids.has(id)) {
      continue;
    }

    ids.add(id);
    resultado.push(produto);
  }

  return resultado;
}

export function catalogoTemMais(
  quantidadeRecebida,
  tamanhoPagina = TAMANHO_PAGINA_CATALOGO,
) {
  return quantidadeRecebida === tamanhoPagina;
}
