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

  /*
   * Reconhece:
   *
   * - últimas 5 lives
   * - ultimas 10 lives
   * - últimos 3 eventos
   *
   * O texto já foi normalizado, portanto
   * acentos não precisam ser tratados aqui.
   */
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

  /*
   * Limite de segurança para impedir
   * consultas exageradamente grandes.
   */
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

  const encontrouMelhor =
    termosMelhor.some(
      (termo) =>
        texto.includes(
          normalizarTexto(
            termo
          )
        )
    );

  if (encontrouMelhor) {
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

  const encontrouPior =
    termosPior.some(
      (termo) =>
        texto.includes(
          normalizarTexto(
            termo
          )
        )
    );

  if (encontrouPior) {
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

  const encontrouComparacaoCompleta =
    termosCompletos.some(
      (termo) =>
        texto.includes(
          normalizarTexto(
            termo
          )
        )
    );

  if (
    encontrouComparacaoCompleta
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

class EntityExtractor {
  extrair(pergunta = "") {
    const texto =
      normalizarTexto(
        pergunta
      );

    const dominio =
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

    return {
      perguntaOriginal:
        pergunta,

      textoNormalizado:
        texto,

      dominio:
        dominio.id,

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
          dominio.pontuacao,

        operacao:
          operacao.pontuacao,
      },

      encontrado:
        Boolean(
          dominio.id
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
