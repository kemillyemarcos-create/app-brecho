import EntityPatterns from "./EntityPatterns";
import { normalizarTexto } from "../utils/TextUtils";

class PeriodExtractor {
  extrair(pergunta = "") {
    const texto = normalizarTexto(pergunta);

    for (const periodo of EntityPatterns.periodos) {
      const encontrou = periodo.termos.some((termo) =>
        texto.includes(normalizarTexto(termo))
      );

      if (encontrou) {
        return {
          encontrado: true,
          tipo: periodo.id,
          termo: periodo.termos.find((termo) =>
            texto.includes(normalizarTexto(termo))
          ),
        };
      }
    }

    return {
      encontrado: false,
      tipo: null,
      termo: null,
    };
  }
}

const periodExtractor = new PeriodExtractor();

export default periodExtractor;