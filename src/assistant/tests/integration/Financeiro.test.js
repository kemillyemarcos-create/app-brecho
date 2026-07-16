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
import { pecas } from "../fixtures/pecas";

describe("Integração - Financeiro", () => {
  function executar(
    pergunta,
    contexto = {
      lives,
      vendas,
      pecas,
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

    return {
      plano,
      definicao,
      resultado:
        resultProcessor.processar(
          definicao,
          contexto
        ),
    };
  }

  test("calcula lucro da última live", () => {
    const { resultado } =
      executar(
        "Qual foi o lucro da última live?"
      );

    expect(resultado.ok).toBe(true);

    expect(
      resultado.dados.faturamento
    ).toBeGreaterThan(0);

    expect(
      resultado.dados.lucro
    ).toBeGreaterThan(0);

    expect(
      resultado.dados.margem
    ).toBeGreaterThan(0);
  });

  test("calcula faturamento total", () => {
    const { resultado } =
      executar(
        "Qual foi o faturamento da última live?"
      );

    expect(resultado.ok).toBe(true);

    expect(
      resultado.dados.faturamento
    ).toBeGreaterThan(0);
  });

  test("calcula ticket médio", () => {
    const { resultado } =
      executar(
        "Qual foi o ticket médio da última live?"
      );

    expect(resultado.ok).toBe(true);

    expect(
      resultado.dados.ticketCliente
    ).toBeGreaterThan(0);

    expect(
      resultado.dados.ticketPeca
    ).toBeGreaterThan(0);
  });

  test("retorna quantidade de clientes", () => {
  const { resultado } =
    executar(
      "Qual foi o ticket médio da última live?"
    );

  expect(
    resultado.dados
      .quantidadeClientes
  ).toBeGreaterThan(0);
});

  test("retorna quantidade de peças", () => {
  const { resultado } =
    executar(
      "Qual foi o ticket médio da última live?"
    );

  expect(
    resultado.dados
      .quantidadePecas
  ).toBeGreaterThan(0);
});

  test("identifica vendas sem custo", () => {
  const vendasSemCusto =
    vendas.map((venda) => ({
      ...venda,
      custo: null,
      valor_compra: null,
      preco_compra: null,
    }));

  const { resultado } =
    executar(
      "Qual foi o lucro da última live?",
      {
        lives,
        vendas: vendasSemCusto,
        pecas: [],
      }
    );

  expect(resultado.ok).toBe(
    true
  );

  expect(
    resultado.dados
      .vendasSemCusto
  ).toBe(
    vendasSemCusto.length
  );

  expect(
    resultado.dados.custo
  ).toBe(0);

  expect(
    resultado.dados.lucro
  ).toBe(
    resultado.dados
      .faturamento
  );
});

  test("não quebra quando não existem vendas", () => {
    const { resultado } =
      executar(
        "Qual foi o faturamento da última live?",
        {
          lives,
          vendas: [],
          pecas,
        }
      );

    expect(resultado.ok).toBe(true);

    expect(
      resultado.dados.faturamento
    ).toBe(0);
  });

  test("mantém período identificado", () => {
    const { plano } =
      executar(
        "Qual foi o faturamento da última live?"
      );

    expect(
      plano.periodo
    ).toBe("ultima_live");
  });

  test("mantém operação identificada", () => {
    const { plano } =
      executar(
        "Qual foi o lucro da última live?"
      );

    expect(
      plano.operacao
    ).toBe("lucro");
  });

  test("mantém domínio identificado", () => {
    const { plano } =
      executar(
        "Qual foi o lucro da última live?"
      );

    expect(
      plano.dominio
    ).toBe("financeiro");
  });

  test("rejeita contexto inválido", () => {
    const plano =
      plannerEngine.criarPlano(
        "Qual foi o lucro da última live?"
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
  });

  test("processa lucro mesmo sem peças", () => {
    const { resultado } =
      executar(
        "Qual foi o lucro da última live?",
        {
          lives,
          vendas,
          pecas: [],
        }
      );

    expect(resultado.ok).toBe(true);
  });

  test("processa ticket mesmo sem peças", () => {
    const { resultado } =
      executar(
        "Qual foi o ticket médio da última live?",
        {
          lives,
          vendas,
          pecas: [],
        }
      );

    expect(resultado.ok).toBe(true);
  });

  test("não altera definição durante processamento", () => {
    const {
      definicao,
      resultado,
    } = executar(
      "Qual foi o lucro da última live?"
    );

    expect(resultado.ok).toBe(true);

    expect(
      definicao.operacao
    ).toBe("lucro");
  });
});