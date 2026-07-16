import {
  describe,
  expect,
  test,
} from "vitest";

import entityExtractor from "../entities/EntityExtractor";

describe("EntityExtractor", () => {
  test("extrai lucro da última live", () => {
    const resultado =
      entityExtractor.extrair(
        "Qual foi o lucro da última live?"
      );

    expect(resultado.operacao).toBe(
      "lucro"
    );

    expect(
      resultado.periodo.tipo
    ).toBe("ultima_live");
  });

  test("extrai faturamento da última live", () => {
    const resultado =
      entityExtractor.extrair(
        "Quanto faturou a última live?"
      );

    expect(resultado.operacao).toBe(
      "total"
    );

    expect(
      resultado.periodo.tipo
    ).toBe("ultima_live");
  });

  test("extrai ticket médio da última live", () => {
    const resultado =
      entityExtractor.extrair(
        "Qual foi o ticket médio da última live?"
      );

    expect(resultado.operacao).toBe(
      "ticket_medio"
    );

    expect(
      resultado.periodo.tipo
    ).toBe("ultima_live");
  });

  test("extrai cliente com maior compra", () => {
    const resultado =
      entityExtractor.extrair(
        "Qual cliente mais comprou na última live?"
      );

    expect(resultado.dominio).toBe(
      "clientes"
    );

    expect(resultado.operacao).toBe(
      "maior_compra"
    );

    expect(
      resultado.periodo.tipo
    ).toBe("ultima_live");
  });

  test("extrai clientes pendentes", () => {
    const resultado =
      entityExtractor.extrair(
        "Quem ainda não pagou na última live?"
      );

    expect(resultado.operacao).toBe(
      "pendentes"
    );

    expect(
      resultado.periodo.tipo
    ).toBe("ultima_live");

    expect(
      resultado.filtros.statusPagamento
    ).toBe("pendente");
  });

  test("extrai marca mais vendida", () => {
    const resultado =
      entityExtractor.extrair(
        "Qual marca mais vendeu na última live?"
      );

    expect(resultado.operacao).toBe(
      "mais_vendida"
    );

    expect(
      resultado.periodo.tipo
    ).toBe("ultima_live");
  });

  test("extrai quantidade por marca", () => {
    const resultado =
      entityExtractor.extrair(
        "Quantas peças Zara foram vendidas na última live?"
      );

    expect(resultado.operacao).toBe(
      "quantidade"
    );

    expect(resultado.filtros.marca).toBe(
      "Zara"
    );

    expect(
      resultado.periodo.tipo
    ).toBe("ultima_live");
  });

  test("extrai comparação das últimas 3 lives", () => {
    const resultado =
      entityExtractor.extrair(
        "Compare as últimas 3 lives."
      );

    expect(resultado.operacao).toBe(
      "comparar_lives"
    );

    expect(
      resultado.periodo.tipo
    ).toBe("ultimas_lives");

    expect(
      resultado.parametros.limite
    ).toBe(3);

    expect(
      resultado.parametros
        .objetivoComparacao
    ).toBe("completo");
  });

  test("extrai a melhor das últimas 5 lives", () => {
    const resultado =
      entityExtractor.extrair(
        "Qual foi a melhor das últimas 5 lives?"
      );

    expect(resultado.operacao).toBe(
      "comparar_lives"
    );

    expect(
      resultado.periodo.tipo
    ).toBe("ultimas_lives");

    expect(
      resultado.parametros.limite
    ).toBe(5);

    expect(
      resultado.parametros
        .objetivoComparacao
    ).toBe("melhor");
  });

  test("extrai a pior das últimas 10 lives", () => {
    const resultado =
      entityExtractor.extrair(
        "Qual foi a pior das últimas 10 lives?"
      );

    expect(resultado.operacao).toBe(
      "comparar_lives"
    );

    expect(
      resultado.periodo.tipo
    ).toBe("ultimas_lives");

    expect(
      resultado.parametros.limite
    ).toBe(10);

    expect(
      resultado.parametros
        .objetivoComparacao
    ).toBe("pior");
  });

  test("usa cinco lives como limite padrão", () => {
    const resultado =
      entityExtractor.extrair(
        "Compare as últimas lives."
      );

    expect(
      resultado.parametros.limite
    ).toBe(5);
  });

  test("limita a comparação ao máximo de 50 lives", () => {
    const resultado =
      entityExtractor.extrair(
        "Compare as últimas 100 lives."
      );

    expect(
      resultado.parametros.limite
    ).toBe(50);
  });

  test("mantém a pergunta original", () => {
    const pergunta =
      "Qual foi o lucro da última live?";

    const resultado =
      entityExtractor.extrair(
        pergunta
      );

    expect(
      resultado.perguntaOriginal
    ).toBe(pergunta);
  });

  test("retorna estrutura vazia para pergunta vazia", () => {
    const resultado =
      entityExtractor.extrair("");

    expect(resultado.encontrado).toBe(
      false
    );

    expect(resultado.dominio).toBeNull();
    expect(resultado.operacao).toBeNull();

    expect(
      resultado.periodo.tipo
    ).toBeNull();
  });
});