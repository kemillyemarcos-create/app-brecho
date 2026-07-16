import {
  describe,
  expect,
  test,
} from "vitest";

import plannerEngine from "../planner/PlannerEngine";
import queryBuilder from "../query/QueryBuilder";

function criarDefinicao(pergunta) {
  const plano =
    plannerEngine.criarPlano(
      pergunta
    );

  return queryBuilder.construir(
    plano
  );
}

describe("QueryBuilder", () => {
  test("constrói consultas para lucro da última live", () => {
    const definicao =
      criarDefinicao(
        "Qual foi o lucro da última live?"
      );

    expect(definicao.valido).toBe(true);
    expect(definicao.operacao).toBe(
      "lucro"
    );

    expect(
      definicao.periodo.tipo
    ).toBe("ultima_live");

    expect(
      definicao.periodo
        .requerUltimaLive
    ).toBe(true);

    expect(
      definicao.consultas
    ).toEqual([
      {
        id: "ultima_live",
        tipo:
          "buscar_ultima_live",
        fonte: "lives",
      },
      {
        id: "vendas",
        tipo:
          "buscar_vendas_da_live",
        fonte: "vendasLive",
        dependeDe:
          "ultima_live",
      },
      {
        id: "pecas",
        tipo:
          "buscar_pecas_por_ids_das_vendas",
        fonte: "pecas",
        dependeDe: "vendas",
      },
    ]);
  });

  test("constrói consultas para maior compra da última live", () => {
    const definicao =
      criarDefinicao(
        "Qual cliente mais comprou na última live?"
      );

    expect(definicao.valido).toBe(true);
    expect(definicao.operacao).toBe(
      "maior_compra"
    );

    expect(
      definicao.consultas
    ).toEqual([
      {
        id: "ultima_live",
        tipo:
          "buscar_ultima_live",
        fonte: "lives",
      },
      {
        id: "vendas",
        tipo:
          "buscar_vendas_da_live",
        fonte: "vendasLive",
        dependeDe:
          "ultima_live",
      },
    ]);
  });

  test("constrói consultas para ticket médio da última live", () => {
    const definicao =
      criarDefinicao(
        "Qual foi o ticket médio da última live?"
      );

    expect(definicao.valido).toBe(true);
    expect(definicao.operacao).toBe(
      "ticket_medio"
    );

    expect(
      definicao.consultas
    ).toHaveLength(2);

    expect(
      definicao.consultas.map(
        (consulta) =>
          consulta.tipo
      )
    ).toEqual([
      "buscar_ultima_live",
      "buscar_vendas_da_live",
    ]);
  });

  test("carrega peças para marca mais vendida", () => {
    const definicao =
      criarDefinicao(
        "Qual marca mais vendeu na última live?"
      );

    expect(definicao.valido).toBe(true);
    expect(definicao.operacao).toBe(
      "mais_vendida"
    );

    expect(
      definicao.consultas.map(
        (consulta) =>
          consulta.tipo
      )
    ).toEqual([
      "buscar_ultima_live",
      "buscar_vendas_da_live",
      "buscar_pecas_por_ids_das_vendas",
    ]);
  });

  test("carrega peças para quantidade por marca", () => {
    const definicao =
      criarDefinicao(
        "Quantas peças Zara foram vendidas na última live?"
      );

    expect(definicao.valido).toBe(true);
    expect(definicao.operacao).toBe(
      "quantidade"
    );

    expect(
      definicao.filtros.marca
    ).toBe("Zara");

    expect(
      definicao.consultas.map(
        (consulta) =>
          consulta.tipo
      )
    ).toContain(
      "buscar_pecas_por_ids_das_vendas"
    );
  });

  test("constrói comparação das últimas três lives", () => {
    const definicao =
      criarDefinicao(
        "Compare as últimas 3 lives."
      );

    expect(definicao.valido).toBe(true);
    expect(definicao.operacao).toBe(
      "comparar_lives"
    );

    expect(
      definicao.periodo.tipo
    ).toBe("ultimas_lives");

    expect(
      definicao.periodo
        .requerMultiplasLives
    ).toBe(true);

    expect(
      definicao.parametros.limite
    ).toBe(3);

    expect(
      definicao.parametros
        .objetivoComparacao
    ).toBe("completo");

    expect(
      definicao.consultas
    ).toEqual([
      {
        id: "lives",
        tipo:
          "buscar_ultimas_lives",
        fonte: "lives",
        limite: 3,
      },
      {
        id: "vendas",
        tipo:
          "buscar_vendas_das_lives",
        fonte: "vendasLive",
        dependeDe: "lives",
        limite: 3,
      },
      {
        id: "pecas",
        tipo:
          "buscar_pecas_por_ids_das_vendas",
        fonte: "pecas",
        dependeDe: "vendas",
      },
    ]);
  });

  test("preserva o objetivo melhor na definição", () => {
    const definicao =
      criarDefinicao(
        "Qual foi a melhor das últimas 5 lives?"
      );

    expect(definicao.valido).toBe(true);

    expect(
      definicao.parametros.limite
    ).toBe(5);

    expect(
      definicao.parametros
        .objetivoComparacao
    ).toBe("melhor");
  });

  test("preserva o objetivo pior na definição", () => {
    const definicao =
      criarDefinicao(
        "Qual foi a pior das últimas 10 lives?"
      );

    expect(definicao.valido).toBe(true);

    expect(
      definicao.parametros.limite
    ).toBe(10);

    expect(
      definicao.parametros
        .objetivoComparacao
    ).toBe("pior");
  });

  test("limita comparação ao máximo configurado", () => {
    const definicao =
      criarDefinicao(
        "Compare as últimas 100 lives."
      );

    expect(definicao.valido).toBe(true);

    expect(
      definicao.parametros.limite
    ).toBe(50);

    expect(
      definicao.consultas[0]
        .limite
    ).toBe(50);
  });

  test("usa limite padrão quando ele não é informado", () => {
    const definicao =
      criarDefinicao(
        "Compare as últimas lives."
      );

    expect(definicao.valido).toBe(true);

    expect(
      definicao.parametros.limite
    ).toBe(5);
  });

  test("constrói consulta por período para vendas de hoje", () => {
    const plano = {
      encontrado: true,
      planoId:
        "vendas_total_hoje",
      dominio: "vendas",
      operacao: "total",
      periodo: "hoje",
      filtros: {},
      parametros: {},
      etapas: [],
      origem: "test",
      entidades: {
        perguntaOriginal:
          "Quanto faturou hoje?",
      },
    };

    const definicao =
      queryBuilder.construir(
        plano
      );

    expect(definicao.valido).toBe(true);
    expect(definicao.operacao).toBe(
      "total"
    );

    expect(
      definicao.periodo.tipo
    ).toBe("hoje");

    expect(
      definicao.periodo
        .dataInicialIso
    ).toEqual(
      expect.any(String)
    );

    expect(
      definicao.periodo
        .dataFinalIso
    ).toEqual(
      expect.any(String)
    );

    expect(
      definicao.consultas
    ).toHaveLength(1);

    expect(
      definicao.consultas[0]
        .tipo
    ).toBe(
      "buscar_vendas_por_periodo"
    );
  });

  test("normaliza alias cliente_maior_compra", () => {
    const plano = {
      encontrado: true,
      planoId:
        "cliente_maior_compra_ultima_live",
      dominio: "clientes",
      operacao:
        "cliente_maior_compra",
      periodo: "ultima_live",
      filtros: {},
      parametros: {},
      etapas: [],
      origem: "test",
      entidades: {
        perguntaOriginal:
          "Cliente com maior compra",
      },
    };

    const definicao =
      queryBuilder.construir(
        plano
      );

    expect(definicao.valido).toBe(true);

    expect(
      definicao.operacaoOriginal
    ).toBe(
      "cliente_maior_compra"
    );

    expect(definicao.operacao).toBe(
      "maior_compra"
    );
  });

  test("normaliza alias quantidade_por_marca", () => {
    const plano = {
      encontrado: true,
      planoId:
        "quantidade_zara_ultima_live",
      dominio: "vendas",
      operacao:
        "quantidade_por_marca",
      periodo: "ultima_live",
      filtros: {
        marca: "Zara",
      },
      parametros: {},
      etapas: [],
      origem: "test",
      entidades: {
        perguntaOriginal:
          "Quantidade de Zara",
      },
    };

    const definicao =
      queryBuilder.construir(
        plano
      );

    expect(definicao.valido).toBe(true);

    expect(
      definicao.operacaoOriginal
    ).toBe(
      "quantidade_por_marca"
    );

    expect(definicao.operacao).toBe(
      "quantidade"
    );
  });

  test("rejeita quantidade_por_marca sem marca", () => {
    const plano = {
      encontrado: true,
      planoId:
        "quantidade_sem_marca",
      dominio: "vendas",
      operacao:
        "quantidade_por_marca",
      periodo: "ultima_live",
      filtros: {},
      parametros: {},
      etapas: [],
      origem: "test",
      entidades: {
        perguntaOriginal:
          "Quantidade por marca",
      },
    };

    const definicao =
      queryBuilder.construir(
        plano
      );

    expect(definicao.valido).toBe(false);

    expect(definicao.motivo).toBe(
      "filtro_marca_obrigatorio"
    );
  });

  test("rejeita plano não encontrado", () => {
    const definicao =
      queryBuilder.construir({
        encontrado: false,
        planoId: null,
      });

    expect(definicao.valido).toBe(false);

    expect(definicao.motivo).toBe(
      "plano_nao_encontrado"
    );
  });

  test("rejeita operação não suportada", () => {
    const definicao =
      queryBuilder.construir({
        encontrado: true,
        planoId:
          "operacao_inexistente",
        dominio: "geral",
        operacao:
          "operacao_inexistente",
        periodo: "ultima_live",
        filtros: {},
        parametros: {},
        etapas: [],
      });

    expect(definicao.valido).toBe(false);

    expect(definicao.motivo).toBe(
      "operacao_nao_suportada"
    );
  });

  test("rejeita período não suportado", () => {
    const definicao =
      queryBuilder.construir({
        encontrado: true,
        planoId:
          "total_periodo_inexistente",
        dominio: "vendas",
        operacao: "total",
        periodo:
          "periodo_inexistente",
        filtros: {},
        parametros: {},
        etapas: [],
      });

    expect(definicao.valido).toBe(false);

    expect(definicao.motivo).toBe(
      "periodo_nao_suportado"
    );
  });

  test("validar rejeita definição sem operação", () => {
    const validacao =
      queryBuilder.validar({
        valido: true,
        operacao: null,
        periodo: {
          tipo: "hoje",
        },
        consultas: [
          {
            id: "vendas",
            tipo:
              "buscar_vendas_por_periodo",
          },
        ],
      });

    expect(validacao.valido).toBe(false);

    expect(validacao.motivo).toBe(
      "operacao_ausente"
    );
  });

  test("validar rejeita definição sem período", () => {
    const validacao =
      queryBuilder.validar({
        valido: true,
        operacao: "total",
        periodo: {
          tipo: null,
        },
        consultas: [
          {
            id: "vendas",
            tipo:
              "buscar_vendas_por_periodo",
          },
        ],
      });

    expect(validacao.valido).toBe(false);

    expect(validacao.motivo).toBe(
      "periodo_ausente"
    );
  });

  test("validar rejeita definição sem consultas", () => {
    const validacao =
      queryBuilder.validar({
        valido: true,
        operacao: "total",
        periodo: {
          tipo: "hoje",
        },
        consultas: [],
      });

    expect(validacao.valido).toBe(false);

    expect(validacao.motivo).toBe(
      "consultas_ausentes"
    );
  });

  test("validar rejeita consultas com ids duplicados", () => {
    const validacao =
      queryBuilder.validar({
        valido: true,
        operacao: "total",
        periodo: {
          tipo: "hoje",
        },
        consultas: [
          {
            id: "vendas",
            tipo: "consulta_a",
          },
          {
            id: "vendas",
            tipo: "consulta_b",
          },
        ],
      });

    expect(validacao.valido).toBe(false);

    expect(validacao.motivo).toBe(
      "consultas_duplicadas"
    );
  });

  test("mantém pergunta original e entidades na definição", () => {
    const pergunta =
      "Qual foi a melhor das últimas 5 lives?";

    const plano =
      plannerEngine.criarPlano(
        pergunta
      );

    const definicao =
      queryBuilder.construir(
        plano
      );

    expect(
      definicao.perguntaOriginal
    ).toBe(pergunta);

    expect(
      definicao.entidades
        .perguntaOriginal
    ).toBe(pergunta);
  });
});