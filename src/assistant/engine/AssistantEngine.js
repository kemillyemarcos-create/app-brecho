import { supabase } from "../../lib/supabase";
import skills from "../skills";
import intentEngine from "../intents/IntentEngine";
import plannerEngine from "../planner/PlannerEngine";
import planExecutor from "../planner/PlanExecutor";
import SkillRegistry from "../SkillRegistry";
import knowledgeExecutor from "./KnowledgeExecutor";
import skillExecutor from "./SkillExecutor";

import {
  formatarErro,
  formatarNaoAprendido,
} from "./ResponseFormatter";

class AssistantEngine {
  constructor() {
    this.skillRegistry =
      new SkillRegistry(
        Array.isArray(skills)
          ? skills
          : []
      );
  }

  buscarSkill(id) {
    return this.skillRegistry.buscarPorId(
      id
    );
  }

  encontrarSkillPorAlias(pergunta) {
    return this.skillRegistry.encontrarPorAlias(
      pergunta
    );
  }

  async executarSkill(
    skill,
    pergunta,
    intent = null,
    opcoes = {}
  ) {
    return skillExecutor.executar({
      skill,
      pergunta,
      contexto: {
        supabase,
        intent,
        formatacao:
          opcoes?.formatacao || {},
      },
    });
  }

  async executarPlanner(
    pergunta,
    intent = null,
    opcoes = {}
  ) {
    const {
      conversaId = "chat-principal",
      usuarioId = null,
      usarContexto = true,
      formatacao = {},
    } = opcoes;

    let resultado;

    try {
      resultado =
        await planExecutor.executarMensagem({
          pergunta,
          supabase,
          conversaId,
          usuarioId,
          usarContexto,
          formatacao,

          metadados: {
            intent:
              intent?.intent?.id ||
              null,

            target:
              intent?.target ||
              null,
          },
        });
    } catch (error) {
      console.error(
        "[AssistantEngine] Falha no modo conversacional.",
        error
      );

      const plano =
        plannerEngine.criarPlano(pergunta);

      if (!plano?.encontrado) {
        return null;
      }

      resultado =
        await planExecutor.executar({
          plano,
          pergunta,
          supabase,
          formatacao,
        });
    }

    const planoNaoEncontrado =
      resultado?.ok === false &&
      resultado?.tipo === "planner" &&
      !resultado?.plano;

    if (planoNaoEncontrado) {
      return null;
    }

    return {
      intent:
        intent?.intent?.id ||
        null,

      ...resultado,
    };
  }

  async executar(
    pergunta,
    opcoes = {}
  ) {
    const textoOriginal =
      String(pergunta || "").trim();

    if (!textoOriginal) {
      return {
        ok: false,
        resposta: formatarErro(
          "Digite uma solicitação para o Assistente Virtual."
        ),
      };
    }

    const intent =
      intentEngine.detectar(
        textoOriginal
      );

    const resultadoPlanner =
      await this.executarPlanner(
        textoOriginal,
        intent,
        opcoes
      );

    if (resultadoPlanner) {
      return resultadoPlanner;
    }

    if (
      intentEngine.isSkill(intent)
    ) {
      const skillDireta =
        this.buscarSkill(
          intent.target
        );

      if (skillDireta) {
        return this.executarSkill(
          skillDireta,
          textoOriginal,
          intent,
          opcoes
        );
      }
    }

    const skillPorAlias =
      this.encontrarSkillPorAlias(
        textoOriginal
      );

    if (skillPorAlias) {
      return this.executarSkill(
        skillPorAlias,
        textoOriginal,
        intent,
        opcoes
      );
    }

    if (
      intentEngine.isKnowledge(intent)
    ) {
      const conhecimento =
        knowledgeExecutor.executar(
          textoOriginal,
          intent
        );

      if (conhecimento) {
        return {
          intent:
            intent?.intent?.id ||
            null,

          ...conhecimento,
        };
      }
    }

    return {
      ok: false,

      intent:
        intent?.intent?.id ||
        null,

      resposta:
        formatarNaoAprendido(),
    };
  }

  listarSkills() {
    return this.skillRegistry.listarResumo();
  }

  diagnosticarSkills() {
    return this.skillRegistry.diagnosticar();
  }

  listarIntencoes() {
    return intentEngine.listarIntencoes();
  }

  listarPlanos() {
    return plannerEngine.listarPlanos();
  }
}

const assistantEngine =
  new AssistantEngine();

export default assistantEngine;