import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  construir: vi.fn(),
  executarConsulta: vi.fn(),
  processarResultado: vi.fn(),
}));

vi.mock(
  "../query/QueryBuilder",
  () => ({
    default: {
      construir:
        mocks.construir,
    },
  })
);

vi.mock(
  "../query/QueryExecutor",
  () => ({
    default: {
      executar:
        mocks.executarConsulta,
    },
  })
);

vi.mock(
  "../results/ResultProcessor",
  () => ({
    default: {
      processar:
        mocks.processarResultado,
    },
  })
);

import planExecutor from "../planner/PlanExecutor";

const supabase = {
  from: vi.fn(),
};

function normalizarEspacos(texto = "") {
  return String(texto)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const live = {
  id: "live-1",
  nome: "Live 01/07",
  status: "encerrada",
};

function criarPlano(
  sobrescritas = {}
) {
  return {
    encontrado: true,
    planoId:
      "financeiro_lucro_ultima_live",
    dominio: "financeiro",
    operacao: "lucro",
    periodo: "ultima_live",
    filtros: {},
    parametros: {},
    etapas: [],
    origem: "entities",
    entidades: {
      perguntaOriginal:
        "Qual foi o lucro da última live?",
      parametros: {
        limite: null,
        objetivoComparacao:
          null,
      },
    },
    ...sobrescritas,
  };
}

function criarDefinicao(
  sobrescritas = {}
) {
  return {
    valido: true,
    planoId:
      "financeiro_lucro_ultima_live",
    origemPlano: "entities",
    dominio: "financeiro",
    operacaoOriginal: "lucro",
    operacao: "lucro",
    periodo: {
      tipo: "ultima_live",
      requerUltimaLive: true,
      requerMultiplasLives:
        false,
    },
    filtros: {},
    parametros: {},
    consultas: [
      {
        id: "ultima_live",
        tipo:
          "buscar_ultima_live",
      },
      {
        id: "vendas",
        tipo:
          "buscar_vendas_da_live",
      },
    ],
    entidades: {
      perguntaOriginal:
        "Qual foi o lucro da última live?",
    },
    perguntaOriginal:
      "Qual foi o lucro da última live?",
    ...sobrescritas,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.construir.mockReturnValue(
    criarDefinicao()
  );

  mocks.executarConsulta.mockResolvedValue({
    live,
    lives: [],
    vendas: [],
    pecas: [],
  });

  mocks.processarResultado.mockReturnValue({
    ok: true,
    tipo: "lucro",
    dados: {
      liveId: "live-1",
      live,
      faturamento: 300,
      custo: 90,
      lucro: 210,
      margem: 70,
      vendasSemCusto: 0,
      quantidadeVendas: 4,
    },
  });
});

describe("PlanExecutor", () => {
  test("rejeita plano não encontrado", async () => {
    const resultado =
      await planExecutor.executar({
        plano: {
          encontrado: false,
        },
        pergunta:
          "Pergunta qualquer",
        supabase,
      });

    expect(resultado.ok).toBe(
      false
    );

    expect(resultado.tipo).toBe(
      "planner"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Nenhum plano válido"
    );

    expect(
      mocks.construir
    ).not.toHaveBeenCalled();
  });

  test("rejeita Supabase ausente", async () => {
    const resultado =
      await planExecutor.executar({
        plano: criarPlano(),
        pergunta:
          "Qual foi o lucro da última live?",
        supabase: null,
      });

    expect(resultado.ok).toBe(
      false
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Não foi possível acessar o banco de dados"
    );

    expect(
      mocks.construir
    ).not.toHaveBeenCalled();
  });

  test("rejeita definição inválida", async () => {
    mocks.construir.mockReturnValue({
      valido: false,
      motivo:
        "operacao_nao_suportada",
    });

    const resultado =
      await planExecutor.executar({
        plano: criarPlano(),
        pergunta:
          "Pergunta inválida",
        supabase,
      });

    expect(resultado.ok).toBe(
      false
    );

    expect(resultado.motivo).toBe(
      "operacao_nao_suportada"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "consulta ainda não está disponível"
    );

    expect(
      mocks.executarConsulta
    ).not.toHaveBeenCalled();
  });

  test("preserva a pergunta original ao construir a definição", async () => {
    const pergunta =
      "Qual foi o lucro da última live?";

    await planExecutor.executar({
      plano: criarPlano({
        entidades: {},
      }),
      pergunta,
      supabase,
    });

    expect(
      mocks.construir
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        entidades:
          expect.objectContaining({
            perguntaOriginal:
              pergunta,
          }),
      })
    );
  });

  test("executa QueryBuilder, QueryExecutor e ResultProcessor na ordem esperada", async () => {
    const plano =
      criarPlano();

    const definicao =
      criarDefinicao();

    const contexto = {
      live,
      lives: [],
      vendas: [
        {
          id: "v1",
        },
      ],
      pecas: [],
    };

    mocks.construir.mockReturnValue(
      definicao
    );

    mocks.executarConsulta.mockResolvedValue(
      contexto
    );

    await planExecutor.executar({
      plano,
      pergunta:
        plano.entidades
          .perguntaOriginal,
      supabase,
    });

    expect(
      mocks.construir
    ).toHaveBeenCalledTimes(1);

    expect(
      mocks.executarConsulta
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        operacao: "lucro",
      }),
      supabase
    );

    expect(
      mocks.processarResultado
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        operacao: "lucro",
      }),
      contexto
    );
  });

  test("formata resposta de lucro", async () => {
    const resultado =
      await planExecutor.executar({
        plano: criarPlano(),
        pergunta:
          "Qual foi o lucro da última live?",
        supabase,
      });

    expect(resultado.ok).toBe(
      true
    );

    expect(resultado.operacao).toBe(
      "lucro"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "💰 Resultado da última live (Live 01/07)"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Faturamento: R$ 300,00"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Custo identificado: R$ 90,00"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Lucro estimado: R$ 210,00"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Margem estimada: 70,0%"
    );
  });

  test("avisa quando existem vendas sem custo", async () => {
    mocks.processarResultado.mockReturnValue({
      ok: true,
      tipo: "lucro",
      dados: {
        live,
        faturamento: 300,
        custo: 40,
        lucro: 260,
        margem:
          86.6666666667,
        vendasSemCusto: 2,
        quantidadeVendas: 4,
      },
    });

    const resultado =
      await planExecutor.executar({
        plano: criarPlano(),
        pergunta:
          "Qual foi o lucro da última live?",
        supabase,
      });

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "2 venda(s) não possuem custo identificado"
    );
  });

  test("formata resposta de faturamento total", async () => {
    const definicao =
      criarDefinicao({
        dominio: "vendas",
        operacaoOriginal:
          "total",
        operacao: "total",
      });

    mocks.construir.mockReturnValue(
      definicao
    );

    mocks.processarResultado.mockReturnValue({
      ok: true,
      tipo: "total",
      dados: {
        liveId: "live-1",
        live,
        quantidade: 4,
        faturamento: 300,
      },
    });

    const resultado =
      await planExecutor.executar({
        plano: criarPlano({
          dominio: "vendas",
          operacao: "total",
        }),
        pergunta:
          "Quanto faturou a última live?",
        supabase,
      });

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Peças vendidas: 4"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Faturamento total: R$ 300,00"
    );
  });

  test("formata resposta de ticket médio", async () => {
    mocks.construir.mockReturnValue(
      criarDefinicao({
        operacaoOriginal:
          "ticket_medio",
        operacao:
          "ticket_medio",
      })
    );

    mocks.processarResultado.mockReturnValue({
      ok: true,
      tipo: "ticket_medio",
      dados: {
        live,
        quantidadeClientes: 3,
        quantidadePecas: 4,
        faturamento: 300,
        ticketMedioPorCliente:
          100,
        ticketMedioPorPeca: 75,
      },
    });

    const resultado =
      await planExecutor.executar({
        plano: criarPlano({
          operacao:
            "ticket_medio",
        }),
        pergunta:
          "Qual foi o ticket médio da última live?",
        supabase,
      });

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Clientes: 3"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Por cliente: R$ 100,00"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Por peça: R$ 75,00"
    );
  });

  test("formata lista de clientes pendentes", async () => {
    mocks.construir.mockReturnValue(
      criarDefinicao({
        dominio: "clientes",
        operacaoOriginal:
          "pendentes",
        operacao:
          "pendentes",
      })
    );

    mocks.processarResultado.mockReturnValue({
      ok: true,
      tipo: "pendentes",
      dados: {
        live,
        clientes: [
          {
            nome: "Ana",
            quantidade: 2,
            valor: 180,
          },
          {
            nome: "Bruna",
            quantidade: 1,
            valor: 70,
          },
        ],
        totalPendente: 250,
        quantidadeClientes: 2,
        quantidadePecas: 3,
      },
    });

    const resultado =
      await planExecutor.executar({
        plano: criarPlano({
          dominio: "clientes",
          operacao:
            "pendentes",
        }),
        pergunta:
          "Quem ainda não pagou na última live?",
        supabase,
      });

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "1. Ana — 2 peça(s) — R$ 180,00"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "2. Bruna — 1 peça(s) — R$ 70,00"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Total pendente: R$ 250,00"
    );
  });

  test("informa quando não existem pendências", async () => {
    mocks.construir.mockReturnValue(
      criarDefinicao({
        operacaoOriginal:
          "pendentes",
        operacao:
          "pendentes",
      })
    );

    mocks.processarResultado.mockReturnValue({
      ok: true,
      tipo: "pendentes",
      dados: {
        live,
        clientes: [],
        totalPendente: 0,
      },
    });

    const resultado =
      await planExecutor.executar({
        plano: criarPlano({
          operacao:
            "pendentes",
        }),
        pergunta:
          "Quem ainda não pagou?",
        supabase,
      });

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Não existem clientes pendentes"
    );
  });

  test("formata comparação completa entre lives", async () => {
    const definicao =
      criarDefinicao({
        dominio: "lives",
        operacaoOriginal:
          "comparar_lives",
        operacao:
          "comparar_lives",
        periodo: {
          tipo:
            "ultimas_lives",
          requerUltimaLive:
            false,
          requerMultiplasLives:
            true,
        },
        parametros: {
          limite: 3,
          objetivoComparacao:
            "completo",
        },
        perguntaOriginal:
          "Compare as últimas 3 lives.",
      });

    mocks.construir.mockReturnValue(
      definicao
    );

    mocks.executarConsulta.mockResolvedValue({
      live: null,
      lives: [
        {
          id: "live-3",
        },
        {
          id: "live-2",
        },
        {
          id: "live-1",
        },
      ],
      vendas: [],
      pecas: [],
    });

    mocks.processarResultado.mockReturnValue({
      ok: true,
      tipo:
        "comparar_lives",
      dados: {
        quantidadeLives: 3,
        comparacoes: [
          {
            id: "live-1",
            nome: "Live 01/07",
            faturamento: 200,
            quantidadeVendas: 2,
            variacaoPercentual:
              null,
          },
          {
            id: "live-2",
            nome: "Live 08/07",
            faturamento: 300,
            quantidadeVendas: 3,
            variacaoPercentual:
              50,
          },
          {
            id: "live-3",
            nome: "Live 15/07",
            faturamento: 400,
            quantidadeVendas: 4,
            variacaoPercentual:
              33.3333,
          },
        ],
        faturamentoTotal: 900,
        faturamentoMedio: 300,
        maiorFaturamento: {
          nome: "Live 15/07",
          faturamento: 400,
        },
        menorFaturamento: {
          nome: "Live 01/07",
          faturamento: 200,
        },
        variacaoTotalPercentual:
          100,
        tendencia:
          "crescimento",
      },
    });

    const resultado =
      await planExecutor.executar({
        plano: criarPlano({
          dominio: "lives",
          operacao:
            "comparar_lives",
          periodo:
            "ultimas_lives",
          parametros: {
            limite: 3,
            objetivoComparacao:
              "completo",
          },
          entidades: {
            perguntaOriginal:
              "Compare as últimas 3 lives.",
          },
        }),
        pergunta:
          "Compare as últimas 3 lives.",
        supabase,
      });

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Evolução das últimas 3 lives"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Live 08/07 — R$ 300,00 — 3 venda(s) — alta de 50,0%"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Faturamento total: R$ 900,00"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Tendência recente: crescimento"
    );
  });

  test("responde somente a melhor live quando esse é o objetivo", async () => {
    const definicao =
      criarDefinicao({
        dominio: "lives",
        operacaoOriginal:
          "comparar_lives",
        operacao:
          "comparar_lives",
        periodo: {
          tipo:
            "ultimas_lives",
          requerUltimaLive:
            false,
          requerMultiplasLives:
            true,
        },
        parametros: {
          limite: 5,
          objetivoComparacao:
            "melhor",
        },
        perguntaOriginal:
          "Qual foi a melhor das últimas 5 lives?",
      });

    mocks.construir.mockReturnValue(
      definicao
    );

    mocks.executarConsulta.mockResolvedValue({
      live: null,
      lives: [
        {
          id: "live-5",
        },
      ],
      vendas: [],
      pecas: [],
    });

    mocks.processarResultado.mockReturnValue({
      ok: true,
      tipo:
        "comparar_lives",
      dados: {
        quantidadeLives: 5,
        comparacoes: [],
        maiorFaturamento: {
          nome: "Live 15/07",
          faturamento: 5800,
          quantidadeVendas: 106,
          quantidadeClientes: 38,
          ticketMedioPorPeca:
            54.716981,
          ticketMedioPorCliente:
            152.631578,
          lucro: 3100,
          margem: 53.448276,
        },
        menorFaturamento: null,
      },
    });

    const resultado =
      await planExecutor.executar({
        plano: criarPlano({
          dominio: "lives",
          operacao:
            "comparar_lives",
          periodo:
            "ultimas_lives",
          parametros: {
            limite: 5,
            objetivoComparacao:
              "melhor",
          },
          entidades: {
            perguntaOriginal:
              "Qual foi a melhor das últimas 5 lives?",
            parametros: {
              limite: 5,
              objetivoComparacao:
                "melhor",
            },
          },
        }),
        pergunta:
          "Qual foi a melhor das últimas 5 lives?",
        supabase,
      });

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "🏆 Melhor das últimas 5 lives"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Live: Live 15/07"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).not.toContain(
      "Evolução das últimas"
    );
  });

  test("responde somente a pior live quando esse é o objetivo", async () => {
    const definicao =
      criarDefinicao({
        dominio: "lives",
        operacaoOriginal:
          "comparar_lives",
        operacao:
          "comparar_lives",
        periodo: {
          tipo:
            "ultimas_lives",
          requerUltimaLive:
            false,
          requerMultiplasLives:
            true,
        },
        parametros: {
          limite: 10,
          objetivoComparacao:
            "pior",
        },
        perguntaOriginal:
          "Qual foi a pior das últimas 10 lives?",
      });

    mocks.construir.mockReturnValue(
      definicao
    );

    mocks.executarConsulta.mockResolvedValue({
      live: null,
      lives: [
        {
          id: "live-10",
        },
      ],
      vendas: [],
      pecas: [],
    });

    mocks.processarResultado.mockReturnValue({
      ok: true,
      tipo:
        "comparar_lives",
      dados: {
        quantidadeLives: 10,
        comparacoes: [],
        maiorFaturamento: null,
        menorFaturamento: {
          nome: "Live 01/07",
          faturamento: 2200,
          quantidadeVendas: 40,
          quantidadeClientes: 18,
          ticketMedioPorPeca: 55,
          ticketMedioPorCliente:
            122.222222,
          lucro: 900,
          margem: 40.90909,
        },
      },
    });

    const resultado =
      await planExecutor.executar({
        plano: criarPlano({
          dominio: "lives",
          operacao:
            "comparar_lives",
          periodo:
            "ultimas_lives",
          parametros: {
            limite: 10,
            objetivoComparacao:
              "pior",
          },
          entidades: {
            perguntaOriginal:
              "Qual foi a pior das últimas 10 lives?",
            parametros: {
              limite: 10,
              objetivoComparacao:
                "pior",
            },
          },
        }),
        pergunta:
          "Qual foi a pior das últimas 10 lives?",
        supabase,
      });

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "📉 Pior das últimas 10 lives"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Live: Live 01/07"
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).not.toContain(
      "Evolução das últimas"
    );
  });

  test("informa quando não existe live encerrada", async () => {
    mocks.executarConsulta.mockResolvedValue({
      live: null,
      lives: [],
      vendas: [],
      pecas: [],
    });

    const resultado =
      await planExecutor.executar({
        plano: criarPlano(),
        pergunta:
          "Qual foi o lucro da última live?",
        supabase,
      });

    expect(resultado.ok).toBe(
      true
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Ainda não encontrei nenhuma live encerrada"
    );

    expect(
      mocks.processarResultado
    ).not.toHaveBeenCalled();
  });

  test("informa quando não existem múltiplas lives para comparação", async () => {
    mocks.construir.mockReturnValue(
      criarDefinicao({
        dominio: "lives",
        operacaoOriginal:
          "comparar_lives",
        operacao:
          "comparar_lives",
        periodo: {
          tipo:
            "ultimas_lives",
          requerUltimaLive:
            false,
          requerMultiplasLives:
            true,
        },
        parametros: {
          limite: 5,
          objetivoComparacao:
            "completo",
        },
      })
    );

    mocks.executarConsulta.mockResolvedValue({
      live: null,
      lives: [],
      vendas: [],
      pecas: [],
    });

    const resultado =
      await planExecutor.executar({
        plano: criarPlano({
          dominio: "lives",
          operacao:
            "comparar_lives",
          periodo:
            "ultimas_lives",
        }),
        pergunta:
          "Compare as últimas 5 lives.",
        supabase,
      });

    expect(resultado.ok).toBe(
      true
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toContain(
      "Ainda não encontrei lives encerradas suficientes"
    );

    expect(
      mocks.processarResultado
    ).not.toHaveBeenCalled();
  });

  test("propaga resposta de erro do ResultProcessor", async () => {
    mocks.processarResultado.mockReturnValue({
      ok: false,
      tipo:
        "result_processor",
      motivo:
        "operacao_nao_suportada",
      resposta:
        "Operação ainda não suportada.",
    });

    const resultado =
      await planExecutor.executar({
        plano: criarPlano(),
        pergunta:
          "Pergunta",
        supabase,
      });

    expect(resultado.ok).toBe(
      false
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toBe(
      "Operação ainda não suportada."
    );
  });

  test("captura erro lançado pelo QueryExecutor", async () => {
    mocks.executarConsulta.mockRejectedValue(
      new Error(
        "Falha simulada no Supabase"
      )
    );

    const consoleError =
      vi.spyOn(
        console,
        "error"
      ).mockImplementation(
        () => {}
      );

    const resultado =
      await planExecutor.executar({
        plano: criarPlano(),
        pergunta:
          "Qual foi o lucro da última live?",
        supabase,
      });

    expect(resultado.ok).toBe(
      false
    );

    expect(
      normalizarEspacos(resultado.resposta)
    ).toBe(
      "Ocorreu um erro ao executar essa análise."
    );

    expect(resultado.erro).toBe(
      "Falha simulada no Supabase"
    );

    consoleError.mockRestore();
  });

  test("retorna metadados do plano e da definição", async () => {
    const resultado =
      await planExecutor.executar({
        plano: criarPlano(),
        pergunta:
          "Qual foi o lucro da última live?",
        supabase,
      });

    expect(resultado).toMatchObject({
      ok: true,
      tipo: "planner",
      plano:
        "financeiro_lucro_ultima_live",
      origemPlano: "entities",
      dominio: "financeiro",
      operacao: "lucro",
      periodo: "ultima_live",
      filtros: {},
      parametros: {},
    });

    expect(
      resultado.definicao
    ).toBeTruthy();

    expect(resultado.dados).toBeTruthy();
  });
});