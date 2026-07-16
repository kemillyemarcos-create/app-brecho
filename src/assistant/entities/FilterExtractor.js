import EntityPatterns from "./EntityPatterns";
import { normalizarTexto } from "../utils/TextUtils";

class FilterExtractor {
  extrair(pergunta = "") {
    const texto = normalizarTexto(pergunta);

    const filtros = {};

    const marca = EntityPatterns.marcas.find((item) =>
      texto.includes(normalizarTexto(item))
    );

    if (marca) {
      filtros.marca = marca;
    }

    if (
      texto.includes("pago") ||
      texto.includes("pagas") ||
      texto.includes("pagos")
    ) {
      filtros.statusPagamento = "pago";
    }

    if (
      texto.includes("pendente") ||
      texto.includes("nao pagou") ||
      texto.includes("não pagou") ||
      texto.includes("quem deve")
    ) {
      filtros.statusPagamento = "pendente";
    }

    if (
      texto.includes("disponivel") ||
      texto.includes("disponível")
    ) {
      filtros.statusEstoque = "disponivel";
    }

    if (
      texto.includes("vendida") ||
      texto.includes("vendidas")
    ) {
      filtros.statusEstoque = "vendida";
    }

    return filtros;
  }
}

const filterExtractor = new FilterExtractor();

export default filterExtractor;