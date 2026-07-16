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

describe("Integração - Comparação de Lives", () => {
  function executar(
    pergunta,
    contexto = {
      lives,
      vendas,
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

  test("compara as últimas 3 lives", () => {
    const { resultado } =
      executar(
        "Compare as últimas 3 lives"
      );

    expect(resultado.ok).toBe(true);

    expect(
      resultado.dados.lives
    ).toHaveLength(3);

    expect(
      resultado.dados
        .maiorFaturamento.nome
    ).toBe("Live 15/07");

    expect(
      resultado.dados
        .menorFaturamento.nome
    ).toBe("Live 01/07");
  });

  test("identifica a melhor live", () => {
    const {
      plano,
      definicao,
      resultado,
    } = executar(
      "Qual foi a melhor das últimas 3 lives?"
    );

    expect(
      plano.parametros
        .objetivoComparacao
    ).toBe("melhor");

    expect(
      definicao.parametros
        .objetivoComparacao
    ).toBe("melhor");

    expect(
      resultado.dados
        .maiorFaturamento.nome
    ).toBe("Live 15/07");

    expect(
      resultado.dados
        .maiorFaturamento
        .faturamento
    ).toBe(400);
  });

  test("identifica a pior live", () => {
    const {
      plano,
      definicao,
      resultado,
    } = executar(
      "Qual foi a pior das últimas 3 lives?"
    );

    expect(
      plano.parametros
        .objetivoComparacao
    ).toBe("pior");

    expect(
      definicao.parametros
        .objetivoComparacao
    ).toBe("pior");

    expect(
      resultado.dados
        .menorFaturamento.nome
    ).toBe("Live 01/07");

    expect(
      resultado.dados
        .menorFaturamento
        .faturamento
    ).toBe(200);
  });

  test("usa cinco lives como limite padrão", () => {
    const plano =
      plannerEngine.criarPlano(
        "Compare as últimas lives"
      );

    expect(
      plano.parametros.limite
    ).toBe(5);
  });

  test("respeita o limite solicitado", () => {
    const plano =
      plannerEngine.criarPlano(
        "Compare as últimas 10 lives"
      );

    expect(
      plano.parametros.limite
    ).toBe(10);
  });

  test("identifica tendência de crescimento", () => {
    const { resultado } =
      executar(
        "Compare as últimas 3 lives"
      );

    expect(
      resultado.dados.tendencia
    ).toBe("crescimento");
  });

  test("calcula faturamento médio", () => {
    const { resultado } =
      executar(
        "Compare as últimas 3 lives"
      );

    expect(
      resultado.dados
        .faturamentoMedio
    ).toBe(300);
  });

  test("calcula faturamento total", () => {
    const { resultado } =
      executar(
        "Compare as últimas 3 lives"
      );

    expect(
      resultado.dados
        .faturamentoTotal
    ).toBe(900);
  });

  test("calcula variações entre as lives", () => {
    const { resultado } =
      executar(
        "Compare as últimas 3 lives"
      );

    expect(
      resultado.dados
        .comparacoes[0]
        .variacaoPercentual
    ).toBeNull();

    expect(
      resultado.dados
        .comparacoes[1]
        .variacaoPercentual
    ).toBe(50);

    expect(
      resultado.dados
        .comparacoes[2]
        .variacaoPercentual
    ).toBeCloseTo(
      33.333333,
      5
    );
  });

  test("mantém a primeira live como base inicial", () => {
    const { resultado } =
      executar(
        "Compare as últimas 3 lives"
      );

    expect(
      resultado.dados
        .comparacoes[0]
        .variacaoAbsoluta
    ).toBeNull();

    expect(
      resultado.dados
        .comparacoes[0]
        .variacaoPercentual
    ).toBeNull();
  });

  test("organiza as lives em ordem cronológica", () => {
    const { resultado } =
      executar(
        "Compare as últimas 3 lives"
      );

    expect(
      resultado.dados.lives.map(
        (item) => item.id
      )
    ).toEqual([
      "live-1",
      "live-2",
      "live-3",
    ]);
  });

  test("calcula a variação total", () => {
    const { resultado } =
      executar(
        "Compare as últimas 3 lives"
      );

    expect(
      resultado.dados
        .variacaoTotalPercentual
    ).toBe(100);
  });

  test("identifica objetivo completo", () => {
    const plano =
      plannerEngine.criarPlano(
        "Compare as últimas 3 lives"
      );

    expect(
      plano.parametros
        .objetivoComparacao
    ).toBe("completo");
  });

  test("identifica objetivo melhor", () => {
    const plano =
      plannerEngine.criarPlano(
        "Qual foi a melhor das últimas 5 lives?"
      );

    expect(
      plano.parametros
        .objetivoComparacao
    ).toBe("melhor");
  });

  test("identifica objetivo pior", () => {
    const plano =
      plannerEngine.criarPlano(
        "Qual foi a pior das últimas 5 lives?"
      );

    expect(
      plano.parametros
        .objetivoComparacao
    ).toBe("pior");
  });

  test("não quebra quando não existem lives", () => {
    const { resultado } =
      executar(
        "Compare as últimas 3 lives",
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
        .maiorFaturamento
    ).toBeNull();

    expect(
      resultado.dados
        .menorFaturamento
    ).toBeNull();
  });
});