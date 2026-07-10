import IntentPatterns from "./IntentPatterns";
import { normalizarTexto } from "../SkillRegistry";

class IntentMatcher {
  constructor() {
    this.patterns = IntentPatterns;
  }

  encontrar(pergunta = "") {
    const texto = normalizarTexto(pergunta);

    let melhorIntent = null;
    let maiorPontuacao = 0;

    for (const intent of this.patterns) {
      let pontuacao = 0;

      for (const pattern of intent.patterns) {
        const termo = normalizarTexto(pattern);

        if (texto.includes(termo)) {
          pontuacao += termo.split(" ").length;
        }
      }

      if (pontuacao > maiorPontuacao) {
        maiorPontuacao = pontuacao;
        melhorIntent = intent;
      }
    }

    return melhorIntent;
  }

  listar() {
    return this.patterns;
  }
}

const intentMatcher = new IntentMatcher();

export default intentMatcher;