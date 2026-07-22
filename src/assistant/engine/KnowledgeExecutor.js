import {
  BusinessKnowledge,
  BusinessModules,
  BusinessRules,
  BusinessVocabulary,
} from "../knowledge";

import {
  formatarLista,
  formatarResultado,
} from "./ResponseFormatter";

import {
  normalizarTexto,
} from "../utils/TextUtils";

function perguntaEhConceitual(
  texto = ""
) {
  return (
    texto.startsWith("o que e ") ||
    texto === "o que e" ||
    texto.startsWith(
      "o que significa"
    ) ||
    texto.includes(
      "qual o significado"
    ) ||
    texto.includes(
      "significa o que"
    ) ||
    texto.startsWith("explique ")
  );
}

function perguntaEhSobreRegra(
  texto = ""
) {
  return (
    texto.startsWith(
      "como funciona"
    ) ||
    texto.startsWith(
      "o que acontece"
    ) ||
    texto.includes(
      "qual a regra"
    ) ||
    texto.includes(
      "quais as regras"
    )
  );
}

class KnowledgeExecutor {
  respostaModulos() {
    const modulos =
      Object.values(
        BusinessModules
      ).map(
        (modulo) =>
          `${modulo.nome} — ${modulo.descricao}`
      );

    return {
      ok: true,
      tipo: "knowledge",

      resposta:
        formatarLista(
          "Módulos disponíveis no sistema",
          modulos
        ),
    };
  }

  respostaConhecimentoGeral() {
    return {
      ok: true,
      tipo: "knowledge",

      resposta:
        formatarResultado({
          titulo:
            "✨ Sobre o sistema",

          descricao:
            BusinessKnowledge.objetivo,

          detalhes: [
            `Segmento: ${BusinessKnowledge.segmento}`,
            `País: ${BusinessKnowledge.pais}`,
            `Moeda: ${BusinessKnowledge.moeda}`,
            `Versão: ${BusinessKnowledge.versao}`,
          ],
        }),
    };
  }

  respostaVocabulario(
    perguntaNormalizada
  ) {
    for (
      const [
        termo,
        sinonimos,
      ] of Object.entries(
        BusinessVocabulary
      )
    ) {
      const termosRelacionados = [
        termo,
        ...(sinonimos || []),
      ];

      const encontrou =
        termosRelacionados.some(
          (item) =>
            perguntaNormalizada.includes(
              normalizarTexto(item)
            )
        );

      if (!encontrou) {
        continue;
      }

      return {
        ok: true,
        tipo: "knowledge",

        resposta:
          formatarResultado({
            titulo: `✨ ${termo}`,

            descricao:
              `No sistema, "${termo}" está relacionado a:`,

            detalhes:
              termosRelacionados,
          }),
      };
    }

    return null;
  }

  respostaRegra(
    perguntaNormalizada
  ) {
    const regra =
      BusinessRules.find(
        (item) => {
          const titulo =
            normalizarTexto(
              item.titulo
            );

          const id =
            normalizarTexto(
              item.id
            );

          if (
            titulo &&
            perguntaNormalizada.includes(
              titulo
            )
          ) {
            return true;
          }

          if (
            id &&
            perguntaNormalizada.includes(
              id
            )
          ) {
            return true;
          }

          const palavrasImportantes =
            normalizarTexto(
              `${item.titulo} ${item.descricao}`
            )
              .split(" ")
              .filter(
                (palavra) =>
                  palavra.length > 4
              );

          return (
            palavrasImportantes.some(
              (palavra) =>
                perguntaNormalizada.includes(
                  palavra
                )
            )
          );
        }
      );

    if (!regra) {
      return null;
    }

    return {
      ok: true,
      tipo: "knowledge",

      resposta:
        formatarResultado({
          titulo:
            `✨ ${regra.titulo}`,

          descricao:
            regra.descricao,
        }),
    };
  }

  executar(
    pergunta,
    intent
  ) {
    const texto =
      normalizarTexto(pergunta);

    if (!texto || !intent) {
      return null;
    }

    if (
      intent?.target ===
      "modules"
    ) {
      return this.respostaModulos();
    }

    if (
      intent?.target ===
      "system"
    ) {
      return (
        this.respostaConhecimentoGeral()
      );
    }

    if (
      intent?.target ===
      "vocabulary" &&
      perguntaEhConceitual(texto)
    ) {
      return (
        this.respostaVocabulario(
          texto
        )
      );
    }

    if (
      intent?.target ===
      "rules" &&
      perguntaEhSobreRegra(texto)
    ) {
      return (
        this.respostaRegra(
          texto
        )
      );
    }

    return null;
  }
}

const knowledgeExecutor =
  new KnowledgeExecutor();

export default knowledgeExecutor;
