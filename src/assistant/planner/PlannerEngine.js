import PlannerPatterns from "./PlannerPatterns";

/*
 * Operações suportadas pelo módulo de estoque.
 */
const OPERACOES_ESTOQUE = [
  "quantidade_estoque",
  "listar_pecas",
  "listar_marcas",
  "listar_categorias",
];


import entityExtractor from "../entities/EntityExtractor";
import { normalizarTexto } from "../utils/TextUtils";

function criarPlanoVazio(entidades = null) {
  return {
    encontrado: false,
    planoId: null,

    dominio:
      entidades?.dominio ||
      null,

    operacao:
      entidades?.operacao ||
      null,

    periodo:
      entidades?.periodo?.tipo ||
      null,

    filtros:
      entidades?.filtros ||
      {},

    parametros:
      entidades?.parametros ||
      {},

    etapas: [],
    pontuacao: 0,
    origem: null,
    entidades,
  };
}

function calcularPontuacao(
  texto,
  pattern
) {
  const termo =
    normalizarTexto(
      pattern
    );

  if (!termo) {
    return 0;
  }

  if (texto === termo) {
    return 100;
  }

  if (
    texto.includes(
      termo
    )
  ) {
    return (
      termo
        .split(" ")
        .filter(Boolean)
        .length * 10
    );
  }

  const palavrasPergunta =
    texto
      .split(" ")
      .filter(
        (palavra) =>
          palavra.length > 2
      );

  const palavrasPattern =
    termo
      .split(" ")
      .filter(
        (palavra) =>
          palavra.length > 2
      );

  if (
    palavrasPattern.length === 0
  ) {
    return 0;
  }

  const palavrasEncontradas =
    palavrasPattern.filter(
      (palavra) =>
        palavrasPergunta.includes(
          palavra
        )
    );

  const proporcao =
    palavrasEncontradas.length /
    palavrasPattern.length;

  if (proporcao < 0.6) {
    return 0;
  }

  return palavrasEncontradas.length;
}

function criarEtapasPorEntidades(
  entidades = {}
) {
  const operacao =
    entidades?.operacao ||
    null;

  const periodo =
    entidades?.periodo?.tipo ||
    null;

  const dominio =
    entidades?.dominio ||
    null;

  const filtros =
    entidades?.filtros ||
    {};

  if (!operacao) {
    return [];
  }

  const etapas = [];

  /*
   * Consultas baseadas na última live.
   */
  if (
    periodo ===
    "ultima_live"
  ) {
    etapas.push(
      "buscar_ultima_live",
      "buscar_vendas_da_live"
    );
  }

  /*
   * Consultas baseadas nas últimas N lives.
   */
  if (
    periodo ===
    "ultimas_lives"
  ) {
    etapas.push(
      "buscar_ultimas_lives",
      "buscar_vendas_das_lives"
    );
  }

  /*
   * Consultas por período de calendário.
   */
  if (
    [
      "hoje",
      "ontem",
      "semana_atual",
      "mes_atual",
      "ano_atual",
    ].includes(periodo)
  ) {
    etapas.push(
      "buscar_vendas_por_periodo"
    );
  }

  /*
   * Módulo de clientes.
   */
  if (
    dominio === "clientes" &&
    operacao ===
      "maior_compra"
  ) {
    etapas.push(
      "agrupar_vendas_por_cliente",
      "ordenar_clientes_por_valor"
    );
  }

  if (
    dominio === "clientes" &&
    operacao ===
      "menor_compra"
  ) {
    etapas.push(
      "agrupar_vendas_por_cliente",
      "ordenar_clientes_por_menor_valor"
    );
  }

  if (
    operacao ===
    "pendentes"
  ) {
    etapas.push(
      "filtrar_vendas_pendentes",
      "agrupar_vendas_por_cliente"
    );
  }

  /*
   * Módulo financeiro.
   */
  if (
    operacao ===
    "ticket_medio"
  ) {
    etapas.push(
      "agrupar_vendas_por_cliente",
      "calcular_ticket_medio"
    );
  }

  if (
    operacao ===
    "lucro"
  ) {
    etapas.push(
      "buscar_custos_das_pecas",
      "calcular_lucro"
    );
  }

  if (
    operacao ===
    "margem"
  ) {
    etapas.push(
      "buscar_custos_das_pecas",
      "calcular_lucro",
      "calcular_margem"
    );
  }

  /*
   * Análises de vendas.
   */
  if (
    operacao ===
    "mais_vendida"
  ) {
    etapas.push(
      "identificar_marcas",
      "agrupar_vendas_por_marca",
      "ordenar_marcas_por_quantidade"
    );
  }

  if (
    operacao ===
      "quantidade" &&
    filtros?.marca
  ) {
    etapas.push(
      "filtrar_vendas_por_marca",
      "contar_vendas"
    );
  }

  /*
   * Comparação entre lives.
   */
  if (
    operacao ===
    "comparar_lives"
  ) {
    etapas.push(
      "agrupar_vendas_por_live",
      "calcular_faturamento_por_live",
      "calcular_variacao_entre_lives",
      "identificar_maior_faturamento",
      "identificar_menor_faturamento",
      "calcular_media_por_live",
      "identificar_tendencia"
    );
  }

  /*
   * Módulo de estoque.
   *
   * O QueryExecutor busca as peças disponíveis.
   * Os filtros semânticos de marca, categoria,
   * cor, material, gênero e tamanho são aplicados
   * posteriormente pelo ResultProcessor por meio
   * do InventorySemanticAnalyzer.
   *
   * Por isso o plano não cria etapas de SQL para
   * cada filtro semântico.
   */
  if (
    dominio === "estoque" &&
    operacao ===
      "quantidade_estoque"
  ) {
    etapas.push(
      "buscar_pecas_estoque",
      "contar_pecas_estoque"
    );
  }

  return [
    ...new Set(
      etapas
    ),
  ];
}

function normalizarLimiteComparacao(
  parametros = {}
) {
  return Math.min(
    Math.max(
      Number(
        parametros?.limite ||
        5
      ),
      2
    ),
    50
  );
}

function criarPlanoId({
  dominio,
  operacao,
  periodo,
  filtros = {},
  limiteComparacao = null,
}) {
  return [
    dominio ||
      "geral",

    operacao,

    periodo,

    filtros?.marca
      ? normalizarTexto(
          filtros.marca
        ).replace(
          /\s+/g,
          "_"
        )
      : null,

    filtros?.categoria
      ? normalizarTexto(
          filtros.categoria
        ).replace(
          /\s+/g,
          "_"
        )
      : null,

    filtros?.cor
      ? normalizarTexto(
          filtros.cor
        ).replace(
          /\s+/g,
          "_"
        )
      : null,

    filtros?.material
      ? normalizarTexto(
          filtros.material
        ).replace(
          /\s+/g,
          "_"
        )
      : null,

    filtros?.genero
      ? normalizarTexto(
          filtros.genero
        ).replace(
          /\s+/g,
          "_"
        )
      : null,

    filtros?.tamanho
      ? normalizarTexto(
          filtros.tamanho
        ).replace(
          /\s+/g,
          "_"
        )
      : null,

    filtros?.statusEstoque
      ? normalizarTexto(
          filtros.statusEstoque
        ).replace(
          /\s+/g,
          "_"
        )
      : null,

    limiteComparacao
      ? `${limiteComparacao}_lives`
      : null,
  ]
    .filter(Boolean)
    .join("_");
}

function validarPlanoPorEntidades({
  dominio,
  operacao,
  periodo,
  filtros,
}) {
  const operacoesSuportadas = [
    "maior_compra",
    "menor_compra",
    "pendentes",
    "ticket_medio",
    "lucro",
    "margem",
    "mais_vendida",
    "quantidade",
    "total",
    "comparar_lives",
    "quantidade_estoque",
    "listar_pecas",
    "listar_marcas",
    "listar_categorias",
  ];

  if (
    !operacoesSuportadas.includes(
      operacao
    )
  ) {
    return false;
  }

  /*
   * A quantidade de vendas ainda exige marca,
   * para não conflitar com perguntas genéricas
   * ainda não implementadas.
   */
  if (
    operacao ===
      "quantidade" &&
    !filtros?.marca
  ) {
    return false;
  }

  if (
    operacao ===
      "comparar_lives" &&
    periodo !==
      "ultimas_lives"
  ) {
    return false;
  }

  /*
   * Consultas de estoque precisam pertencer
   * ao domínio estoque e usar estoque_atual.
   */
  if (
    OPERACOES_ESTOQUE.includes(
      operacao
    )
  ) {
    if (
      dominio !==
      "estoque"
    ) {
      return false;
    }

    if (
      periodo !==
      "estoque_atual"
    ) {
      return false;
    }
  }

  return true;
}

function criarPlanoPorEntidades(
  entidades
) {
  if (
    !entidades?.encontrado
  ) {
    return null;
  }

  const dominio =
    entidades?.dominio ||
    null;

  const operacao =
    entidades?.operacao ||
    null;

  const periodo =
    entidades?.periodo?.tipo ||
    null;

  const filtros =
    entidades?.filtros ||
    {};

  const parametros =
    entidades?.parametros ||
    {};

  if (
    !operacao ||
    !periodo
  ) {
    return null;
  }

  const planoValido =
    validarPlanoPorEntidades({
      dominio,
      operacao,
      periodo,
      filtros,
    });

  if (!planoValido) {
    return null;
  }

  const limiteComparacao =
    operacao ===
      "comparar_lives"
      ? normalizarLimiteComparacao(
          parametros
        )
      : null;

  const planoId =
    criarPlanoId({
      dominio,
      operacao,
      periodo,
      filtros,
      limiteComparacao,
    });

  return {
    encontrado: true,

    planoId,

    dominio,

    operacao,

    periodo,

    filtros,

    parametros: {
      ...parametros,

      ...(limiteComparacao
        ? {
            limite:
              limiteComparacao,
          }
        : {}),

      ...(OPERACOES_ESTOQUE.includes(
      operacao
    )
        ? {
            estoqueAtual: true,
          }
        : {}),
    },

    etapas:
      criarEtapasPorEntidades(
        entidades
      ),

    pontuacao:
      Number(
        entidades?.confianca
          ?.dominio ||
        0
      ) +
      Number(
        entidades?.confianca
          ?.operacao ||
        0
      ),

    origem: "entities",

    entidades,
  };
}

class PlannerEngine {
  constructor() {
    this.patterns =
      Array.isArray(
        PlannerPatterns
      )
        ? PlannerPatterns
        : [];
  }

  criarPlanoPorPatterns(
    pergunta = "",
    entidades = null
  ) {
    const texto =
      normalizarTexto(
        pergunta
      );

    if (!texto) {
      return criarPlanoVazio(
        entidades
      );
    }

    let melhorPlano = null;
    let maiorPontuacao = 0;

    for (
      const patternConfig of
      this.patterns
    ) {
      let pontuacaoPlano = 0;

      for (
        const pattern of
        patternConfig.patterns ||
        []
      ) {
        const pontuacao =
          calcularPontuacao(
            texto,
            pattern
          );

        if (
          pontuacao >
          pontuacaoPlano
        ) {
          pontuacaoPlano =
            pontuacao;
        }
      }

      if (
        pontuacaoPlano >
        maiorPontuacao
      ) {
        maiorPontuacao =
          pontuacaoPlano;

        melhorPlano =
          patternConfig;
      }
    }

    if (
      !melhorPlano ||
      maiorPontuacao <= 0
    ) {
      return criarPlanoVazio(
        entidades
      );
    }

    return {
      encontrado: true,

      planoId:
        melhorPlano.id,

      dominio:
        melhorPlano.dominio,

      operacao:
        melhorPlano.operacao,

      periodo:
        melhorPlano.periodo,

      filtros:
        entidades?.filtros ||
        {},

      parametros:
        entidades?.parametros ||
        {},

      etapas: [
        ...(
          melhorPlano.etapas ||
          []
        ),
      ],

      pontuacao:
        maiorPontuacao,

      origem: "patterns",

      entidades,
    };
  }

  criarPlano(
    pergunta = ""
  ) {
    const entidades =
      entityExtractor.extrair(
        pergunta
      );

    /*
     * Primeiro tenta criar um plano
     * usando as entidades extraídas.
     */
    const planoEntidades =
      criarPlanoPorEntidades(
        entidades
      );

    if (planoEntidades) {
      return planoEntidades;
    }

    /*
     * Caso não seja possível, usa os
     * padrões antigos como fallback.
     */
    return this.criarPlanoPorPatterns(
      pergunta,
      entidades
    );
  }

  detectar(
    pergunta = ""
  ) {
    return this.criarPlano(
      pergunta
    );
  }

  extrairEntidades(
    pergunta = ""
  ) {
    return entityExtractor.extrair(
      pergunta
    );
  }

  listarPlanos() {
    return this.patterns.map(
      (plano) => ({
        id:
          plano.id,

        dominio:
          plano.dominio,

        operacao:
          plano.operacao,

        periodo:
          plano.periodo,

        patterns: [
          ...(
            plano.patterns ||
            []
          ),
        ],

        etapas: [
          ...(
            plano.etapas ||
            []
          ),
        ],
      })
    );
  }

  buscarPlano(id) {
    if (!id) {
      return null;
    }

    const idNormalizado =
      normalizarTexto(
        id
      );

    return (
      this.patterns.find(
        (plano) =>
          normalizarTexto(
            plano.id
          ) ===
          idNormalizado
      ) ||
      null
    );
  }
}

const plannerEngine =
  new PlannerEngine();

export default plannerEngine;