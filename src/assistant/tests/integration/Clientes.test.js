import {
  describe,
  expect,
  test,
} from "vitest";

import plannerEngine from "../../planner/PlannerEngine";
import queryBuilder from "../../query/QueryBuilder";
import resultProcessor from "../../results/ResultProcessor";

import { lives } from "../fixtures/lives";
import { vendas } from "../fixtures/vendas";

const ultimaLive = lives[0];

const vendasUltimaLive =
  vendas.filter(
    (venda) =>
      String(venda.live_id) ===
      String(ultimaLive.id)
  );

function criarVendasComPendencias() {
  return vendasUltimaLive.map(
    (venda, index) => ({
      ...venda,

      status_pagamento:
        index < 2
          ? "pendente"
          : "pago",
    })
  );
}

describe("Integração - Clientes", () => {
  function executar(
    pergunta,
    contexto = {
      live: ultimaLive,
      lives,
      vendas:
        vendasUltimaLive,
      pecas: [],
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

  test("identifica o cliente com maior compra", () => {
    const { resultado } =
      executar(
        "Qual cliente mais comprou na última live?"
      );

    expect(resultado.ok).toBe(
      true
    );

    expect(resultado.tipo).toBe(
      "maior_compra"
    );

    expect(
      resultado.dados.cliente
    ).toBeTruthy();

    expect(
      resultado.dados.cliente.nome
    ).toBe("Ana");

    expect(
      resultado.dados.cliente.valor
    ).toBe(100);

    expect(
      resultado.dados.cliente
        .quantidade
    ).toBe(1);
  });

  test("agrupa compras repetidas do mesmo cliente", () => {
    const vendasRepetidas = [
      ...vendasUltimaLive,
      {
        id: "venda-extra-ana",
        live_id:
          ultimaLive.id,
        peca_id: "p10",
        cliente_nome: "Ana",
        nome_peca:
          "Blusa extra",
        valor_venda: 150,
        status_pagamento:
          "pago",
        data_hora:
          "15/07/2026, 20:40:00",
      },
    ];

    const { resultado } =
      executar(
        "Qual cliente mais comprou na última live?",
        {
          live: ultimaLive,
          lives,
          vendas:
            vendasRepetidas,
          pecas: [],
        }
      );

    expect(
      resultado.dados.cliente.nome
    ).toBe("Ana");

    expect(
      resultado.dados.cliente
        .quantidade
    ).toBe(2);

    expect(
      resultado.dados.cliente.valor
    ).toBe(250);
  });

  test("identifica clientes pendentes", () => {
    const vendasComPendencias =
      criarVendasComPendencias();

    const { resultado } =
      executar(
        "Quem ainda não pagou na última live?",
        {
          live: ultimaLive,
          lives,
          vendas:
            vendasComPendencias,
          pecas: [],
        }
      );

    expect(resultado.ok).toBe(
      true
    );

    expect(resultado.tipo).toBe(
      "pendentes"
    );

    expect(
      resultado.dados.clientes
    ).toHaveLength(2);
  });

  test("calcula quantidade de clientes pendentes", () => {
    const vendasComPendencias =
      criarVendasComPendencias();

    const { resultado } =
      executar(
        "Quem ainda não pagou na última live?",
        {
          live: ultimaLive,
          lives,
          vendas:
            vendasComPendencias,
          pecas: [],
        }
      );

    expect(
      resultado.dados
        .quantidadeClientes
    ).toBe(2);
  });

  test("calcula quantidade de peças pendentes", () => {
    const vendasComPendencias =
      criarVendasComPendencias();

    const { resultado } =
      executar(
        "Quem ainda não pagou na última live?",
        {
          live: ultimaLive,
          lives,
          vendas:
            vendasComPendencias,
          pecas: [],
        }
      );

    expect(
      resultado.dados
        .quantidadePecas
    ).toBe(2);
  });

  test("calcula o valor total pendente", () => {
    const vendasComPendencias =
      criarVendasComPendencias();

    const { resultado } =
      executar(
        "Quem ainda não pagou na última live?",
        {
          live: ultimaLive,
          lives,
          vendas:
            vendasComPendencias,
          pecas: [],
        }
      );

    expect(
      resultado.dados
        .totalPendente
    ).toBe(200);
  });

  test("ordena clientes pendentes pelo maior valor", () => {
    const vendasComPendencias = [
      {
        id: "pendente-ana",
        live_id:
          ultimaLive.id,
        cliente_nome: "Ana",
        valor_venda: 100,
        status_pagamento:
          "pendente",
      },
      {
        id: "pendente-bruna-1",
        live_id:
          ultimaLive.id,
        cliente_nome: "Bruna",
        valor_venda: 150,
        status_pagamento:
          "pendente",
      },
      {
        id: "pendente-bruna-2",
        live_id:
          ultimaLive.id,
        cliente_nome: "Bruna",
        valor_venda: 100,
        status_pagamento:
          "pendente",
      },
    ];

    const { resultado } =
      executar(
        "Quem ainda não pagou na última live?",
        {
          live: ultimaLive,
          lives,
          vendas:
            vendasComPendencias,
          pecas: [],
        }
      );

    expect(
      resultado.dados
        .clientes[0].nome
    ).toBe("Bruna");

    expect(
      resultado.dados
        .clientes[0].valor
    ).toBe(250);

    expect(
      resultado.dados
        .clientes[0].quantidade
    ).toBe(2);
  });

  test("retorna lista vazia quando não existem pendências", () => {
    const vendasPagas =
      vendasUltimaLive.map(
        (venda) => ({
          ...venda,
          status_pagamento:
            "pago",
        })
      );

    const { resultado } =
      executar(
        "Quem ainda não pagou na última live?",
        {
          live: ultimaLive,
          lives,
          vendas:
            vendasPagas,
          pecas: [],
        }
      );

    expect(resultado.ok).toBe(
      true
    );

    expect(
      resultado.dados.clientes
    ).toEqual([]);

    expect(
      resultado.dados
        .quantidadeClientes
    ).toBe(0);

    expect(
      resultado.dados
        .quantidadePecas
    ).toBe(0);

    expect(
      resultado.dados
        .totalPendente
    ).toBe(0);
  });

  test("retorna cliente nulo quando não existem vendas", () => {
    const { resultado } =
      executar(
        "Qual cliente mais comprou na última live?",
        {
          live: ultimaLive,
          lives,
          vendas: [],
          pecas: [],
        }
      );

    expect(resultado.ok).toBe(
      true
    );

    expect(
      resultado.dados.cliente
    ).toBeNull();

    expect(
      resultado.dados
        .quantidadeVendas
    ).toBe(0);
  });

  test("preserva o domínio clientes", () => {
    const { plano } =
      executar(
        "Qual cliente mais comprou na última live?"
      );

    expect(plano.dominio).toBe(
      "clientes"
    );
  });

  test("preserva a operação maior compra", () => {
    const { plano } =
      executar(
        "Qual cliente mais comprou na última live?"
      );

    expect(plano.operacao).toBe(
      "maior_compra"
    );
  });

  test("preserva a operação pendentes", () => {
    const { plano } =
      executar(
        "Quem ainda não pagou na última live?"
      );

    expect(plano.operacao).toBe(
      "pendentes"
    );
  });

  test("preserva o período da última live", () => {
    const { plano } =
      executar(
        "Qual cliente mais comprou na última live?"
      );

    expect(plano.periodo).toBe(
      "ultima_live"
    );
  });

  test("mantém a live no resultado", () => {
    const { resultado } =
      executar(
        "Qual cliente mais comprou na última live?"
      );

    expect(
      resultado.dados.liveId
    ).toBe(ultimaLive.id);

    expect(
      resultado.dados.live
    ).toEqual(ultimaLive);
  });

  test("rejeita contexto inválido", () => {
    const plano =
      plannerEngine.criarPlano(
        "Qual cliente mais comprou na última live?"
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