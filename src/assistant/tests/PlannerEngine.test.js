import {
  describe,
  expect,
  test,
} from "vitest";

import plannerEngine from "../planner/PlannerEngine";

describe("PlannerEngine", () => {
  test("cria plano para lucro da última live", () => {
    const plano = plannerEngine.criarPlano(
      "Qual foi o lucro da última live?"
    );

    expect(plano.encontrado).toBe(true);
    expect(plano.origem).toBe("entities");
    expect(plano.dominio).toBe("financeiro");
    expect(plano.operacao).toBe("lucro");
    expect(plano.periodo).toBe("ultima_live");

    expect(plano.etapas).toEqual(
      expect.arrayContaining([
        "buscar_ultima_live",
        "buscar_vendas_da_live",
        "buscar_custos_das_pecas",
        "calcular_lucro",
      ])
    );
  });

  test("cria plano para cliente com maior compra", () => {
    const plano = plannerEngine.criarPlano(
      "Qual cliente mais comprou na última live?"
    );

    expect(plano.encontrado).toBe(true);
    expect(plano.origem).toBe("entities");
    expect(plano.dominio).toBe("clientes");
    expect(plano.operacao).toBe("maior_compra");
    expect(plano.periodo).toBe("ultima_live");

    expect(plano.etapas).toEqual(
      expect.arrayContaining([
        "buscar_ultima_live",
        "buscar_vendas_da_live",
        "agrupar_vendas_por_cliente",
        "ordenar_clientes_por_valor",
      ])
    );
  });

  test("cria plano para clientes pendentes", () => {
    const plano = plannerEngine.criarPlano(
      "Quem ainda não pagou na última live?"
    );

    expect(plano.encontrado).toBe(true);
    expect(plano.operacao).toBe("pendentes");
    expect(plano.periodo).toBe("ultima_live");
    expect(plano.filtros.statusPagamento).toBe(
      "pendente"
    );

    expect(plano.etapas).toEqual(
      expect.arrayContaining([
        "buscar_ultima_live",
        "buscar_vendas_da_live",
        "filtrar_vendas_pendentes",
        "agrupar_vendas_por_cliente",
      ])
    );
  });

  test("cria plano para ticket médio", () => {
    const plano = plannerEngine.criarPlano(
      "Qual foi o ticket médio da última live?"
    );

    expect(plano.encontrado).toBe(true);
    expect(plano.operacao).toBe("ticket_medio");
    expect(plano.periodo).toBe("ultima_live");

    expect(plano.etapas).toEqual(
      expect.arrayContaining([
        "buscar_ultima_live",
        "buscar_vendas_da_live",
        "agrupar_vendas_por_cliente",
        "calcular_ticket_medio",
      ])
    );
  });

  test("cria plano para marca mais vendida", () => {
    const plano = plannerEngine.criarPlano(
      "Qual marca mais vendeu na última live?"
    );

    expect(plano.encontrado).toBe(true);
    expect(plano.operacao).toBe("mais_vendida");
    expect(plano.periodo).toBe("ultima_live");

    expect(plano.etapas).toEqual(
      expect.arrayContaining([
        "buscar_ultima_live",
        "buscar_vendas_da_live",
        "identificar_marcas",
        "agrupar_vendas_por_marca",
        "ordenar_marcas_por_quantidade",
      ])
    );
  });

  test("cria plano para quantidade de peças por marca", () => {
    const plano = plannerEngine.criarPlano(
      "Quantas peças Zara foram vendidas na última live?"
    );

    expect(plano.encontrado).toBe(true);
    expect(plano.operacao).toBe("quantidade");
    expect(plano.periodo).toBe("ultima_live");
    expect(plano.filtros.marca).toBe("Zara");

    expect(plano.etapas).toEqual(
      expect.arrayContaining([
        "buscar_ultima_live",
        "buscar_vendas_da_live",
        "filtrar_vendas_por_marca",
        "contar_vendas",
      ])
    );
  });

  test("não cria plano genérico de quantidade sem marca", () => {
    const plano = plannerEngine.criarPlano(
      "Quantas peças foram vendidas na última live?"
    );

    expect(plano.encontrado).toBe(false);
  });

  test("cria plano completo para comparar as últimas 3 lives", () => {
    const plano = plannerEngine.criarPlano(
      "Compare as últimas 3 lives."
    );

    expect(plano.encontrado).toBe(true);
    expect(plano.origem).toBe("entities");
    expect(plano.dominio).toBe("lives");
    expect(plano.operacao).toBe("comparar_lives");
    expect(plano.periodo).toBe("ultimas_lives");

    expect(plano.parametros.limite).toBe(3);
    expect(
      plano.parametros.objetivoComparacao
    ).toBe("completo");

    expect(plano.etapas).toEqual(
      expect.arrayContaining([
        "buscar_ultimas_lives",
        "buscar_vendas_das_lives",
        "agrupar_vendas_por_live",
        "calcular_faturamento_por_live",
        "calcular_variacao_entre_lives",
        "identificar_maior_faturamento",
        "identificar_menor_faturamento",
        "calcular_media_por_live",
        "identificar_tendencia",
      ])
    );
  });

  test("preserva o objetivo melhor na comparação", () => {
    const plano = plannerEngine.criarPlano(
      "Qual foi a melhor das últimas 5 lives?"
    );

    expect(plano.encontrado).toBe(true);
    expect(plano.operacao).toBe("comparar_lives");
    expect(plano.periodo).toBe("ultimas_lives");
    expect(plano.parametros.limite).toBe(5);

    expect(
      plano.parametros.objetivoComparacao
    ).toBe("melhor");
  });

  test("preserva o objetivo pior na comparação", () => {
    const plano = plannerEngine.criarPlano(
      "Qual foi a pior das últimas 10 lives?"
    );

    expect(plano.encontrado).toBe(true);
    expect(plano.operacao).toBe("comparar_lives");
    expect(plano.periodo).toBe("ultimas_lives");
    expect(plano.parametros.limite).toBe(10);

    expect(
      plano.parametros.objetivoComparacao
    ).toBe("pior");
  });

  test("usa cinco lives como limite padrão", () => {
    const plano = plannerEngine.criarPlano(
      "Compare as últimas lives."
    );

    expect(plano.encontrado).toBe(true);
    expect(plano.parametros.limite).toBe(5);
    expect(
      plano.parametros.objetivoComparacao
    ).toBe("completo");
  });

  test("respeita o limite máximo de cinquenta lives", () => {
    const plano = plannerEngine.criarPlano(
      "Compare as últimas 100 lives."
    );

    expect(plano.encontrado).toBe(true);
    expect(plano.parametros.limite).toBe(50);
  });

  test("gera planoId descritivo para comparação", () => {
    const plano = plannerEngine.criarPlano(
      "Compare as últimas 3 lives."
    );

    expect(plano.planoId).toBe(
      "lives_comparar_lives_ultimas_lives_3_lives"
    );
  });

  test("mantém as entidades extraídas dentro do plano", () => {
    const pergunta =
      "Qual foi a melhor das últimas 5 lives?";

    const plano =
      plannerEngine.criarPlano(pergunta);

    expect(plano.entidades).toBeTruthy();
    expect(
      plano.entidades.perguntaOriginal
    ).toBe(pergunta);

    expect(
      plano.entidades.parametros
        .objetivoComparacao
    ).toBe("melhor");
  });

  test("não encontra plano para pergunta vazia", () => {
    const plano =
      plannerEngine.criarPlano("");

    expect(plano.encontrado).toBe(false);
    expect(plano.planoId).toBeNull();
    expect(plano.operacao).toBeNull();
    expect(plano.periodo).toBeNull();
    expect(plano.etapas).toEqual([]);
  });

  test("detectar funciona como alias de criarPlano", () => {
    const pergunta =
      "Qual foi o lucro da última live?";

    const planoCriado =
      plannerEngine.criarPlano(pergunta);

    const planoDetectado =
      plannerEngine.detectar(pergunta);

    expect(planoDetectado).toEqual(
      planoCriado
    );
  });

  test("extrairEntidades delega para o EntityExtractor", () => {
    const entidades =
      plannerEngine.extrairEntidades(
        "Compare as últimas 3 lives."
      );

    expect(entidades.operacao).toBe(
      "comparar_lives"
    );

    expect(entidades.periodo.tipo).toBe(
      "ultimas_lives"
    );

    expect(
      entidades.parametros.limite
    ).toBe(3);
  });
});
