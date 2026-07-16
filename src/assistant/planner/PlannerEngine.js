import PlannerPatterns from "./PlannerPatterns";
import entityExtractor from "../entities/EntityExtractor";
import { normalizarTexto } from "../utils/TextUtils";

function criarPlanoVazio(entidades = null) {
  return {
    encontrado: false,
    planoId: null,
    dominio: entidades?.dominio || null,
    operacao: entidades?.operacao || null,
    periodo: entidades?.periodo?.tipo || null,
    filtros: entidades?.filtros || {},
    parametros: entidades?.parametros || {},
    etapas: [],
    pontuacao: 0,
    origem: null,
    entidades,
  };
}

function calcularPontuacao(texto, pattern) {
  const termo = normalizarTexto(pattern);

  if (!termo) return 0;

  if (texto === termo) {
    return 100;
  }

  if (texto.includes(termo)) {
    return (
      termo
        .split(" ")
        .filter(Boolean)
        .length * 10
    );
  }

  const palavrasPergunta = texto
    .split(" ")
    .filter((palavra) => palavra.length > 2);

  const palavrasPattern = termo
    .split(" ")
    .filter((palavra) => palavra.length > 2);

  if (!palavrasPattern.length) {
    return 0;
  }

  const palavrasEncontradas =
    palavrasPattern.filter((palavra) =>
      palavrasPergunta.includes(palavra)
    );

  const proporcao =
    palavrasEncontradas.length /
    palavrasPattern.length;

  if (proporcao < 0.6) {
    return 0;
  }

  return palavrasEncontradas.length;
}

function criarEtapasPorEntidades(entidades) {
  const operacao = entidades?.operacao;
  const periodo = entidades?.periodo?.tipo;
  const dominio = entidades?.dominio;

  if (!operacao) {
    return [];
  }

  const etapas = [];

  if (periodo === "ultima_live") {
    etapas.push(
      "buscar_ultima_live",
      "buscar_vendas_da_live"
    );
  }

  if (periodo === "ultimas_lives") {
    etapas.push(
      "buscar_ultimas_lives",
      "buscar_vendas_das_lives"
    );
  }

  if (
    dominio === "clientes" &&
    operacao === "maior_compra"
  ) {
    etapas.push(
      "agrupar_vendas_por_cliente",
      "ordenar_clientes_por_valor"
    );
  }

  if (operacao === "pendentes") {
    etapas.push(
      "filtrar_vendas_pendentes",
      "agrupar_vendas_por_cliente"
    );
  }

  if (operacao === "ticket_medio") {
    etapas.push(
      "agrupar_vendas_por_cliente",
      "calcular_ticket_medio"
    );
  }

  if (operacao === "lucro") {
    etapas.push(
      "buscar_custos_das_pecas",
      "calcular_lucro"
    );
  }

  if (operacao === "mais_vendida") {
    etapas.push(
      "identificar_marcas",
      "agrupar_vendas_por_marca",
      "ordenar_marcas_por_quantidade"
    );
  }

  if (
    operacao === "quantidade" &&
    entidades?.filtros?.marca
  ) {
    etapas.push(
      "filtrar_vendas_por_marca",
      "contar_vendas"
    );
  }

  if (operacao === "comparar_lives") {
    etapas.push(
      "agrupar_vendas_por_live",
      "calcular_faturamento_por_live",
      "calcular_variacao_entre_lives",
      "identificar_maior_faturamento",
      "identificar_menor_faturamento",
      "calcular_media_por_live",
      "identificar_tendencia"
    );
  }

  return [...new Set(etapas)];
}

function criarPlanoPorEntidades(entidades) {
  if (!entidades?.encontrado) {
    return null;
  }

  const dominio = entidades.dominio;
  const operacao = entidades.operacao;
  const periodo = entidades.periodo?.tipo;
  const filtros = entidades.filtros || {};
  const parametros = entidades.parametros || {};

  if (!operacao || !periodo) {
    return null;
  }

  const operacoesSuportadas = [
    "maior_compra",
    "pendentes",
    "ticket_medio",
    "lucro",
    "mais_vendida",
    "quantidade",
    "comparar_lives",
  ];

  if (!operacoesSuportadas.includes(operacao)) {
    return null;
  }

  if (
    operacao === "quantidade" &&
    !filtros.marca
  ) {
    return null;
  }

  if (
    operacao === "comparar_lives" &&
    periodo !== "ultimas_lives"
  ) {
    return null;
  }

  const limiteComparacao =
    operacao === "comparar_lives"
      ? Math.min(
          Math.max(
            Number(parametros?.limite || 5),
            2
          ),
          50
        )
      : null;

  const planoId = [
    dominio || "geral",
    operacao,
    periodo,
    filtros.marca
      ? normalizarTexto(
          filtros.marca
        ).replace(/\s+/g, "_")
      : null,
    limiteComparacao
      ? `${limiteComparacao}_lives`
      : null,
  ]
    .filter(Boolean)
    .join("_");

  return {
    encontrado: true,
    planoId,
    dominio,
    operacao,
    periodo,
    filtros,
    parametros: {
      ...parametros,
      ...(limiteComparacao
        ? {
            limite: limiteComparacao,
          }
        : {}),
    },
    etapas:
      criarEtapasPorEntidades(
        entidades
      ),
    pontuacao:
      Number(
        entidades?.confianca
          ?.dominio || 0
      ) +
      Number(
        entidades?.confianca
          ?.operacao || 0
      ),
    origem: "entities",
    entidades,
  };
}

class PlannerEngine {
  constructor() {
    this.patterns = Array.isArray(
      PlannerPatterns
    )
      ? PlannerPatterns
      : [];
  }

  criarPlanoPorPatterns(
    pergunta = "",
    entidades = null
  ) {
    const texto =
      normalizarTexto(pergunta);

    if (!texto) {
      return criarPlanoVazio(
        entidades
      );
    }

    let melhorPlano = null;
    let maiorPontuacao = 0;

    for (
      const patternConfig of
      this.patterns
    ) {
      let pontuacaoPlano = 0;

      for (
        const pattern of
        patternConfig.patterns || []
      ) {
        const pontuacao =
          calcularPontuacao(
            texto,
            pattern
          );

        if (
          pontuacao >
          pontuacaoPlano
        ) {
          pontuacaoPlano =
            pontuacao;
        }
      }

      if (
        pontuacaoPlano >
        maiorPontuacao
      ) {
        maiorPontuacao =
          pontuacaoPlano;

        melhorPlano =
          patternConfig;
      }
    }

    if (
      !melhorPlano ||
      maiorPontuacao <= 0
    ) {
      return criarPlanoVazio(
        entidades
      );
    }

    return {
      encontrado: true,
      planoId: melhorPlano.id,
      dominio:
        melhorPlano.dominio,
      operacao:
        melhorPlano.operacao,
      periodo:
        melhorPlano.periodo,
      filtros:
        entidades?.filtros ||
        {},
      parametros:
        entidades?.parametros ||
        {},
      etapas: [
        ...(
          melhorPlano.etapas ||
          []
        ),
      ],
      pontuacao:
        maiorPontuacao,
      origem: "patterns",
      entidades,
    };
  }

  criarPlano(pergunta = "") {
    const entidades =
      entityExtractor.extrair(
        pergunta
      );

    /*
     * 1. Primeiro tenta criar um plano genérico
     * usando domínio, operação, período, filtros
     * e parâmetros extraídos da pergunta.
     */
    const planoEntidades =
      criarPlanoPorEntidades(
        entidades
      );

    if (planoEntidades) {
      return planoEntidades;
    }

    /*
     * 2. Se ainda não for possível, usa os
     * padrões antigos como fallback.
     */
    return this.criarPlanoPorPatterns(
      pergunta,
      entidades
    );
  }

  detectar(pergunta = "") {
    return this.criarPlano(
      pergunta
    );
  }

  extrairEntidades(
    pergunta = ""
  ) {
    return entityExtractor.extrair(
      pergunta
    );
  }

  listarPlanos() {
    return this.patterns.map(
      (plano) => ({
        id: plano.id,
        dominio:
          plano.dominio,
        operacao:
          plano.operacao,
        periodo:
          plano.periodo,
        patterns: [
          ...(
            plano.patterns ||
            []
          ),
        ],
        etapas: [
          ...(
            plano.etapas ||
            []
          ),
        ],
      })
    );
  }

  buscarPlano(id) {
    if (!id) {
      return null;
    }

    const idNormalizado =
      normalizarTexto(id);

    return (
      this.patterns.find(
        (plano) =>
          normalizarTexto(
            plano.id
          ) ===
          idNormalizado
      ) || null
    );
  }
}

const plannerEngine =
  new PlannerEngine();

export default plannerEngine;
