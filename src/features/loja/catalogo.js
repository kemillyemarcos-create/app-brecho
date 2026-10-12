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

// Uma instância por consulta. Invalidação impede commits de páginas antigas.
export function criarConsultaCatalogo(rpc, criterios, atual) {
  let offset = 0;
  let ocupado = false;
  let ativo = true;
  return {
    cancelar() { ativo = false; },
    vigente() { return ativo && atual(); },
    async carregar() {
      if (!ativo || !atual() || ocupado) return null;
      ocupado = true;
      try {
        const { data, error } = await rpc('loja_catalogo_publico_por_slug_v2', {
          ...criterios, p_limite: TAMANHO_PAGINA_CATALOGO, p_offset: offset,
        });
        if (!ativo || !atual()) return null;
        if (error) throw error;
        if (!Array.isArray(data?.produtos) || typeof data?.tem_mais !== 'boolean' ||
            !['categorias', 'marcas', 'tamanhos'].every(k => Array.isArray(data?.opcoes?.[k]))) {
          throw new Error('Resposta inválida do catálogo.');
        }
        offset += data.produtos.length;
        return data;
      } catch (error) {
        if (!ativo || !atual()) return null;
        throw error;
      } finally { ocupado = false; }
    },
  };
}
