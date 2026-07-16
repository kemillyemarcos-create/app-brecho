import {
  describe,
  expect,
  test,
} from "vitest";

import queryExecutor from "../query/QueryExecutor";

function criarSupabaseMock({
  tabelas = {},
  erros = {},
} = {}) {
  const chamadas = [];

  function aplicarFiltros(
    registros,
    estado
  ) {
    let resultado = [
      ...(registros || []),
    ];

    for (
      const filtro of
      estado.filtros
    ) {
      const {
        tipo,
        campo,
        valor,
      } = filtro;

      if (tipo === "eq") {
        resultado =
          resultado.filter(
            (registro) =>
              String(
                registro?.[campo]
              ) ===
              String(valor)
          );
      }

      if (tipo === "in") {
        const conjunto =
          new Set(
            (valor || []).map(
              (item) =>
                String(item)
            )
          );

        resultado =
          resultado.filter(
            (registro) =>
              conjunto.has(
                String(
                  registro?.[
                    campo
                  ]
                )
              )
          );
      }

      if (tipo === "gte") {
        resultado =
          resultado.filter(
            (registro) =>
              String(
                registro?.[campo]
              ) >=
              String(valor)
          );
      }

      if (tipo === "lte") {
        resultado =
          resultado.filter(
            (registro) =>
              String(
                registro?.[campo]
              ) <=
              String(valor)
          );
      }
    }

    for (
      const ordenacao of
      [...estado.ordenacoes]
        .reverse()
    ) {
      const {
        campo,
        ascending,
      } = ordenacao;

      resultado.sort(
        (a, b) => {
          const valorA =
            a?.[campo];

          const valorB =
            b?.[campo];

          if (
            valorA === valorB
          ) {
            return 0;
          }

          if (
            valorA === null ||
            valorA === undefined
          ) {
            return ascending
              ? -1
              : 1;
          }

          if (
            valorB === null ||
            valorB === undefined
          ) {
            return ascending
              ? 1
              : -1;
          }

          return valorA >
            valorB
            ? (
                ascending
                  ? 1
                  : -1
              )
            : (
                ascending
                  ? -1
                  : 1
              );
        }
      );
    }

    if (
      Number.isInteger(
        estado.limite
      )
    ) {
      resultado =
        resultado.slice(
          0,
          estado.limite
        );
    }

    return resultado;
  }

  function selecionarCampos(
    registros,
    selecao
  ) {
    if (
      !selecao ||
      selecao === "*"
    ) {
      return registros;
    }

    const campos =
      selecao
        .split(",")
        .map(
          (campo) =>
            campo.trim()
        )
        .filter(Boolean);

    return registros.map(
      (registro) => {
        const parcial = {};

        for (
          const campo of campos
        ) {
          parcial[campo] =
            registro?.[campo];
        }

        return parcial;
      }
    );
  }

  function criarConsulta(
    tabela
  ) {
    const estado = {
      tabela,
      selecao: "*",
      filtros: [],
      ordenacoes: [],
      limite: null,
    };

    const consulta = {
      select(selecao = "*") {
        estado.selecao =
          selecao;

        chamadas.push({
          metodo: "select",
          tabela,
          selecao,
        });

        return consulta;
      },

      eq(campo, valor) {
        estado.filtros.push({
          tipo: "eq",
          campo,
          valor,
        });

        chamadas.push({
          metodo: "eq",
          tabela,
          campo,
          valor,
        });

        return consulta;
      },

      in(campo, valor) {
        estado.filtros.push({
          tipo: "in",
          campo,
          valor,
        });

        chamadas.push({
          metodo: "in",
          tabela,
          campo,
          valor,
        });

        return consulta;
      },

      gte(campo, valor) {
        estado.filtros.push({
          tipo: "gte",
          campo,
          valor,
        });

        chamadas.push({
          metodo: "gte",
          tabela,
          campo,
          valor,
        });

        return consulta;
      },

      lte(campo, valor) {
        estado.filtros.push({
          tipo: "lte",
          campo,
          valor,
        });

        chamadas.push({
          metodo: "lte",
          tabela,
          campo,
          valor,
        });

        return consulta;
      },

      order(
        campo,
        opcoes = {}
      ) {
        estado.ordenacoes.push({
          campo,
          ascending:
            opcoes
              ?.ascending !==
            false,
        });

        chamadas.push({
          metodo: "order",
          tabela,
          campo,
          opcoes,
        });

        return consulta;
      },

      limit(valor) {
        estado.limite =
          valor;

        chamadas.push({
          metodo: "limit",
          tabela,
          valor,
        });

        return consulta;
      },

      async range(
        inicio,
        fim
      ) {
        chamadas.push({
          metodo: "range",
          tabela,
          inicio,
          fim,
        });

        const erro =
          erros?.[tabela];

        if (erro) {
          return {
            data: null,
            error: {
              message:
                String(erro),
            },
          };
        }

        const registros =
          aplicarFiltros(
            tabelas?.[
              tabela
            ] || [],
            estado
          );

        return {
          data:
            selecionarCampos(
              registros.slice(
                inicio,
                fim + 1
              ),
              estado.selecao
            ),

          error: null,
        };
      },

      async maybeSingle() {
        chamadas.push({
          metodo:
            "maybeSingle",
          tabela,
        });

        const erro =
          erros?.[tabela];

        if (erro) {
          return {
            data: null,
            error: {
              message:
                String(erro),
            },
          };
        }

        const registros =
          aplicarFiltros(
            tabelas?.[
              tabela
            ] || [],
            estado
          );

        return {
          data:
            selecionarCampos(
              registros,
              estado.selecao
            )[0] || null,

          error: null,
        };
      },

      then(
        resolver,
        rejeitar
      ) {
        const promessa =
          Promise.resolve()
            .then(() => {
              const erro =
                erros?.[
                  tabela
                ];

              if (erro) {
                return {
                  data: null,
                  error: {
                    message:
                      String(
                        erro
                      ),
                  },
                };
              }

              const registros =
                aplicarFiltros(
                  tabelas?.[
                    tabela
                  ] || [],
                  estado
                );

              return {
                data:
                  selecionarCampos(
                    registros,
                    estado.selecao
                  ),

                error: null,
              };
            });

        return promessa.then(
          resolver,
          rejeitar
        );
      },
    };

    return consulta;
  }

  return {
    chamadas,

    from(tabela) {
      chamadas.push({
        metodo: "from",
        tabela,
      });

      return criarConsulta(
        tabela
      );
    },
  };
}

const lives = [
  {
    id: "live-antiga",
    nome: "Live antiga",
    status: "encerrada",
    data_live:
      "01/07/2026",
    hora_fim:
      "01/07/2026, 22:00:00",
    criado_em:
      "2026-07-01T22:00:00.000Z",
  },
  {
    id: "live-recente",
    nome: "Live recente",
    status: "encerrada",
    data_live:
      "08/07/2026",
    hora_fim:
      "08/07/2026, 22:00:00",
    criado_em:
      "2026-07-08T22:00:00.000Z",
  },
  {
    id: "live-aberta",
    nome: "Live aberta",
    status: "aberta",
    data_live:
      "15/07/2026",
    criado_em:
      "2026-07-15T20:00:00.000Z",
  },
];

const vendas = [
  {
    id: "v1",
    live_id:
      "live-antiga",
    peca_id: "p1",
    valor_venda: 100,
    data_hora:
      "01/07/2026, 21:00:00",
  },
  {
    id: "v2",
    live_id:
      "live-recente",
    peca_id: "p2",
    valor_venda: 200,
    data_hora:
      "08/07/2026, 21:30:00",
  },
  {
    id: "v3",
    live_id:
      "live-recente",
    peca_id: "p3",
    valor_venda: 150,
    data_hora:
      "08/07/2026, 21:45:00",
  },
];

const pecas = [
  {
    id: "p1",
    nome: "Peça 1",
    custo: 20,
  },
  {
    id: "p2",
    nome: "Peça 2",
    custo: 30,
  },
  {
    id: "p3",
    nome: "Peça 3",
    custo: 40,
  },
];

function criarDefinicao(
  consultas,
  extras = {}
) {
  return {
    valido: true,
    operacao: "total",
    periodo: {
      tipo:
        "ultima_live",
    },
    filtros: {},
    parametros: {},
    consultas,
    ...extras,
  };
}

describe("QueryExecutor", () => {
  test("rejeita definição ausente", async () => {
    const supabase =
      criarSupabaseMock();

    await expect(
      queryExecutor.executar(
        null,
        supabase
      )
    ).rejects.toThrow(
      "Definição de consulta não informada."
    );
  });

  test("rejeita definição inválida", async () => {
    const supabase =
      criarSupabaseMock();

    await expect(
      queryExecutor.executar(
        {
          valido: false,
          motivo:
            "teste_invalido",
        },
        supabase
      )
    ).rejects.toThrow(
      "Definição de consulta inválida: teste_invalido"
    );
  });

  test("rejeita definição sem consultas", async () => {
    const supabase =
      criarSupabaseMock();

    await expect(
      queryExecutor.executar(
        {
          valido: true,
          consultas: [],
        },
        supabase
      )
    ).rejects.toThrow(
      "A definição não possui consultas para executar."
    );
  });

  test("rejeita cliente Supabase ausente", async () => {
    const definicao =
      criarDefinicao([
        {
          id: "vendas",
          tipo:
            "buscar_vendas_por_periodo",
          periodo: {
            dataInicialIso:
              "2026-07-01T00:00:00.000Z",
            dataFinalIso:
              "2026-07-31T23:59:59.999Z",
          },
        },
      ]);

    await expect(
      queryExecutor.executar(
        definicao,
        null
      )
    ).rejects.toThrow(
      "Cliente Supabase não informado."
    );
  });

  test("busca a última live encerrada e suas vendas", async () => {
    const supabase =
      criarSupabaseMock({
        tabelas: {
          lives,
          vendas_live:
            vendas,
          pecas,
        },
      });

    const definicao =
      criarDefinicao([
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
      ]);

    const contexto =
      await queryExecutor.executar(
        definicao,
        supabase
      );

    expect(
      contexto.live.id
    ).toBe("live-recente");

    expect(
      contexto.vendas.map(
        (venda) =>
          venda.id
      )
    ).toEqual([
      "v2",
      "v3",
    ]);

    expect(
      contexto.lives
    ).toEqual([]);

    expect(
      contexto.pecas
    ).toEqual([]);
  });

  test("ignora lives abertas ao buscar a última live", async () => {
    const supabase =
      criarSupabaseMock({
        tabelas: {
          lives,
          vendas_live:
            vendas,
        },
      });

    const definicao =
      criarDefinicao([
        {
          id: "ultima_live",
          tipo:
            "buscar_ultima_live",
        },
      ]);

    const contexto =
      await queryExecutor.executar(
        definicao,
        supabase
      );

    expect(
      contexto.live.status
    ).toBe("encerrada");

    expect(
      contexto.live.id
    ).not.toBe(
      "live-aberta"
    );
  });

  test("busca as últimas N lives e todas as vendas relacionadas", async () => {
    const supabase =
      criarSupabaseMock({
        tabelas: {
          lives,
          vendas_live:
            vendas,
          pecas,
        },
      });

    const definicao =
      criarDefinicao(
        [
          {
            id: "lives",
            tipo:
              "buscar_ultimas_lives",
            limite: 2,
          },
          {
            id: "vendas",
            tipo:
              "buscar_vendas_das_lives",
            limite: 2,
          },
        ],
        {
          operacao:
            "comparar_lives",
          periodo: {
            tipo:
              "ultimas_lives",
          },
          parametros: {
            limite: 2,
          },
        }
      );

    const contexto =
      await queryExecutor.executar(
        definicao,
        supabase
      );

    expect(
      contexto.lives.map(
        (live) =>
          live.id
      )
    ).toEqual([
      "live-recente",
      "live-antiga",
    ]);

    expect(
      contexto.vendas
    ).toHaveLength(3);
  });

  test("usa limite dos parâmetros quando a consulta não informa limite", async () => {
    const supabase =
      criarSupabaseMock({
        tabelas: {
          lives,
          vendas_live:
            vendas,
        },
      });

    const definicao =
      criarDefinicao(
        [
          {
            id: "lives",
            tipo:
              "buscar_ultimas_lives",
          },
        ],
        {
          operacao:
            "comparar_lives",
          periodo: {
            tipo:
              "ultimas_lives",
          },
          parametros: {
            limite: 1,
          },
        }
      );

    const contexto =
      await queryExecutor.executar(
        definicao,
        supabase
      );

    /*
     * O QueryExecutor normaliza o limite mínimo
     * configurado para comparação para 2 lives.
     */
    expect(
      contexto.lives
    ).toHaveLength(2);
  });

  test("busca vendas por período", async () => {
    const vendasPeriodo = [
      {
        id: "j1",
        live_id:
          "live-recente",
        data_hora:
          "2026-07-05T10:00:00.000Z",
      },
      {
        id: "j2",
        live_id:
          "live-recente",
        data_hora:
          "2026-07-15T10:00:00.000Z",
      },
      {
        id: "j3",
        live_id:
          "live-recente",
        data_hora:
          "2026-08-01T10:00:00.000Z",
      },
    ];

    const supabase =
      criarSupabaseMock({
        tabelas: {
          vendas_live:
            vendasPeriodo,
        },
      });

    const definicao =
      criarDefinicao([
        {
          id: "vendas",
          tipo:
            "buscar_vendas_por_periodo",
          periodo: {
            dataInicialIso:
              "2026-07-01T00:00:00.000Z",
            dataFinalIso:
              "2026-07-31T23:59:59.999Z",
          },
        },
      ]);

    const contexto =
      await queryExecutor.executar(
        definicao,
        supabase
      );

    expect(
      contexto.vendas.map(
        (venda) =>
          venda.id
      )
    ).toEqual([
      "j1",
      "j2",
    ]);
  });

  test("usa o período da definição como fallback", async () => {
    const supabase =
      criarSupabaseMock({
        tabelas: {
          vendas_live: [
            {
              id: "j1",
              data_hora:
                "2026-07-10T10:00:00.000Z",
            },
          ],
        },
      });

    const definicao =
      criarDefinicao(
        [
          {
            id: "vendas",
            tipo:
              "buscar_vendas_por_periodo",
          },
        ],
        {
          periodo: {
            tipo: "hoje",
            dataInicialIso:
              "2026-07-01T00:00:00.000Z",
            dataFinalIso:
              "2026-07-31T23:59:59.999Z",
          },
        }
      );

    const contexto =
      await queryExecutor.executar(
        definicao,
        supabase
      );

    expect(
      contexto.vendas
    ).toHaveLength(1);
  });

  test("rejeita período sem datas válidas", async () => {
    const supabase =
      criarSupabaseMock({
        tabelas: {
          vendas_live: [],
        },
      });

    const definicao =
      criarDefinicao([
        {
          id: "vendas",
          tipo:
            "buscar_vendas_por_periodo",
          periodo: {
            tipo: "hoje",
          },
        },
      ]);

    await expect(
      queryExecutor.executar(
        definicao,
        supabase
      )
    ).rejects.toThrow(
      "O período não possui data inicial e data final válidas."
    );
  });

  test("busca peças relacionadas às vendas sem duplicar ids", async () => {
    const supabase =
      criarSupabaseMock({
        tabelas: {
          pecas,
        },
      });

    const definicao =
      criarDefinicao([
        {
          id: "pecas",
          tipo:
            "buscar_pecas_por_ids_das_vendas",
        },
      ]);

    /*
     * Para esta etapa, injetamos primeiro vendas
     * por uma consulta de período simulada.
     */
    definicao.consultas.unshift({
      id: "vendas",
      tipo:
        "buscar_vendas_por_periodo",
      periodo: {
        dataInicialIso:
          "2026-07-01T00:00:00.000Z",
        dataFinalIso:
          "2026-07-31T23:59:59.999Z",
      },
    });

    supabase.from =
      ((originalFrom) =>
        function from(tabela) {
          if (
            tabela ===
            "vendas_live"
          ) {
            return criarSupabaseMock({
              tabelas: {
                vendas_live: [
                  {
                    id: "a",
                    peca_id:
                      "p1",
                    data_hora:
                      "2026-07-10T10:00:00.000Z",
                  },
                  {
                    id: "b",
                    peca_id:
                      "p1",
                    data_hora:
                      "2026-07-11T10:00:00.000Z",
                  },
                  {
                    id: "c",
                    peca_id:
                      "p2",
                    data_hora:
                      "2026-07-12T10:00:00.000Z",
                  },
                ],
              },
            }).from(tabela);
          }

          return originalFrom.call(
            supabase,
            tabela
          );
        })(
        supabase.from
      );

    const contexto =
      await queryExecutor.executar(
        definicao,
        supabase
      );

    expect(
      contexto.pecas.map(
        (peca) => peca.id
      )
    ).toEqual([
      "p1",
      "p2",
    ]);
  });

  test("retorna listas vazias quando não existem ids de peças", async () => {
    const supabase =
      criarSupabaseMock({
        tabelas: {
          vendas_live: [],
          pecas,
        },
      });

    const definicao =
      criarDefinicao([
        {
          id: "vendas",
          tipo:
            "buscar_vendas_por_periodo",
          periodo: {
            dataInicialIso:
              "2026-07-01T00:00:00.000Z",
            dataFinalIso:
              "2026-07-31T23:59:59.999Z",
          },
        },
        {
          id: "pecas",
          tipo:
            "buscar_pecas_por_ids_das_vendas",
        },
      ]);

    const contexto =
      await queryExecutor.executar(
        definicao,
        supabase
      );

    expect(
      contexto.vendas
    ).toEqual([]);

    expect(
      contexto.pecas
    ).toEqual([]);
  });

  test("propaga erro do Supabase ao buscar lives", async () => {
    const supabase =
      criarSupabaseMock({
        tabelas: {
          lives: [],
        },
        erros: {
          lives:
            "falha simulada",
        },
      });

    const definicao =
      criarDefinicao([
        {
          id: "ultima_live",
          tipo:
            "buscar_ultima_live",
        },
      ]);

    await expect(
      queryExecutor.executar(
        definicao,
        supabase
      )
    ).rejects.toThrow(
      "Erro ao buscar lives encerradas: falha simulada"
    );
  });

  test("propaga erro do Supabase ao buscar vendas", async () => {
    const supabase =
      criarSupabaseMock({
        tabelas: {
          vendas_live: [],
        },
        erros: {
          vendas_live:
            "erro de vendas",
        },
      });

    const definicao =
      criarDefinicao([
        {
          id: "vendas",
          tipo:
            "buscar_vendas_por_periodo",
          periodo: {
            dataInicialIso:
              "2026-07-01T00:00:00.000Z",
            dataFinalIso:
              "2026-07-31T23:59:59.999Z",
          },
        },
      ]);

    await expect(
      queryExecutor.executar(
        definicao,
        supabase
      )
    ).rejects.toThrow(
      "Erro ao buscar vendas por período: erro de vendas"
    );
  });

  test("propaga erro do Supabase ao buscar peças", async () => {
    const supabase =
      criarSupabaseMock({
        tabelas: {
          vendas_live: [
            {
              id: "v1",
              peca_id: "p1",
              data_hora:
                "2026-07-10T10:00:00.000Z",
            },
          ],
          pecas: [],
        },
        erros: {
          pecas:
            "erro de peças",
        },
      });

    const definicao =
      criarDefinicao([
        {
          id: "vendas",
          tipo:
            "buscar_vendas_por_periodo",
          periodo: {
            dataInicialIso:
              "2026-07-01T00:00:00.000Z",
            dataFinalIso:
              "2026-07-31T23:59:59.999Z",
          },
        },
        {
          id: "pecas",
          tipo:
            "buscar_pecas_por_ids_das_vendas",
        },
      ]);

    await expect(
      queryExecutor.executar(
        definicao,
        supabase
      )
    ).rejects.toThrow(
      "Erro ao buscar peças relacionadas às vendas: erro de peças"
    );
  });

  test("rejeita consulta sem tipo", async () => {
    const supabase =
      criarSupabaseMock();

    const definicao =
      criarDefinicao([
        {
          id:
            "consulta-sem-tipo",
        },
      ]);

    await expect(
      queryExecutor.executar(
        definicao,
        supabase
      )
    ).rejects.toThrow(
      "Foi encontrada uma consulta sem tipo definido."
    );
  });

  test("rejeita tipo de consulta não suportado", async () => {
    const supabase =
      criarSupabaseMock();

    const definicao =
      criarDefinicao([
        {
          id: "invalida",
          tipo:
            "consulta_inexistente",
        },
      ]);

    await expect(
      queryExecutor.executar(
        definicao,
        supabase
      )
    ).rejects.toThrow(
      "Consulta não suportada: consulta_inexistente"
    );
  });
});