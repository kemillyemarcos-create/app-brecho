class SkillExecutor {
  async executar({
    skill,
    pergunta,
    contexto = {},
  }) {
    if (!skill) {
      return {
        ok: false,
        tipo: "skill",
        resposta: "Habilidade não encontrada.",
      };
    }

    if (typeof skill.execute !== "function") {
      return {
        ok: false,
        tipo: "skill",
        skill: skill.id || null,
        categoria: skill.categoria || null,
        resposta: `A habilidade "${
          skill.id || skill.nome || "desconhecida"
        }" não possui execução válida.`,
      };
    }

    try {
      const resultado = await skill.execute({
        pergunta,
        ...contexto,
      });

      if (!resultado || typeof resultado !== "object") {
        return {
          ok: false,
          tipo: "skill",
          skill: skill.id || null,
          categoria: skill.categoria || null,
          resposta:
            "A habilidade foi executada, mas não retornou um resultado válido.",
        };
      }

      return {
        skill: skill.id || null,
        categoria: skill.categoria || null,
        tipo: resultado.tipo || skill.tipo || "skill",
        ...resultado,
      };
    } catch (error) {
      console.error(
        `[SkillExecutor] Erro ao executar "${
          skill.id || skill.nome || "skill desconhecida"
        }"`,
        error
      );

      return {
        ok: false,
        tipo: "skill",
        skill: skill.id || null,
        categoria: skill.categoria || null,
        resposta:
          "Ocorreu um erro ao executar essa solicitação.",
      };
    }
  }
}

const skillExecutor = new SkillExecutor();

export default skillExecutor;
