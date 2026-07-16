import {
  describe,
  expect,
  test,
} from "vitest";

import plannerEngine from "../../planner/PlannerEngine";
import queryBuilder from "../../query/QueryBuilder";
import resultProcessor from "../../results/ResultProcessor";

import { lives } from "../fixtures/lives";

const ultimaLive =
  lives[0] || null;

const pecasEstoque = [
  {
    id: "estoque-p1",
    nome: "Jaqueta Nike",
    marca: "Nike",
    categoria: "Jaqueta",
    custo: 40,
  },
  {
    id: "estoque-p2",
    nome: "Camiseta Nike",
    marca: "Nike",
    categoria: "Camiseta",
    custo: 20,
  },
  {
    id: "estoque-p3",
    nome: "Calça Zara",
    marca: "Zara",
    categoria: "Calça",
    custo: 30,
  },
  {
    id: "estoque-p4",
    nome: "Vestido Zara",
    marca: "Zara",
    categoria: "Vestido",
    custo: 35,
  },
  {
    id: "estoque-p5",
    nome: "Moletom Adidas",
    marca: "Adidas",
    categoria: "Moletom",
    custo: 25,
  },
  {
    id: "estoque-p6",
    nome: "Blusa sem marca",
    marca: null,
    categoria: "Blusa",
    custo: 15,
  },
];

const vendasEstoque = [
  {
    id: "estoque-v1",
    live_id:
      ultimaLive?.id ||
      "live-3",
    peca_id: "estoque-p1",
    cliente_nome: "Ana",
    nome_peca:
      "Jaqueta Nike",
    valor_venda: 120,
    status_pagamento:
      "pago",
    data_hora:
      "15/07/2026, 20:00:00",
  },
  {
    id: "estoque-v2",
    live_id:
      ultimaLive?.id ||
      "live-3",
    peca_id: "estoque-p2",
    cliente_nome: "Bruna",
    nome_peca:
      "Camiseta Nike",
    valor_venda: 80,
    status_pagamento:
      "pago",
    data_hora:
      "15/07/2026, 20:10:00",
  },
  {
    id: "estoque-v3",
    live_id:
      ultimaLive?.id ||
      "live-3",
    peca_id: "estoque-p3",
    cliente_nome: "Carla",
    nome_peca:
      "Calça Zara",
    valor_venda: 100,
    status_pagamento:
      "pago",
    data_hora:
      "15/07/2026, 20:20:00",
  },
  {
    id: "estoque-v4",
    live_id:
      ultimaLive?.id ||
      "live-3",
    peca_id: "estoque-p4",
    cliente_nome: "Daniela",
    nome_peca:
      "Vestido Zara",
    valor_venda: 90,
    status_pagamento:
      "pendente",
    data_hora:
      "15/07/2026, 20:30:00",
  },
  {
    id: "estoque-v5",
    live_id:
      ultimaLive?.id ||
      "live-3",
    peca_id: "estoque-p5",
    cliente_nome: "Elaine",
    nome_peca:
      "Moletom Adidas",
    valor_venda: 70,
    status_pagamento:
      "pago",
    data_hora:
      "15/07/2026, 20:40:00",
  },
  {
    id: "estoque-v6",
    live_id:
      ultimaLive?.id ||
      "live-3",
    peca_id: "estoque-p6",
    cliente_nome: "Fernanda",
    nome_peca:
      "Blusa sem marca",
    valor_venda: 50,
    status_pagamento:
      "pago",
    data_hora:
      "15/07/2026, 20:50:00",
  },
];

describe("Integração - Estoque", () => {
  function executar(
    pergunta,
    contexto = {
      live: ultimaLive,
      lives,
      vendas:
        vendasEstoque,
      pecas:
        pecasEstoque,
    }
  ) {
    const plano =
      plannerEngine.criarPlano(
        pergunta
      );

    expect(plano.encontrado).toBe(
      true
    );

    const definicao =
      queryBuilder.construir(
        plano
      );

    expect(definicao.valido).toBe(
      true
    );

    const resultado =
      resultProcessor.processar(
        definicao,
        contexto
      );

    return {
      plano,
      definicao,
      resultado,
    };
  }

  test("identifica a marca mais vendida", () => {
    const { resultado } =
      executar(
        "Qual marca mais vendeu na última live?"
      );

    expect(resultado.ok).toBe(
      true
    );

    expect(resultado.tipo).toBe(
      "mais_vendida"
    );

    expect(
      resultado.dados.marca
    ).toBeTruthy();

    expect(
      resultado.dados.marca.marca
    ).toBe("Nike");
  });

  test("calcula a quantidade da marca mais vendida", () => {
    const { resultado } =
      executar(
        "Qual marca mais vendeu na última live?"
      );

    expect(
      resultado.dados.marca
        .quantidade
    ).toBe(2);
  });

  test("calcula o faturamento da marca mais vendida", () => {
    const { resultado } =
      executar(
        "Qual marca mais vendeu na última live?"
      );

    expect(
      resultado.dados.marca.valor
    ).toBe(200);
  });

  test("usa faturamento como desempate entre marcas", () => {
    const { resultado } =
      executar(
        "Qual marca mais vendeu na última live?"
      );

    /*
     * Nike e Zara possuem duas vendas.
     * Nike faturou R$ 200,00 e Zara
     * faturou R$ 190,00.
     */
    expect(
      resultado.dados.marca.marca
    ).toBe("Nike");
  });

  test("calcula quantidade vendida da Nike", () => {
    const { resultado } =
      executar(
        "Quantas peças Nike foram vendidas na última live?"
      );

    expect(resultado.ok).toBe(
      true
    );

    expect(resultado.tipo).toBe(
      "quantidade"
    );

    expect(
      resultado.dados.marca
    ).toBe("Nike");

    expect(
      resultado.dados.quantidade
    ).toBe(2);
  });

  test("calcula faturamento da Nike", () => {
    const { resultado } =
      executar(
        "Quantas peças Nike foram vendidas na última live?"
      );

    expect(
      resultado.dados
        .faturamento
    ).toBe(200);
  });

  test("retorna as vendas relacionadas à marca", () => {
    const { resultado } =
      executar(
        "Quantas peças Zara foram vendidas na última live?"
      );

    expect(
      resultado.dados.vendas
    ).toHaveLength(2);

    expect(
      resultado.dados.vendas.every(
        (venda) =>
          [
            "estoque-p3",
            "estoque-p4",
          ].includes(
            venda.peca_id
          )
      )
    ).toBe(true);
  });

  test("identifica marca pelo relacionamento com a peça", () => {
    const vendasSemMarcaDireta =
      vendasEstoque.map(
        (venda) => {
          const copia = {
            ...venda,
          };

          delete copia.marca;
          delete copia.marca_nome;
          delete copia.marca_peca;

          return copia;
        }
      );

    const { resultado } =
      executar(
        "Quantas peças Adidas foram vendidas na última live?",
        {
          live: ultimaLive,
          lives,
          vendas:
            vendasSemMarcaDireta,
          pecas:
            pecasEstoque,
        }
      );

    expect(
      resultado.dados.quantidade
    ).toBe(1);

    expect(
      resultado.dados
        .faturamento
    ).toBe(70);
  });

  test("identifica marca pelo nome da peça", () => {
    const vendasPeloNome = [
      {
        id: "nome-marca-1",
        live_id:
          ultimaLive?.id ||
          "live-3",
        peca_id:
          "peca-inexistente",
        cliente_nome: "Ana",
        nome_peca:
          "Jaqueta Columbia impermeável",
        valor_venda: 180,
        status_pagamento:
          "pago",
      },
    ];

    const { resultado } =
      executar(
        "Quantas peças Columbia foram vendidas na última live?",
        {
          live: ultimaLive,
          lives,
          vendas:
            vendasPeloNome,
          pecas: [],
        }
      );

    expect(
      resultado.dados.quantidade
    ).toBe(1);

    expect(
      resultado.dados
        .faturamento
    ).toBe(180);
  });

  test("retorna zero quando a marca não possui vendas", () => {
    const { resultado } =
      executar(
        "Quantas peças Puma foram vendidas na última live?"
      );

    expect(resultado.ok).toBe(
      true
    );

    expect(
      resultado.dados.marca
    ).toBe("Puma");

    expect(
      resultado.dados.quantidade
    ).toBe(0);

    expect(
      resultado.dados
        .faturamento
    ).toBe(0);

    expect(
      resultado.dados.vendas
    ).toEqual([]);
  });

  test("ignora itens sem marca no ranking principal", () => {
    const vendasComSemMarca = [
      ...vendasEstoque,
      {
        id: "sem-marca-extra-1",
        live_id:
          ultimaLive?.id ||
          "live-3",
        peca_id:
          "estoque-p6",
        cliente_nome: "Gabriela",
        nome_peca:
          "Blusa sem marca",
        valor_venda: 500,
        status_pagamento:
          "pago",
      },
      {
        id: "sem-marca-extra-2",
        live_id:
          ultimaLive?.id ||
          "live-3",
        peca_id:
          "estoque-p6",
        cliente_nome: "Helena",
        nome_peca:
          "Blusa sem marca",
        valor_venda: 500,
        status_pagamento:
          "pago",
      },
      {
        id: "sem-marca-extra-3",
        live_id:
          ultimaLive?.id ||
          "live-3",
        peca_id:
          "estoque-p6",
        cliente_nome: "Isabela",
        nome_peca:
          "Blusa sem marca",
        valor_venda: 500,
        status_pagamento:
          "pago",
      },
    ];

    const { resultado } =
      executar(
        "Qual marca mais vendeu na última live?",
        {
          live: ultimaLive,
          lives,
          vendas:
            vendasComSemMarca,
          pecas:
            pecasEstoque,
        }
      );

    expect(
      resultado.dados.marca.marca
    ).not.toBe("Sem marca");

    expect(
      resultado.dados.marca.marca
    ).toBe("Nike");
  });

  test("retorna marca nula quando não existem vendas com marca", () => {
    const vendasSemMarca = [
      {
        id: "somente-sem-marca",
        live_id:
          ultimaLive?.id ||
          "live-3",
        peca_id:
          "estoque-p6",
        cliente_nome: "Ana",
        nome_peca:
          "Blusa básica",
        valor_venda: 50,
        status_pagamento:
          "pago",
      },
    ];

    const { resultado } =
      executar(
        "Qual marca mais vendeu na última live?",
        {
          live: ultimaLive,
          lives,
          vendas:
            vendasSemMarca,
          pecas: [
            {
              id: "estoque-p6",
              nome:
                "Blusa básica",
              marca: null,
            },
          ],
        }
      );

    expect(resultado.ok).toBe(
      true
    );

    expect(
      resultado.dados.marca
    ).toBeNull();
  });

  test("preserva a operação mais vendida", () => {
    const { plano } =
      executar(
        "Qual marca mais vendeu na última live?"
      );

    expect(plano.operacao).toBe(
      "mais_vendida"
    );
  });

  test("preserva a operação quantidade", () => {
    const { plano } =
      executar(
        "Quantas peças Zara foram vendidas na última live?"
      );

    expect(plano.operacao).toBe(
      "quantidade"
    );
  });

  test("preserva o filtro de marca", () => {
    const {
      plano,
      definicao,
    } = executar(
      "Quantas peças Zara foram vendidas na última live?"
    );

    expect(
      plano.filtros.marca
    ).toBe("Zara");

    expect(
      definicao.filtros.marca
    ).toBe("Zara");
  });

  test("preserva o período da última live", () => {
    const { plano } =
      executar(
        "Qual marca mais vendeu na última live?"
      );

    expect(plano.periodo).toBe(
      "ultima_live"
    );
  });

  test("mantém a live no resultado", () => {
    const { resultado } =
      executar(
        "Qual marca mais vendeu na última live?"
      );

    expect(
      resultado.dados.liveId
    ).toBe(ultimaLive.id);

    expect(
      resultado.dados.live
    ).toEqual(ultimaLive);
  });

  test("não quebra quando não existem vendas", () => {
    const { resultado } =
      executar(
        "Qual marca mais vendeu na última live?",
        {
          live: ultimaLive,
          lives,
          vendas: [],
          pecas:
            pecasEstoque,
        }
      );

    expect(resultado.ok).toBe(
      true
    );

    expect(
      resultado.dados.marca
    ).toBeNull();
  });

  test("não quebra quando não existem peças relacionadas", () => {
    const { resultado } =
      executar(
        "Qual marca mais vendeu na última live?",
        {
          live: ultimaLive,
          lives,
          vendas:
            vendasEstoque,
          pecas: [],
        }
      );

    expect(resultado.ok).toBe(
      true
    );

    /*
     * As marcas ainda podem ser identificadas
     * pelo nome registrado nas vendas.
     */
    expect(
      resultado.dados.marca
    ).toBeTruthy();
  });

  test("rejeita contexto inválido", () => {
    const plano =
      plannerEngine.criarPlano(
        "Qual marca mais vendeu na última live?"
      );

    const definicao =
      queryBuilder.construir(
        plano
      );

    const resultado =
      resultProcessor.processar(
        definicao,
        null
      );

    expect(resultado.ok).toBe(
      false
    );

    expect(resultado.motivo).toBe(
      "contexto_invalido"
    );
  });
});