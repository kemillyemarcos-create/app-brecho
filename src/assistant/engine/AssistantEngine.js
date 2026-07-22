import { supabase } from "../../lib/supabase";
import skills from "../skills";
import intentEngine from "../intents/IntentEngine";
import plannerEngine from "../planner/PlannerEngine";
import planExecutor from "../planner/PlanExecutor";
import { normalizarTexto } from "../utils/TextUtils";
import knowledgeExecutor from "./KnowledgeExecutor";
import skillExecutor from "./SkillExecutor";

import {
  formatarErro,
  formatarNaoAprendido,
} from "./ResponseFormatter";

class AssistantEngine {
  constructor() {
    this.skills = Array.isArray(skills) ? skills : [];
  }

  buscarSkill(id) {
    if (!id) {
      return null;
    }

    const idNormalizado = normalizarTexto(id);

    return (
      this.skills.find(
        (skill) =>
          normalizarTexto(skill?.id) === idNormalizado
      ) || null
    );
  }

  encontrarSkillPorAlias(pergunta) {
    const texto = normalizarTexto(pergunta);

    if (!texto) {
      return null;
    }

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

        if (!termo) {
          continue;
        }

        let pontuacao = 0;

        if (texto === termo) {
          pontuacao = 100;
        } else if (texto.includes(termo)) {
          pontuacao =
            termo
              .split(" ")
              .filter(Boolean)
              .length * 10;
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

  async executarSkill(
    skill,
    pergunta,
    intent = null
  ) {
    return skillExecutor.executar({
      skill,
      pergunta,
      contexto: {
        supabase,
        intent,
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
          intent
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
        intent
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

const assistantEngine =
  new AssistantEngine();

export default assistantEngine;
