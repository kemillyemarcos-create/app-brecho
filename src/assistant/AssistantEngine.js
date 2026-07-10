import { supabase } from "../lib/supabase";
import { normalizarTexto } from "./SkillRegistry";
import skills from "./skills";
import intentEngine from "./intents/IntentEngine";

import {
  BusinessKnowledge,
  BusinessModules,
  BusinessRules,
  BusinessVocabulary,
} from "./knowledge";

import {
  formatarErro,
  formatarLista,
  formatarNaoAprendido,
  formatarResultado,
} from "./ResponseFormatter";

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
    const todosTermos = [termo, ...(sinonimos || [])];

    const encontrou = todosTermos.some((item) =>
      perguntaNormalizada.includes(normalizarTexto(item))
    );

    if (encontrou) {
      return {
        ok: true,
        tipo: "knowledge",
        resposta: formatarResultado({
          titulo: `✨ ${termo}`,
          descricao: `No sistema, "${termo}" está relacionado a estes termos:`,
          detalhes: todosTermos,
        }),
      };
    }
  }

  return null;
}

function respostaRegra(perguntaNormalizada) {
  const regra = BusinessRules.find((item) => {
    const base = `${item.id} ${item.titulo} ${item.descricao}`;

    return (
      perguntaNormalizada.includes(normalizarTexto(item.titulo)) ||
      perguntaNormalizada.includes(normalizarTexto(item.id)) ||
      normalizarTexto(base)
        .split(" ")
        .some(
          (palavra) =>
            palavra.length > 4 && perguntaNormalizada.includes(palavra)
        )
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

  if (intent?.target === "vocabulary") {
    const resposta = respostaVocabulario(texto);
    if (resposta) return resposta;
  }

  if (intent?.target === "rules") {
    const resposta = respostaRegra(texto);
    if (resposta) return resposta;
  }

  return null;
}

class AssistantEngine {
  constructor() {
    this.skills = skills;
  }

  async executar(pergunta) {
    if (!pergunta || !String(pergunta).trim()) {
      return {
        ok: false,
        resposta: formatarErro("Digite uma solicitação para o Assistente Virtual."),
      };
    }

    const intent = intentEngine.detectar(pergunta);

    if (intentEngine.isKnowledge(intent)) {
      const respostaConhecimento = responderConhecimento(pergunta, intent);

      if (respostaConhecimento) {
        return {
          intent: intent.intent?.id,
          ...respostaConhecimento,
        };
      }
    }

    if (intentEngine.isSkill(intent)) {
      const skill = this.buscarSkill(intent.target);

      if (!skill) {
        return {
          ok: false,
          resposta: formatarNaoAprendido(),
        };
      }

      return this.executarSkill(skill, pergunta, intent);
    }

    const skillFallback = this.encontrarSkillFallback(pergunta);

    if (skillFallback) {
      return this.executarSkill(skillFallback, pergunta, intent);
    }

    return {
      ok: false,
      resposta: formatarNaoAprendido(),
    };
  }

  async executarSkill(skill, pergunta, intent = null) {
    try {
      const resultado = await skill.execute({
        pergunta,
        supabase,
      });

      return {
        intent: intent?.intent?.id || null,
        skill: skill.id,
        categoria: skill.categoria,
        ...resultado,
      };
    } catch (error) {
      console.error(
        `[Assistente Virtual] Erro ao executar a Skill "${skill.id}"`,
        error
      );

      return {
        ok: false,
        resposta: formatarErro("Ocorreu um erro ao executar essa solicitação."),
      };
    }
  }

  encontrarSkillFallback(pergunta) {
    const texto = normalizarTexto(pergunta);

    return (
      this.skills.find((skill) =>
        (skill.aliases || []).some((alias) =>
          texto.includes(normalizarTexto(alias))
        )
      ) || null
    );
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

  buscarSkill(id) {
    return this.skills.find((skill) => skill.id === id) || null;
  }

  listarIntencoes() {
    return intentEngine.listarIntencoes();
  }
}

const assistantEngine = new AssistantEngine();

export default assistantEngine;