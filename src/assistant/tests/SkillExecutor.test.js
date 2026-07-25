import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import skillExecutor from "../engine/SkillExecutor";

function criarSkill({
  id = "skill-teste",
  nome = "Skill de teste",
  categoria = "teste",
  tipo = "skill",
  execute,
} = {}) {
  return {
    id,
    nome,
    categoria,
    tipo,
    execute:
      execute ||
      vi.fn(async () => ({
        ok: true,
        resposta: "Executado com sucesso.",
      })),
  };
}

describe("SkillExecutor", () => {
  it("retorna erro quando a Skill não é informada", async () => {
    const resultado =
      await skillExecutor.executar({
        skill: null,
        pergunta: "Teste",
      });

    expect(resultado).toEqual({
      ok: false,
      tipo: "skill",
      resposta:
        "Habilidade não encontrada.",
    });
  });

  it("retorna erro quando execute não é uma função", async () => {
    const resultado =
      await skillExecutor.executar({
        skill: {
          id: "skill-invalida",
          nome: "Skill inválida",
          categoria: "teste",
        },

        pergunta: "Teste",
      });

    expect(resultado).toEqual({
      ok: false,
      tipo: "skill",
      skill: "skill-invalida",
      categoria: "teste",
      resposta:
        'A habilidade "skill-invalida" não possui execução válida.',
    });
  });

  it("executa a Skill com pergunta e contexto", async () => {
    const execute = vi.fn(
      async ({
        pergunta,
        supabase,
        intent,
      }) => ({
        ok: true,
        resposta: pergunta,
        dados: {
          supabase,
          intent,
        },
      })
    );

    const skill = criarSkill({
      id: "resumo-vendas",
      nome: "Resumo de vendas",
      categoria: "vendas",
      execute,
    });

    const supabase = {
      nome: "cliente-supabase",
    };

    const intent = {
      target: "resumo-vendas",
    };

    const resultado =
      await skillExecutor.executar({
        skill,
        pergunta:
          "Mostre o resumo de vendas",

        contexto: {
          supabase,
          intent,
        },
      });

    expect(execute).toHaveBeenCalledTimes(
      1
    );

    expect(execute).toHaveBeenCalledWith({
      pergunta:
        "Mostre o resumo de vendas",
      supabase,
      intent,
    });

    expect(resultado.ok).toBe(true);

    expect(resultado.skill).toBe(
      "resumo-vendas"
    );

    expect(resultado.categoria).toBe(
      "vendas"
    );

    expect(resultado.tipo).toBe(
      "skill"
    );
  });

  it("preserva o tipo retornado pela Skill", async () => {
    const skill = criarSkill({
      id: "relatorio-live",
      nome: "Relatório da live",
      categoria: "lives",
      tipo: "skill",

      execute: vi.fn(async () => ({
        ok: true,
        tipo: "relatorio",
        resposta: "Relatório pronto.",
      })),
    });

    const resultado =
      await skillExecutor.executar({
        skill,
        pergunta:
          "Como foi a última live?",
      });

    expect(resultado.tipo).toBe(
      "relatorio"
    );
  });

  it("usa o tipo da Skill quando o resultado não informa tipo", async () => {
    const skill = criarSkill({
      id: "analise-vendas",
      nome: "Análise de vendas",
      categoria: "vendas",
      tipo: "analise",

      execute: vi.fn(async () => ({
        ok: true,
        resposta: "Análise pronta.",
      })),
    });

    const resultado =
      await skillExecutor.executar({
        skill,
        pergunta:
          "Analise as vendas",
      });

    expect(resultado.tipo).toBe(
      "analise"
    );
  });

  it("usa skill como tipo padrão", async () => {
    const skill = {
      id: "skill-sem-tipo",
      nome: "Skill sem tipo",
      categoria: "teste",

      async execute() {
        return {
          ok: true,
          resposta: "Concluído.",
        };
      },
    };

    const resultado =
      await skillExecutor.executar({
        skill,
        pergunta: "Executar",
      });

    expect(resultado.tipo).toBe(
      "skill"
    );
  });

  it("preserva dados adicionais retornados pela Skill", async () => {
    const skill = criarSkill({
      id: "resumo-financeiro",
      nome: "Resumo financeiro",
      categoria: "financeiro",

      execute: vi.fn(async () => ({
        ok: true,
        resposta: "Resumo pronto.",

        dados: {
          total: 1250,
          quantidade: 10,
        },

        metadados: {
          periodo: "hoje",
        },
      })),
    });

    const resultado =
      await skillExecutor.executar({
        skill,
        pergunta:
          "Mostre o resumo financeiro",
      });

    expect(resultado.dados).toEqual({
      total: 1250,
      quantidade: 10,
    });

    expect(
      resultado.metadados
    ).toEqual({
      periodo: "hoje",
    });
  });

  it("permite que o resultado sobrescreva categoria e skill", async () => {
    const skill = criarSkill({
      id: "skill-original",
      nome: "Skill original",
      categoria: "original",

      execute: vi.fn(async () => ({
        ok: true,
        skill: "skill-retornada",
        categoria: "retornada",
        resposta: "Concluído.",
      })),
    });

    const resultado =
      await skillExecutor.executar({
        skill,
        pergunta: "Executar",
      });

    expect(resultado.skill).toBe(
      "skill-retornada"
    );

    expect(resultado.categoria).toBe(
      "retornada"
    );
  });

  it("retorna erro quando a Skill retorna null", async () => {
    const skill = criarSkill({
      id: "skill-sem-retorno",
      nome: "Skill sem retorno",
      categoria: "teste",

      execute: vi.fn(
        async () => null
      ),
    });

    const resultado =
      await skillExecutor.executar({
        skill,
        pergunta: "Executar",
      });

    expect(resultado).toEqual({
      ok: false,
      tipo: "skill",
      skill: "skill-sem-retorno",
      categoria: "teste",
      resposta:
        "A habilidade foi executada, mas não retornou um resultado válido.",
    });
  });

  it("retorna erro quando a Skill retorna string", async () => {
    const skill = criarSkill({
      id: "skill-string",
      nome: "Skill string",
      categoria: "teste",

      execute: vi.fn(
        async () =>
          "resultado inválido"
      ),
    });

    const resultado =
      await skillExecutor.executar({
        skill,
        pergunta: "Executar",
      });

    expect(resultado.ok).toBe(false);

    expect(resultado.resposta).toBe(
      "A habilidade foi executada, mas não retornou um resultado válido."
    );
  });

  it("trata erros lançados pela Skill", async () => {
    const erroConsole = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const skill = criarSkill({
      id: "skill-com-erro",
      nome: "Skill com erro",
      categoria: "teste",

      execute: vi.fn(async () => {
        throw new Error(
          "Falha interna"
        );
      }),
    });

    const resultado =
      await skillExecutor.executar({
        skill,
        pergunta: "Executar",
      });

    expect(resultado).toEqual({
      ok: false,
      tipo: "skill",
      skill: "skill-com-erro",
      categoria: "teste",
      resposta:
        "Ocorreu um erro ao executar essa solicitação.",
    });

    expect(
      erroConsole
    ).toHaveBeenCalled();

    erroConsole.mockRestore();
  });

  it("funciona sem contexto explícito", async () => {
    const execute = vi.fn(
      async ({ pergunta }) => ({
        ok: true,
        resposta: pergunta,
      })
    );

    const skill = criarSkill({
      execute,
    });

    const resultado =
      await skillExecutor.executar({
        skill,
        pergunta: "Teste simples",
      });

    expect(execute).toHaveBeenCalledWith({
      pergunta: "Teste simples",
    });

    expect(resultado.ok).toBe(true);
  });

  it("usa valores nulos quando a Skill não possui metadados", async () => {
    const skill = {
      async execute() {
        return {
          ok: true,
          resposta: "Executado.",
        };
      },
    };

    const resultado =
      await skillExecutor.executar({
        skill,
        pergunta: "Executar",
      });

    expect(resultado.skill).toBeNull();

    expect(
      resultado.categoria
    ).toBeNull();
  });
});