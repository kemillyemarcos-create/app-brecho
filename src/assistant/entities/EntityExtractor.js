import EntityPatterns from "./EntityPatterns";
import periodExtractor from "./PeriodExtractor";
import filterExtractor from "./FilterExtractor";
import { normalizarTexto } from "../utils/TextUtils";

function encontrarEntidade(
  texto,
  configuracoes = []
) {
  let melhor = null;
  let maiorPontuacao = 0;

  for (const configuracao of configuracoes) {
    let pontuacao = 0;

    for (
      const termoOriginal of
      configuracao.termos || []
    ) {
      const termo =
        normalizarTexto(
          termoOriginal
        );

      if (!termo) {
        continue;
      }

      if (texto === termo) {
        pontuacao += 100;
      } else if (
        texto.includes(termo)
      ) {
        pontuacao +=
          termo
            .split(" ")
            .filter(Boolean)
            .length * 10;
      }
    }

    if (
      pontuacao >
      maiorPontuacao
    ) {
      maiorPontuacao =
        pontuacao;

      melhor =
        configuracao;
    }
  }

  return melhor
    ? {
        encontrado: true,
        id: melhor.id,
        pontuacao:
          maiorPontuacao,
      }
    : {
        encontrado: false,
        id: null,
        pontuacao: 0,
      };
}

function extrairLimite(
  texto = ""
) {
  if (!texto) {
    return null;
  }

  const correspondencia =
    texto.match(
      /\b(?:ultimas|ultimos)\s+(\d+)\b/
    );

  if (!correspondencia) {
    return null;
  }

  const limite = Number(
    correspondencia[1]
  );

  if (
    !Number.isInteger(limite) ||
    limite <= 0
  ) {
    return null;
  }

  return Math.min(
    limite,
    50
  );
}

function extrairObjetivoComparacao(
  texto = ""
) {
  if (!texto) {
    return null;
  }

  const termosMelhor = [
    "qual foi a melhor",
    "qual a melhor",
    "melhor live",
    "melhor das lives",
    "melhor das ultimas",
    "maior faturamento",
    "teve maior faturamento",
    "qual teve maior faturamento",
    "qual live teve maior faturamento",
    "qual faturou mais",
    "faturou mais",
  ];

  if (
    termosMelhor.some(
      (termo) =>
        texto.includes(
          normalizarTexto(
            termo
          )
        )
    )
  ) {
    return "melhor";
  }

  const termosPior = [
    "qual foi a pior",
    "qual a pior",
    "pior live",
    "pior das lives",
    "pior das ultimas",
    "menor faturamento",
    "teve menor faturamento",
    "qual teve menor faturamento",
    "qual live teve menor faturamento",
    "qual faturou menos",
    "faturou menos",
  ];

  if (
    termosPior.some(
      (termo) =>
        texto.includes(
          normalizarTexto(
            termo
          )
        )
    )
  ) {
    return "pior";
  }

  const termosCompletos = [
    "compare",
    "comparar",
    "comparacao",
    "evolucao",
    "desempenho",
    "mostre a evolucao",
    "mostrar evolucao",
    "como foi o faturamento",
    "faturamento esta aumentando",
    "faturamento esta caindo",
  ];

  if (
    termosCompletos.some(
      (termo) =>
        texto.includes(
          normalizarTexto(
            termo
          )
        )
    )
  ) {
    return "completo";
  }

  return null;
}

function resolverPeriodoComparativo({
  periodo,
  operacao,
  limite,
}) {
  if (
    operacao ===
      "comparar_lives" &&
    periodo?.tipo !==
      "ultimas_lives"
  ) {
    return {
      encontrado: true,
      tipo: "ultimas_lives",
      termo: limite
        ? `ultimas ${limite} lives`
        : "ultimas lives",
    };
  }

  return periodo;
}

function resolverDominioPorOperacao({
  dominioDetectado,
  operacao,
}) {
  const dominiosPreferenciais = {
    maior_compra: "clientes",
    menor_compra: "clientes",
    pendentes: "clientes",

    lucro: "financeiro",
    margem: "financeiro",
    ticket_medio: "financeiro",

    comparar_lives: "lives",

    mais_vendida: "vendas",
    quantidade: "vendas",
    total: "vendas",
  };

  return (
    dominiosPreferenciais[
      operacao
    ] ||
    dominioDetectado ||
    null
  );
}

class EntityExtractor {
  extrair(pergunta = "") {
    const texto =
      normalizarTexto(
        pergunta
      );

    const dominioDetectado =
      encontrarEntidade(
        texto,
        EntityPatterns.dominios
      );

    const operacao =
      encontrarEntidade(
        texto,
        EntityPatterns.operacoes
      );

    const periodoExtraido =
      periodExtractor.extrair(
        pergunta
      );

    const filtros =
      filterExtractor.extrair(
        pergunta
      );

    const limite =
      extrairLimite(
        texto
      );

    const objetivoComparacao =
      operacao.id ===
      "comparar_lives"
        ? (
            extrairObjetivoComparacao(
              texto
            ) ||
            "completo"
          )
        : null;

    const periodo =
      resolverPeriodoComparativo({
        periodo:
          periodoExtraido,

        operacao:
          operacao.id,

        limite,
      });

    const limiteFinal =
      operacao.id ===
      "comparar_lives"
        ? (
            limite ||
            5
          )
        : limite;

    const dominio =
      resolverDominioPorOperacao({
        dominioDetectado:
          dominioDetectado.id,

        operacao:
          operacao.id,
      });

    return {
      perguntaOriginal:
        pergunta,

      textoNormalizado:
        texto,

      dominio,

      operacao:
        operacao.id,

      periodo: {
        tipo:
          periodo?.tipo ||
          null,

        termo:
          periodo?.termo ||
          null,
      },

      filtros,

      parametros: {
        limite:
          limiteFinal,

        objetivoComparacao,
      },

      confianca: {
        dominio:
          dominioDetectado.pontuacao,

        operacao:
          operacao.pontuacao,
      },

      encontrado:
        Boolean(
          dominio
        ) ||
        Boolean(
          operacao.id
        ) ||
        Boolean(
          periodo?.tipo
        ) ||
        Object.keys(
          filtros
        ).length > 0 ||
        Boolean(
          limite
        ) ||
        Boolean(
          objetivoComparacao
        ),
    };
  }
}

const entityExtractor =
  new EntityExtractor();

export default entityExtractor;