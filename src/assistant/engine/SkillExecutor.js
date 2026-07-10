class SkillExecutor {
  async executar({ skill, pergunta, contexto = {} }) {
    if (!skill) {
      return {
        ok: false,
        resposta: "Habilidade não encontrada.",
      };
    }

    if (typeof skill.execute !== "function") {
      return {
        ok: false,
        resposta: `A habilidade "${skill.id || skill.nome}" não possui execução válida.`,
      };
    }

    try {
      const resultado = await skill.execute({
        pergunta,
        ...contexto,
      });

      return {
        skill: skill.id,
        categoria: skill.categoria,
        tipo: skill.tipo || "skill",
        ...resultado,
      };
    } catch (error) {
      console.error(
        `[SkillExecutor] Erro ao executar "${skill.id || skill.nome}"`,
        error
      );

      return {
        ok: false,
        skill: skill.id,
        categoria: skill.categoria,
        resposta: "Ocorreu um erro ao executar essa solicitação.",
      };
    }
  }
}

const skillExecutor = new SkillExecutor();

export default skillExecutor;