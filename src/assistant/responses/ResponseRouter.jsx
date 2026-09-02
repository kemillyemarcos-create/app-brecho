// ResponseRouter.jsx

// Encaminha o resultado para o builder apropriado.

// Nesta primeira sprint, apenas estoque usa a nova camada.

import StockResponseBuilder from "./builders/StockResponseBuilder";

function build(
  resultado = {},
  definicao = {},
  formatacao = {}
) {
  const dominio =
    resultado?.dominio ||
    resultado?.dados?.dominio ||
    definicao?.dominio ||
    null;

  const operacao =
    resultado?.tipo ||
    resultado?.dados?.operacao ||
    definicao?.operacao ||
    null;

  const ehEstoque =
    dominio === "estoque" ||
    [
      "quantidade_estoque",
      "quantidade_estoque_por_marca",
      "quantidade_estoque_por_categoria",
      "listar_pecas",
      "listar_pecas_estoque",
      "listar_marcas",
      "listar_marcas_estoque",
      "listar_categorias",
      "listar_categorias_estoque",
    ].includes(operacao);

  if (ehEstoque) {
    return StockResponseBuilder.build(
      resultado,
      definicao,
      formatacao
    );
  }

  /*
   * Mantém o fluxo antigo para os outros domínios.
   */
  return null;
}

const ResponseRouter = {
  build,
};

export {
  build,
};

export default ResponseRouter;