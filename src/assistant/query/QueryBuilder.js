// QueryBuilder.js
// Sprint 4.2
// Constrói a definição de consulta a partir do plano criado pelo Planner.

import QueryRegistry from "./QueryRegistry";
import periodResolver from "./PeriodResolver";

function normalizarOperacao(
  operacao
) {
  const aliases = {
    cliente_maior_compra:
      "maior_compra",

    clientes_pendentes:
      "pendentes",

    marca_mais_vendida:
      "mais_vendida",

    quantidade_por_marca:
      "quantidade",

    quantidade_estoque_por_marca:
      "quantidade_estoque",

    quantidade_estoque_por_categoria:
      "quantidade_estoque",
  };

  return (
    aliases[operacao] ||
    operacao
  );
}

function normalizarLimiteComparacao(
  valor
) {
  const minimo =
    Number(
      QueryRegistry?.limites
        ?.comparacaoLivesMinimo
    ) || 2;

  const maximo =
    Number(
      QueryRegistry?.limites
        ?.comparacaoLivesMaximo
    ) || 50;

  const padrao =
    Number(
      QueryRegistry?.limites
        ?.comparacaoLivesPadrao
    ) || 5;

  const numero =
    Number(valor);

  if (
    !Number.isInteger(
      numero
    ) ||
    numero <= 0
  ) {
    return padrao;
  }

  return Math.min(
    Math.max(
      numero,
      minimo
    ),
    maximo
  );
}

function criarPeriodoUltimasLives(
  periodoPlano,
  limite
) {
  return {
    tipo:
      "ultimas_lives",

    termo:
      periodoPlano?.termo ||
      `ultimas ${limite} lives`,

    requerUltimaLive:
      false,

    requerMultiplasLives:
      true,

    requerEstoqueAtual:
      false,

    limite,

    suportado: true,
  };
}

function criarPeriodoEstoqueAtual(
  periodoPlano = null
) {
  return {
    tipo:
      "estoque_atual",

    termo:
      periodoPlano?.termo ||
      "estoque atual",

    requerUltimaLive:
      false,

    requerMultiplasLives:
      false,

    requerEstoqueAtual:
      true,

    suportado: true,
  };
}

function resolverPeriodoDoPlano(
  plano,
  operacao,
  limite
) {
  /*
   * Consultas de estoque não usam datas.
   *
   * Elas representam o estado atual da
   * tabela pecas.
   */
  if (
    operacao ===
      "quantidade_estoque" ||
    plano?.periodo ===
      "estoque_atual" ||
    plano?.periodo?.tipo ===
      "estoque_atual"
  ) {
    return criarPeriodoEstoqueAtual(
      plano?.entidades?.periodo ||
      plano?.periodo ||
      null
    );
  }

  /*
   * Comparações entre lives usam
   * as últimas N lives encerradas.
   */
  if (
    operacao ===
      "comparar_lives" ||
    plano?.periodo ===
      "ultimas_lives" ||
    plano?.periodo?.tipo ===
      "ultimas_lives"
  ) {
    return criarPeriodoUltimasLives(
      plano?.entidades?.periodo ||
      plano?.periodo ||
      null,
      limite
    );
  }

  return periodResolver.resolver(
    plano?.periodo
  );
}

function criarConsultaUltimaLive() {
  return [
    {
      id:
        "ultima_live",

      tipo:
        "buscar_ultima_live",

      fonte:
        "lives",
    },

    {
      id:
        "vendas",

      tipo:
        "buscar_vendas_da_live",

      fonte:
        "vendasLive",

      dependeDe:
        "ultima_live",
    },
  ];
}

function criarConsultaUltimasLives(
  limite
) {
  return [
    {
      id:
        "lives",

      tipo:
        "buscar_ultimas_lives",

      fonte:
        "lives",

      limite,
    },

    {
      id:
        "vendas",

      tipo:
        "buscar_vendas_das_lives",

      fonte:
        "vendasLive",

      dependeDe:
        "lives",

      limite,
    },
  ];
}

function criarConsultaPorPeriodo(
  periodo
) {
  return [
    {
      id:
        "vendas",

      tipo:
        "buscar_vendas_por_periodo",

      fonte:
        "vendasLive",

      periodo,
    },
  ];
}

function criarConsultaEstoque(
  filtros = {}
) {
  return [
    {
      id:
        "pecas",

      tipo:
        "buscar_pecas_estoque",

      fonte:
        "pecas",

      filtros: {
        ...filtros,
      },
    },
  ];
}

function adicionarConsultasComplementares(
  consultas = [],
  operacao = null
) {
  const resultado = [
    ...consultas,
  ];

  /*
   * Para calcular lucro precisamos buscar
   * os custos cadastrados nas peças
   * relacionadas às vendas.
   */
  if (
    operacao ===
    "lucro"
  ) {
    resultado.push({
      id:
        "pecas",

      tipo:
        "buscar_pecas_por_ids_das_vendas",

      fonte:
        "pecas",

      dependeDe:
        "vendas",
    });
  }

  /*
   * Marca mais vendida e quantidade por marca
   * podem precisar dos dados das peças quando
   * a marca não estiver diretamente registrada
   * em vendas_live.
   */
  if (
    operacao ===
      "mais_vendida" ||
    operacao ===
      "quantidade"
  ) {
    resultado.push({
      id:
        "pecas",

      tipo:
        "buscar_pecas_por_ids_das_vendas",

      fonte:
        "pecas",

      dependeDe:
        "vendas",
    });
  }

  /*
   * A comparação entre lives também carrega
   * as peças para permitir cálculo de custo,
   * lucro e margem por live.
   */
  if (
    operacao ===
    "comparar_lives"
  ) {
    resultado.push({
      id:
        "pecas",

      tipo:
        "buscar_pecas_por_ids_das_vendas",

      fonte:
        "pecas",

      dependeDe:
        "vendas",
    });
  }

  /*
   * quantidade_estoque já busca diretamente
   * a tabela pecas.
   *
   * Portanto, não precisa de consulta
   * complementar.
   */

  return resultado.filter(
    (
      consulta,
      index,
      lista
    ) =>
      lista.findIndex(
        (item) =>
          item.id ===
          consulta.id
      ) === index
  );
}

function validarOperacao(
  operacaoOriginal,
  operacaoNormalizada
) {
  return (
    QueryRegistry
      .operacoesSuportadas
      .includes(
        operacaoOriginal
      ) ||
    QueryRegistry
      .operacoesSuportadas
      .includes(
        operacaoNormalizada
      )
  );
}

function validarPeriodo(
  periodo
) {
  if (
    !periodo?.tipo
  ) {
    return false;
  }

  if (
    periodo.suportado ===
    false
  ) {
    return false;
  }

  return QueryRegistry
    .periodosSuportados
    .includes(
      periodo.tipo
    );
}

class QueryBuilder {
  construir(
    plano = {}
  ) {
    if (
      !plano?.encontrado
    ) {
      return {
        valido: false,

        motivo:
          "plano_nao_encontrado",

        planoId:
          plano?.planoId ||
          null,
      };
    }

    const operacaoOriginal =
      plano.operacao ||
      null;

    const operacao =
      normalizarOperacao(
        operacaoOriginal
      );

    const parametros = {
      ...(
        plano.parametros ||
        {}
      ),
    };

    const limiteComparacao =
      normalizarLimiteComparacao(
        parametros?.limite
      );

    const periodo =
      resolverPeriodoDoPlano(
        plano,
        operacao,
        limiteComparacao
      );

    const filtros = {
      ...(
        plano.filtros ||
        {}
      ),
    };

    if (
      !validarOperacao(
        operacaoOriginal,
        operacao
      )
    ) {
      return {
        valido: false,

        motivo:
          "operacao_nao_suportada",

        planoId:
          plano.planoId ||
          null,

        operacaoOriginal,

        operacao,
      };
    }

    if (
      !validarPeriodo(
        periodo
      )
    ) {
      return {
        valido: false,

        motivo:
          "periodo_nao_suportado",

        planoId:
          plano.planoId ||
          null,

        periodo,
      };
    }

    /*
     * Compatibilidade com a operação antiga
     * quantidade_por_marca.
     */
    if (
      operacaoOriginal ===
        "quantidade_por_marca" &&
      !filtros.marca
    ) {
      return {
        valido: false,

        motivo:
          "filtro_marca_obrigatorio",

        planoId:
          plano.planoId ||
          null,

        operacao,

        filtros,
      };
    }

    if (
      operacao ===
        "comparar_lives" &&
      periodo.tipo !==
        "ultimas_lives"
    ) {
      return {
        valido: false,

        motivo:
          "periodo_comparacao_invalido",

        planoId:
          plano.planoId ||
          null,

        operacao,

        periodo,
      };
    }

    /*
     * A consulta de quantidade de estoque
     * obrigatoriamente representa o estado
     * atual da tabela pecas.
     */
    if (
      operacao ===
        "quantidade_estoque" &&
      periodo.tipo !==
        "estoque_atual"
    ) {
      return {
        valido: false,

        motivo:
          "periodo_estoque_invalido",

        planoId:
          plano.planoId ||
          null,

        operacao,

        periodo,
      };
    }

    let consultas = [];

    /*
     * Estoque possui prioridade porque
     * não utiliza consultas de vendas.
     */
    if (
      operacao ===
        "quantidade_estoque" ||
      plano?.dominio ===
        "estoque" ||
      periodo
        .requerEstoqueAtual
    ) {
      consultas =
        criarConsultaEstoque(
          filtros
        );
    } else if (
      periodo
        .requerMultiplasLives
    ) {
      consultas =
        criarConsultaUltimasLives(
          limiteComparacao
        );
    } else if (
      periodo
        .requerUltimaLive
    ) {
      consultas =
        criarConsultaUltimaLive();
    } else {
      consultas =
        criarConsultaPorPeriodo(
          periodo
        );
    }

    consultas =
      adicionarConsultasComplementares(
        consultas,
        operacao
      );

    const definicao = {
      valido: true,

      planoId:
        plano.planoId ||
        null,

      origemPlano:
        plano.origem ||
        null,

      dominio:
        plano.dominio ||
        null,

      operacaoOriginal,

      operacao,

      periodo,

      filtros,

      parametros: {
        ...parametros,

        ...(
          operacao ===
          "comparar_lives"
            ? {
                limite:
                  limiteComparacao,
              }
            : {}
        ),

        ...(
          operacao ===
          "quantidade_estoque"
            ? {
                estoqueAtual:
                  true,
              }
            : {}
        ),
      },

      etapas: [
        ...(
          plano.etapas ||
          []
        ),
      ],

      consultas,

      entidades:
        plano.entidades ||
        null,

      perguntaOriginal:
        plano?.entidades
          ?.perguntaOriginal ||
        "",
    };

    const validacao =
      this.validar(
        definicao
      );

    if (
      !validacao.valido
    ) {
      return {
        ...definicao,

        valido: false,

        motivo:
          validacao.motivo,
      };
    }

    return definicao;
  }

  validar(
    definicao = {}
  ) {
    if (
      !definicao?.valido
    ) {
      return {
        valido: false,

        motivo:
          definicao?.motivo ||
          "definicao_invalida",
      };
    }

    if (
      !definicao.operacao
    ) {
      return {
        valido: false,

        motivo:
          "operacao_ausente",
      };
    }

    if (
      !definicao
        .periodo?.tipo
    ) {
      return {
        valido: false,

        motivo:
          "periodo_ausente",
      };
    }

    if (
      !Array.isArray(
        definicao.consultas
      ) ||
      definicao.consultas
        .length === 0
    ) {
      return {
        valido: false,

        motivo:
          "consultas_ausentes",
      };
    }

    const idsConsultas =
      definicao.consultas.map(
        (consulta) =>
          consulta.id
      );

    if (
      idsConsultas.some(
        (
          id,
          index
        ) =>
          idsConsultas.indexOf(
            id
          ) !== index
      )
    ) {
      return {
        valido: false,

        motivo:
          "consultas_duplicadas",
      };
    }

    if (
      definicao.operacao ===
        "comparar_lives"
    ) {
      const limite =
        Number(
          definicao
            ?.parametros
            ?.limite
        );

      if (
        !Number.isInteger(
          limite
        ) ||
        limite <
          QueryRegistry
            .limites
            .comparacaoLivesMinimo ||
        limite >
          QueryRegistry
            .limites
            .comparacaoLivesMaximo
      ) {
        return {
          valido: false,

          motivo:
            "limite_comparacao_invalido",
        };
      }

      const tiposConsultas =
        definicao
          .consultas
          .map(
            (consulta) =>
              consulta.tipo
          );

      if (
        !tiposConsultas
          .includes(
            "buscar_ultimas_lives"
          ) ||
        !tiposConsultas
          .includes(
            "buscar_vendas_das_lives"
          )
      ) {
        return {
          valido: false,

          motivo:
            "consultas_comparacao_incompletas",
        };
      }
    }

    /*
     * Validação específica do módulo de estoque.
     */
    if (
      definicao.operacao ===
        "quantidade_estoque"
    ) {
      if (
        definicao
          .periodo?.tipo !==
        "estoque_atual"
      ) {
        return {
          valido: false,

          motivo:
            "periodo_estoque_invalido",
        };
      }

      const consultaEstoque =
        definicao
          .consultas
          .find(
            (consulta) =>
              consulta.tipo ===
              "buscar_pecas_estoque"
          );

      if (
        !consultaEstoque
      ) {
        return {
          valido: false,

          motivo:
            "consulta_estoque_ausente",
        };
      }

      if (
        consultaEstoque
          .fonte !==
        "pecas"
      ) {
        return {
          valido: false,

          motivo:
            "fonte_estoque_invalida",
        };
      }
    }

    return {
      valido: true,
      motivo: null,
    };
  }
}

const queryBuilder =
  new QueryBuilder();

export default queryBuilder;