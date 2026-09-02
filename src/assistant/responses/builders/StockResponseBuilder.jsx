// StockResponseBuilder.jsx

// Converte resultados estruturados de estoque em respostas naturais.

// As variações são determinísticas: a mesma consulta produz a mesma frase.

import {
  ajustarAdjetivo,
  artigoDaMarca,
  categoriaEhFeminina,
  normalizarQuantidade,
  pluralizar,
} from "../ResponseFormatter";

const TIPOS_SUPORTADOS = new Set([
  "quantidade_estoque",
  "quantidade_estoque_por_marca",
  "quantidade_estoque_por_categoria",
  "listar_pecas",
  "listar_pecas_estoque",
  "listar_marcas",
  "listar_marcas_estoque",
  "listar_categorias",
  "listar_categorias_estoque",
]);

function obterTipo(
  resultado = {},
  definicao = {}
) {
  return (
    resultado?.tipo ||
    definicao?.operacao ||
    ""
  );
}

function obterFiltros(
  resultado = {},
  definicao = {}
) {
  return {
    ...(definicao?.filtros || {}),
    ...(resultado?.dados?.filtros || {}),
  };
}

function criarIndiceDeterministico(
  valor = "",
  quantidadeOpcoes = 1
) {
  const texto = String(
    valor || ""
  );

  let total = 0;

  for (
    let index = 0;
    index < texto.length;
    index += 1
  ) {
    total =
      (
        total * 31 +
        texto.charCodeAt(index)
      ) %
      2147483647;
  }

  return quantidadeOpcoes > 0
    ? total % quantidadeOpcoes
    : 0;
}

function escolherVariacao(
  opcoes = [],
  chave = ""
) {
  if (
    !Array.isArray(opcoes) ||
    opcoes.length === 0
  ) {
    return "";
  }

  return opcoes[
    criarIndiceDeterministico(
      chave,
      opcoes.length
    )
  ];
}

function possuiFiltroSecundario(
  filtros = {}
) {
  return Boolean(
    filtros?.categoria ||
      filtros?.cor ||
      filtros?.material ||
      filtros?.genero ||
      filtros?.tamanho ||
      filtros?.nome ||
      filtros?.descricao
  );
}

function montarNucleoProduto(
  filtros = {},
  quantidade = 0
) {
  const plural =
    normalizarQuantidade(
      quantidade
    ) !== 1;

  const categoria =
    String(
      filtros?.categoria || ""
    ).trim();

  const substantivo =
    categoria
      ? pluralizar(
          categoria.toLocaleLowerCase(
            "pt-BR"
          ),
          quantidade
        )
      : plural
        ? "peças"
        : "peça";

  const feminino =
    categoria
      ? categoriaEhFeminina(
          categoria
        )
      : true;

  const adjetivos = [];

  if (filtros?.cor) {
    adjetivos.push(
      ajustarAdjetivo(
        filtros.cor,
        {
          feminino,
          plural,
        }
      )
    );
  }

  if (filtros?.genero) {
    adjetivos.push(
      ajustarAdjetivo(
        filtros.genero,
        {
          feminino,
          plural,
        }
      )
    );
  }

  const partes = [
    substantivo,
    ...adjetivos,
  ];

  if (filtros?.material) {
    partes.push(
      `em ${String(
        filtros.material
      ).toLocaleLowerCase(
        "pt-BR"
      )}`
    );
  }

  if (filtros?.tamanho) {
    partes.push(
      `tamanho ${String(
        filtros.tamanho
      ).toUpperCase()}`
    );
  }

  if (filtros?.marca) {
    partes.push(
      artigoDaMarca(
        filtros.marca
      )
    );
  }

  if (filtros?.nome) {
    partes.push(
      `com "${filtros.nome}"`
    );
  }

  return partes
    .filter(Boolean)
    .join(" ");
}

function montarDescricaoSemMarca(
  filtros = {},
  quantidade = 0
) {
  return montarNucleoProduto(
    {
      ...filtros,
      marca: null,
    },
    quantidade
  );
}

function montarFollowUpPositivo(
  filtros = {}
) {
  if (
    filtros?.marca &&
    possuiFiltroSecundario(
      filtros
    )
  ) {
    return "Posso listar essas peças ou ampliar a busca removendo algum filtro.";
  }

  if (filtros?.marca) {
    return "Posso listar todas elas para você.";
  }

  if (filtros?.categoria) {
    return "Posso listar essas peças ou refinar por marca, cor ou tamanho.";
  }

  if (
    filtros?.cor ||
    filtros?.material ||
    filtros?.genero ||
    filtros?.tamanho
  ) {
    return "Posso listar os resultados ou combinar a busca com marca e categoria.";
  }

  return "Posso detalhar o estoque por marca, categoria, cor ou tamanho.";
}

function montarFollowUpNegativo({
  filtros = {},
  quantidadeMarca = 0,
  alternativaMaisProxima = null,
}) {
  if (
    alternativaMaisProxima?.encontrada &&
    normalizarQuantidade(
      alternativaMaisProxima
        ?.quantidade
    ) > 0
  ) {
    const quantidadeAlternativa =
      normalizarQuantidade(
        alternativaMaisProxima
          .quantidade
      );

    return quantidadeAlternativa ===
      1
      ? "Posso listar essa peça para você ou continuar refinando a busca."
      : "Posso listar essas peças para você ou continuar refinando a busca.";
  }

  if (
    filtros?.marca &&
    quantidadeMarca > 0 &&
    possuiFiltroSecundario(
      filtros
    )
  ) {
    const descricaoAlternativa =
      montarDescricaoSemMarca(
        filtros,
        2
      );

    return `Posso listar as peças ${artigoDaMarca(
      filtros.marca
    )} ou procurar ${descricaoAlternativa} de outras marcas.`;
  }

  if (filtros?.marca) {
    return "Posso verificar outras marcas ou listar as marcas disponíveis.";
  }

  if (
    possuiFiltroSecundario(
      filtros
    )
  ) {
    return "Posso ampliar a busca removendo algum filtro ou mostrar opções semelhantes.";
  }

  return "Posso listar as marcas e categorias que estão disponíveis.";
}

function montarRespostaQuantidade(
  resultado = {},
  definicao = {}
) {
  const dados =
    resultado?.dados || {};

  const filtros =
    obterFiltros(
      resultado,
      definicao
    );

  const quantidade =
    normalizarQuantidade(
      dados?.quantidade
    );

  const descricao =
    montarNucleoProduto(
      filtros,
      quantidade
    );

  const chaveVariacao =
    JSON.stringify({
      filtros,
      quantidade,
      tipo: resultado?.tipo,
    });

  if (quantidade === 0) {
    const quantidadeMarca =
      normalizarQuantidade(
        dados?.quantidadeMarca
      );

    const alternativaMaisProxima =
      dados?.alternativaMaisProxima ||
      null;

    const abertura =
      escolherVariacao(
        [
          `Não encontrei ${descricao} no estoque.`,
          `Neste momento, não temos ${descricao} no estoque.`,
          `Essa combinação não está disponível: ${descricao}.`,
        ],
        chaveVariacao
      );

    const linhas = [
      "📦 Estoque",
      "",
      abertura,
    ];

    /*
     * Prioridade 1:
     * Existe uma alternativa mais próxima.
     */
    if (
      alternativaMaisProxima
        ?.encontrada
    ) {
      const quantidadeAlternativa =
        normalizarQuantidade(
          alternativaMaisProxima
            .quantidade
        );

      const descricaoAlternativa =
        montarNucleoProduto(
          alternativaMaisProxima
            ?.filtros || {},
          quantidadeAlternativa
        );

      linhas.push(
        "",
        `Mas encontrei ${quantidadeAlternativa} ${descricaoAlternativa}.`
      );
    }

    /*
     * Prioridade 2:
     * Não existe alternativa,
     * mas existem peças da marca.
     */
    else if (
      filtros?.marca &&
      quantidadeMarca > 0
    ) {
      linhas.push(
        "",
        `Mas temos ${quantidadeMarca} ${
          quantidadeMarca === 1
            ? "peça"
            : "peças"
        } ${artigoDaMarca(
          filtros.marca
        )} no estoque.`
      );
    }

    linhas.push(
      "",
      montarFollowUpNegativo({
        filtros,
        quantidadeMarca,
        alternativaMaisProxima,
      })
    );

    return linhas.join("\n");
  }

  const disponibilidade =
    quantidade === 1
      ? "disponível"
      : "disponíveis";

  const frase =
    escolherVariacao(
      [
        `Sim! Temos ${quantidade} ${descricao} no estoque.`,
        `Encontrei ${quantidade} ${descricao} ${disponibilidade}.`,
        `Atualmente, temos ${quantidade} ${descricao} no estoque.`,
      ],
      chaveVariacao
    );

  return [
    "📦 Estoque",
    "",
    frase,
    "",
    montarFollowUpPositivo(
      filtros
    ),
  ].join("\n");
}

function obterNomePeca(
  peca = {}
) {
  return (
    peca?.nome ||
    peca?.descricao ||
    peca?.titulo ||
    peca?.produto ||
    "Peça sem nome"
  );
}

function obterValorPeca(
  peca = {}
) {
  return (
    peca?.venda ??
    peca?.valor_venda ??
    peca?.valorVenda ??
    peca?.valor_venda_final ??
    peca?.valorVendaFinal ??
    null
  );
}

function formatarValor(
  valor,
  formatacao = {}
) {
  const numero =
    Number(valor);

  if (
    !Number.isFinite(
      numero
    )
  ) {
    return "";
  }

  const locale =
    formatacao?.locale ||
    "pt-BR";

  const moeda =
    formatacao?.moeda ||
    "BRL";

  return numero.toLocaleString(
    locale,
    {
      style: "currency",
      currency: moeda,
    }
  );
}

function montarRespostaListaPecas(
  resultado = {},
  formatacao = {}
) {
  const dados =
    resultado?.dados || {};

  const filtros =
    dados?.filtros || {};

  const pecas =
    Array.isArray(
      dados?.pecas
    )
      ? dados.pecas
      : [];

  const alternativaMaisProxima =
    dados?.alternativaMaisProxima ||
    null;

  const pecasAlternativas =
    Array.isArray(
      alternativaMaisProxima
        ?.pecas
    )
      ? alternativaMaisProxima
          .pecas
      : [];

  const possuiAlternativa =
    alternativaMaisProxima
      ?.encontrada &&
    pecasAlternativas.length > 0;

  /*
   * Nenhuma peça exata e nenhuma
   * alternativa disponível.
   */
  if (
    pecas.length === 0 &&
    !possuiAlternativa
  ) {
    return [
      "📦 Estoque",
      "",
      "Não encontrei peças para os filtros informados.",
      "",
      montarFollowUpNegativo({
        filtros,
        quantidadeMarca:
          dados?.quantidadeMarca ||
          0,
        alternativaMaisProxima,
      }),
    ].join("\n");
  }

  const usandoAlternativa =
    pecas.length === 0 &&
    possuiAlternativa;

  const pecasParaListar =
    usandoAlternativa
      ? pecasAlternativas
      : pecas;

  const limite = 20;

  const linhas =
    pecasParaListar
      .slice(
        0,
        limite
      )
      .map(
        (
          peca,
          index
        ) => {
          const valor =
            formatarValor(
              obterValorPeca(
                peca
              ),
              formatacao
            );

          return `${index + 1}. ${obterNomePeca(
            peca
          )}${
            valor
              ? ` — ${valor}`
              : ""
          }`;
        }
      );

  if (
    pecasParaListar.length >
    limite
  ) {
    linhas.push(
      `… e mais ${
        pecasParaListar.length -
        limite
      } peças.`
    );
  }

  /*
   * Não encontrou a combinação exata,
   * mas encontrou peças semelhantes.
   */
  if (
    usandoAlternativa
  ) {
    const quantidadeAlternativa =
      normalizarQuantidade(
        alternativaMaisProxima
          ?.quantidade ||
          pecasAlternativas.length
      );

    const descricaoBusca =
      montarNucleoProduto(
        filtros,
        0
      );

    const descricaoAlternativa =
      montarNucleoProduto(
        alternativaMaisProxima
          ?.filtros || {},
        quantidadeAlternativa
      );

    return [
      "📦 Alternativas encontradas",
      "",
      `Não encontrei ${descricaoBusca} no estoque.`,
      "",
      `Mas encontrei ${quantidadeAlternativa} ${descricaoAlternativa}:`,
      "",
      ...linhas,
      "",
      quantidadeAlternativa ===
      1
        ? "Essa é a opção mais próxima disponível. Posso continuar refinando a busca."
        : "Essas são as opções mais próximas disponíveis. Posso continuar refinando a busca.",
    ].join("\n");
  }

  /*
   * Encontrou peças com todos
   * os filtros solicitados.
   */
  return [
    "📦 Peças disponíveis",
    "",
    `Encontrei ${pecasParaListar.length} ${
      pecasParaListar.length ===
      1
        ? "peça"
        : "peças"
    }:`,
    "",
    ...linhas,
    "",
    "Posso refinar essa lista por marca, categoria, cor, material, gênero ou tamanho.",
  ].join("\n");
}

function montarRespostaListaAgrupada({
  titulo,
  itens = [],
  quantidadeTotal = 0,
  tipo = "",
}) {
  if (
    !Array.isArray(itens) ||
    itens.length === 0
  ) {
    return [
      titulo,
      "",
      "Não encontrei informações disponíveis para essa consulta.",
    ].join("\n");
  }

  const linhas =
    itens.map(
      (
        item,
        index
      ) => {
        const nome =
          item?.nome ||
          item?.marca ||
          item?.categoria ||
          "Não identificado";

        const quantidade =
          normalizarQuantidade(
            item?.quantidade
          );

        return `${index + 1}. ${nome} — ${quantidade} ${
          quantidade === 1
            ? "peça"
            : "peças"
        }`;
      }
    );

  const followUp =
    tipo === "marcas"
      ? "Posso listar as peças de qualquer uma dessas marcas."
      : "Posso listar as peças de qualquer uma dessas categorias.";

  return [
    titulo,
    "",
    `O estoque analisado possui ${normalizarQuantidade(
      quantidadeTotal
    )} ${
      normalizarQuantidade(
        quantidadeTotal
      ) === 1
        ? "peça"
        : "peças"
    }.`,
    "",
    ...linhas,
    "",
    followUp,
  ].join("\n");
}

function build(
  resultado = {},
  definicao = {},
  formatacao = {}
) {
  const tipo =
    obterTipo(
      resultado,
      definicao
    );

  if (
    !TIPOS_SUPORTADOS.has(
      tipo
    )
  ) {
    return null;
  }

  switch (tipo) {
    case "quantidade_estoque":
    case "quantidade_estoque_por_marca":
    case "quantidade_estoque_por_categoria":
      return montarRespostaQuantidade(
        resultado,
        definicao
      );

    case "listar_pecas":
    case "listar_pecas_estoque":
      return montarRespostaListaPecas(
        resultado,
        formatacao
      );

    case "listar_marcas":
    case "listar_marcas_estoque":
      return montarRespostaListaAgrupada({
        titulo:
          "🏷️ Marcas do estoque",

        itens:
          resultado?.dados
            ?.marcas ||
          [],

        quantidadeTotal:
          resultado?.dados
            ?.quantidadePecas ||
          0,

        tipo:
          "marcas",
      });

    case "listar_categorias":
    case "listar_categorias_estoque":
      return montarRespostaListaAgrupada({
        titulo:
          "🧥 Categorias do estoque",

        itens:
          resultado?.dados
            ?.categorias ||
          [],

        quantidadeTotal:
          resultado?.dados
            ?.quantidadePecas ||
          0,

        tipo:
          "categorias",
      });

    default:
      return null;
  }
}

const StockResponseBuilder = {
  build,
};

export {
  build,
  montarNucleoProduto,
};

export default StockResponseBuilder;