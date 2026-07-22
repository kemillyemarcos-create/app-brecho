// InventoryConversationEngine.jsx
//
// Analisa resultados de estoque e encontra alternativas
// próximas quando uma combinação de filtros não retorna peças.
//
// Responsabilidades:
// - não consulta banco;
// - não formata respostas;
// - não altera contexto;
// - trabalha apenas com peças já carregadas.

import inventorySemanticAnalyzer from "../analytics/InventorySemanticAnalyzer";

/*
 * Ordem de flexibilização.
 *
 * Filtros mais específicos são removidos primeiro.
 * A marca permanece por último por normalmente
 * representar a principal intenção do usuário.
 */
const ORDEM_FLEXIBILIZACAO = [
  "material",
  "cor",
  "genero",
  "tamanho",
  "categoria",
  "marca",
];

const CAMPOS_PLURAIS = {
  marca: "marcas",
  categoria: "categorias",
  cor: "cores",
  tamanho: "tamanhos",
  material: "materiais",
  genero: "generos",
};

function copiarFiltros(filtros = {}) {
  if (!filtros || typeof filtros !== "object") {
    return {};
  }

  return Object.entries(filtros).reduce(
    (resultado, [chave, valor]) => {
      resultado[chave] = Array.isArray(valor)
        ? [...valor]
        : valor;

      return resultado;
    },
    {}
  );
}

function filtroPossuiValor(valor) {
  if (Array.isArray(valor)) {
    return valor.length > 0;
  }

  return (
    valor !== null &&
    valor !== undefined &&
    String(valor).trim() !== ""
  );
}

function obterValorFiltro(filtros = {}, campo) {
  const plural = CAMPOS_PLURAIS[campo];

  if (filtroPossuiValor(filtros[campo])) {
    return filtros[campo];
  }

  if (plural && filtroPossuiValor(filtros[plural])) {
    return filtros[plural];
  }

  return null;
}

function filtrosPossuemCampo(filtros = {}, campo) {
  return filtroPossuiValor(
    obterValorFiltro(filtros, campo)
  );
}

function removerCampoFiltro(filtros = {}, campo) {
  const resultado = copiarFiltros(filtros);
  const plural = CAMPOS_PLURAIS[campo];

  delete resultado[campo];

  if (plural) {
    delete resultado[plural];
  }

  return resultado;
}

function filtrarPecas(pecas = [], filtros = {}) {
  const lista = Array.isArray(pecas)
    ? pecas
    : [];

  return lista.filter((peca) =>
    inventorySemanticAnalyzer.pecaCorrespondeAosFiltros(
      peca,
      filtros
    )
  );
}

/*
 * Procura a alternativa mais próxima removendo
 * apenas um filtro por tentativa.
 */
export function encontrarAlternativaMaisProxima({
  pecas = [],
  filtros = {},
  ordem = ORDEM_FLEXIBILIZACAO,
} = {}) {
  const filtrosOriginais = copiarFiltros(filtros);

  for (const campo of ordem) {
    if (!filtrosPossuemCampo(filtrosOriginais, campo)) {
      continue;
    }

    const filtrosAlternativos = removerCampoFiltro(
      filtrosOriginais,
      campo
    );

    const pecasAlternativas = filtrarPecas(
      pecas,
      filtrosAlternativos
    );

    if (pecasAlternativas.length === 0) {
      continue;
    }

    return {
      encontrada: true,
      quantidade: pecasAlternativas.length,
      filtros: filtrosAlternativos,
      pecas: pecasAlternativas,
    };
  }

  return {
    encontrada: false,
    quantidade: 0,
    filtros: {},
    pecas: [],
  };
}

/*
 * Analisa o resultado da busca.
 *
 * O retorno é totalmente estruturado para ser
 * consumido posteriormente pelo ResultProcessor
 * e pelo StockResponseBuilder.
 */
export function analisarResultadoEstoque({
  pecas = [],
  filtros = {},
  pecasEncontradas = null,
} = {}) {
  const resultadoFiltrado = Array.isArray(pecasEncontradas)
    ? pecasEncontradas
    : filtrarPecas(pecas, filtros);

  const quantidade = resultadoFiltrado.length;

  if (quantidade > 0) {
    return {
      encontrou: true,
      quantidade,
      filtros: copiarFiltros(filtros),
      pecas: resultadoFiltrado,
      alternativaMaisProxima: null,
    };
  }

  const alternativaMaisProxima =
    encontrarAlternativaMaisProxima({
      pecas,
      filtros,
    });

  return {
    encontrou: false,
    quantidade: 0,
    filtros: copiarFiltros(filtros),
    pecas: [],
    alternativaMaisProxima:
      alternativaMaisProxima.encontrada
        ? alternativaMaisProxima
        : null,
  };
}

class InventoryConversationEngine {
  analisar(dados = {}) {
    return analisarResultadoEstoque(dados);
  }

  encontrarAlternativa(dados = {}) {
    return encontrarAlternativaMaisProxima(dados);
  }
}

const inventoryConversationEngine =
  new InventoryConversationEngine();

export {
  ORDEM_FLEXIBILIZACAO,
  InventoryConversationEngine,
};

export default inventoryConversationEngine;
