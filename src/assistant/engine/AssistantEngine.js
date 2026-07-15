import { supabase } from "../../lib/supabase";
import skills from "../skills";
import intentEngine from "../intents/IntentEngine";
import plannerEngine from "../planner/PlannerEngine";
import planExecutor from "../planner/PlanExecutor";
import { normalizarTexto } from "../utils/TextUtils";
import skillExecutor from "./SkillExecutor";

import {
  BusinessKnowledge,
  BusinessModules,
  BusinessRules,
  BusinessVocabulary,
} from "../knowledge";

import {
  formatarErro,
  formatarLista,
  formatarNaoAprendido,
  formatarResultado,
} from "./ResponseFormatter";

function perguntaEhConceitual(texto = "") {
  return (
    texto.startsWith("o que e ") ||
    texto === "o que e" ||
    texto.startsWith("o que significa") ||
    texto.includes("qual o significado") ||
    texto.includes("significa o que") ||
    texto.startsWith("explique ")
  );
}

function perguntaEhSobreRegra(texto = "") {
  return (
    texto.startsWith("como funciona") ||
    texto.startsWith("o que acontece") ||
    texto.includes("qual a regra") ||
    texto.includes("quais as regras")
  );
}

function respostaModulos() {
  const modulos = Object.values(BusinessModules).map(
    (modulo) => `${modulo.nome} — ${modulo.descricao}`
  );

  return {
    ok: true,
    tipo: "knowledge",
    resposta: formatarLista("Módulos disponíveis no sistema", modulos),
  };
}

function respostaConhecimentoGeral() {
  return {
    ok: true,
    tipo: "knowledge",
    resposta: formatarResultado({
      titulo: "✨ Sobre o sistema",
      descricao: BusinessKnowledge.objetivo,
      detalhes: [
        `Segmento: ${BusinessKnowledge.segmento}`,
        `País: ${BusinessKnowledge.pais}`,
        `Moeda: ${BusinessKnowledge.moeda}`,
        `Versão: ${BusinessKnowledge.versao}`,
      ],
    }),
  };
}

function respostaVocabulario(perguntaNormalizada) {
  for (const [termo, sinonimos] of Object.entries(BusinessVocabulary)) {
    const termosRelacionados = [termo, ...(sinonimos || [])];

    const encontrou = termosRelacionados.some((item) =>
      perguntaNormalizada.includes(normalizarTexto(item))
    );

    if (!encontrou) continue;

    return {
      ok: true,
      tipo: "knowledge",
      resposta: formatarResultado({
        titulo: `✨ ${termo}`,
        descricao: `No sistema, "${termo}" está relacionado a:`,
        detalhes: termosRelacionados,
      }),
    };
  }

  return null;
}

function respostaRegra(perguntaNormalizada) {
  const regra = BusinessRules.find((item) => {
    const titulo = normalizarTexto(item.titulo);
    const id = normalizarTexto(item.id);

    if (titulo && perguntaNormalizada.includes(titulo)) {
      return true;
    }

    if (id && perguntaNormalizada.includes(id)) {
      return true;
    }

    const palavrasImportantes = normalizarTexto(
      `${item.titulo} ${item.descricao}`
    )
      .split(" ")
      .filter((palavra) => palavra.length > 4);

    return palavrasImportantes.some((palavra) =>
      perguntaNormalizada.includes(palavra)
    );
  });

  if (!regra) return null;

  return {
    ok: true,
    tipo: "knowledge",
    resposta: formatarResultado({
      titulo: `✨ ${regra.titulo}`,
      descricao: regra.descricao,
    }),
  };
}

function responderConhecimento(pergunta, intent) {
  const texto = normalizarTexto(pergunta);

  if (intent?.target === "modules") {
    return respostaModulos();
  }

  if (intent?.target === "system") {
    return respostaConhecimentoGeral();
  }

  if (
    intent?.target === "vocabulary" &&
    perguntaEhConceitual(texto)
  ) {
    return respostaVocabulario(texto);
  }

  if (
    intent?.target === "rules" &&
    perguntaEhSobreRegra(texto)
  ) {
    return respostaRegra(texto);
  }

  return null;
}

class AssistantEngine {
  constructor() {
    this.skills = Array.isArray(skills) ? skills : [];
  }

  buscarSkill(id) {
    if (!id) return null;

    const idNormalizado = normalizarTexto(id);

    return (
      this.skills.find(
        (skill) => normalizarTexto(skill?.id) === idNormalizado
      ) || null
    );
  }

  encontrarSkillPorAlias(pergunta) {
    const texto = normalizarTexto(pergunta);

    if (!texto) return null;

    let melhorSkill = null;
    let maiorPontuacao = 0;

    for (const skill of this.skills) {
      const termos = [
        ...(skill?.aliases || []),
        ...(skill?.patterns || []),
      ];

      let pontuacaoSkill = 0;

      for (const termoOriginal of termos) {
        const termo = normalizarTexto(termoOriginal);

        if (!termo) continue;

        let pontuacao = 0;

        if (texto === termo) {
          pontuacao = 100;
        } else if (texto.includes(termo)) {
          pontuacao =
            termo.split(" ").filter(Boolean).length * 10;
        }

        if (pontuacao > pontuacaoSkill) {
          pontuacaoSkill = pontuacao;
        }
      }

      if (pontuacaoSkill > maiorPontuacao) {
        maiorPontuacao = pontuacaoSkill;
        melhorSkill = skill;
      }
    }

    return melhorSkill;
  }

  async executarSkill(skill, pergunta, intent = null) {
    return skillExecutor.executar({
      skill,
      pergunta,
      contexto: {
        supabase,
        intent,
      },
    });
  }

  async executarPlanner(pergunta, intent = null) {
    const plano = plannerEngine.criarPlano(pergunta);

    if (!plano?.encontrado) {
      return null;
    }

    const resultado = await planExecutor.executar({
      plano,
      pergunta,
      supabase,
    });

    return {
      intent: intent?.intent?.id || null,
      plano: plano.planoId,
      dominio: plano.dominio,
      operacao: plano.operacao,
      periodo: plano.periodo,
      ...resultado,
    };
  }

  async executar(pergunta) {
    const textoOriginal = String(pergunta || "").trim();

    if (!textoOriginal) {
      return {
        ok: false,
        resposta: formatarErro(
          "Digite uma solicitação para o Assistente Virtual."
        ),
      };
    }

    const intent = intentEngine.detectar(textoOriginal);

    /*
     * 1. O Planner recebe prioridade.
     *
     * Perguntas analíticas como:
     * - cliente que mais comprou;
     * - ticket médio;
     * - quem ainda não pagou;
     * - lucro;
     * - marca mais vendida;
     *
     * precisam ser analisadas antes das Skills genéricas.
     */
    const resultadoPlanner = await this.executarPlanner(
      textoOriginal,
      intent
    );

    if (resultadoPlanner) {
      return resultadoPlanner;
    }

    /*
     * 2. Skill declarada diretamente no IntentPatterns.
     *
     * Exemplo:
     * "Vendas da última live?"
     */
    if (intentEngine.isSkill(intent)) {
      const skillDireta = this.buscarSkill(intent.target);

      if (skillDireta) {
        return this.executarSkill(
          skillDireta,
          textoOriginal,
          intent
        );
      }
    }

    /*
     * 3. Skill reconhecida pelos aliases.
     */
    const skillPorAlias =
      this.encontrarSkillPorAlias(textoOriginal);

    if (skillPorAlias) {
      return this.executarSkill(
        skillPorAlias,
        textoOriginal,
        intent
      );
    }

    /*
     * 4. Knowledge para perguntas conceituais.
     */
    if (intentEngine.isKnowledge(intent)) {
      const conhecimento = responderConhecimento(
        textoOriginal,
        intent
      );

      if (conhecimento) {
        return {
          intent: intent.intent?.id || null,
          ...conhecimento,
        };
      }
    }

    return {
      ok: false,
      intent: intent?.intent?.id || null,
      resposta: formatarNaoAprendido(),
    };
  }

  listarSkills() {
    return this.skills.map((skill) => ({
      id: skill.id,
      nome: skill.nome,
      categoria: skill.categoria,
      tipo: skill.tipo,
      aliases: skill.aliases || [],
    }));
  }

  listarIntencoes() {
    return intentEngine.listarIntencoes();
  }

  listarPlanos() {
    return plannerEngine.listarPlanos();
  }
}

const assistantEngine = new AssistantEngine();

export default assistantEngine;