import PlannerPatterns from "./PlannerPatterns";
import { normalizarTexto } from "../utils/TextUtils";

function calcularPontuacao(texto, pattern) {
  const termo = normalizarTexto(pattern);

  if (!termo) return 0;

  if (texto === termo) {
    return 100;
  }

  if (texto.includes(termo)) {
    return termo.split(" ").length * 10;
  }

  const palavrasPergunta = texto.split(" ").filter(Boolean);
  const palavrasPattern = termo.split(" ").filter(Boolean);

  const palavrasEncontradas = palavrasPattern.filter((palavra) =>
    palavrasPergunta.includes(palavra)
  );

  if (palavrasEncontradas.length === 0) {
    return 0;
  }

  const proporcao =
    palavrasEncontradas.length / Math.max(palavrasPattern.length, 1);

  return proporcao >= 0.6
    ? palavrasEncontradas.length
    : 0;
}

class PlannerEngine {
  constructor() {
    this.patterns = PlannerPatterns;
  }

  criarPlano(pergunta = "") {
    const texto = normalizarTexto(pergunta);

    if (!texto) {
      return {
        encontrado: false,
        planoId: null,
        dominio: null,
        operacao: null,
        periodo: null,
        etapas: [],
        pontuacao: 0,
      };
    }

    let melhorPlano = null;
    let maiorPontuacao = 0;

    for (const patternConfig of this.patterns) {
      let pontuacaoPlano = 0;

      for (const pattern of patternConfig.patterns || []) {
        const pontuacao = calcularPontuacao(texto, pattern);

        if (pontuacao > pontuacaoPlano) {
          pontuacaoPlano = pontuacao;
        }
      }

      if (pontuacaoPlano > maiorPontuacao) {
        maiorPontuacao = pontuacaoPlano;
        melhorPlano = patternConfig;
      }
    }

    if (!melhorPlano || maiorPontuacao <= 0) {
      return {
        encontrado: false,
        planoId: null,
        dominio: null,
        operacao: null,
        periodo: null,
        etapas: [],
        pontuacao: 0,
      };
    }

    return {
      encontrado: true,
      planoId: melhorPlano.id,
      dominio: melhorPlano.dominio,
      operacao: melhorPlano.operacao,
      periodo: melhorPlano.periodo,
      etapas: [...(melhorPlano.etapas || [])],
      pontuacao: maiorPontuacao,
    };
  }

  detectar(pergunta = "") {
    return this.criarPlano(pergunta);
  }

  listarPlanos() {
    return this.patterns.map((plano) => ({
      id: plano.id,
      dominio: plano.dominio,
      operacao: plano.operacao,
      periodo: plano.periodo,
      patterns: [...(plano.patterns || [])],
      etapas: [...(plano.etapas || [])],
    }));
  }

  buscarPlano(id) {
    if (!id) return null;

    return (
      this.patterns.find(
        (plano) =>
          normalizarTexto(plano.id) === normalizarTexto(id)
      ) || null
    );
  }
}

const plannerEngine = new PlannerEngine();

export default plannerEngine;