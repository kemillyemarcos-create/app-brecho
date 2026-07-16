import {
  describe,
  expect,
  test,
} from "vitest";

import resultProcessor from "../results/ResultProcessor";

const live = {
  id: "live-1",
  nome: "Live 01/07",
  status: "encerrada",
  data_live: "01/07/2026",
};

const lives = [
  {
    id: "live-3",
    nome: "Live 15/07",
    status: "encerrada",
    data_live: "15/07/2026",
  },
  {
    id: "live-2",
    nome: "Live 08/07",
    status: "encerrada",
    data_live: "08/07/2026",
  },
  {
    id: "live-1",
    nome: "Live 01/07",
    status: "encerrada",
    data_live: "01/07/2026",
  },
];

const pecas = [
  {
    id: "p1",
    nome: "Jaqueta Nike",
    marca: "Nike",
    custo: 40,
  },
  {
    id: "p2",
    nome: "Calça Zara",
    marca: "Zara",
    custo: 30,
  },
  {
    id: "p3",
    nome: "Moletom Adidas",
    marca: "Adidas",
    custo: 20,
  },
  {
    id: "p4",
    nome: "Blusa básica",
    marca: null,
    custo: null,
  },
  {
    id: "p5",
    nome: "Camiseta Nike",
    marca: "Nike",
    custo: 25,
  },
  {
    id: "p6",
    nome: "Vestido Zara",
    marca: "Zara",
    custo: 45,
  },
];

const vendas = [
  {
    id: "v1",
    live_id: "live-1",
    peca_id: "p1",
    cliente_nome: "Ana",
    nome_peca: "Jaqueta Nike",
    valor_venda: 100,
    status_pagamento: "pago",
  },
  {
    id: "v2",
    live_id: "live-1",
    peca_id: "p2",
    cliente_nome: "Ana",
    nome_peca: "Calça Zara",
    valor_venda: 80,
    status_pagamento: "pendente",
  },
  {
    id: "v3",
    live_id: "live-1",
    peca_id: "p3",
    cliente_nome: "Bruna",
    nome_peca: "Moletom Adidas",
    valor_venda: 70,
    status_pagamento: "pago",
  },
  {
    id: "v4",
    live_id: "live-1",
    peca_id: "p4",
    cliente_nome: "Carla",
    nome_peca: "Blusa básica",
    valor_venda: 50,
    status_pagamento: "",
  },
];

const vendasComparacao = [
  {
    id: "c1",
    live_id: "live-1",
    peca_id: "p1",
    cliente_nome: "Ana",
    valor_venda: 100,
    status_pagamento: "pago",
  },
  {
    id: "c2",
    live_id: "live-1",
    peca_id: "p2",
    cliente_nome: "Bruna",
    valor_venda: 100,
    status_pagamento: "pago",
  },
  {
    id: "c3",
    live_id: "live-2",
    peca_id: "p3",
    cliente_nome: "Ana",
    valor_venda: 150,
    status_pagamento: "pago",
  },
  {
    id: "c4",
    live_id: "live-2",
    peca_id: "p5",
    cliente_nome: "Carla",
    valor_venda: 150,
    status_pagamento: "pago",
  },
  {
    id: "c5",
    live_id: "live-3",
    peca_id: "p6",
    cliente_nome: "Ana",
    valor_venda: 200,
    status_pagamento: "pago",
  },
  {
    id: "c6",
    live_id: "live-3",
    peca_id: "p5",
    cliente_nome: "Ana",
    valor_venda: 200,
    status_pagamento: "pago",
  },
];

function criarDefinicao(
  operacao,
  {
    filtros = {},
    parametros = {},
  } = {}
) {
  return {
    valido: true,
    operacao,
    filtros,
    parametros,
    periodo: {
      tipo: "ultima_live",
    },
  };
}

describe("ResultProcessor", () => {
  test("rejeita contexto inválido", () => {
    const resultado =
      resultProcessor.processar(
        criarDefinicao("total"),
        null
      );

    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe(
      "contexto_invalido"
    );
  });

  test("rejeita definição sem operação", () => {
    const resultado =
      resultProcessor.processar(
        {
          valido: true,
          operacao: null,
        },
        {
          vendas,
        }
      );

    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe(
      "operacao_ausente"
    );
  });

  test("processa maior compra", () => {
    const resultado =
      resultProcessor.processar(
        criarDefinicao(
          "maior_compra"
        ),
        {
          live,
          vendas,
          pecas,
        }
      );

    expect(resultado.ok).toBe(true);
    expect(resultado.tipo).toBe(
      "maior_compra"
    );

    expect(
      resultado.dados.liveId
    ).toBe("live-1");

    expect(
      resultado.dados.cliente
    ).toMatchObject({
      nome: "Ana",
      quantidade: 2,
      valor: 180,
    });

    expect(
      resultado.dados
        .quantidadeVendas
    ).toBe(4);
  });

  test("aplica filtro de pagamento antes de calcular maior compra", () => {
    const resultado =
      resultProcessor.processar(
        criarDefinicao(
          "maior_compra",
          {
            filtros: {
              statusPagamento:
                "pago",
            },
          }
        ),
        {
          live,
          vendas,
          pecas,
        }
      );

    expect(
      resultado.dados.cliente
        .nome
    ).toBe("Ana");

    expect(
      resultado.dados.cliente
        .valor
    ).toBe(100);

    expect(
      resultado.dados
        .quantidadeVendas
    ).toBe(2);
  });

  test("processa clientes pendentes", () => {
    const resultado =
      resultProcessor.processar(
        criarDefinicao(
          "pendentes"
        ),
        {
          live,
          vendas,
          pecas,
        }
      );

    expect(resultado.ok).toBe(true);
    expect(resultado.tipo).toBe(
      "pendentes"
    );

    expect(
      resultado.dados.clientes
    ).toHaveLength(2);

    expect(
      resultado.dados
        .quantidadeClientes
    ).toBe(2);

    expect(
      resultado.dados
        .quantidadePecas
    ).toBe(2);

    expect(
      resultado.dados
        .totalPendente
    ).toBe(130);
  });

  test("processa ticket médio", () => {
    const resultado =
      resultProcessor.processar(
        criarDefinicao(
          "ticket_medio"
        ),
        {
          live,
          vendas,
          pecas,
        }
      );

    expect(resultado.ok).toBe(true);
    expect(resultado.tipo).toBe(
      "ticket_medio"
    );

    expect(
      resultado.dados
        .faturamento
    ).toBe(300);

    expect(
      resultado.dados
        .quantidadePecas
    ).toBe(4);

    expect(
      resultado.dados
        .quantidadeClientes
    ).toBe(3);

    expect(
      resultado.dados
        .ticketMedioPorPeca
    ).toBe(75);

    expect(
      resultado.dados
        .ticketMedioPorCliente
    ).toBe(100);

    expect(
      resultado.dados.ticketPeca
    ).toBe(75);

    expect(
      resultado.dados
        .ticketCliente
    ).toBe(100);
  });

  test("processa marca mais vendida", () => {
    const resultado =
      resultProcessor.processar(
        criarDefinicao(
          "mais_vendida"
        ),
        {
          live,
          vendas,
          pecas,
        }
      );

    expect(resultado.ok).toBe(true);
    expect(resultado.tipo).toBe(
      "mais_vendida"
    );

    expect(
      resultado.dados.marca
    ).toMatchObject({
      marca: "Nike",
      quantidade: 1,
      valor: 100,
    });
  });

  test("aplica filtro de marca em operação geral", () => {
    const resultado =
      resultProcessor.processar(
        criarDefinicao(
          "total",
          {
            filtros: {
              marca: "Zara",
            },
          }
        ),
        {
          live,
          vendas,
          pecas,
        }
      );

    expect(resultado.ok).toBe(true);

    expect(
      resultado.dados.quantidade
    ).toBe(1);

    expect(
      resultado.dados
        .faturamento
    ).toBe(80);
  });

  test("processa quantidade por marca", () => {
    const resultado =
      resultProcessor.processar(
        criarDefinicao(
          "quantidade",
          {
            filtros: {
              marca: "Zara",
            },
          }
        ),
        {
          live,
          vendas,
          pecas,
        }
      );

    expect(resultado.ok).toBe(true);
    expect(resultado.tipo).toBe(
      "quantidade"
    );

    expect(
      resultado.dados.marca
    ).toBe("Zara");

    expect(
      resultado.dados.quantidade
    ).toBe(1);

    expect(
      resultado.dados
        .faturamento
    ).toBe(80);

    expect(
      resultado.dados.vendas
    ).toHaveLength(1);
  });

  test("processa quantidade genérica", () => {
    const resultado =
      resultProcessor.processar(
        criarDefinicao(
          "quantidade"
        ),
        {
          live,
          vendas,
          pecas,
        }
      );

    expect(resultado.ok).toBe(true);

    expect(
      resultado.dados.marca
    ).toBeNull();

    expect(
      resultado.dados.quantidade
    ).toBe(4);

    expect(
      resultado.dados
        .faturamento
    ).toBe(300);
  });

  test("processa lucro", () => {
    const resultado =
      resultProcessor.processar(
        criarDefinicao("lucro"),
        {
          live,
          vendas,
          pecas,
        }
      );

    expect(resultado.ok).toBe(true);
    expect(resultado.tipo).toBe(
      "lucro"
    );

    expect(
      resultado.dados
        .faturamento
    ).toBe(300);

    expect(
      resultado.dados.custo
    ).toBe(90);

    expect(
      resultado.dados.lucro
    ).toBe(210);

    expect(
      resultado.dados.margem
    ).toBe(70);

    expect(
      resultado.dados
        .vendasSemCusto
    ).toBe(1);

    expect(
      resultado.dados
        .quantidadeVendas
    ).toBe(4);
  });

  test("processa total", () => {
    const resultado =
      resultProcessor.processar(
        criarDefinicao("total"),
        {
          live,
          vendas,
          pecas,
        }
      );

    expect(resultado.ok).toBe(true);
    expect(resultado.tipo).toBe(
      "total"
    );

    expect(
      resultado.dados.quantidade
    ).toBe(4);

    expect(
      resultado.dados
        .faturamento
    ).toBe(300);
  });

  test("processa comparação de lives em ordem cronológica", () => {
    const resultado =
      resultProcessor.processar(
        {
          valido: true,
          operacao:
            "comparar_lives",
          filtros: {},
          parametros: {
            limite: 3,
            objetivoComparacao:
              "completo",
          },
          periodo: {
            tipo:
              "ultimas_lives",
          },
        },
        {
          lives,
          vendas:
            vendasComparacao,
          pecas,
        }
      );

    expect(resultado.ok).toBe(true);
    expect(resultado.tipo).toBe(
      "comparar_lives"
    );

    expect(
      resultado.dados
        .quantidadeLives
    ).toBe(3);

    expect(
      resultado.dados.lives.map(
        (item) => item.id
      )
    ).toEqual([
      "live-1",
      "live-2",
      "live-3",
    ]);

    expect(
      resultado.dados.lives.map(
        (item) =>
          item.faturamento
      )
    ).toEqual([
      200,
      300,
      400,
    ]);
  });

  test("calcula variações entre as lives", () => {
    const resultado =
      resultProcessor.processar(
        {
          valido: true,
          operacao:
            "comparar_lives",
          filtros: {},
          parametros: {
            limite: 3,
          },
          periodo: {
            tipo:
              "ultimas_lives",
          },
        },
        {
          lives,
          vendas:
            vendasComparacao,
          pecas,
        }
      );

    const comparacoes =
      resultado.dados
        .comparacoes;

    expect(
      comparacoes[0]
        .variacaoPercentual
    ).toBeNull();

    expect(
      comparacoes[1]
        .variacaoAbsoluta
    ).toBe(100);

    expect(
      comparacoes[1]
        .variacaoPercentual
    ).toBe(50);

    expect(
      comparacoes[2]
        .variacaoAbsoluta
    ).toBe(100);

    expect(
      comparacoes[2]
        .variacaoPercentual
    ).toBeCloseTo(
      33.3333333333,
      5
    );
  });

  test("calcula resumo da comparação", () => {
    const resultado =
      resultProcessor.processar(
        {
          valido: true,
          operacao:
            "comparar_lives",
          filtros: {},
          parametros: {
            limite: 3,
          },
          periodo: {
            tipo:
              "ultimas_lives",
          },
        },
        {
          lives,
          vendas:
            vendasComparacao,
          pecas,
        }
      );

    expect(
      resultado.dados
        .faturamentoTotal
    ).toBe(900);

    expect(
      resultado.dados
        .faturamentoMedio
    ).toBe(300);

    expect(
      resultado.dados
        .maiorFaturamento.id
    ).toBe("live-3");

    expect(
      resultado.dados
        .menorFaturamento.id
    ).toBe("live-1");

    expect(
      resultado.dados
        .variacaoTotalPercentual
    ).toBe(100);

    expect(
      resultado.dados
        .tendencia
    ).toBe("crescimento");

    expect(
      resultado.dados
        .primeiraLive.id
    ).toBe("live-1");

    expect(
      resultado.dados
        .ultimaLive.id
    ).toBe("live-3");
  });

  test("limita a quantidade de lives processadas", () => {
    const resultado =
      resultProcessor.processar(
        {
          valido: true,
          operacao:
            "comparar_lives",
          filtros: {},
          parametros: {
            limite: 2,
          },
          periodo: {
            tipo:
              "ultimas_lives",
          },
        },
        {
          lives,
          vendas:
            vendasComparacao,
          pecas,
        }
      );

    expect(
      resultado.dados
        .quantidadeLives
    ).toBe(2);

    /*
     * As duas lives mais recentes recebidas são:
     * live-3 e live-2. O processor as reverte para
     * ordem cronológica: live-2 e live-3.
     */
    expect(
      resultado.dados.lives.map(
        (item) => item.id
      )
    ).toEqual([
      "live-2",
      "live-3",
    ]);
  });

  test("retorna comparação vazia quando não existem lives", () => {
    const resultado =
      resultProcessor.processar(
        {
          valido: true,
          operacao:
            "comparar_lives",
          filtros: {},
          parametros: {
            limite: 5,
          },
          periodo: {
            tipo:
              "ultimas_lives",
          },
        },
        {
          lives: [],
          vendas: [],
          pecas: [],
        }
      );

    expect(resultado.ok).toBe(true);

    expect(
      resultado.dados.lives
    ).toEqual([]);

    expect(
      resultado.dados
        .comparacoes
    ).toEqual([]);

    expect(
      resultado.dados
        .quantidadeLives
    ).toBe(0);

    expect(
      resultado.dados
        .maiorFaturamento
    ).toBeNull();

    expect(
      resultado.dados
        .menorFaturamento
    ).toBeNull();
  });

  test("trata contexto sem arrays como listas vazias", () => {
    const resultado =
      resultProcessor.processar(
        criarDefinicao("total"),
        {
          live,
          vendas: null,
          pecas: null,
        }
      );

    expect(resultado.ok).toBe(true);

    expect(
      resultado.dados.quantidade
    ).toBe(0);

    expect(
      resultado.dados
        .faturamento
    ).toBe(0);
  });

  test("rejeita operação não suportada", () => {
    const resultado =
      resultProcessor.processar(
        criarDefinicao(
          "operacao_inexistente"
        ),
        {
          live,
          vendas,
          pecas,
        }
      );

    expect(resultado.ok).toBe(false);

    expect(resultado.motivo).toBe(
      "operacao_nao_suportada"
    );

    expect(resultado.operacao).toBe(
      "operacao_inexistente"
    );
  });
});