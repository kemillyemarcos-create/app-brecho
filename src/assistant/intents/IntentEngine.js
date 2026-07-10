import IntentTypes from "./IntentTypes";
import intentMatcher from "./IntentMatcher";

class IntentEngine {
  detectar(pergunta = "") {
    const intent = intentMatcher.encontrar(pergunta);

    if (!intent) {
      return {
        type: IntentTypes.UNKNOWN,
        target: null,
        intent: null,
      };
    }

    return {
      type: intent.type,
      target: intent.target,
      intent,
    };
  }

  isKnowledge(resultado) {
    return resultado?.type === IntentTypes.KNOWLEDGE;
  }

  isSkill(resultado) {
    return resultado?.type === IntentTypes.SKILL;
  }

  isAction(resultado) {
    return resultado?.type === IntentTypes.ACTION;
  }

  isUnknown(resultado) {
    return resultado?.type === IntentTypes.UNKNOWN;
  }

  listarIntencoes() {
    return intentMatcher.listar();
  }
}

const intentEngine = new IntentEngine();

export default intentEngine;