// EntityExtractor.jsx

import EntityPatterns from "./EntityPatterns";
import periodExtractor from "./PeriodExtractor";
import filterExtractor from "./FilterExtractor";

import { normalizarTexto } from "../utils/TextUtils";

/*
 * Operações de estoque suportadas.
 */
const OPERACOES_ESTOQUE = [
  "quantidade_estoque",
  "listar_pecas",
  "listar_marcas",
  "listar_categorias",
];


function encontrarEntidade(
  texto,
  configuracoes = []
) {
  let melhor = null;
  let maiorPontuacao = 0;

  for (const configuracao of configuracoes) {
    let pontuacao = 0;

    for (
      const termoOriginal of
      configuracao.termos || []
    ) {
      const termo =
        normalizarTexto(
          termoOriginal
        );

      if (!termo) {
        continue;
      }

      if (texto === termo) {
        pontuacao += 100;
      } else if (
        texto.includes(termo)
      ) {
        pontuacao +=
          termo
            .split(" ")
            .filter(Boolean)
            .length * 10;
      }
    }

    if (
      pontuacao >
      maiorPontuacao
    ) {
      maiorPontuacao =
        pontuacao;

      melhor =
        configuracao;
    }
  }

  return melhor
    ? {
        encontrado: true,
        id: melhor.id,
        pontuacao:
          maiorPontuacao,
      }
    : {
        encontrado: false,
        id: null,
        pontuacao: 0,
      };
}

function textoContemAlgumTermo(
  texto = "",
  termos = []
) {
  if (!texto) {
    return false;
  }

  return termos.some(
    (termo) => {
      const termoNormalizado =
        normalizarTexto(
          termo
        );

      return (
        termoNormalizado &&
        texto.includes(
          termoNormalizado
        )
      );
    }
  );
}

function extrairLimite(
  texto = ""
) {
  if (!texto) {
    return null;
  }

  /*
   * Reconhece:
   *
   * - últimas 5 lives
   * - ultimas 10 lives
   * - últimos 3 eventos
   *
   * Como o texto já foi normalizado,
   * não precisamos tratar acentos.
   */
  const correspondencia =
    texto.match(
      /\b(?:ultimas|ultimos)\s+(\d+)\b/
    );

  if (!correspondencia) {
    return null;
  }

  const limite = Number(
    correspondencia[1]
  );

  if (
    !Number.isInteger(limite) ||
    limite <= 0
  ) {
    return null;
  }

  /*
   * Limite de segurança para impedir
   * consultas exageradamente grandes.
   */
  return Math.min(
    limite,
    50
  );
}

function extrairObjetivoComparacao(
  texto = ""
) {
  if (!texto) {
    return null;
  }

  const termosMelhor = [
    "qual foi a melhor",
    "qual a melhor",
    "melhor live",
    "melhor das lives",
    "melhor das ultimas",
    "maior faturamento",
    "teve maior faturamento",
    "qual teve maior faturamento",
    "qual live teve maior faturamento",
    "qual faturou mais",
    "faturou mais",
  ];

  if (
    textoContemAlgumTermo(
      texto,
      termosMelhor
    )
  ) {
    return "melhor";
  }

  const termosPior = [
    "qual foi a pior",
    "qual a pior",
    "pior live",
    "pior das lives",
    "pior das ultimas",
    "menor faturamento",
    "teve menor faturamento",
    "qual teve menor faturamento",
    "qual live teve menor faturamento",
    "qual faturou menos",
    "faturou menos",
  ];

  if (
    textoContemAlgumTermo(
      texto,
      termosPior
    )
  ) {
    return "pior";
  }

  const termosCompletos = [
    "compare",
    "comparar",
    "comparacao",
    "evolucao",
    "desempenho",
    "mostre a evolucao",
    "mostrar evolucao",
    "como foi o faturamento",
    "faturamento esta aumentando",
    "faturamento esta caindo",
  ];

  if (
    textoContemAlgumTermo(
      texto,
      termosCompletos
    )
  ) {
    return "completo";
  }

  return null;
}

function possuiFiltroEstoque(
  filtros = {}
) {
  return Boolean(
    filtros?.marca ||
    filtros?.categoria ||
    filtros?.cor ||
    filtros?.material ||
    filtros?.genero ||
    filtros?.tamanho ||
    filtros?.statusEstoque
  );
}

function perguntaIndicaExistenciaEstoque(
  texto = "",
  filtros = {}
) {
  if (!possuiFiltroEstoque(filtros)) {
    return false;
  }

  /*
   * Reconhece perguntas naturais de existência:
   *
   * - Tem Nike?
   * - Existe MK?
   * - Tem Michael Kors?
   * - Vocês têm Columbia?
   * - Há casaco preto?
   */
  return (
    /^(?:tem|temos|existe|existem|ha)\b/.test(
      texto
    ) ||
    /\b(?:voce|voces)\s+tem\b/.test(
      texto
    ) ||
    /\b(?:tem|temos|existe|existem|ha)\b/.test(
      texto
    )
  );
}

function perguntaIndicaEstoque(
  texto = "",
  filtros = {}
) {
  const termosEstoque = [
    "estoque",
    "em estoque",
    "no estoque",
    "nosso estoque",
    "estoque atual",
    "saldo em estoque",
    "saldo do estoque",

    "temos disponivel",
    "temos disponiveis",
    "esta disponivel",
    "estao disponiveis",

    "temos reservado",
    "temos reservados",
    "temos reservada",
    "temos reservadas",

    "quantas temos",
    "quantos temos",
    "quantas ainda temos",
    "quantos ainda temos",

    "quantas restam",
    "quantos restam",
    "quantas sobraram",
    "quantos sobraram",
  ];

  if (
    textoContemAlgumTermo(
      texto,
      termosEstoque
    )
  ) {
    return true;
  }

  /*
   * Reconhece perguntas em que existe um termo
   * entre "quantas/quantos" e "temos".
   */
  const quantidadeQueTemos =
    /\bquant(?:a|o)s?\b.*\b(?:ainda\s+)?temos\b/.test(
      texto
    );

  if (quantidadeQueTemos) {
    return true;
  }

  /*
   * Reconhece construções com "restam"
   * e "sobraram".
   */
  const quantidadeRestante =
    /\bquant(?:a|o)s?\b.*\b(?:restam|sobraram)\b/.test(
      texto
    );

  if (quantidadeRestante) {
    return true;
  }

  /*
   * Uma pergunta de quantidade com ao menos um
   * filtro de produto e sem vocabulário de venda
   * representa o estado atual do estoque.
   *
   * Exemplos:
   *
   * - Quantos vestidos Zara?
   * - Quantas jaquetas Columbia?
   * - Quantas peças femininas?
   * - Quantas peças de pena de ganso?
   */
  const perguntaQuantidade =
    /\b(?:quantas|quantos|quantidade|numero de)\b/.test(
      texto
    );

  if (
    perguntaQuantidade &&
    possuiFiltroEstoque(filtros)
  ) {
    return true;
  }

  return perguntaIndicaExistenciaEstoque(
    texto,
    filtros
  );
}

function perguntaIndicaVenda(
  texto = ""
) {
  const termosVenda = [
    "vendeu",
    "venderam",
    "vendida",
    "vendidas",
    "vendido",
    "vendidos",

    "foram vendidas",
    "foram vendidos",

    "faturou",
    "faturamento",
    "receita",

    "comprou",
    "compraram",
    "compra",
    "compras",

    "ultima live",
    "ultimas lives",
    "live passada",
    "live anterior",
  ];

  return textoContemAlgumTermo(
    texto,
    termosVenda
  );
}

function resolverOperacaoPorContexto({
  texto,
  operacaoDetectada,
  dominioDetectado,
  filtros,
}) {
  const indicaEstoque =
    perguntaIndicaEstoque(
      texto,
      filtros
    );

  const indicaVenda =
    perguntaIndicaVenda(
      texto
    );

  /*
   * Perguntas como:
   *
   * "Quantas Nike temos no estoque?"
   * "Quantas jaquetas estão disponíveis?"
   * "Quantas peças ainda temos?"
   *
   * devem usar uma operação própria de estoque.
   */
  if (
    (
      operacaoDetectada ===
        "quantidade" ||
      !operacaoDetectada
    ) &&
    indicaEstoque &&
    !indicaVenda
  ) {
    return "quantidade_estoque";
  }

  /*
   * Caso o domínio já tenha sido claramente
   * reconhecido como estoque e não exista
   * indicação de venda, também convertemos
   * a quantidade genérica.
   *
   * Isso permite reconhecer:
   *
   * "Quantas Nike no estoque?"
   * "Quantidade de Zara no estoque"
   */
  if (
    operacaoDetectada ===
      "quantidade" &&
    dominioDetectado ===
      "estoque" &&
    !indicaVenda
  ) {
    return "quantidade_estoque";
  }

  return (
    operacaoDetectada ||
    null
  );
}

function resolverPeriodoComparativo({
  periodo,
  operacao,
  limite,
}) {
  if (
    operacao ===
      "comparar_lives" &&
    periodo?.tipo !==
      "ultimas_lives"
  ) {
    return {
      encontrado: true,
      tipo: "ultimas_lives",
      termo: limite
        ? `ultimas ${limite} lives`
        : "ultimas lives",
    };
  }

  return periodo;
}

function resolverDominioPorOperacao({
  dominioDetectado,
  operacao,
}) {
  const dominiosPreferenciais = {
    maior_compra:
      "clientes",

    menor_compra:
      "clientes",

    pendentes:
      "clientes",

    lucro:
      "financeiro",

    margem:
      "financeiro",

    ticket_medio:
      "financeiro",

    comparar_lives:
      "lives",

    /*
     * A nova operação sempre pertence
     * ao domínio de estoque.
     */
    quantidade_estoque:
      "estoque",

    listar_pecas:
      "estoque",

    listar_marcas:
      "estoque",

    listar_categorias:
      "estoque",

    mais_vendida:
      "vendas",

    quantidade:
      "vendas",

    total:
      "vendas",
  };

  return (
    dominiosPreferenciais[
      operacao
    ] ||
    dominioDetectado ||
    null
  );
}

function resolverPeriodoPorOperacao({
  periodo,
  operacao,
}) {
  /*
   * Consultas sobre o estado atual do estoque
   * não precisam de período.
   *
   * Não inventamos "hoje", pois a consulta será
   * feita diretamente sobre o estado atual da
   * tabela de peças.
   */
  if (
    OPERACOES_ESTOQUE.includes(
      operacao
    )
  ) {
    return {
      encontrado: true,
      tipo: "estoque_atual",
      termo: "estoque atual",
    };
  }

  return periodo;
}

class EntityExtractor {
  extrair(pergunta = "") {
    const texto =
      normalizarTexto(
        pergunta
      );

    const dominioDetectado =
      encontrarEntidade(
        texto,
        EntityPatterns.dominios
      );

    const operacaoDetectada =
      encontrarEntidade(
        texto,
        EntityPatterns.operacoes
      );

    /*
     * Os filtros são extraídos antes da resolução
     * da operação porque marca, categoria, cor,
     * material e gênero ajudam a identificar
     * perguntas implícitas sobre estoque.
     */
    const filtros =
      filterExtractor.extrair(
        pergunta
      );

    /*
     * Ajusta a operação usando o contexto da
     * pergunta para separar estoque de vendas.
     */
    const operacao =
      resolverOperacaoPorContexto({
        texto,

        operacaoDetectada:
          operacaoDetectada.id,

        dominioDetectado:
          dominioDetectado.id,

        filtros,
      });

    const periodoExtraido =
      periodExtractor.extrair(
        pergunta
      );

    const limite =
      extrairLimite(
        texto
      );

    const objetivoComparacao =
      operacao ===
      "comparar_lives"
        ? (
            extrairObjetivoComparacao(
              texto
            ) ||
            "completo"
          )
        : null;

    const periodoComparativo =
      resolverPeriodoComparativo({
        periodo:
          periodoExtraido,

        operacao,

        limite,
      });

    const periodo =
      resolverPeriodoPorOperacao({
        periodo:
          periodoComparativo,

        operacao,
      });

    const limiteFinal =
      operacao ===
      "comparar_lives"
        ? (
            limite ||
            5
          )
        : limite;

    const dominio =
      resolverDominioPorOperacao({
        dominioDetectado:
          dominioDetectado.id,

        operacao,
      });

    return {
      perguntaOriginal:
        pergunta,

      textoNormalizado:
        texto,

      dominio,

      operacao,

      periodo: {
        tipo:
          periodo?.tipo ||
          null,

        termo:
          periodo?.termo ||
          null,
      },

      filtros,

      parametros: {
        limite:
          limiteFinal,

        objetivoComparacao,

        /*
         * Informa às próximas camadas que a
         * consulta se refere ao estado atual
         * do estoque.
         */
        estoqueAtual:
          OPERACOES_ESTOQUE.includes(
            operacao
          ),
      },

      confianca: {
        dominio:
          dominioDetectado
            .pontuacao,

        operacao:
          operacaoDetectada
            .pontuacao,
      },

      encontrado:
        Boolean(
          dominio
        ) ||
        Boolean(
          operacao
        ) ||
        Boolean(
          periodo?.tipo
        ) ||
        Object.keys(
          filtros
        ).length > 0 ||
        Boolean(
          limite
        ) ||
        Boolean(
          objetivoComparacao
        ),
    };
  }
}

const entityExtractor =
  new EntityExtractor();

export default entityExtractor;